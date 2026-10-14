import type { Metadata } from "next";
import QrPage from "@/routes/qr";

export const metadata: Metadata = {
  title: "QR Code do Menu — Villa Sage",
  description: "Descarregue o QR Code do menu digital Villa Sage para mesas e cartazes.",
  openGraph: {
    title: "QR Code do Menu — Villa Sage",
    description: "QR Code para abrir o menu digital do Villa Sage.",
    type: "website",
  },
  twitter: { card: "summary" },
  robots: { index: false },
};

export default function Page() {
  return <QrPage />;
}