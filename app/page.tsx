import type { Metadata } from "next";
import MenuPage from "@/routes/index";

export const metadata: Metadata = { title: "Villa Sage — Menu Digital" };

export default function Page() {
  return <MenuPage />;
}