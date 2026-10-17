"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { StaticImageData } from "next/image";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Coffee,
  Copy,
  Download,
  ExternalLink,
  Filter,
  FolderTree,
  ImageIcon,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Category, MenuItem } from "@/data/menu";

type AdminItem = Omit<MenuItem, "image"> & {
  image?: string | StaticImageData;
  is_active: boolean;
  sort_order: number;
};

type AdminCategory = Omit<Category, "items"> & {
  is_active: boolean;
  sort_order: number;
  items: AdminItem[];
};

type AdminMenuRow = Omit<AdminCategory, "items"> & {
  items: (Omit<AdminItem, "image"> & { image: string | null })[];
};

type ItemForm = {
  categoryId: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  pendingFile: File | null;
  previewUrl: string;
  editingId: string | null;
};

type UploadState = "idle" | "uploading" | "success" | "error";

const MAX_CLIENT_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

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

  const [activeTab, setActiveTab] = useState<"items" | "categories" | "qr">("items");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<"ALL" | "Comida" | "Bebidas">("ALL");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");

  // QR Code State
  const [qrCustomUrl, setQrCustomUrl] = useState<string>("");
  const [qrPreview, setQrPreview] = useState<string>("");
  const [copiedQrUrl, setCopiedQrUrl] = useState(false);

  // Paginação
  const ITEMS_PER_PAGE = 15;
  const CATEGORIES_PER_PAGE = 20;
  const [itemsPage, setItemsPage] = useState(1);
  const [categoriesPage, setCategoriesPage] = useState(1);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState<{ text: string; type: "info" | "error" | "success" } | null>(null);
  const [session, setSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Modais
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Formulários
  const [categoryForm, setCategoryForm] = useState<{ name: string; group: Category["group"] }>({
    name: "",
    group: "Comida",
  });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm(initialMenu[0]?.id ?? ""));
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileInputId = useId();

  useEffect(() => {
    return () => {
      if (itemForm.previewUrl) URL.revokeObjectURL(itemForm.previewUrl);
    };
  }, [itemForm.previewUrl]);

  function showMessage(text: string, type: "info" | "error" | "success" = "info") {
    setMessage({ text, type });
    if (type === "success") {
      setTimeout(() => setMessage(null), 4000);
    }
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

  // Verificação inicial de sessão (silenciosa para nunca gerar erro na Vercel)
  useEffect(() => {
    let active = true;
    adminRequest<{ authenticated: boolean }>("GET", "/api/admin/session")
      .then((status) => {
        if (!active) return;
        setSession(status.authenticated);
        if (status.authenticated) {
          void refreshMenu().catch((error: unknown) => {
            if (active) {
              showMessage(error instanceof Error ? error.message : "Não foi possível carregar o menu.", "error");
            }
          });
        }
      })
      .catch(() => {
        // Silencioso na inicialização
      })
      .finally(() => {
        if (active) setIsCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Detetar aba da URL e inicializar URL do QR Code
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "qr" || tabParam === "categories" || tabParam === "items") {
        setActiveTab(tabParam);
      }
      setQrCustomUrl(window.location.origin + "/");
    }
  }, []);

  const effectiveQrUrl = qrCustomUrl || (typeof window !== "undefined" ? window.location.origin + "/" : "");

  useEffect(() => {
    if (!effectiveQrUrl) return;
    QRCode.toDataURL(effectiveQrUrl, {
      width: 2048,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#0f2a20", light: "#ffffff" },
    })
      .then(setQrPreview)
      .catch(() => setQrPreview(""));
  }, [effectiveQrUrl]);

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
      showMessage(error instanceof Error ? error.message : "Credenciais inválidas.", "error");
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

  // Abertura de modais
  function openNewItemModal() {
    clearImage();
    setItemForm(emptyItemForm(menu[0]?.id ?? ""));
    setIsItemModalOpen(true);
  }

  function openEditItemModal(category: AdminCategory, item: MenuItem) {
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
    setIsItemModalOpen(true);
  }

  function openNewCategoryModal() {
    setCategoryForm({ name: "", group: "Comida" });
    setEditingCategoryId(null);
    setIsCategoryModalOpen(true);
  }

  function openEditCategoryModal(category: AdminCategory) {
    setCategoryForm({ name: category.name, group: category.group });
    setEditingCategoryId(category.id);
    setIsCategoryModalOpen(true);
  }

  // Categorias
  async function handleSaveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryForm.name.trim();
    if (!name) {
      showMessage("Informe o nome da categoria.", "error");
      return;
    }

    const editingId = editingCategoryId;
    const saved = await saveChange(
      editingId ? "PATCH" : "POST",
      editingId
        ? { type: "category", id: editingId, name, group: categoryForm.group }
        : { type: "category", name, group: categoryForm.group },
      editingId ? "Categoria actualizada com sucesso." : "Categoria adicionada com sucesso.",
    );

    if (saved) {
      setIsCategoryModalOpen(false);
      setCategoryForm({ name: "", group: "Comida" });
      setEditingCategoryId(null);
    }
  }

  // Upload
  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

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

    if (itemForm.previewUrl) URL.revokeObjectURL(itemForm.previewUrl);

    const previewUrl = URL.createObjectURL(file);
    setItemForm((prev) => ({ ...prev, pendingFile: file, previewUrl }));
    setUploadState("idle");
    setMessage(null);
  }

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
      showMessage(error instanceof Error ? error.message : "Falha no envio da fotografia.", "error");
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

  // Salvar Item
  async function handleSaveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = itemForm.name.trim();
    const price = Number(itemForm.price);
    if (!itemForm.categoryId) {
      showMessage("Selecione uma categoria.", "error");
      return;
    }
    if (!name) {
      showMessage("Informe o nome do item.", "error");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      showMessage("Informe um preço válido.", "error");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const editingId = itemForm.editingId;

      if (editingId) {
        let finalImageUrl = itemForm.imageUrl || null;

        if (itemForm.pendingFile) {
          const uploaded = await uploadPendingFile(editingId);
          if (uploaded === null && itemForm.pendingFile) {
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
        showMessage("Item actualizado com sucesso.", "success");
        setIsItemModalOpen(false);
        setItemForm(emptyItemForm(itemForm.categoryId));
      } else {
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
          setItemForm((prev) => ({ ...prev, editingId: created.id }));
          finalImageUrl = await uploadPendingFile(created.id);
        }

        await refreshMenu();
        showMessage(
          finalImageUrl
            ? "Item adicionado com fotografia ao menu."
            : "Item adicionado ao menu.",
          "success",
        );
        setIsItemModalOpen(false);
        setItemForm(emptyItemForm(itemForm.categoryId));
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível guardar o item.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  // Reordenação
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
      showMessage(`Ordem de "${currentCategory.name}" actualizada.`, "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Erro ao reordenar.", "error");
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
      showMessage(`Ordem de "${currentItem.name}" actualizada.`, "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Erro ao reordenar.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  // Lista plana de itens filtrada para a tabela de produtos
  const allFilteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const result: { item: AdminItem; category: AdminCategory; indexInCategory: number }[] = [];

    menu.forEach((category) => {
      if (selectedGroupFilter !== "ALL" && category.group !== selectedGroupFilter) return;
      if (selectedCategoryFilter !== "ALL" && category.id !== selectedCategoryFilter) return;

      category.items.forEach((item, indexInCategory) => {
        if (
          term &&
          !item.name.toLowerCase().includes(term) &&
          !(item.description && item.description.toLowerCase().includes(term))
        ) {
          return;
        }

        result.push({ item, category, indexInCategory });
      });
    });

    return result;
  }, [menu, searchTerm, selectedGroupFilter, selectedCategoryFilter]);

  // Reset página ao alterar filtros
  useEffect(() => { setItemsPage(1); }, [searchTerm, selectedGroupFilter, selectedCategoryFilter, activeTab]);
  useEffect(() => { setCategoriesPage(1); }, [activeTab]);

  // Contadores
  const totalItemsCount = useMemo(
    () => menu.reduce((acc, cat) => acc + cat.items.length, 0),
    [menu],
  );
  const activeItemsCount = useMemo(
    () => menu.reduce((acc, cat) => acc + cat.items.filter((i) => i.is_active).length, 0),
    [menu],
  );

  // Paginação de itens
  const itemsTotalPages = Math.max(1, Math.ceil(allFilteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(
    () => allFilteredItems.slice((itemsPage - 1) * ITEMS_PER_PAGE, itemsPage * ITEMS_PER_PAGE),
    [allFilteredItems, itemsPage],
  );

  // Paginação de categorias
  const categoriesTotalPages = Math.max(1, Math.ceil(menu.length / CATEGORIES_PER_PAGE));
  const paginatedCategories = useMemo(
    () => menu.slice((categoriesPage - 1) * CATEGORIES_PER_PAGE, categoriesPage * CATEGORIES_PER_PAGE),
    [menu, categoriesPage],
  );

  // Estados de sessão
  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">A carregar o painel administrativo…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card/90 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="text-center">
            <Link href="/" className="inline-block transition hover:opacity-90">
              <Image
                src="/logo.png"
                alt="Villa Sage"
                width={80}
                height={56}
                priority
                className="mx-auto h-14 w-20 rounded-md bg-white object-contain p-1 shadow-md sm:h-16 sm:w-24"
              />
            </Link>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-gold">
              <ShieldCheck className="h-3.5 w-3.5" />
              Painel Administrativo
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold text-cream">Login</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Aceda com as credenciais do restaurante para gerir o cardápio.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData((p) => ({ ...p, email: e.target.value }))}
                autoComplete="username"
                placeholder="admin@villasage.com"
                required
                className="border-border bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Senha</Label>
              <Input
                id="admin-password"
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))}
                autoComplete="current-password"
                placeholder="••••••••••••"
                required
                className="border-border bg-background/50"
              />
            </div>

            {message && (
              <p className={`text-sm ${message.type === "error" ? "text-red-400" : "text-green-400"}`}>
                {message.text}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-gold font-medium text-black hover:bg-gold/90"
              disabled={isLoading}
            >
              {isLoading ? "A entrar…" : "Entrar no Painel"}
            </Button>
          </form>

          <div className="mt-6 border-t border-border/60 pt-4 text-center">
            <Link href="/" className="text-xs text-muted-foreground transition hover:text-gold">
              ← Voltar ao menu público
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const previewSrc = itemForm.previewUrl || itemForm.imageUrl;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* ─── SIDEBAR FIXA PARA DESKTOP ─── */}
      <aside className="hidden w-72 shrink-0 border-r border-border bg-card/60 backdrop-blur-2xl lg:flex lg:flex-col">
        {/* Topo da Sidebar: Logo & Identidade */}
        <div className="flex h-20 items-center gap-3.5 border-b border-border/80 px-6">
          <Image
            src="/logo.png"
            alt="Villa Sage"
            width={48}
            height={36}
            priority
            className="h-10 w-14 rounded bg-white object-contain p-1 shadow-sm"
          />
          <div>
            <h2 className="font-display text-lg font-semibold tracking-wide text-cream">Villa Sage</h2>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              Painel Gestor
            </div>
          </div>
        </div>

        {/* Navegação da Sidebar */}
        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
          {/* Seção Principal */}
          <div>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              Gestão
            </p>
            <nav className="mt-2 space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab("items")}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  activeTab === "items"
                    ? "bg-gold text-black shadow-md shadow-gold/20"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-3">
                  <UtensilsCrossed className="h-4 w-4" />
                  Produtos & Bebidas
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    activeTab === "items" ? "bg-black/20 text-black" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {totalItemsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("categories")}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  activeTab === "categories"
                    ? "bg-gold text-black shadow-md shadow-gold/20"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-3">
                  <FolderTree className="h-4 w-4" />
                  Categorias
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    activeTab === "categories" ? "bg-black/20 text-black" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {menu.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("qr")}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  activeTab === "qr"
                    ? "bg-gold text-black shadow-md shadow-gold/20"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-3">
                  <QrCode className="h-4 w-4" />
                  QR Code do Menu
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    activeTab === "qr" ? "bg-black/20 text-black" : "bg-gold/20 text-gold"
                  }`}
                >
                  Mesas
                </span>
              </button>
            </nav>
          </div>

          {/* Ações Rápidas */}
          <div>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              Ações Rápidas
            </p>
            <div className="mt-2 space-y-2">
              <Button
                onClick={openNewItemModal}
                className="w-full justify-start gap-2.5 bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Adicionar Produto
              </Button>
              <Button
                variant="outline"
                onClick={openNewCategoryModal}
                className="w-full justify-start gap-2.5 border-border bg-background/50 hover:border-gold hover:text-gold"
              >
                <Plus className="h-4 w-4" />
                Nova Categoria
              </Button>
            </div>
          </div>

          {/* Filtros rápidos por Grupo */}
          <div>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              Grupos
            </p>
            <div className="mt-2 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedGroupFilter("ALL");
                  setActiveTab("items");
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition ${
                  selectedGroupFilter === "ALL" && activeTab === "items"
                    ? "border border-gold/30 bg-gold/10 font-semibold text-gold"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5" />
                  Todos os Grupos
                </span>
                <span>{totalItemsCount}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedGroupFilter("Comida");
                  setActiveTab("items");
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition ${
                  selectedGroupFilter === "Comida" && activeTab === "items"
                    ? "border border-gold/30 bg-gold/10 font-semibold text-gold"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <UtensilsCrossed className="h-3.5 w-3.5 text-gold" />
                  Pratos & Comidas
                </span>
                <span>
                  {menu
                    .filter((c) => c.group === "Comida")
                    .reduce((acc, c) => acc + c.items.length, 0)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedGroupFilter("Bebidas");
                  setActiveTab("items");
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition ${
                  selectedGroupFilter === "Bebidas" && activeTab === "items"
                    ? "border border-gold/30 bg-gold/10 font-semibold text-gold"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Coffee className="h-3.5 w-3.5 text-amber-400" />
                  Bebidas & Bar
                </span>
                <span>
                  {menu
                    .filter((c) => c.group === "Bebidas")
                    .reduce((acc, c) => acc + c.items.length, 0)}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé da Sidebar: Ver Menu Público e Sair */}
        <div className="border-t border-border/80 p-4 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex w-full items-center justify-between rounded-xl border border-border bg-background/40 px-3.5 py-2.5 text-xs text-foreground transition hover:border-gold hover:text-gold"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              Ver Menu Público
            </span>
            <span className="text-[10px] text-muted-foreground">Abrir ↗</span>
          </Link>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-2.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Terminar Sessão
          </Button>
        </div>
      </aside>

      {/* ─── SIDEBAR MOBILE (DRAWER OVERLAY) ─── */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-50 flex w-72 flex-col bg-card border-r border-border p-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="Villa Sage"
                  width={40}
                  height={30}
                  className="h-8 w-12 rounded bg-white object-contain p-1"
                />
                <span className="font-display font-semibold text-cream">Villa Sage</span>
              </div>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex-1 space-y-3">
              <Button
                variant={activeTab === "items" ? "default" : "outline"}
                onClick={() => {
                  setActiveTab("items");
                  setMobileSidebarOpen(false);
                }}
                className={`w-full justify-start gap-3 ${activeTab === "items" ? "bg-gold text-black" : ""}`}
              >
                <UtensilsCrossed className="h-4 w-4" />
                Produtos ({totalItemsCount})
              </Button>
              <Button
                variant={activeTab === "categories" ? "default" : "outline"}
                onClick={() => {
                  setActiveTab("categories");
                  setMobileSidebarOpen(false);
                }}
                className={`w-full justify-start gap-3 ${activeTab === "categories" ? "bg-gold text-black" : ""}`}
              >
                <FolderTree className="h-4 w-4" />
                Categorias ({menu.length})
              </Button>
              <Button
                variant={activeTab === "qr" ? "default" : "outline"}
                onClick={() => {
                  setActiveTab("qr");
                  setMobileSidebarOpen(false);
                }}
                className={`w-full justify-start gap-3 ${activeTab === "qr" ? "bg-gold text-black" : ""}`}
              >
                <QrCode className="h-4 w-4" />
                QR Code do Menu
              </Button>
              <div className="pt-4 border-t border-border space-y-2">
                <Button
                  onClick={() => {
                    openNewItemModal();
                    setMobileSidebarOpen(false);
                  }}
                  className="w-full justify-start gap-2 bg-whatsapp text-whatsapp-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Novo Produto
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    openNewCategoryModal();
                    setMobileSidebarOpen(false);
                  }}
                  className="w-full justify-start gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Nova Categoria
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <Link
                href="/"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-gold"
              >
                <ExternalLink className="h-4 w-4" />
                Ver Menu Público
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 text-xs text-red-400"
              >
                <LogOut className="h-4 w-4" />
                Terminar Sessão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONTEÚDO PRINCIPAL (COM AS TABELAS) ─── */}
      <main className="flex-1 overflow-x-hidden">
        {/* Barra Superior / Header fixo com sombra profunda */}
        <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-border/80 bg-background/90 px-4 sm:px-8 backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.35)] transition-shadow">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-border text-foreground hover:border-gold lg:hidden"
              aria-label="Abrir menu lateral"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-cream sm:text-3xl">
                {activeTab === "items" ? "Tabela de Produtos" : "Tabela de Categorias"}
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                {activeTab === "items"
                  ? "Gerir todos os pratos, bebidas, preços e fotografias em tabela detalhada."
                  : "Organizar e reordenar as secções do cardápio."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={refreshMenu}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="gap-2 border-border text-xs hover:border-gold hover:text-gold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>

            {activeTab === "items" ? (
              <Button
                onClick={openNewItemModal}
                size="sm"
                className="gap-1.5 bg-gold font-medium text-black hover:bg-gold/90 text-xs shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Produto</span>
              </Button>
            ) : (
              <Button
                onClick={openNewCategoryModal}
                size="sm"
                className="gap-1.5 bg-gold font-medium text-black hover:bg-gold/90 text-xs shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Categoria</span>
              </Button>
            )}
          </div>
        </header>

        {/* Feedback de mensagens */}
        {message && (
          <div className="px-4 pt-4 sm:px-8">
            <div
              role="status"
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                message.type === "error"
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : message.type === "success"
                    ? "border-green-500/30 bg-green-500/10 text-green-300"
                    : "border-gold/30 bg-gold/10 text-cream"
              }`}
            >
              <span>{message.text}</span>
              <button
                type="button"
                onClick={() => setMessage(null)}
                className="text-xs opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Corpo principal */}
        <div className="p-4 sm:p-8 space-y-6">
          {/* Cartões de Métricas Resumo */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Produtos</p>
              <p className="mt-1 font-display text-2xl font-bold text-cream sm:text-3xl">{totalItemsCount}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Itens Ativos</p>
              <p className="mt-1 font-display text-2xl font-bold text-green-400 sm:text-3xl">{activeItemsCount}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Categorias</p>
              <p className="mt-1 font-display text-2xl font-bold text-gold sm:text-3xl">{menu.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Com Fotografia</p>
              <p className="mt-1 font-display text-2xl font-bold text-cyan-400 sm:text-3xl">
                {menu.reduce((acc, c) => acc + c.items.filter((i) => Boolean(i.image)).length, 0)}
              </p>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* ABA 1: TABELA DE PRODUTOS / ITENS DO CARDÁPIO                    */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === "items" && (
            <div className="rounded-2xl border border-border bg-card/80 shadow-md backdrop-blur-xl">
              {/* Barra de Filtros e Pesquisa */}
              <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por nome ou descrição…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 border-border bg-background/50 pl-9 text-xs"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Filtro por Categoria */}
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-gold"
                  >
                    <option value="ALL">Todas as Categorias ({totalItemsCount})</option>
                    {menu.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.items.length})
                      </option>
                    ))}
                  </select>

                  {/* Filtro por Grupo */}
                  <div className="inline-flex rounded-lg border border-border bg-background p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedGroupFilter("ALL")}
                      className={`rounded-md px-2.5 py-1 transition ${
                        selectedGroupFilter === "ALL" ? "bg-gold text-black font-medium" : "text-muted-foreground"
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGroupFilter("Comida")}
                      className={`rounded-md px-2.5 py-1 transition ${
                        selectedGroupFilter === "Comida" ? "bg-gold text-black font-medium" : "text-muted-foreground"
                      }`}
                    >
                      Comida
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGroupFilter("Bebidas")}
                      className={`rounded-md px-2.5 py-1 transition ${
                        selectedGroupFilter === "Bebidas" ? "bg-gold text-black font-medium" : "text-muted-foreground"
                      }`}
                    >
                      Bebidas
                    </button>
                  </div>
                </div>
              </div>

              {/* TABELA DE PRODUTOS */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-background/40">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="w-16 text-center text-xs">Foto</TableHead>
                      <TableHead className="min-w-[200px] text-xs">Produto & Descrição</TableHead>
                      <TableHead className="text-xs">Categoria</TableHead>
                      <TableHead className="text-xs">Grupo</TableHead>
                      <TableHead className="text-right text-xs">Preço</TableHead>
                      <TableHead className="text-center text-xs">Estado</TableHead>
                      <TableHead className="text-center text-xs">Ordem</TableHead>
                      <TableHead className="text-right text-xs">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allFilteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-40 text-center text-sm text-muted-foreground">
                          {searchTerm || selectedCategoryFilter !== "ALL" || selectedGroupFilter !== "ALL"
                            ? "Nenhum produto corresponde aos filtros aplicados."
                            : "Nenhum produto cadastrado ainda. Clique em 'Novo Produto' para começar."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedItems.map(({ item, category, indexInCategory }, rowIdx) => {
                        const imgSrc = imageSource(item.image);
                        return (
                          <TableRow
                            key={item.id}
                            className="border-border hover:bg-muted/40 transition-colors"
                            style={{
                              animation: `fadeSlideIn 0.25s ease both`,
                              animationDelay: `${rowIdx * 25}ms`,
                            }}
                          >
                            {/* Miniatura */}
                            <TableCell className="text-center py-2.5">
                              {imgSrc ? (
                                <img
                                  src={imgSrc}
                                  alt={item.name}
                                  className="mx-auto h-11 w-11 rounded-lg object-cover border border-border shadow-sm"
                                />
                              ) : (
                                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-border bg-background/50 text-muted-foreground">
                                  <ImageIcon className="h-4 w-4 opacity-50" />
                                </div>
                              )}
                            </TableCell>

                            {/* Nome & Descrição */}
                            <TableCell className="py-2.5">
                              <p className="font-medium text-cream text-sm">{item.name}</p>
                              {item.description && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground max-w-sm">
                                  {item.description}
                                </p>
                              )}
                            </TableCell>

                            {/* Categoria */}
                            <TableCell className="py-2.5 text-xs text-foreground">
                              <Badge variant="outline" className="border-border/80 bg-background/40 font-normal">
                                {category.name}
                              </Badge>
                            </TableCell>

                            {/* Grupo */}
                            <TableCell className="py-2.5 text-xs">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  category.group === "Comida"
                                    ? "bg-gold/10 text-gold border border-gold/30"
                                    : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                                }`}
                              >
                                {category.group === "Comida" ? (
                                  <UtensilsCrossed className="h-2.5 w-2.5" />
                                ) : (
                                  <Coffee className="h-2.5 w-2.5" />
                                )}
                                {category.group}
                              </span>
                            </TableCell>

                            {/* Preço */}
                            <TableCell className="py-2.5 text-right font-medium text-gold text-sm whitespace-nowrap">
                              {formatPrice(Number(item.price ?? 0))}
                            </TableCell>

                            {/* Estado Ativo/Inativo */}
                            <TableCell className="py-2.5 text-center">
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() =>
                                  void saveChange(
                                    "PATCH",
                                    { type: "item", id: item.id, isActive: !item.is_active },
                                    item.is_active ? "Item desativado." : "Item ativado.",
                                  )
                                }
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                                  item.is_active
                                    ? "bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20"
                                    : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    item.is_active ? "bg-green-400" : "bg-muted-foreground"
                                  }`}
                                />
                                {item.is_active ? "Ativo" : "Inativo"}
                              </button>
                            </TableCell>

                            {/* Reordenação */}
                            <TableCell className="py-2.5 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={isLoading || indexInCategory === 0}
                                  onClick={() => void moveItem(category, indexInCategory, "up")}
                                  className="grid h-6 w-6 place-items-center rounded-md border border-border text-muted-foreground hover:border-gold hover:text-gold disabled:opacity-30"
                                  title="Mover para cima"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isLoading || indexInCategory === category.items.length - 1}
                                  onClick={() => void moveItem(category, indexInCategory, "down")}
                                  className="grid h-6 w-6 place-items-center rounded-md border border-border text-muted-foreground hover:border-gold hover:text-gold disabled:opacity-30"
                                  title="Mover para baixo"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                              </div>
                            </TableCell>

                            {/* Ações */}
                            <TableCell className="py-2.5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditItemModal(category, item)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-gold"
                                  title="Editar Produto"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isLoading}
                                  onClick={() => {
                                    if (window.confirm(`Eliminar "${item.name}" definitivamente?`)) {
                                      void saveChange("DELETE", { type: "item", id: item.id }, "Item eliminado.");
                                    }
                                  }}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                                  title="Eliminar Produto"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação de itens */}
              <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-muted-foreground">
                  A mostrar{" "}
                  <strong className="text-foreground">
                    {Math.min((itemsPage - 1) * ITEMS_PER_PAGE + 1, allFilteredItems.length)}–
                    {Math.min(itemsPage * ITEMS_PER_PAGE, allFilteredItems.length)}
                  </strong>{" "}
                  de <strong className="text-foreground">{allFilteredItems.length}</strong> produtos
                </span>
                {itemsTotalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setItemsPage(1)}
                      disabled={itemsPage === 1}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-border text-xs text-muted-foreground transition hover:border-gold hover:text-gold disabled:opacity-30"
                      title="Primeira página"
                    >
                      «
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemsPage((p) => Math.max(1, p - 1))}
                      disabled={itemsPage === 1}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-border text-xs text-muted-foreground transition hover:border-gold hover:text-gold disabled:opacity-30"
                      title="Página anterior"
                    >
                      ‹
                    </button>
                    {Array.from({ length: itemsTotalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === itemsTotalPages || Math.abs(p - itemsPage) <= 1)
                      .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                        if (idx > 0 && (arr[idx - 1] as number) !== p - 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === "..." ? (
                          <span key={`dots-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setItemsPage(p as number)}
                            className={`grid h-7 min-w-[1.75rem] place-items-center rounded-lg border px-2 text-xs font-medium transition ${
                              itemsPage === p
                                ? "border-gold bg-gold text-black"
                                : "border-border text-muted-foreground hover:border-gold hover:text-gold"
                            }`}
                          >
                            {p}
                          </button>
                        ),
                      )}
                    <button
                      type="button"
                      onClick={() => setItemsPage((p) => Math.min(itemsTotalPages, p + 1))}
                      disabled={itemsPage === itemsTotalPages}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-border text-xs text-muted-foreground transition hover:border-gold hover:text-gold disabled:opacity-30"
                      title="Próxima página"
                    >
                      ›
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemsPage(itemsTotalPages)}
                      disabled={itemsPage === itemsTotalPages}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-border text-xs text-muted-foreground transition hover:border-gold hover:text-gold disabled:opacity-30"
                      title="Última página"
                    >
                      »
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* ABA 2: TABELA DE CATEGORIAS                                      */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === "categories" && (
            <div className="rounded-2xl border border-border bg-card/80 shadow-md backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-border p-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-cream">Gestão de Categorias</h3>
                  <p className="text-xs text-muted-foreground">
                    Ordene e gira as seções exibidas no menu digital público.
                  </p>
                </div>
                <Button
                  onClick={openNewCategoryModal}
                  size="sm"
                  className="gap-1.5 bg-gold font-medium text-black hover:bg-gold/90 text-xs"
                >
                  <Plus className="h-4 w-4" />
                  Nova Categoria
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-background/40">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="w-12 text-center text-xs">#</TableHead>
                      <TableHead className="min-w-[180px] text-xs">Nome da Categoria</TableHead>
                      <TableHead className="text-xs">Grupo</TableHead>
                      <TableHead className="text-center text-xs">Qtd. Produtos</TableHead>
                      <TableHead className="text-center text-xs">Estado</TableHead>
                      <TableHead className="text-center text-xs">Ordem</TableHead>
                      <TableHead className="text-right text-xs">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menu.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                          Nenhuma categoria cadastrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedCategories.map((category, index) => (
                        <TableRow
                          key={category.id}
                          className="border-border hover:bg-muted/40 transition-colors"
                          style={{
                            animation: `fadeSlideIn 0.25s ease both`,
                            animationDelay: `${index * 30}ms`,
                          }}
                        >
                          <TableCell className="text-center font-mono text-xs text-muted-foreground">
                            {(categoriesPage - 1) * CATEGORIES_PER_PAGE + index + 1}
                          </TableCell>

                          <TableCell className="font-medium text-cream text-sm">
                            {category.name}
                          </TableCell>

                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                category.group === "Comida"
                                  ? "bg-gold/10 text-gold border border-gold/30"
                                  : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                              }`}
                            >
                              {category.group}
                            </span>
                          </TableCell>

                          <TableCell className="text-center">
                            <Badge variant="outline" className="border-border bg-background/50 text-xs">
                              {category.items.length} produto(s)
                            </Badge>
                          </TableCell>

                          <TableCell className="text-center">
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() =>
                                void saveChange(
                                  "PATCH",
                                  { type: "category", id: category.id, isActive: !category.is_active },
                                  category.is_active ? "Categoria desativada." : "Categoria ativada.",
                                )
                              }
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                                category.is_active
                                  ? "bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20"
                                  : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  category.is_active ? "bg-green-400" : "bg-muted-foreground"
                                }`}
                              />
                              {category.is_active ? "Ativo" : "Inativo"}
                            </button>
                          </TableCell>

                          <TableCell className="text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isLoading || index === 0}
                                onClick={() => void moveCategory(index, "up")}
                                className="grid h-6 w-6 place-items-center rounded-md border border-border text-muted-foreground hover:border-gold hover:text-gold disabled:opacity-30"
                                title="Mover para cima"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={isLoading || index === menu.length - 1}
                                onClick={() => void moveCategory(index, "down")}
                                className="grid h-6 w-6 place-items-center rounded-md border border-border text-muted-foreground hover:border-gold hover:text-gold disabled:opacity-30"
                                title="Mover para baixo"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                          </TableCell>

                          <TableCell className="text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditCategoryModal(category)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-gold"
                                title="Editar Categoria"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isLoading}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Eliminar a categoria "${category.name}" e TODOS os seus ${category.items.length} produtos?`,
                                    )
                                  ) {
                                    void saveChange("DELETE", { type: "category", id: category.id }, "Categoria eliminada.");
                                  }
                                }}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                                title="Eliminar Categoria"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Paginação de categorias */}
              {categoriesTotalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    Página <strong className="text-foreground">{categoriesPage}</strong> de{" "}
                    <strong className="text-foreground">{categoriesTotalPages}</strong>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCategoriesPage(1)}
                      disabled={categoriesPage === 1}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-border text-xs text-muted-foreground transition hover:border-gold hover:text-gold disabled:opacity-30"
                    >«</button>
                    <button
                      type="button"
                      onClick={() => setCategoriesPage((p) => Math.max(1, p - 1))}
                      disabled={categoriesPage === 1}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-border text-xs text-muted-foreground transition hover:border-gold hover:text-gold disabled:opacity-30"
                    >‹</button>
                    {Array.from({ length: categoriesTotalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCategoriesPage(p)}
                        className={`grid h-7 min-w-[1.75rem] place-items-center rounded-lg border px-2 text-xs font-medium transition ${
                          categoriesPage === p
                            ? "border-gold bg-gold text-black"
                            : "border-border text-muted-foreground hover:border-gold hover:text-gold"
                        }`}
                      >{p}</button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCategoriesPage((p) => Math.min(categoriesTotalPages, p + 1))}
                      disabled={categoriesPage === categoriesTotalPages}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-border text-xs text-muted-foreground transition hover:border-gold hover:text-gold disabled:opacity-30"
                    >›</button>
                    <button
                      type="button"
                      onClick={() => setCategoriesPage(categoriesTotalPages)}
                      disabled={categoriesPage === categoriesTotalPages}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-border text-xs text-muted-foreground transition hover:border-gold hover:text-gold disabled:opacity-30"
                    >»</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* ABA 3: GESTÃO E DOWNLOAD DO QR CODE DO MENU DIGITAL             */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === "qr" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-md backdrop-blur-xl sm:p-8">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-6">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                      <QrCode className="h-3.5 w-3.5" /> Acesso Digital
                    </span>
                    <h2 className="mt-2 font-display text-2xl font-bold text-cream sm:text-3xl">
                      QR Code do Menu Digital
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                      Gere e transfira o QR Code oficial em alta definição (2048 × 2048 px) para impressão nas mesas, balcão e expositores.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
                  {/* Coluna da Esquerda: Configurações & Instruções */}
                  <div className="space-y-6 lg:col-span-7">
                    <div className="space-y-2">
                      <Label htmlFor="qr-url-input" className="text-xs font-medium text-foreground">
                        Endereço URL de Destino do Menu
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="qr-url-input"
                          value={effectiveQrUrl}
                          onChange={(e) => setQrCustomUrl(e.target.value)}
                          placeholder="https://exemplo.com/"
                          className="font-mono text-xs bg-background/50 border-border focus:border-gold"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (effectiveQrUrl && typeof navigator !== "undefined") {
                              void navigator.clipboard.writeText(effectiveQrUrl);
                              setCopiedQrUrl(true);
                              setTimeout(() => setCopiedQrUrl(false), 2500);
                            }
                          }}
                          className="shrink-0 gap-1.5 border-border hover:border-gold hover:text-gold"
                          title="Copiar URL"
                        >
                          {copiedQrUrl ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                          <span className="hidden sm:inline">{copiedQrUrl ? "Copiado" : "Copiar"}</span>
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Por defeito utiliza o domínio atual. Pode inserir qualquer URL se pretender apontar para um domínio personalizado.
                      </p>
                    </div>

                    {/* Aviso caso esteja em domínio de preview/local */}
                    {effectiveQrUrl && /localhost|127\.0\.0\.1|lovableproject\.com|id-preview--/.test(effectiveQrUrl) && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
                        <p className="font-semibold text-amber-400">⚠️ Endereço de Teste / Temporário Detectado</p>
                        <p className="mt-1 opacity-90">
                          Este QR Code está a apontar para um endereço temporário ou local. Antes de imprimir para as mesas físicas, assegure-se de que o URL corresponde ao domínio publicado definitivo (ex: Vercel ou domínio próprio do restaurante).
                        </p>
                      </div>
                    )}

                    {/* Dicas de Impressão e Boas Práticas */}
                    <div className="rounded-xl border border-border/80 bg-background/40 p-5 space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gold">
                        Guia de Utilização no Restaurante
                      </h4>
                      <ul className="space-y-2 text-xs text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 text-gold">•</span>
                          <span><strong>Nas Mesas:</strong> Recomendado suportes acrílicos verticais (T-stand) de 10×15 cm ou adesivos laminados de 8×8 cm.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 text-gold">•</span>
                          <span><strong>Ao Balcão / Entrada:</strong> Expositor visível perto da recepção para clientes que queiram ver o menu em takeaway.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 text-gold">•</span>
                          <span><strong>Resolução:</strong> O ficheiro PNG descarregado tem 2048 × 2048 px em alta definição com correção de erros avançada (Nível H).</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Coluna da Direita: Cartão do QR Code e Ações */}
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-background/60 p-6 lg:col-span-5 text-center">
                    <div className="w-full max-w-xs rounded-2xl border border-gold/30 bg-cream p-6 shadow-2xl text-center">
                      <p className="font-display text-xl font-bold tracking-wide text-[#0f2a20]">
                        Villa Sage
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0f2a20]/70 mb-3">
                        Menu Digital
                      </p>
                      {qrPreview ? (
                        <div className="relative mx-auto aspect-square w-full max-w-[240px] overflow-hidden rounded-xl bg-white p-2 shadow-inner">
                          <Image
                            src={qrPreview}
                            alt="QR Code do Menu Villa Sage"
                            width={2048}
                            height={2048}
                            unoptimized
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="grid aspect-square w-full place-items-center rounded-xl bg-white text-xs text-muted-foreground">
                          A gerar QR Code...
                        </div>
                      )}
                      <p className="mt-4 text-[11px] font-medium text-[#0f2a20]/80">
                        Aponte a câmara do telemóvel para abrir o menu
                      </p>
                    </div>

                    <div className="mt-6 flex w-full max-w-xs flex-col gap-2.5">
                      <a
                        href={qrPreview || undefined}
                        download="villa-sage-menu-qr.png"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-black shadow-md shadow-gold/20 transition hover:brightness-110"
                      >
                        <Download className="h-4 w-4" />
                        Descarregar PNG (2048×2048)
                      </a>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            window.print();
                          }
                        }}
                        className="w-full gap-2 border-border hover:border-gold hover:text-gold"
                      >
                        <Printer className="h-4 w-4" />
                        Imprimir Cartão
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─── MODAL (DIALOG) PARA ADICIONAR / EDITAR PRODUTO ─── */}
      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent className="max-w-lg border-border bg-card p-6 shadow-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-cream">
              {itemForm.editingId ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Preencha os detalhes do prato ou bebida para exibição no cardápio público.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveItem} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="item-category" className="text-xs">
                Categoria *
              </Label>
              <select
                id="item-category"
                value={itemForm.categoryId}
                onChange={(e) => setItemForm((p) => ({ ...p, categoryId: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
                required
              >
                {menu.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.group})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-name" className="text-xs">
                Nome do Produto *
              </Label>
              <Input
                id="item-name"
                value={itemForm.name}
                onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex.: Choco Frito com Batatas"
                required
                className="border-input bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-price" className="text-xs">
                Preço em Kwanzas (Kz) *
              </Label>
              <Input
                id="item-price"
                type="number"
                min="0"
                step="1"
                value={itemForm.price}
                onChange={(e) => setItemForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="Ex.: 8500"
                required
                className="border-input bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-description" className="text-xs">
                Descrição (opcional)
              </Label>
              <Textarea
                id="item-description"
                value={itemForm.description}
                onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Ingredientes, acompanhamentos ou detalhes do prato…"
                rows={3}
                className="border-input bg-background"
              />
            </div>

            {/* Fotografia */}
            <div className="space-y-2 rounded-xl border border-border/80 bg-background/50 p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor={fileInputId} className="text-xs font-semibold">
                  Fotografia do Produto
                </Label>
                <span className="text-[10px] text-muted-foreground">JPEG, PNG, WebP · máx. 10 MB</span>
              </div>

              {previewSrc && (
                <div className="relative overflow-hidden rounded-xl border border-border">
                  <img src={previewSrc} alt="Pré-visualização" className="h-40 w-full object-cover" />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-500 transition"
                    title="Remover pré-visualização"
                  >
                    ✕
                  </button>
                </div>
              )}

              <Input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                onChange={handleFileSelect}
                className="cursor-pointer text-xs"
              />

              {uploadState === "uploading" && (
                <p className="flex items-center gap-2 text-xs text-gold">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border border-gold border-t-transparent" />
                  A optimizar e enviar imagem…
                </p>
              )}

              {itemForm.imageUrl && itemForm.editingId && (
                <button
                  type="button"
                  onClick={() => void removeExistingImage(itemForm.editingId!)}
                  disabled={isLoading}
                  className="text-xs text-red-400 underline hover:text-red-300"
                >
                  Remover fotografia permanentemente
                </button>
              )}
            </div>

            <DialogFooter className="mt-6 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsItemModalOpen(false)}
                className="border-border text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || uploadState === "uploading"}
                className="bg-gold font-medium text-black hover:bg-gold/90 text-xs"
              >
                {isLoading || uploadState === "uploading"
                  ? "A guardar…"
                  : itemForm.editingId
                    ? "Guardar Alterações"
                    : "Criar Produto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL (DIALOG) PARA ADICIONAR / EDITAR CATEGORIA ─── */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md border-border bg-card p-6 shadow-2xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-cream">
              {editingCategoryId ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Categorias agrupam os pratos e bebidas no menu.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="category-name-modal" className="text-xs">
                Nome da Categoria *
              </Label>
              <Input
                id="category-name-modal"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex.: Sobremesas, Vinhos, Carnes"
                required
                className="border-input bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category-group-modal" className="text-xs">
                Grupo *
              </Label>
              <select
                id="category-group-modal"
                value={categoryForm.group}
                onChange={(e) => setCategoryForm((p) => ({ ...p, group: e.target.value as Category["group"] }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
              >
                <option value="Comida">Comida (Pratos, Entradas, Sobremesas)</option>
                <option value="Bebidas">Bebidas (Vinhos, Cervejas, Cocktails, Sumos)</option>
              </select>
            </div>

            <DialogFooter className="mt-6 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCategoryModalOpen(false)}
                className="border-border text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-gold font-medium text-black hover:bg-gold/90 text-xs"
              >
                {isLoading ? "A guardar…" : editingCategoryId ? "Guardar Categoria" : "Criar Categoria"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
