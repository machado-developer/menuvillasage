import * as Dialog from "@radix-ui/react-dialog";
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  buildWhatsAppCartUrl,
  formatKz,
  WHATSAPP_PRIMARY_DISPLAY,
  WHATSAPP_PRIMARY_NUMBER,
  WHATSAPP_SECONDARY_DISPLAY,
  WHATSAPP_SECONDARY_NUMBER,
  type CartLine,
} from "@/data/menu";
import { WhatsAppIcon } from "./WhatsAppIcon";

export function CartDialog({
  items,
  onQuantityChange,
  onRemove,
}: {
  items: CartLine[];
  onQuantityChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(WHATSAPP_PRIMARY_NUMBER);
  const itemCount = items.reduce((total, item) => total + item.qty, 0);
  const total = items.reduce((sum, item) => sum + item.unit * item.qty, 0);
  const url = buildWhatsAppCartUrl(items, phone);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Abrir carrinho com ${itemCount} ${itemCount === 1 ? "item" : "itens"}`}
        className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 font-medium text-background shadow-lg transition hover:brightness-110 md:bottom-6 md:right-6"
      >
        <ShoppingCart className="h-5 w-5" />
        <span>Carrinho</span>
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-background/15 px-1.5 text-xs tabular-nums">
          {itemCount}
        </span>
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-popover p-5 shadow-2xl data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:bottom-auto sm:top-1/2 sm:max-h-[85dvh] sm:-translate-y-1/2 sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-gold">O seu pedido</p>
                <Dialog.Title className="mt-1 font-display text-3xl leading-tight">Carrinho</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  {itemCount} {itemCount === 1 ? "item" : "itens"} no pedido
                </Dialog.Description>
              </div>
              <Dialog.Close className="rounded-full p-1 text-muted-foreground hover:text-foreground" aria-label="Fechar carrinho">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>

            {items.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingCart className="mx-auto h-8 w-8 text-gold" />
                <p className="mt-3 text-sm text-muted-foreground">O carrinho está vazio.</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-5 rounded-full border border-border px-5 py-2 text-sm transition hover:border-gold hover:text-gold"
                >
                  Voltar ao menu
                </button>
              </div>
            ) : (
              <>
                <ul className="mt-5 space-y-3 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <li key={item.id} className="rounded-xl border border-border bg-card/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-cream">{item.name}</p>
                          {item.variant && <p className="mt-0.5 text-xs text-muted-foreground">{item.variant}</p>}
                          <p className="mt-1 text-sm text-gold">
                            {formatKz(item.unit)} · Subtotal {formatKz(item.unit * item.qty)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemove(item.id)}
                          aria-label={`Remover ${item.name} do carrinho`}
                          className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onQuantityChange(item.id, Math.max(1, item.qty - 1))}
                          disabled={item.qty <= 1}
                          aria-label={`Diminuir quantidade de ${item.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border transition hover:border-gold disabled:opacity-40"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm tabular-nums">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => onQuantityChange(item.id, Math.min(99, item.qty + 1))}
                          disabled={item.qty >= 99}
                          aria-label={`Aumentar quantidade de ${item.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border transition hover:border-gold disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 border-t border-border pt-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-muted-foreground">Total do pedido</span>
                    <span className="font-display text-3xl text-gold">{formatKz(total)}</span>
                  </div>
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Enviar pedido para:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPhone(WHATSAPP_PRIMARY_NUMBER)}
                        aria-pressed={phone === WHATSAPP_PRIMARY_NUMBER}
                        className={`rounded-lg border p-2 text-left text-xs transition ${
                          phone === WHATSAPP_PRIMARY_NUMBER
                            ? "border-whatsapp bg-whatsapp/15 text-cream"
                            : "border-border text-muted-foreground hover:border-whatsapp/40"
                        }`}
                      >
                        <span className="block font-semibold text-whatsapp">Principal</span>
                        <span className="block text-[11px] opacity-80">{WHATSAPP_PRIMARY_DISPLAY}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhone(WHATSAPP_SECONDARY_NUMBER)}
                        aria-pressed={phone === WHATSAPP_SECONDARY_NUMBER}
                        className={`rounded-lg border p-2 text-left text-xs transition ${
                          phone === WHATSAPP_SECONDARY_NUMBER
                            ? "border-whatsapp bg-whatsapp/15 text-cream"
                            : "border-border text-muted-foreground hover:border-whatsapp/40"
                        }`}
                      >
                        <span className="block font-semibold text-gold">Alternativo</span>
                        <span className="block text-[11px] opacity-80">{WHATSAPP_SECONDARY_DISPLAY}</span>
                      </button>
                    </div>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-whatsapp px-5 py-3.5 font-medium text-whatsapp-foreground transition hover:opacity-90"
                  >
                    <WhatsAppIcon className="h-5 w-5" />
                    Enviar pedido pelo WhatsApp
                  </a>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
