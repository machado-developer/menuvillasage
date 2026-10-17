import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_IMAGE_URL_LENGTH = 2048;
const imageUrlSchema = z.string().max(MAX_IMAGE_URL_LENGTH).nullable().refine(
  (value) =>
    value === null ||
    /^https:\/\/\S+$/i.test(value) ||
    /^\/(?!\/)\S*$/.test(value),
  "URL de imagem inválido.",
);

const categoryInput = z.object({
  type: z.literal("category"),
  name: z.string().trim().min(1).max(100),
  group: z.enum(["Comida", "Bebidas"]),
}).strict();
const itemInput = z.object({
  type: z.literal("item"),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable(),
  price: z.number().finite().min(0).max(99_999_999),
  imageUrl: imageUrlSchema,
}).strict();
const categoryUpdate = z.object({
  type: z.literal("category"),
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  group: z.enum(["Comida", "Bebidas"]).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
}).strict().refine((data) => Object.keys(data).length > 2, "Nenhuma alteração enviada.");
const itemUpdate = z.object({
  type: z.literal("item"),
  id: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  price: z.number().finite().min(0).max(99_999_999).optional(),
  imageUrl: imageUrlSchema.optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
}).strict().refine((data) => Object.keys(data).length > 2, "Nenhuma alteração enviada.");
const deleteInput = z.object({
  type: z.enum(["category", "item"]),
  id: z.string().uuid(),
}).strict();

async function readJson(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 3_500_000) {
    return { error: "O pedido excede o limite de tamanho." } as const;
  }
  try {
    const raw = await request.text();
    if (raw.length > 3_500_000) {
      return { error: "O pedido excede o limite de tamanho." } as const;
    }
    return { body: JSON.parse(raw) as unknown } as const;
  } catch {
    return { error: "O conteúdo enviado não é um JSON válido." } as const;
  }
}

function databaseError(error: unknown, action: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return Response.json({ error: "O registo solicitado não existe." }, { status: 404 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    return Response.json({ error: "A categoria selecionada não existe." }, { status: 400 });
  }
  console.error(`Falha ao ${action} no banco Prisma:`, error);
  return Response.json({ error: "Não foi possível concluir a operação no banco de dados." }, { status: 500 });
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const categories = await prisma.menuCategory.findMany({
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
    return Response.json(
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        group: category.group,
        is_active: category.isActive,
        sort_order: category.sortOrder,
        items: category.items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price.toNumber(),
          image: item.imageUrl,
          is_active: item.isActive,
          sort_order: item.sortOrder,
        })),
      })),
    );
  } catch (error) {
    return databaseError(error, "carregar");
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }
  const parsed = await readJson(request);
  if ("error" in parsed) {
    const status = parsed.error.startsWith("O pedido excede") ? 413 : 400;
    return Response.json({ error: parsed.error }, { status });
  }

  const category = categoryInput.safeParse(parsed.body);
  const item = itemInput.safeParse(parsed.body);
  try {
    if (category.success) {
      const { type: _type, ...data } = category.data;
      const sortOrder = await prisma.menuCategory.count();
      const created = await prisma.menuCategory.create({ data: { ...data, sortOrder } });
      revalidatePath("/");
      revalidatePath("/admin");
      return Response.json({ id: created.id }, { status: 201 });
    }
    if (item.success) {
      const { type: _type, ...data } = item.data;
      const sortOrder = await prisma.menuItem.count({ where: { categoryId: item.data.categoryId } });
      const created = await prisma.menuItem.create({ data: { ...data, sortOrder } });
      revalidatePath("/");
      revalidatePath("/admin");
      return Response.json({ id: created.id }, { status: 201 });
    }
    return Response.json({ error: "Os dados da categoria ou do produto são inválidos." }, { status: 400 });
  } catch (error) {
    return databaseError(error, "criar");
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }
  const parsed = await readJson(request);
  if ("error" in parsed) {
    const status = parsed.error.startsWith("O pedido excede") ? 413 : 400;
    return Response.json({ error: parsed.error }, { status });
  }

  const category = categoryUpdate.safeParse(parsed.body);
  const item = itemUpdate.safeParse(parsed.body);
  try {
    if (category.success) {
      const { id } = category.data;
      const data = {
        ...(category.data.name !== undefined ? { name: category.data.name } : {}),
        ...(category.data.group !== undefined ? { group: category.data.group } : {}),
        ...(category.data.isActive !== undefined ? { isActive: category.data.isActive } : {}),
        ...(category.data.sortOrder !== undefined ? { sortOrder: category.data.sortOrder } : {}),
      };
      await prisma.menuCategory.update({ where: { id }, data });
      revalidatePath("/");
      revalidatePath("/admin");
      return Response.json({ ok: true });
    }
    if (item.success) {
      const { id } = item.data;
      let previousImageUrl: string | null = null;
      if (item.data.imageUrl !== undefined) {
        const currentItem = await prisma.menuItem.findUnique({
          where: { id },
          select: { imageUrl: true },
        });
        previousImageUrl = currentItem?.imageUrl ?? null;
      }

      const data = {
        ...(item.data.categoryId !== undefined ? { category: { connect: { id: item.data.categoryId } } } : {}),
        ...(item.data.name !== undefined ? { name: item.data.name } : {}),
        ...(item.data.description !== undefined ? { description: item.data.description } : {}),
        ...(item.data.price !== undefined ? { price: item.data.price } : {}),
        ...(item.data.imageUrl !== undefined ? { imageUrl: item.data.imageUrl } : {}),
        ...(item.data.isActive !== undefined ? { isActive: item.data.isActive } : {}),
        ...(item.data.sortOrder !== undefined ? { sortOrder: item.data.sortOrder } : {}),
      };
      await prisma.menuItem.update({ where: { id }, data });

      // Apagar blob anterior se foi alterado e já não está a ser utilizado
      if (
        previousImageUrl &&
        previousImageUrl.startsWith("https://") &&
        previousImageUrl !== item.data.imageUrl &&
        process.env["BLOB_READ_WRITE_TOKEN"]
      ) {
        const stillUsed = await prisma.menuItem.count({ where: { imageUrl: previousImageUrl } });
        if (stillUsed === 0) {
          await del(previousImageUrl).catch((err) => console.warn("Aviso: erro ao apagar blob:", err));
        }
      }

      revalidatePath("/");
      revalidatePath("/admin");
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Os dados da categoria ou do produto são inválidos." }, { status: 400 });
  } catch (error) {
    return databaseError(error, "atualizar");
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }
  const parsed = await readJson(request);
  if ("error" in parsed) {
    const status = parsed.error.startsWith("O pedido excede") ? 413 : 400;
    return Response.json({ error: parsed.error }, { status });
  }
  const result = deleteInput.safeParse(parsed.body);
  if (!result.success) {
    return Response.json({ error: "Identificador ou tipo de registo inválido." }, { status: 400 });
  }
  try {
    if (result.data.type === "category") {
      const itemsToDelete = await prisma.menuItem.findMany({
        where: { categoryId: result.data.id, imageUrl: { not: null } },
        select: { imageUrl: true },
      });
      await prisma.menuCategory.delete({ where: { id: result.data.id } });
      if (process.env["BLOB_READ_WRITE_TOKEN"]) {
        for (const item of itemsToDelete) {
          if (item.imageUrl && item.imageUrl.startsWith("https://")) {
            const stillUsed = await prisma.menuItem.count({ where: { imageUrl: item.imageUrl } });
            if (stillUsed === 0) {
              await del(item.imageUrl).catch((err) => console.warn("Aviso: erro ao apagar blob:", err));
            }
          }
        }
      }
    } else {
      const itemToDelete = await prisma.menuItem.findUnique({
        where: { id: result.data.id },
        select: { imageUrl: true },
      });
      await prisma.menuItem.delete({ where: { id: result.data.id } });
      if (
        itemToDelete?.imageUrl &&
        itemToDelete.imageUrl.startsWith("https://") &&
        process.env["BLOB_READ_WRITE_TOKEN"]
      ) {
        const stillUsed = await prisma.menuItem.count({ where: { imageUrl: itemToDelete.imageUrl } });
        if (stillUsed === 0) {
          await del(itemToDelete.imageUrl).catch((err) => console.warn("Aviso: erro ao apagar blob:", err));
        }
      }
    }
    revalidatePath("/");
    revalidatePath("/admin");
    return Response.json({ ok: true });
  } catch (error) {
    return databaseError(error, "eliminar");
  }
}
