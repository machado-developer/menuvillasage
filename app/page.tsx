import type { Metadata } from "next";
import hero from "@/assets/hero.jpg";
import { ADDRESS, WHATSAPP_NUMBER } from "@/data/menu";
import { getPublicMenu } from "@/lib/menu-data";
import { SITE_URL } from "@/lib/seo";
import MenuPage from "@/routes/index";

const description =
  "Consulte o menu digital do Villa Sage em Benfica, Angola. Veja pratos e preços em kwanzas e encomende pelo WhatsApp.";

export const metadata: Metadata = {
  title: { absolute: "Menu do Villa Sage em Benfica, Angola" },
  description,
  keywords: [
    "Villa Sage",
    "menu Villa Sage",
    "restaurante em Benfica",
    "menu restaurante Angola",
    "pratos e preços em kwanzas",
    "encomendas pelo WhatsApp",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_AO",
    siteName: "Villa Sage",
    title: "Menu do Villa Sage em Benfica, Angola",
    description,
    url: SITE_URL,
    images: [
      {
        url: hero.src,
        width: hero.width,
        height: hero.height,
        alt: "Mesa do Villa Sage com pratos do restaurante",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Menu do Villa Sage em Benfica, Angola",
    description,
    images: [
      {
        url: hero.src,
        alt: "Mesa do Villa Sage com pratos do restaurante",
      },
    ],
  },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialCategories = await getPublicMenu();

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "Villa Sage — Menu Digital",
        inLanguage: "pt-AO",
      },
      {
        "@type": "Restaurant",
        "@id": `${SITE_URL}/#restaurant`,
        name: "Villa Sage",
        url: SITE_URL,
        image: new URL(hero.src, SITE_URL).toString(),
        telephone: `+${WHATSAPP_NUMBER}`,
        address: {
          "@type": "PostalAddress",
          streetAddress: "Morro dos Veados, entrada do Matadouro",
          addressLocality: "Benfica",
          addressCountry: "AO",
        },
        contactPoint: {
          "@type": "ContactPoint",
          telephone: `+${WHATSAPP_NUMBER}`,
          contactType: "customer service",
          availableLanguage: "Portuguese",
        },
        hasMenu: `${SITE_URL}/#menu`,
        mainEntityOfPage: SITE_URL,
        description: `Menu digital do restaurante Villa Sage. ${ADDRESS}.`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <MenuPage initialCategories={initialCategories} />
    </>
  );
}