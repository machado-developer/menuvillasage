"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowDown, House, MapPin, QrCode, Search, Utensils, X } from "lucide-react";
import { useMemo, useState } from "react";
import hero from "@/assets/hero.jpg";
import bebidas from "@/assets/bebidas.jpg";
import { OrderDialog } from "@/components/OrderDialog";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { ADDRESS, categories, formatKz, WHATSAPP_DISPLAY, WHATSAPP_NUMBER, type MenuItem } from "@/data/menu";

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function Index() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MenuItem | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return categories;
    return categories
      .map((c) => ({ ...c, items: c.items.filter((i) => normalize(i.name + " " + (i.description ?? "")).includes(q)) }))
      .filter((c) => c.items.length > 0);
  }, [query]);

  return (
    <div id="inicio" className="min-h-screen pb-20 md:pb-0">
      <header className="border-b border-border/70 bg-background">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-5 lg:px-8">
          <a href="#inicio" className="group flex items-center gap-3" aria-label="Villa Sage — início">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-gold/50 font-display text-lg text-gold">V</span>
            <span className="leading-none">
              <span className="block font-display text-xl text-cream">Villa Sage</span>
              <span className="mt-1 block text-[9px] uppercase tracking-[0.28em] text-gold">Menu</span>
            </span>
          </a>
          <nav className="hidden items-center gap-8 text-xs text-muted-foreground md:flex" aria-label="Navegação principal">
            <a href="#inicio" className="transition hover:text-gold">Início</a>
            <a href="#menu" className="text-gold">Menu</a>
            <a href="#contactos" className="transition hover:text-gold">Contactos</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/qr" aria-label="QR Code do menu" className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted-foreground transition hover:border-gold hover:text-gold">
              <QrCode className="h-4 w-4" />
            </Link>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${WHATSAPP_DISPLAY}`} className="grid h-10 w-10 place-items-center rounded-xl bg-whatsapp text-whatsapp-foreground transition hover:brightness-110 sm:flex sm:w-auto sm:gap-2 sm:px-4">
              <WhatsAppIcon className="h-4 w-4" />
              <span className="hidden text-xs sm:inline">WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

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
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-cream/25 bg-background/35 px-5 py-3 text-sm text-cream backdrop-blur transition hover:border-gold hover:text-gold">
                <WhatsAppIcon className="h-4 w-4" /> {WHATSAPP_DISPLAY}
              </a>
            </div>
          </div>
        </div>
        <span className="absolute bottom-5 right-5 hidden text-[10px] uppercase tracking-[0.2em] text-cream/60 md:block">Menu digital</span>
      </section>

      <div id="menu" className="sticky top-0 z-30 border-b border-border/80 bg-background/95 shadow-[0_12px_30px_rgba(0,0,0,0.16)] backdrop-blur-xl">
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
              <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Limpar pesquisa">
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
            <p className="mt-2 text-sm text-muted-foreground">Nenhum resultado para “{query}”.</p>
            <button type="button" onClick={() => setQuery("")} className="mt-6 rounded-lg border border-border px-5 py-2.5 text-sm transition hover:border-gold hover:text-gold">
              Ver todo o menu
            </button>
          </div>
        )}
        {filtered.map((c, idx) => {
          const showGroup = idx === 0 || filtered[idx - 1]?.group !== c.group;
          const itemPhoto = c.image ?? (c.group === "Bebidas" ? bebidas : hero);
          return (
            <div key={c.id}>
              {showGroup && (
                <div className={`mb-8 mt-12 flex items-center gap-4 first:mt-0 ${c.group === "Bebidas" ? "border-t border-border pt-10" : ""}`}>
                  <h2 className="font-display text-3xl text-cream sm:text-4xl">{c.group}</h2>
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
              <section id={c.id} className="mb-12 scroll-mt-36 sm:mb-16">
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
                  {c.items.map((item) => (
                    <li key={item.id} className="group flex h-full flex-col overflow-hidden rounded-xl border border-border/80 bg-card/70 transition duration-300 hover:-translate-y-0.5 hover:border-gold/40 hover:bg-card hover:shadow-[0_14px_36px_rgba(0,0,0,0.2)]">
                      <div className="relative h-40 w-full overflow-hidden sm:h-44">
                        <Image
                          src={itemPhoto}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-card via-transparent to-transparent" />
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
      </main>

      <footer id="contactos" className="border-t border-border bg-card/30 px-5 py-8 text-center sm:py-10">
        <p className="font-display text-2xl text-cream">Villa Sage</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{ADDRESS}</p>
        <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-gold transition hover:text-cream">
          <WhatsAppIcon className="h-4 w-4" /> {WHATSAPP_DISPLAY}
        </a>
        <div>
          <Link href="/qr" className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground transition hover:border-gold hover:text-gold">
            <QrCode className="h-4 w-4" /> QR Code do menu
          </Link>
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

      <OrderDialog item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
