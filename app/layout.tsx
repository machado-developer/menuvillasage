import type { Metadata } from "next";
import "@/styles.css";

export const metadata: Metadata = {
  title: "Villa Sage — Menu Digital",
  description: "Menu digital do restaurante Villa Sage em Benfica, Angola. Consulte pratos e preços e encomende pelo WhatsApp.",
  openGraph: {
    title: "Villa Sage — Menu Digital",
    description: "Consulte o menu do Villa Sage e encomende directamente pelo WhatsApp.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}