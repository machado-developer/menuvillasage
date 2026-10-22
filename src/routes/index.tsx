"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ChevronDown, House, LogIn, MapPin, Search, Utensils, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import hero from "@/assets/hero.jpg";
import bebidas from "@/assets/bebidas.jpg";
import { CartDialog } from "@/components/CartDialog";
import { OrderDialog } from "@/components/OrderDialog";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import {
  ADDRESS,
  type CartLine,
  categories,
  formatKz,
  WHATSAPP_PRIMARY_DISPLAY,
  WHATSAPP_PRIMARY_NUMBER,
  WHATSAPP_SECONDARY_DISPLAY,
  WHATSAPP_SECONDARY_NUMBER,
  type Category,
  type MenuItem,
} from "@/data/menu";

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const INITIAL_CATEGORIES = 3;
const MORE_STEP = 3;

export default function Index({ initialCategories = categories }: { initialCategories?: Category[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [menu, setMenu] = useState<Category[]>(initialCategories);
  const [visibleCount, setVisibleCount] = useState(INITIAL_CATEGORIES);
  const [isExpanding, setIsExpanding] = useState(false);
  const newSectionRef = useRef<HTMLDivElement | null>(null);

  function addToCart(line: CartLine) {
    setCart((current) => {
      const existing = current.find((item) => item.id === line.id);
      if (!existing) return [...current, line];
      return current.map((item) =>
        item.id === line.id ? { ...item, qty: Math.min(99, item.qty + line.qty) } : item,
      );
    });
  }

  function updateCartQuantity(id: string, qty: number) {
    setCart((current) => current.map((item) => (item.id === id ? { ...item, qty } : item)));
  }

  useEffect(() => {
    setMenu(initialCategories);
    setVisibleCount(INITIAL_CATEGORIES);
  }, [initialCategories]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return menu;
    return menu
      .map((c) => ({ ...c, items: c.items.filter((i) => normalize(i.name + " " + (i.description ?? "")).includes(q)) }))
      .filter((c) => c.items.length > 0);
  }, [menu, query]);

  // Quando pesquisa está ativa, mostrar tudo; caso contrário paginar
  const isSearching = query.trim().length > 0;
  const visibleCategories = isSearching ? filtered : filtered.slice(0, visibleCount);
  const hasMore = !isSearching && visibleCount < filtered.length;

  function handleShowMore() {
    const prevCount = visibleCount;
    setIsExpanding(true);
    setVisibleCount((v) => Math.min(v + MORE_STEP, filtered.length));
    setTimeout(() => {
      setIsExpanding(false);
      const sections = document.querySelectorAll("[data-category-section]");
      const next = sections[prevCount];
      if (next) {
        next.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);
  }

  return (
    <div id="inicio" className="min-h-screen pb-20 md:pb-0">
      {/* Header principal — sticky com sombra suave */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.25)] transition-shadow">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-5 lg:px-8">
          <a href="#inicio" className="group flex items-center gap-3" aria-label="Villa Sage — início">
            <Image
              src="/logo.png"
              alt="Villa Sage — Cuidamos da sua estadia"
              width={90}
              height={64}
              priority
              className="h-14 w-20 rounded-md bg-white object-contain p-1 sm:h-16 sm:w-[90px]"
            />
            <span className="text-[9px] uppercase tracking-[0.28em] text-gold">Menu</span>
          </a>
          <nav className="hidden items-center gap-8 text-xs text-muted-foreground md:flex" aria-label="Navegação principal">
            <a href="#inicio" className="transition hover:text-gold">Início</a>
            <a href="#menu" className="text-gold">Menu</a>
            <a href="#contactos" className="transition hover:text-gold">Contactos</a>
            <Link href="/login" className="transition hover:text-gold">Entrar</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              aria-label="Iniciar Sessão"
              title="Iniciar Sessão"
              className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted-foreground transition hover:border-gold hover:text-gold"
            >
              <LogIn className="h-4 w-4" />
            </Link>
            <a
              href={`https://wa.me/${WHATSAPP_PRIMARY_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`WhatsApp ${WHATSAPP_PRIMARY_DISPLAY}`}
              className="grid h-10 w-10 place-items-center rounded-xl bg-whatsapp text-whatsapp-foreground transition hover:brightness-110 sm:flex sm:w-auto sm:gap-2 sm:px-4"
            >
              <WhatsAppIcon className="h-4 w-4" />
              <span className="hidden text-xs sm:inline">WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate min-h-[28rem] overflow-hidden border-b border-border/60 sm:min-h-[32rem]">
        <Image src={hero} alt="Mesa do Villa Sage com lagosta grelhada" fill priority sizes="100vw" className="absolute inset-0 -z-20 object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-linear-to-r from-background via-background/85 to-background/25" />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-background via-transparent to-background/25" />
        <div className="mx-auto flex min-h-[28rem] max-w-7xl items-center px-5 py-12 sm:min-h-[32rem] lg:px-8">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-background/60 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-gold backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Restaurante
            </p>
            <h1 className="mt-5 font-display text-6xl font-light leading-[0.92] tracking-tight text-cream sm:text-7xl lg:text-8xl">Villa Sage</h1>
            <div className="mt-6 h-px w-20 bg-gold" />
            <p className="mt-5 flex max-w-xl items-start gap-2.5 text-sm leading-relaxed text-cream/80">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> {ADDRESS}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#menu" className="inline-flex items-center gap-2 rounded-lg bg-whatsapp px-5 py-3 text-sm font-medium text-whatsapp-foreground transition hover:brightness-110">
                Explorar menu <ArrowDown className="h-4 w-4" />
              </a>
              <a
                href={`https://wa.me/${WHATSAPP_PRIMARY_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-cream/25 bg-background/35 px-5 py-3 text-sm text-cream backdrop-blur transition hover:border-gold hover:text-gold"
              >
                <WhatsAppIcon className="h-4 w-4 text-whatsapp" /> {WHATSAPP_PRIMARY_DISPLAY}
              </a>
            </div>
          </div>
        </div>
        <span className="absolute bottom-5 right-5 hidden text-[10px] uppercase tracking-[0.2em] text-cream/60 md:block">Menu digital</span>
      </section>

      {/* Barra de pesquisa + navegação de categorias — sticky abaixo do header */}
      <div id="menu" className="sticky top-[4.5rem] z-30 border-b border-border/80 bg-background/95 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 pt-3 lg:px-8">
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar pratos ou bebidas…"
              className="w-full rounded-xl border border-border bg-card/80 py-3 pl-11 pr-11 text-sm placeholder:text-muted-foreground/80 focus:border-gold/70 focus:outline-none focus:ring-2 focus:ring-gold/15"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Limpar pesquisa"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
        </div>
        <nav className="no-scrollbar mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 py-3 lg:px-8" aria-label="Categorias do menu">
          {filtered.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              onClick={() => {
                // Se a categoria não estiver visível ainda, expandir até ela
                const idx = filtered.findIndex((cat) => cat.id === c.id);
                if (!isSearching && idx >= visibleCount) {
                  setVisibleCount(idx + 1);
                }
              }}
              className="shrink-0 rounded-full border border-border bg-card/50 px-4 py-2 text-xs text-muted-foreground transition hover:border-gold/70 hover:text-gold"
            >
              {c.name}
            </a>
          ))}
        </nav>
      </div>

      <main className="mx-auto max-w-7xl px-5 py-10 sm:py-14 lg:px-8">
        {filtered.length === 0 && (
          <div className="mx-auto my-8 max-w-2xl rounded-2xl border border-border bg-card/60 px-6 py-14 text-center sm:my-14 sm:px-12">
            <Search className="mx-auto h-7 w-7 text-gold" />
            <h2 className="mt-5 font-display text-3xl text-cream">Nenhum resultado</h2>
            <p className="mt-2 text-sm text-muted-foreground">Nenhum resultado para "{query}".</p>
            <button type="button" onClick={() => setQuery("")} className="mt-6 rounded-lg border border-border px-5 py-2.5 text-sm transition hover:border-gold hover:text-gold">
              Ver todo o menu
            </button>
          </div>
        )}

        {visibleCategories.map((c, idx) => {
          const showGroup = idx === 0 || visibleCategories[idx - 1]?.group !== c.group;
          const isNewlyVisible = !isSearching && idx >= visibleCount - MORE_STEP && idx < visibleCount;
          return (
            <div
              key={c.id}
              data-category-section
              ref={idx === visibleCount - MORE_STEP ? newSectionRef : undefined}
            >
              {showGroup && (
                <div className={`mb-8 mt-12 flex items-center gap-4 first:mt-0 ${c.group === "Bebidas" ? "border-t border-border pt-10" : ""}`}>
                  <h2 className="font-display text-3xl text-cream sm:text-4xl">{c.group}</h2>
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
              <section
                id={c.id}
                className="mb-12 scroll-mt-44 sm:mb-16"
                style={isNewlyVisible ? { animation: "fadeIn 0.4s ease both" } : undefined}
              >
                <div className="mb-5 flex items-center gap-4">
                  {c.image ? (
                    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-border/70 sm:h-20 sm:w-28">
                      <Image src={c.image} alt="" fill sizes="112px" className="object-cover" />
                      <div className="absolute inset-0 bg-linear-to-t from-background/55 to-transparent" />
                    </div>
                  ) : (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-gold/20 bg-gold/5 text-gold">
                      <Utensils className="h-5 w-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-2xl text-cream sm:text-3xl">{c.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{c.items.length} {c.items.length === 1 ? "opção" : "opções"}</p>
                  </div>
                  <span className="hidden h-px w-12 bg-gold/60 sm:block" />
                </div>
                {c.note && <p className="mb-5 max-w-4xl border-l border-gold/60 pl-4 text-sm italic leading-relaxed text-muted-foreground">{c.note}</p>}
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {c.items.map((item, itemIdx) => (
                    <li
                      key={item.id}
                      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border/80 bg-card/70 transition duration-300 hover:-translate-y-0.5 hover:border-gold/40 hover:bg-card hover:shadow-[0_14px_36px_rgba(0,0,0,0.2)]"
                      style={{
                        animation: "scaleIn 0.3s ease both",
                        animationDelay: `${itemIdx * 40}ms`,
                      }}
                    >
                      <div className="relative h-40 w-full overflow-hidden sm:h-44">
                        <Image
                          src={item.image ?? c.image ?? (c.group === "Bebidas" ? bebidas : hero)}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-card via-transparent to-transparent" />
                        {item.imageCredit && (
                          <div className="absolute bottom-2 left-2 z-10 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-md bg-background/85 px-2 py-1 text-[9px] text-foreground backdrop-blur-sm">
                            <a
                              href={item.imageCredit.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              title={`${item.imageCredit.title} — ${item.imageCredit.creator}`}
                              className="truncate underline decoration-foreground/50 underline-offset-2"
                            >
                              Foto: {item.imageCredit.creator}
                            </a>
                            <span aria-hidden="true">·</span>
                            <a
                              href={item.imageCredit.licenseUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 underline decoration-foreground/50 underline-offset-2"
                            >
                              {item.imageCredit.license}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="font-display text-xl leading-tight text-cream sm:text-2xl">{item.name}</h4>
                            {!item.variants && <span className="shrink-0 pt-1 font-display text-lg text-gold">{formatKz(item.price ?? 0)}</span>}
                          </div>
                          {item.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
                          {item.variants && (
                            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/70 pt-3">
                              {item.variants.map((variant) => (
                                <div key={variant.label} className="min-w-0">
                                  <span className="block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{variant.label}</span>
                                  <span className="mt-0.5 block font-display text-lg text-gold">{formatKz(variant.price)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelected(item)}
                          aria-label={`Encomendar ${item.name} pelo WhatsApp`}
                          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-whatsapp/45 bg-whatsapp/10 px-4 py-2.5 text-xs text-cream transition-colors hover:border-whatsapp hover:bg-whatsapp hover:text-whatsapp-foreground"
                        >
                          <WhatsAppIcon className="h-4 w-4" /> Encomendar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          );
        })}

        {/* Botão "Ver mais categorias" */}
        {hasMore && (
          <div
            className="mt-4 mb-12 flex flex-col items-center gap-3"
            style={{ animation: "fadeIn 0.3s ease both" }}
          >
            <div className="flex items-center gap-3 w-full max-w-xs">
              <span className="h-px flex-1 bg-border/60" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {visibleCount} de {filtered.length} categorias
              </span>
              <span className="h-px flex-1 bg-border/60" />
            </div>
            <button
              type="button"
              onClick={handleShowMore}
              disabled={isExpanding}
              className="group inline-flex items-center gap-2.5 rounded-2xl border border-border bg-card/70 px-6 py-3 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur transition hover:border-gold hover:bg-card hover:text-gold hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] disabled:opacity-60"
            >
              {isExpanding ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" />
              ) : (
                <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
              )}
              Ver mais categorias
              <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-xs text-muted-foreground">
                +{Math.min(MORE_STEP, filtered.length - visibleCount)}
              </span>
            </button>
          </div>
        )}

        {/* Separador "Fim do menu" */}
        {!hasMore && !isSearching && filtered.length > 0 && (
          <div className="mt-4 mb-8 flex items-center gap-4">
            <span className="h-px flex-1 bg-border/40" />
            <span className="text-xs text-muted-foreground/60 uppercase tracking-widest">Fim do menu</span>
            <span className="h-px flex-1 bg-border/40" />
          </div>
        )}
      </main>

      <footer id="contactos" className="border-t border-border bg-card/30 px-5 py-8 text-center sm:py-10">
        <p className="font-display text-2xl text-cream">Villa Sage</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{ADDRESS}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <a
            href={`https://wa.me/${WHATSAPP_PRIMARY_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-whatsapp/40 bg-whatsapp/10 px-4 py-2 text-xs font-medium text-cream transition hover:border-whatsapp hover:bg-whatsapp hover:text-whatsapp-foreground"
          >
            <WhatsAppIcon className="h-4 w-4" />
            <span>Principal: <strong className="font-semibold">{WHATSAPP_PRIMARY_DISPLAY}</strong></span>
          </a>

          <a
            href={`https://wa.me/${WHATSAPP_SECONDARY_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/50 px-4 py-2 text-xs font-medium text-muted-foreground transition hover:border-gold hover:text-gold"
          >
            <WhatsAppIcon className="h-4 w-4 text-gold" />
            <span>Alternativo: <strong className="font-semibold">{WHATSAPP_SECONDARY_DISPLAY}</strong></span>
          </a>
        </div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-border bg-background/95 px-4 py-2 backdrop-blur-xl md:hidden" aria-label="Navegação inferior">
        <a href="#inicio" className="flex flex-col items-center gap-1 py-1 text-[10px] text-muted-foreground transition hover:text-gold">
          <House className="h-4 w-4" /> Início
        </a>
        <a href="#menu" className="flex flex-col items-center gap-1 py-1 text-[10px] text-gold">
          <Utensils className="h-4 w-4" /> Menu
        </a>
        <a href="#contactos" className="flex flex-col items-center gap-1 py-1 text-[10px] text-muted-foreground transition hover:text-gold">
          <MapPin className="h-4 w-4" /> Contactos
        </a>
      </nav>

      <OrderDialog item={selected} onClose={() => setSelected(null)} onAddToCart={addToCart} />
      {cart.length > 0 && (
        <CartDialog
          items={cart}
          onQuantityChange={updateCartQuantity}
          onRemove={(id) => setCart((current) => current.filter((item) => item.id !== id))}
        />
      )}
    </div>
  );
}
