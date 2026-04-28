import { getIronSession, type SessionOptions as IronSessionOptions } from "iron-session";
import { cookies } from "next/headers";

/**
 * Iron session for short-lived flash data that must not persist in the DB.
 *
 * Currently used for:
 * - One-time temp password display after tenant creation (60s TTL enforced
 *   by setting the cookie MaxAge)
 *
 * The session secret is distinct from AUTH_SECRET and must be ≥32 chars.
 */

interface AdminFlashSession {
  /** Temp password shown once on /onboard/success */
  tempPassword?: string;
  /** Tenant slug for context on the success page */
  tenantSlug?: string;
  /** Admin email for context on the success page */
  adminEmail?: string;
}

const sessionOptions: IronSessionOptions = {
  password: process.env.IRON_SESSION_SECRET!,
  cookieName: "admin_flash",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60, // 60 seconds — temp password display window
  },
};

export async function getFlashSession() {
  const cookieStore = await cookies();
  return getIronSession<AdminFlashSession>(cookieStore, sessionOptions);
}
