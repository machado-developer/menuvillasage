import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearAdminSession();
  return NextResponse.json({
    success: true,
    message: "Sessão terminada com sucesso.",
  });
}

export async function GET(request: Request) {
  await clearAdminSession();
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}
