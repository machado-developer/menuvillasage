import nextEnv from "@next/env";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";

nextEnv.loadEnvConfig(process.cwd());

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  console.log("A aplicar migração SQL à base de dados...");
  const sql = fs.readFileSync(
    path.join(process.cwd(), "prisma/migrations/20261016150000_init/migration.sql"),
    "utf8"
  );
  
  await pool.query(sql);
  console.log("✅ Tabelas criadas com sucesso na base de dados!");

  // Criar tabela de migrações do Prisma para marcar como aplicada
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id"                    VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum"              VARCHAR(64) NOT NULL,
      "finished_at"           TIMESTAMPTZ,
      "migration_name"        VARCHAR(255) NOT NULL,
      "logs"                  TEXT,
      "rolled_back_at"        TIMESTAMPTZ,
      "started_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count"   INTEGER NOT NULL DEFAULT 0
    );
  `);

  await pool.query(`
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
    VALUES (
      '20261016150000-init',
      '20261016150000_init',
      now(),
      '20261016150000_init',
      1
    )
    ON CONFLICT (id) DO NOTHING;
  `);

  console.log("✅ Migração registada com sucesso!");
} catch (err) {
  console.error("❌ Erro ao aplicar migração:", err.message);
} finally {
  await pool.end();
}
