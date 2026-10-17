import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

const connectionString = process.env.DATABASE_URL;
console.log("A testar Prisma via @prisma/adapter-pg...");

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

try {
  console.log("A ligar...");
  await prisma.$connect();
  console.log("✅ CONEXÃO ESTABELECIDA COM SUCESSO VIA ADAPTER-PG!");
  const count = await prisma.menuCategory.count();
  console.log("Número de categorias na BD:", count);
  await prisma.$disconnect();
  await pool.end();
  console.log("✓ Teste concluído com êxito!");
} catch (error) {
  console.error("❌ Erro:", error);
  process.exit(1);
}
