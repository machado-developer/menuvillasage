CREATE TYPE "MenuGroup" AS ENUM ('Comida', 'Bebidas');

CREATE TABLE "menu_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "group" "MenuGroup" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "menu_items" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "menu_categories_sort_order_idx" ON "menu_categories"("sort_order");
CREATE INDEX "menu_items_category_id_idx" ON "menu_items"("category_id");
CREATE INDEX "menu_items_is_active_idx" ON "menu_items"("is_active");

ALTER TABLE "menu_items"
ADD CONSTRAINT "menu_items_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "menu_categories"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
