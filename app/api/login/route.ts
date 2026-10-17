import { NextResponse } from "next/server";
import {
  adminCredentialsAreConfigured,
  createAdminSession,
  isAdminAuthenticated,
  verifyAdminCredentials,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const authenticated = await isAdminAuthenticated();
  return NextResponse.json({
    authenticated,
    configured: adminCredentialsAreConfigured(),
  });
}

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Formato de requisição inválido." }, { status: 400 });
  }

  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Informe email e senha." }, { status: 400 });
  }

  const email = body.email.trim();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email e senha são obrigatórios." }, { status: 400 });
  }

  const isValid = await verifyAdminCredentials(email, password);
  if (!isValid) {
    return NextResponse.json({ error: "Email ou senha incorretos." }, { status: 401 });
  }

  await createAdminSession();

  return NextResponse.json({
    success: true,
    message: "Login efetuado com sucesso.",
  });
}
