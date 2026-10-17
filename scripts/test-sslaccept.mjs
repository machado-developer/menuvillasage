import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";

nextEnv.loadEnvConfig(process.cwd());

const baseUrl = process.env.DATABASE_URL;
const testUrl = baseUrl + "&sslaccept=accept_invalid_certs";

console.log("A testar com sslaccept=accept_invalid_certs...");
const prisma = new PrismaClient({
  datasources: { db: { url: testUrl } },
});

try {
  await prisma.$connect();
  console.log("✅ Conectou com sslaccept=accept_invalid_certs!");
  const count = await prisma.menuCategory.count();
  console.log("Categorias:", count);
} catch (e) {
  console.log("❌ Falha:", e.message?.slice(0, 150));
} finally {
  await prisma.$disconnect();
}
