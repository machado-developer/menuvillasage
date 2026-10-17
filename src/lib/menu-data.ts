import type { Category, MenuItem } from "@/data/menu";
import { beveragePhotoCredits } from "@/data/beverage-photo-credits";
import { fallbackMenu } from "@/lib/fallback-menu";
import { getDatabaseUrl, prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type MenuCategoryWithItems = Prisma.MenuCategoryGetPayload<{ include: { items: true } }>;

function toCategoryModel(row: MenuCategoryWithItems): Category {
  const items: MenuItem[] = row.items.map((item) => {
    const imageCredit = beveragePhotoCredits[item.name];

    return {
      id: item.id,
      name: item.name,
      price: item.price.toNumber(),
      is_active: item.isActive,
      sort_order: item.sortOrder,
      ...(item.description ? { description: item.description } : {}),
      ...(item.imageUrl
        ? { image: item.imageUrl, ...(imageCredit ? { imageCredit } : {}) }
        : {}),
    };
  });

  return {
    id: row.id,
    name: row.name,
    group: row.group,
    is_active: row.isActive,
    sort_order: row.sortOrder,
    items,
  };
}

export async function getPublicMenu(): Promise<Category[]> {
  if (!getDatabaseUrl()) {
    return fallbackMenu;
  }

  try {
    const categories = await prisma.menuCategory.findMany({
      where: { isActive: true },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    if (categories.length === 0) {
      return fallbackMenu;
    }

    return categories.map(toCategoryModel);
  } catch (error) {
    console.error("Falha ao obter menu público do banco Prisma:", error);
    return fallbackMenu;
  }
}

export async function getAdminMenu(): Promise<Category[]> {
  if (!getDatabaseUrl()) {
    return fallbackMenu;
  }

  try {
    const categories = await prisma.menuCategory.findMany({
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });

    if (categories.length === 0) {
      return fallbackMenu;
    }

    return categories.map(toCategoryModel);
  } catch (error) {
    console.error("Falha ao obter menu administrativo do banco Prisma:", error);
    return [];
  }
}
