import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const ADMIN_SESSION_COOKIE = "villa_sage_admin";
const ADMIN_SESSION_SECONDS = 60 * 60 * 12;

function requiredEnvironment(name: "ADMIN_EMAIL" | "ADMIN_PASSWORD" | "ADMIN_SESSION_SECRET") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`A variável de ambiente ${name} não está configurada.`);
  }
  return value;
}

function safeEqual(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function signatureFor(timestamp: string) {
  return createHmac("sha256", requiredEnvironment("ADMIN_SESSION_SECRET"))
    .update(`villa-sage-admin:${timestamp}`)
    .digest("hex");
}

export function adminCredentialsAreConfigured() {
  return Boolean(
    process.env.ADMIN_EMAIL &&
      process.env.ADMIN_PASSWORD &&
      process.env.ADMIN_SESSION_SECRET &&
      process.env.DATABASE_URL,
  );
}

export function verifyAdminCredentials(email: string, password: string) {
  const expectedEmail = requiredEnvironment("ADMIN_EMAIL").trim().toLowerCase();
  const expectedPassword = requiredEnvironment("ADMIN_PASSWORD");
  return safeEqual(email.trim().toLowerCase(), expectedEmail) && safeEqual(password, expectedPassword);
}

export async function createAdminSession() {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const value = `${timestamp}.${signatureFor(timestamp)}`;
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function isAdminAuthenticated() {
  if (!adminCredentialsAreConfigured()) return false;

  const value = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!value) return false;

  const [timestamp, signature, ...extra] = value.split(".");
  if (!timestamp || !signature || extra.length > 0 || !/^\d+$/.test(timestamp)) return false;

  const issuedAt = Number(timestamp);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > now || now - issuedAt > ADMIN_SESSION_SECONDS) {
    return false;
  }

  try {
    return safeEqual(signature, signatureFor(timestamp));
  } catch {
    return false;
  }
}
