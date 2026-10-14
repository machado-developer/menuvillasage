import * as Dialog from "@radix-ui/react-dialog";
import { Minus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { buildWhatsAppUrl, formatKz, type MenuItem } from "@/data/menu";
import { WhatsAppIcon } from "./WhatsAppIcon";

export function OrderDialog({ item, onClose }: { item: MenuItem | null; onClose: () => void }) {
  const [qty, setQty] = useState(1);
  const [variantIdx, setVariantIdx] = useState(0);

  useEffect(() => {
    setQty(1);
    setVariantIdx(0);
  }, [item]);

  const variant = item?.variants?.[variantIdx];
  const unit = variant ? variant.price : item?.price ?? 0;
  const url = item ? buildWhatsAppUrl({ name: item.name, qty, variant: variant?.label, unit }) : "#";

  return (
    <Dialog.Root open={!!item} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-2xl border border-border bg-popover p-6 shadow-2xl data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
          {item && (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-gold">Encomendar</p>
                  <Dialog.Title className="mt-1 font-display text-3xl leading-tight">{item.name}</Dialog.Title>
                  {item.description && (
                    <Dialog.Description className="mt-1 text-sm text-muted-foreground">{item.description}</Dialog.Description>
                  )}
                </div>
                <Dialog.Close className="rounded-full p-1 text-muted-foreground hover:text-foreground" aria-label="Fechar">
                  <X className="h-5 w-5" />
                </Dialog.Close>
              </div>

              {item.variants && (
                <div className="mt-6">
                  <p className="mb-2 text-sm text-muted-foreground">Tamanho</p>
                  <div className="grid grid-cols-2 gap-2">
                    {item.variants.map((v, i) => (
                      <button
                        key={v.label}
                        onClick={() => setVariantIdx(i)}
                        className={`rounded-lg border px-3 py-3 text-left transition ${
                          i === variantIdx ? "border-gold bg-accent" : "border-border hover:border-gold/60"
                        }`}
                      >
                        <span className="block font-medium">{v.label}</span>
                        <span className="text-sm text-gold">{formatKz(v.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Quantidade</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-gold"
                    aria-label="Diminuir"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-lg font-medium tabular-nums">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(99, q + 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-gold"
                    aria-label="Aumentar"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-6 flex items-baseline justify-between border-t border-border pt-4">
                <span className="text-muted-foreground">Total</span>
                <span className="font-display text-3xl text-gold">{formatKz(unit * qty)}</span>
              </div>

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-whatsapp px-5 py-3.5 font-medium text-whatsapp-foreground transition hover:opacity-90"
              >
                <WhatsAppIcon className="h-5 w-5" />
                Encomendar pelo WhatsApp
              </a>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Abrirá o WhatsApp com a mensagem pronta. Confirme o envio e aguarde a resposta do restaurante.
              </p>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
