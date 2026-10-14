import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import "@/styles.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Menu Digital do Villa Sage",
    template: "%s | Villa Sage",
  },
  description:
    "Consulte o menu digital do Villa Sage em Benfica, Angola. Veja pratos e preços em kwanzas e faça a sua encomenda pelo WhatsApp.",
  applicationName: "Villa Sage — Menu Digital",
  authors: [{ name: "Villa Sage" }],
  creator: "Villa Sage",
  publisher: "Villa Sage",
  category: "food",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_AO",
    siteName: "Villa Sage",
    title: "Menu Digital do Villa Sage",
    description:
      "Consulte pratos e preços do Villa Sage em Benfica, Angola, e encomende pelo WhatsApp.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Menu Digital do Villa Sage",
    description:
      "Consulte pratos e preços do Villa Sage em Benfica, Angola, e encomende pelo WhatsApp.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}