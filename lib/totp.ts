import { authenticator } from "otplib";
import crypto from "crypto";

/**
 * TOTP helpers using otplib.
 *
 * totpSecret is stored AES-256-GCM encrypted in the DB.
 * Use encryptSecret() before storing and decryptSecret() before verifying.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV for GCM

function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  // Derive a 32-byte key from AUTH_SECRET via SHA-256
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Format: iv(hex):tag(hex):ciphertext(hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(stored: string): string {
  const [ivHex, tagHex, ctHex] = stored.split(":");
  if (!ivHex || !tagHex || !ctHex)
    throw new Error("Invalid encrypted secret format");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ct = Buffer.from(ctHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(ct) + decipher.final("utf8");
}

/** Generate a new TOTP secret for enrollment. */
export function generateSecret(): string {
  return authenticator.generateSecret(20);
}

/**
 * Verify a TOTP code against an encrypted stored secret.
 * Returns true if the code is valid within the tolerance window.
 */
export function verifyTotp(code: string, encryptedSecret: string): boolean {
  try {
    const secret = decryptSecret(encryptedSecret);
    return authenticator.verify({ token: code, secret });
  } catch {
    return false;
  }
}

/**
 * Generate a TOTP URI for QR code rendering.
 * @param email - super-admin email
 * @param secret - plain-text secret (before encryption)
 */
export function getTotpUri(email: string, secret: string): string {
  return authenticator.keyuri(email, "PeopleCore Admin", secret);
}
