"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("from") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Credenciais inválidas. Verifique o email e senha.");
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push(redirectUrl);
        router.refresh();
      }, 700);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Ocorreu um erro ao iniciar sessão.");
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 selection:bg-gold selection:text-black">
      {/* Luz ambiente de fundo */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-gold/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 -z-10 h-[400px] w-[500px] rounded-full bg-gold/5 blur-[120px]" />

      <div className="w-full max-w-md">
        {/* Cartão principal de login */}
        <div className="relative rounded-3xl border border-border/80 bg-card/90 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:p-10">
          {/* Cabeçalho */}
          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-3 transition hover:opacity-90"
              aria-label="Villa Sage — Menu Inicial"
            >
              <Image
                src="/logo.png"
                alt="Villa Sage"
                width={80}
                height={56}
                priority
                className="h-14 w-20 rounded-md bg-white object-contain p-1 sm:h-16 sm:w-24 shadow-md"
              />
            </Link>

            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-gold">
              <ShieldCheck className="h-3.5 w-3.5" />
              Painel Administrativo
            </div>

            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-cream sm:text-4xl">
              Iniciar Sessão
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Insira as credenciais do restaurante para gerir o menu digital.
            </p>
          </div>

          {/* Feedback de erro */}
          {errorMessage && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Feedback de sucesso */}
          {isSuccess && (
            <div
              role="status"
              className="mt-6 flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
              <span>Sessão iniciada! A redirecionar para o painel…</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="space-y-2 text-left">
              <Label htmlFor="login-email" className="text-xs uppercase tracking-wider text-muted-foreground">
                Email de Administrador
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="admin@villasage.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || isSuccess}
                  className="h-11 border-border/80 bg-background/60 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 transition focus-visible:border-gold focus-visible:ring-1 focus-visible:ring-gold"
                />
              </div>
            </div>

            <div className="space-y-2 text-left">
              <Label htmlFor="login-password" className="text-xs uppercase tracking-wider text-muted-foreground">
                Palavra-passe
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || isSuccess}
                  className="h-11 border-border/80 bg-background/60 pl-10 pr-11 text-sm text-foreground placeholder:text-muted-foreground/60 transition focus-visible:border-gold focus-visible:ring-1 focus-visible:ring-gold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || isSuccess}
              className="mt-2 h-11 w-full bg-gold font-medium text-black transition hover:bg-gold/90 focus-visible:ring-gold disabled:opacity-70"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  A validar credenciais…
                </span>
              ) : isSuccess ? (
                "Acedendo…"
              ) : (
                "Entrar no Painel"
              )}
            </Button>
          </form>

          {/* Rodapé do cartão com link de regresso */}
          <div className="mt-8 border-t border-border/60 pt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition hover:text-gold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao menu público
            </Link>
          </div>
        </div>

        {/* Rodapé com copyright */}
        <p className="mt-6 text-center text-xs text-muted-foreground/70">
          Villa Sage &copy; {new Date().getFullYear()} &middot; Morro dos Veados, Benfica, Angola
        </p>
      </div>
    </div>
  );
}
