import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";

nextEnv.loadEnvConfig(process.cwd());

const baseUrl = process.env.DATABASE_URL;

const variants = [
  { name: "Original (postgres://)", url: baseUrl },
  { name: "Scheme postgresql://", url: baseUrl.replace("postgres://", "postgresql://") },
  { name: "With pgbouncer=true", url: baseUrl.replace("postgres://", "postgresql://") + "&pgbouncer=true" },
  { name: "With connection_limit=1", url: baseUrl.replace("postgres://", "postgresql://") + "&connection_limit=1" },
  { name: "Direct host (db.prisma.io)", url: baseUrl.replace("postgres://", "postgresql://").replace("pooled.db.prisma.io", "db.prisma.io") },
];

for (const v of variants) {
  console.log(`\n========================================`);
  console.log(`A testar: ${v.name}`);
  const prisma = new PrismaClient({
    datasources: { db: { url: v.url } },
  });
  try {
    const start = Date.now();
    await prisma.$connect();
    const elapsed = Date.now() - start;
    console.log(`✅ SUCESSO com ${v.name}! Tempo: ${elapsed}ms`);
    const count = await prisma.menuCategory.count();
    console.log(`Categorias na BD: ${count}`);
    await prisma.$disconnect();
    break;
  } catch (err) {
    console.log(`❌ Falhou com ${v.name}: ${err.message?.slice(0, 150)}`);
    await prisma.$disconnect().catch(() => {});
  }
}
