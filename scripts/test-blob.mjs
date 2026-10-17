import dotenv from "dotenv";
import { head, put } from "@vercel/blob";

dotenv.config({ path: ".env.local" });

const token = process.env.BLOB_READ_WRITE_TOKEN;

console.log("🔍 A testar configuração do Vercel Blob...\n");

if (!token) {
  console.error("❌ BLOB_READ_WRITE_TOKEN não encontrado no .env.local!");
  console.log("\nPara configurar:");
  console.log("1. Aceda a vercel.com/dashboard → Storage → [A sua Blob Store]");
  console.log("2. Copie o valor do BLOB_READ_WRITE_TOKEN");
  console.log("3. Adicione ao ficheiro .env.local:");
  console.log('   BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."\n');
  process.exit(1);
}

console.log("✓ Token detectado no .env.local (" + token.slice(0, 18) + "...)\n");

try {
  console.log("A enviar ficheiro de teste...");
  const testBlob = await put("__test_connection.txt", "Vercel Blob ligação local validada com sucesso!", {
    access: "public",
    addRandomSuffix: true,
  });

  console.log("✅ Ligação com o Vercel Blob estabelecida com sucesso!");
  console.log("🔗 URL de teste criado:", testBlob.url);

  // Verificar leitura
  const blobInfo = await head(testBlob.url);
  console.log("📦 Tamanho do ficheiro:", blobInfo.size, "bytes");
  console.log("🌐 Status: Operacional e pronto para uploads locais e no painel admin!\n");
} catch (error) {
  console.error("❌ Erro ao ligar ao Vercel Blob:");
  console.error(error.message || error);
  process.exit(1);
}
