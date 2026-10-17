import { NextResponse } from "next/server";
import {
  adminCredentialsAreConfigured,
  clearAdminSession,
  createAdminSession,
  isAdminAuthenticated,
  verifyAdminCredentials,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    authenticated: await isAdminAuthenticated(),
    configured: adminCredentialsAreConfigured(),
  });
}

export async function POST(request: Request) {
  if (!adminCredentialsAreConfigured()) {
    return NextResponse.json(
      { error: "Configure DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD e ADMIN_SESSION_SECRET." },
      { status: 503 },
    );
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Pedido de login inválido." }, { status: 400 });
  }

  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Informe email e senha." }, { status: 400 });
  }

  if (!verifyAdminCredentials(body.email, body.password)) {
    return NextResponse.json({ error: "Email ou senha inválidos." }, { status: 401 });
  }

  await createAdminSession();
  return NextResponse.json({ authenticated: true });
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ authenticated: false });
}
