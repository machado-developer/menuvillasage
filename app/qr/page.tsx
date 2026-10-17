import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "QR Code do Menu — Villa Sage",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    redirect("/login?from=/admin");
  }

  redirect("/admin?tab=qr");
}