"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Download } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState, useSyncExternalStore } from "react";

const PREVIEW_HOST = /id-preview--|lovableproject\.com|localhost/;
const subscribe = () => () => {};
const getOriginUrl = () => window.location.origin + "/";
const getServerOriginUrl = () => "";

export default function QrPage() {
  const originUrl = useSyncExternalStore(subscribe, getOriginUrl, getServerOriginUrl);
  const [editedUrl, setEditedUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState("");
  const url = editedUrl ?? originUrl;

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: 2048, margin: 2, errorCorrectionLevel: "H", color: { dark: "#0f2a20", light: "#ffffff" } })
      .then(setPreview)
      .catch(() => setPreview(""));
  }, [url]);

  const isTemp = PREVIEW_HOST.test(url);

  return (
    <div className="mx-auto min-h-screen max-w-lg px-5 py-10">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold">
        <ArrowLeft className="h-4 w-4" /> Voltar ao menu
      </Link>
      <h1 className="mt-6 font-display text-5xl">QR Code do menu</h1>
      <p className="mt-2 text-muted-foreground">Imprima nas mesas, cartazes e materiais promocionais.</p>

      <label className="mt-8 block text-sm text-muted-foreground">Endereço do menu</label>
      <input
        value={url}
        onChange={(e) => setEditedUrl(e.target.value)}
        className="mt-2 w-full rounded-lg border border-input bg-card px-4 py-2.5 text-sm focus:border-gold focus:outline-none"
      />
      {isTemp && (
        <p className="mt-2 text-sm text-destructive">
          Este é um endereço temporário. Abra esta página no endereço publicado definitivo antes de descarregar.
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-cream p-6">
        {preview && <Image src={preview} alt="QR Code do menu Villa Sage" width={2048} height={2048} unoptimized className="mx-auto w-full max-w-xs" />}
        <p className="mt-3 text-center font-display text-2xl text-primary-foreground">Villa Sage · Menu</p>
      </div>

      <a
        href={preview || undefined}
        download="villa-sage-menu-qr.png"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 font-medium text-primary-foreground hover:opacity-90"
      >
        <Download className="h-5 w-5" /> Descarregar PNG (2048 × 2048)
      </a>
    </div>
  );
}
