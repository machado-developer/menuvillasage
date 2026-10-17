"use client";

import { useEffect, useRef, useState } from "react";
import type { StaticImageData } from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category, MenuItem } from "@/data/menu";

type AdminItem = Omit<MenuItem, "image"> & { image?: string | StaticImageData; is_active: boolean; sort_order: number };
type AdminCategory = Omit<Category, "items"> & { is_active: boolean; sort_order: number; items: AdminItem[] };
type AdminMenuRow = Omit<AdminCategory, "items"> & {
  items: (Omit<AdminItem, "image"> & { image: string | null })[];
};
type ItemForm = {
  categoryId: string;
  name: string;
  description: string;
  price: string;
  /** URL persistente (Blob ou relativo) ou "" */
  imageUrl: string;
  /** Ficheiro local seleccionado ainda não carregado */
  pendingFile: File | null;
  /** URL de pré-visualização gerado por createObjectURL */
  previewUrl: string;
  editingId: string | null;
};
type UploadState = "idle" | "uploading" | "success" | "error";

/** Tamanho máximo para validação no cliente (10 MB — igual ao servidor) */
const MAX_CLIENT_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

// ─── helpers ────────────────────────────────────────────────────────────────

async function adminRequest<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const bodyText = body === undefined ? undefined : JSON.stringify(body);
  const response = await fetch(path, {
    method,
    ...(bodyText === undefined
      ? {}
      : { headers: { "content-type": "application/json" }, body: bodyText }),
    cache: "no-store",
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Não foi possível concluir a operação.");
  return result;
}

function imageSource(image?: string | StaticImageData | null): string {
  if (!image) return "";
  return typeof image === "string" ? image : image.src;
}

function toAdminCategory(category: AdminMenuRow): AdminCategory {
  const { items, ...fields } = category;
  return {
    ...fields,
    items: items.map(({ image, ...item }) => ({
      ...item,
      ...(image ? { image } : {}),
    })),
  };
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(value) + " Kz";
}

const emptyItemForm = (categoryId: string): ItemForm => ({
  categoryId,
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  pendingFile: null,
  previewUrl: "",
  editingId: null,
});

// ─── componente principal ────────────────────────────────────────────────────

export function AdminMenuManager({ initialMenu }: { initialMenu: Category[] }) {
  const [menu, setMenu] = useState<AdminCategory[]>(
    initialMenu.map((category) => ({
      ...category,
      is_active: category.is_active ?? true,
      sort_order: category.sort_order ?? 0,
      items: category.items.map((item, index) => ({
        ...item,
        is_active: item.is_active ?? true,
        sort_order: item.sort_order ?? index,
      })),
    })),
  );
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState<{ text: string; type: "info" | "error" | "success" } | null>(null);
  const [session, setSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryForm, setCategoryForm] = useState<{ name: string; group: Category["group"] }>({
    name: "",
    group: "Comida",
  });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm(initialMenu[0]?.id ?? ""));
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revogar object URLs para evitar memory leaks
  useEffect(() => {
    return () => {
      if (itemForm.previewUrl) URL.revokeObjectURL(itemForm.previewUrl);
    };
  }, [itemForm.previewUrl]);

  // ─── helpers internos ─────────────────────────────────────────────────────

  function showMessage(text: string, type: "info" | "error" | "success" = "info") {
    setMessage({ text, type });
  }

  async function refreshMenu() {
    const rows = await adminRequest<AdminMenuRow[]>("GET", "/api/admin/menu");
    const categories = rows.map(toAdminCategory);
    setMenu(categories);
    setItemForm((previous) => ({
      ...previous,
      categoryId: categories.some((category) => category.id === previous.categoryId)
        ? previous.categoryId
        : (categories[0]?.id ?? ""),
    }));
  }

  // ─── sessão ───────────────────────────────────────────────────────────────

  useEffect(() => {
    let active = true;
    adminRequest<{ authenticated: boolean; configured: boolean }>("GET", "/api/admin/session")
      .then((status) => {
        if (!active) return;
        setSession(status.authenticated);
        if (!status.configured) {
          showMessage(
            "Configure DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD e ADMIN_SESSION_SECRET no .env.local.",
            "error",
          );
        }
        if (status.authenticated) {
          void refreshMenu().catch((error: unknown) => {
            if (active)
              showMessage(error instanceof Error ? error.message : "Não foi possível carregar o menu.", "error");
          });
        }
      })
      .catch((error: unknown) => {
        if (active)
          showMessage(error instanceof Error ? error.message : "Não foi possível verificar a sessão.", "error");
      })
      .finally(() => {
        if (active) setIsCheckingSession(false);
      });
    return () => { active = false; };
  }, []);

  async function saveChange(method: "POST" | "PATCH" | "DELETE", payload: unknown, success: string) {
    setIsLoading(true);
    setMessage(null);
    try {
      await adminRequest(method, "/api/admin/menu", payload);
      await refreshMenu();
      showMessage(success, "success");
      return true;
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível guardar a alteração.", "error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  // ─── login / logout ───────────────────────────────────────────────────────

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      await adminRequest("POST", "/api/admin/session", loginData);
      setSession(true);
      await refreshMenu();
      showMessage("Login efetuado com sucesso.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível iniciar sessão.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await adminRequest("DELETE", "/api/admin/session");
      setSession(false);
      showMessage("Sessão terminada.", "info");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível terminar a sessão.", "error");
    }
  }

  // ─── categorias ───────────────────────────────────────────────────────────

  async function handleSaveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryForm.name.trim();
    if (!name) { showMessage("Informe o nome da categoria.", "error"); return; }

    const editingId = editingCategoryId;
    const saved = await saveChange(
      editingId ? "PATCH" : "POST",
      editingId
        ? { type: "category", id: editingId, name, group: categoryForm.group }
        : { type: "category", name, group: categoryForm.group },
      editingId ? "Categoria actualizada." : "Categoria adicionada com sucesso.",
    );
    if (!saved) return;
    setCategoryForm({ name: "", group: "Comida" });
    setEditingCategoryId(null);
  }

  // ─── upload de imagem ─────────────────────────────────────────────────────

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validações no cliente (pré-filtragem)
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showMessage("Escolha uma imagem JPEG, PNG, WebP, GIF ou AVIF.", "error");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_CLIENT_BYTES) {
      showMessage(`A imagem não pode exceder ${Math.round(MAX_CLIENT_BYTES / 1024 / 1024)} MB.`, "error");
      event.target.value = "";
      return;
    }

    // Revogar pré-visualização anterior
    if (itemForm.previewUrl) URL.revokeObjectURL(itemForm.previewUrl);

    const previewUrl = URL.createObjectURL(file);
    setItemForm((prev) => ({ ...prev, pendingFile: file, previewUrl }));
    setUploadState("idle");
    setMessage(null);
  }

  /**
   * Faz upload do pendingFile para /api/upload e actualiza itemForm.imageUrl.
   * Requer que o item já exista na BD (editingId preenchido).
   */
  async function uploadPendingFile(itemId: string): Promise<string | null> {
    if (!itemForm.pendingFile) return itemForm.imageUrl || null;

    setUploadState("uploading");

    const fd = new FormData();
    fd.append("file", itemForm.pendingFile);
    fd.append("itemId", itemId);
    if (itemForm.imageUrl) fd.append("oldUrl", itemForm.imageUrl);

    try {
      const response = await fetch("/api/upload", { method: "POST", body: fd, cache: "no-store" });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Erro no upload.");
      const url = data.url ?? "";
      setUploadState("success");
      setItemForm((prev) => ({ ...prev, imageUrl: url, pendingFile: null, previewUrl: url }));
      return url;
    } catch (error) {
      setUploadState("error");
      showMessage(error instanceof Error ? error.message : "Não foi possível carregar a imagem.", "error");
      return null;
    }
  }

  function clearImage() {
    if (itemForm.previewUrl && itemForm.previewUrl !== itemForm.imageUrl) {
      URL.revokeObjectURL(itemForm.previewUrl);
    }
    setItemForm((prev) => ({ ...prev, pendingFile: null, previewUrl: "", imageUrl: "" }));
    setUploadState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function removeExistingImage(itemId: string) {
    if (!itemForm.imageUrl) return;
    if (!window.confirm("Remover a fotografia deste produto?")) return;

    setIsLoading(true);
    try {
      await adminRequest("DELETE", "/api/upload", { url: itemForm.imageUrl, itemId });
      clearImage();
      await refreshMenu();
      showMessage("Fotografia removida.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível remover a imagem.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  // ─── itens ────────────────────────────────────────────────────────────────

  async function handleSaveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = itemForm.name.trim();
    const price = Number(itemForm.price);
    if (!itemForm.categoryId) { showMessage("Selecione uma categoria.", "error"); return; }
    if (!name) { showMessage("Informe o nome do item.", "error"); return; }
    if (!Number.isFinite(price) || price < 0) { showMessage("Informe um preço válido.", "error"); return; }

    setIsLoading(true);
    setMessage(null);

    try {
      const editingId = itemForm.editingId;

      if (editingId) {
        // Caso edição: item já existe — podemos fazer upload directo
        let finalImageUrl = itemForm.imageUrl || null;

        if (itemForm.pendingFile) {
          const uploaded = await uploadPendingFile(editingId);
          if (uploaded === null && itemForm.pendingFile) {
            // Upload falhou — já foi mostrada mensagem
            setIsLoading(false);
            return;
          }
          finalImageUrl = uploaded;
        }

        await adminRequest("PATCH", "/api/admin/menu", {
          type: "item",
          id: editingId,
          categoryId: itemForm.categoryId,
          name,
          description: itemForm.description.trim() || null,
          price,
          imageUrl: finalImageUrl,
        });
        await refreshMenu();
        showMessage("Item actualizado.", "success");
        setItemForm(emptyItemForm(itemForm.categoryId));
      } else {
        // Caso criação: criar primeiro sem imagem, depois fazer upload
        const created = await adminRequest<{ id: string }>("POST", "/api/admin/menu", {
          type: "item",
          categoryId: itemForm.categoryId,
          name,
          description: itemForm.description.trim() || null,
          price,
          imageUrl: null,
        });

        let finalImageUrl: string | null = null;
        if (itemForm.pendingFile) {
          // Temporariamente actualizar o form com o novo ID para o upload funcionar
          setItemForm((prev) => ({ ...prev, editingId: created.id }));
          const uploaded = await uploadPendingFile(created.id);
          finalImageUrl = uploaded;
          // Se o upload falhar, o item já foi criado (sem imagem) — não bloquear
        }

        if (finalImageUrl) {
          // A rota /api/upload já guardou o URL — apenas actualizamos o estado local
          await refreshMenu();
          showMessage("Item adicionado ao menu com fotografia.", "success");
        } else {
          await refreshMenu();
          showMessage("Item adicionado ao menu.", "success");
        }

        setItemForm(emptyItemForm(itemForm.categoryId));
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível guardar o item.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  function beginEditingItem(category: AdminCategory, item: MenuItem) {
    const existingUrl = imageSource(item.image);
    setItemForm({
      categoryId: category.id,
      name: item.name,
      description: item.description ?? "",
      price: String(item.price ?? 0),
      imageUrl: existingUrl,
      pendingFile: null,
      previewUrl: existingUrl,
      editingId: item.id,
    });
    setUploadState("idle");
  }

  // ─── reordenação ─────────────────────────────────────────────────────────

  async function moveCategory(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= menu.length) return;
    const currentCategory = menu[index];
    const targetCategory = menu[targetIndex];
    if (!currentCategory || !targetCategory) return;

    setIsLoading(true);
    setMessage(null);
    try {
      await adminRequest("PATCH", "/api/admin/menu", { type: "category", id: currentCategory.id, sortOrder: targetIndex });
      await adminRequest("PATCH", "/api/admin/menu", { type: "category", id: targetCategory.id, sortOrder: index });
      await refreshMenu();
      showMessage(`Ordem da categoria "${currentCategory.name}" actualizada.`, "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível reordenar categorias.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  async function moveItem(category: AdminCategory, itemIndex: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? itemIndex - 1 : itemIndex + 1;
    if (targetIndex < 0 || targetIndex >= category.items.length) return;
    const currentItem = category.items[itemIndex];
    const targetItem = category.items[targetIndex];
    if (!currentItem || !targetItem) return;

    setIsLoading(true);
    setMessage(null);
    try {
      await adminRequest("PATCH", "/api/admin/menu", { type: "item", id: currentItem.id, sortOrder: targetIndex });
      await adminRequest("PATCH", "/api/admin/menu", { type: "item", id: targetItem.id, sortOrder: itemIndex });
      await refreshMenu();
      showMessage(`Ordem do item "${currentItem.name}" actualizada.`, "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível reordenar itens.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  // ─── estados de carregamento / sessão ─────────────────────────────────────

  if (isCheckingSession) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-10">
        <p className="text-sm text-muted-foreground">A verificar sessão…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-10">
        <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">Administração</p>
          <h1 className="mt-3 font-display text-4xl text-cream">Login</h1>
          <p className="mt-2 text-sm text-muted-foreground">Entre com as credenciais do painel para gerir o menu.</p>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={loginData.email} onChange={(e) => setLoginData((p) => ({ ...p, email: e.target.value }))} autoComplete="username" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={loginData.password} onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))} autoComplete="current-password" required />
            </div>
            {message && (
              <p className={`text-sm ${message.type === "error" ? "text-red-400" : "text-cream"}`}>{message.text}</p>
            )}
            <Button type="submit" className="w-full bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90" disabled={isLoading}>
              {isLoading ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ─── painel principal ──────────────────────────────────────────────────────

  const previewSrc = itemForm.previewUrl || itemForm.imageUrl;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Cabeçalho */}
      <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Painel administrativo</p>
          <h1 className="font-display text-4xl text-cream">Menu Villa Sage</h1>
        </div>
        <div className="flex gap-3">
          <a href="/" className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm text-foreground transition hover:border-gold hover:text-gold">Ver menu público</a>
          <Button variant="outline" onClick={handleLogout} className="border-border text-foreground hover:border-gold hover:text-gold">Sair</Button>
        </div>
      </div>

      {/* Mensagem de estado */}
      {message && (
        <div
          role="status"
          className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            message.type === "error"
              ? "border-red-500/30 bg-red-500/5 text-red-400"
              : message.type === "success"
                ? "border-green-500/30 bg-green-500/5 text-green-400"
                : "border-gold/30 bg-gold/5 text-cream"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.4fr]">
        <div className="space-y-6">

          {/* Formulário de categoria */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-3xl text-cream">{editingCategoryId ? "Editar categoria" : "Nova categoria"}</h2>
            <form onSubmit={handleSaveCategory} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Nome</Label>
                <Input id="category-name" value={categoryForm.name} onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex.: Sobremesas" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-group">Grupo</Label>
                <select id="category-group" value={categoryForm.group} onChange={(e) => setCategoryForm((p) => ({ ...p, group: e.target.value as Category["group"] }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                  <option value="Comida">Comida</option>
                  <option value="Bebidas">Bebidas</option>
                </select>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full bg-gold text-primary-foreground hover:bg-gold/90">
                {isLoading ? "A guardar…" : editingCategoryId ? "Guardar categoria" : "Adicionar categoria"}
              </Button>
              {editingCategoryId && (
                <Button type="button" variant="outline" className="w-full" onClick={() => { setEditingCategoryId(null); setCategoryForm({ name: "", group: "Comida" }); }}>
                  Cancelar edição
                </Button>
              )}
            </form>
          </section>

          {/* Formulário de item */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-3xl text-cream">{itemForm.editingId ? "Editar item" : "Novo item"}</h2>
            <form onSubmit={handleSaveItem} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="item-category">Categoria</Label>
                <select id="item-category" value={itemForm.categoryId} onChange={(e) => setItemForm((p) => ({ ...p, categoryId: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold" required>
                  {menu.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-name">Nome</Label>
                <Input id="item-name" value={itemForm.name} onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-price">Preço (Kz)</Label>
                <Input id="item-price" type="number" min="0" step="1" value={itemForm.price} onChange={(e) => setItemForm((p) => ({ ...p, price: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-description">Descrição</Label>
                <Textarea id="item-description" value={itemForm.description} onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))} />
              </div>

              {/* Campo de fotografia */}
              <div className="space-y-2">
                <Label htmlFor="item-photo">
                  Fotografia
                  <span className="ml-1 text-xs text-muted-foreground">(JPEG, PNG, WebP, GIF, AVIF · máx. 10 MB)</span>
                </Label>

                {/* Pré-visualização */}
                {previewSrc && (
                  <div className="relative">
                    <img
                      src={previewSrc}
                      alt="Pré-visualização"
                      className="h-36 w-full rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-xs text-foreground hover:bg-red-500 hover:text-white"
                      title="Remover pré-visualização"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Input de ficheiro */}
                <Input
                  ref={fileInputRef}
                  id="item-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />

                {/* Estados do upload */}
                {uploadState === "uploading" && (
                  <p className="flex items-center gap-2 text-xs text-gold">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border border-gold border-t-transparent" />
                    A processar e carregar imagem…
                  </p>
                )}
                {uploadState === "success" && (
                  <p className="text-xs text-green-400">✓ Imagem carregada com sucesso.</p>
                )}
                {uploadState === "error" && (
                  <p className="text-xs text-red-400">✕ Falha no upload. Tente novamente.</p>
                )}

                {/* Botão para remover imagem existente */}
                {itemForm.imageUrl && itemForm.editingId && (
                  <button
                    type="button"
                    onClick={() => void removeExistingImage(itemForm.editingId!)}
                    disabled={isLoading}
                    className="text-xs text-red-400 underline hover:text-red-300 disabled:opacity-50"
                  >
                    Remover fotografia guardada
                  </button>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading || uploadState === "uploading" || !menu.length}
                className="w-full bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
              >
                {isLoading || uploadState === "uploading"
                  ? "A guardar…"
                  : itemForm.editingId
                    ? "Guardar item"
                    : "Adicionar item ao menu"}
              </Button>
              {itemForm.editingId && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    clearImage();
                    setItemForm(emptyItemForm(itemForm.categoryId));
                    setUploadState("idle");
                  }}
                >
                  Cancelar edição
                </Button>
              )}
            </form>
          </section>
        </div>

        {/* Resumo do menu */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-3xl text-cream">Resumo do menu</h2>
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{menu.length} categorias</span>
          </div>
          <div className="space-y-4">
            {menu.map((category, categoryIndex) => (
              <div key={category.id} className="rounded-xl border border-border bg-background/50 p-4">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gold">{category.group}</p>
                    <h3 className="font-display text-2xl text-cream">{category.name}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button type="button" disabled={isLoading || categoryIndex === 0} onClick={() => void moveCategory(categoryIndex, "up")} title="Mover categoria para cima" className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground transition hover:border-gold hover:text-gold disabled:opacity-40">↑</button>
                    <button type="button" disabled={isLoading || categoryIndex === menu.length - 1} onClick={() => void moveCategory(categoryIndex, "down")} title="Mover categoria para baixo" className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground transition hover:border-gold hover:text-gold disabled:opacity-40">↓</button>
                    <button type="button" disabled={isLoading} onClick={() => void saveChange("PATCH", { type: "category", id: category.id, isActive: !category.is_active }, category.is_active ? "Categoria desativada." : "Categoria ativada.")} className="rounded-full border border-border px-2.5 py-1 text-xs">{category.is_active ? "Ativo" : "Inativo"}</button>
                    <button type="button" onClick={() => { setEditingCategoryId(category.id); setCategoryForm({ name: category.name, group: category.group }); }} className="rounded-full border border-border px-2.5 py-1 text-xs">Editar</button>
                    <button type="button" disabled={isLoading} onClick={() => { if (window.confirm(`Eliminar a categoria "${category.name}" e todos os seus itens?`)) void saveChange("DELETE", { type: "category", id: category.id }, "Categoria eliminada."); }} className="rounded-full border border-red-500/40 px-2.5 py-1 text-xs text-red-400">Eliminar</button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {category.items.length === 0
                    ? <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">Nenhum item nesta categoria ainda.</p>
                    : category.items.map((item, itemIndex) => (
                      <div key={item.id} className="overflow-hidden rounded-lg border border-border bg-card">
                        {item.image && <img src={imageSource(item.image)} alt={item.name} className="h-28 w-full object-cover" />}
                        <div className="space-y-2 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-display text-xl text-cream">{item.name}</h4>
                            <span className="text-sm font-medium text-gold">{formatPrice(Number(item.price ?? 0))}</span>
                          </div>
                          {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                          <div className="flex flex-wrap items-center gap-1.5 pt-2">
                            <button type="button" disabled={isLoading || itemIndex === 0} onClick={() => void moveItem(category, itemIndex, "up")} title="Mover item para cima" className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition hover:border-gold hover:text-gold disabled:opacity-40">↑</button>
                            <button type="button" disabled={isLoading || itemIndex === category.items.length - 1} onClick={() => void moveItem(category, itemIndex, "down")} title="Mover item para baixo" className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition hover:border-gold hover:text-gold disabled:opacity-40">↓</button>
                            <button type="button" disabled={isLoading} onClick={() => void saveChange("PATCH", { type: "item", id: item.id, isActive: !item.is_active }, item.is_active ? "Item desativado." : "Item ativado.")} className="rounded-full border border-border px-2.5 py-1 text-[11px]">{item.is_active ? "Ativo" : "Inativo"}</button>
                            <button type="button" onClick={() => beginEditingItem(category, item)} className="rounded-full border border-border px-2.5 py-1 text-[11px]">Editar</button>
                            <button type="button" disabled={isLoading} onClick={() => { if (window.confirm(`Eliminar "${item.name}"?`)) void saveChange("DELETE", { type: "item", id: item.id }, "Item eliminado."); }} className="rounded-full border border-red-500/40 px-2.5 py-1 text-[11px] text-red-400">Eliminar</button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
