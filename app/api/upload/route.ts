import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { MAX_UPLOAD_BYTES, processImage } from "@/lib/image-processor";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// A Vercel processa este limite no body antes de chegar ao handler.
// Definimos 11 MB para dar margem ao overhead multipart.
export const maxDuration = 30; // segundos — necessário para sharp no Edge
export const runtime = "nodejs"; // sharp não corre no Edge Runtime

/**
 * POST /api/upload
 * Aceita multipart/form-data com os campos:
 *   - file: File (obrigatório)
 *   - itemId: string UUID (obrigatório — associar ao produto)
 *   - oldUrl: string (opcional — URL anterior a apagar do Blob)
 *
 * Devolve: { url: string }
 */
export async function POST(request: Request) {
  // 1. Autenticação
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  // 2. Verificar configuração do Blob
  if (!process.env["BLOB_READ_WRITE_TOKEN"]) {
    return Response.json(
      { error: "BLOB_READ_WRITE_TOKEN não está configurado no servidor." },
      { status: 503 },
    );
  }

  // 3. Ler o FormData
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Pedido inválido: não foi possível ler o formulário." }, { status: 400 });
  }

  const fileEntry = formData.get("file");
  const itemId = formData.get("itemId");
  const oldUrl = formData.get("oldUrl");

  if (!fileEntry || typeof fileEntry === "string" || typeof (fileEntry as Blob).arrayBuffer !== "function") {
    return Response.json({ error: "Nenhum ficheiro recebido." }, { status: 400 });
  }
  if (typeof itemId !== "string" || !itemId.trim()) {
    return Response.json({ error: "itemId inválido ou ausente." }, { status: 400 });
  }

  // 4. Verificar que o itemId existe na base de dados (evita uploads fantasma)
  const existingItem = await prisma.menuItem.findUnique({
    where: { id: itemId },
    select: { id: true },
  });
  if (!existingItem) {
    return Response.json({ error: "Produto não encontrado." }, { status: 404 });
  }

  // 5. Validar tamanho antes de ler bytes
  if (fileEntry.size > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: `A imagem não pode exceder ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.` },
      { status: 413 },
    );
  }

  // 6. Ler bytes e processar (validação magic bytes + sharp)
  const rawBuffer = Buffer.from(await fileEntry.arrayBuffer());
  let processedBuffer: Buffer;
  try {
    processedBuffer = await processImage(rawBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao processar a imagem.";
    return Response.json({ error: message }, { status: 422 });
  }

  // 7. Fazer upload para Vercel Blob
  const filename = `menu/${itemId}-${Date.now()}.webp`;
  let blobUrl: string;
  try {
    const blob = await put(filename, processedBuffer, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
    });
    blobUrl = blob.url;
  } catch (error) {
    console.error("Erro ao fazer upload para Vercel Blob:", error);
    return Response.json({ error: "Não foi possível fazer o upload da imagem." }, { status: 502 });
  }

  // 8. Guardar URL no PostgreSQL via Prisma
  try {
    await prisma.menuItem.update({
      where: { id: itemId },
      data: { imageUrl: blobUrl },
    });
  } catch (error) {
    // Apagar o blob recém-criado para evitar órfãos
    await del(blobUrl).catch(() => null);
    console.error("Erro ao actualizar imageUrl no Prisma:", error);
    return Response.json({ error: "Imagem carregada mas não foi possível associá-la ao produto." }, { status: 500 });
  }

  // 9. Apagar imagem antiga do Blob apenas se já não estiver a ser utilizada por outro item
  if (typeof oldUrl === "string" && oldUrl.startsWith("https://") && oldUrl !== blobUrl) {
    try {
      const stillUsed = await prisma.menuItem.count({
        where: { imageUrl: oldUrl, id: { not: itemId } },
      });
      if (stillUsed === 0) {
        await del(oldUrl);
      }
    } catch (error) {
      // Não bloquear a resposta — apenas registar
      console.warn("Aviso: não foi possível apagar a imagem anterior do Blob:", error);
    }
  }

  // 10. Revalidar cache do Next.js
  revalidatePath("/");
  revalidatePath("/admin");

  return Response.json({ url: blobUrl }, { status: 200 });
}

/**
 * DELETE /api/upload
 * Body JSON: { url: string, itemId: string }
 * Remove a imagem do Blob e limpa o imageUrl no Prisma.
 */
export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!process.env["BLOB_READ_WRITE_TOKEN"]) {
    return Response.json(
      { error: "BLOB_READ_WRITE_TOKEN não está configurado no servidor." },
      { status: 503 },
    );
  }

  let body: { url?: unknown; itemId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const { url, itemId } = body;

  if (typeof itemId !== "string" || !itemId.trim()) {
    return Response.json({ error: "itemId inválido." }, { status: 400 });
  }

  // Verificar que o produto pertence ao admin autenticado (dupla verificação)
  const existingItem = await prisma.menuItem.findUnique({
    where: { id: itemId },
    select: { id: true, imageUrl: true },
  });
  if (!existingItem) {
    return Response.json({ error: "Produto não encontrado." }, { status: 404 });
  }

  // Limpar imageUrl no Prisma
  try {
    await prisma.menuItem.update({
      where: { id: itemId },
      data: { imageUrl: null },
    });
  } catch (error) {
    console.error("Erro ao remover imageUrl no Prisma:", error);
    return Response.json({ error: "Não foi possível remover a imagem do produto." }, { status: 500 });
  }

  // Apagar do Blob se for URL do Vercel Blob e já não estiver a ser utilizado
  const urlToDelete = typeof url === "string" ? url : existingItem.imageUrl;
  if (urlToDelete && urlToDelete.startsWith("https://")) {
    const stillUsed = await prisma.menuItem.count({ where: { imageUrl: urlToDelete } });
    if (stillUsed === 0) {
      await del(urlToDelete).catch((error: unknown) => {
        console.warn("Aviso: não foi possível apagar do Blob:", error);
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return Response.json({ ok: true });
}
