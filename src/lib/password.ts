import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const KEY_LENGTH = 64;
const PREFIX = "scrypt";

/**
 * Cria um hash criptográfico seguro para a senha com salt aleatório.
 * Formato resultante: scrypt:salt_hex:hash_hex
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${PREFIX}:${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Valida uma senha em texto simples contra um hash gerado por `hashPassword`.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split(":");
    if (parts.length !== 3 || parts[0] !== PREFIX) {
      return false;
    }

    const salt = parts[1];
    const hashHex = parts[2];
    if (!salt || !hashHex) {
      return false;
    }

    const originalHash = Buffer.from(hashHex, "hex");
    const derivedKey = (await scryptAsync(password, salt, originalHash.length)) as Buffer;
    return timingSafeEqual(originalHash, derivedKey);
  } catch {
    return false;
  }
}
