import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Iniciar Sessão",
  description: "Acesso administrativo ao painel de gestão do Villa Sage.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage() {
  const authenticated = await isAdminAuthenticated();
  if (authenticated) {
    redirect("/admin");
  }

  return <LoginForm />;
}
