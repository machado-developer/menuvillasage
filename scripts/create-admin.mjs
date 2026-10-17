/**
 * Script para criar ou actualizar um utilizador administrador na base de dados PostgreSQL.
 *
 * Uso:
 *   node scripts/create-admin.mjs [email] [senha] [nome]
 *
 * Exemplo:
 *   node scripts/create-admin.mjs admin@villasage.com VillaSage@2026! "Gestor Villa Sage"
 */

import nextEnv from "@next/env";
import pg from "pg";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL não está configurada no .env.local.");
  process.exit(1);
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

const email = (process.argv[2] || process.env.ADMIN_EMAIL || "admin@villasage.com").trim().toLowerCase();
const password = process.argv[3] || process.env.ADMIN_PASSWORD || "VillaSage@2026!";
const name = process.argv[4] || "Administrador Villa Sage";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  console.log(`\n🔐 A preparar conta administrativa para: ${email}`);

  // 1. Garantir que a tabela admin_users existe
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "admin_users" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "email" TEXT UNIQUE NOT NULL,
      "password_hash" TEXT NOT NULL,
      "name" TEXT,
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Gerar hash da senha
  const passwordHash = await hashPassword(password);

  // 3. Inserir ou actualizar o utilizador
  const result = await pool.query(
    `
    INSERT INTO "admin_users" ("email", "password_hash", "name", "updated_at")
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    ON CONFLICT ("email") DO UPDATE
      SET "password_hash" = EXCLUDED."password_hash",
          "name" = COALESCE(EXCLUDED."name", "admin_users"."name"),
          "updated_at" = CURRENT_TIMESTAMP
    RETURNING "id", "email", "name", "created_at", "updated_at";
  `,
    [email, passwordHash, name],
  );

  const user = result.rows[0];
  console.log("\n✅ Administrador configurado com sucesso na base de dados!");
  console.log(`   ID:    ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Nome:  ${user.name || "—"}`);
  console.log("\nPode agora iniciar sessão em /login ou /admin com estas credenciais.");
} catch (err) {
  console.error("❌ Erro ao criar administrador na base de dados:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
