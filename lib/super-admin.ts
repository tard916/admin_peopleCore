import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export interface SuperAdminSession {
  id: string;
  email: string;
  name?: string | null;
}

/**
 * Server-side helper that asserts the current session belongs to a verified
 * super-admin. Throws (via redirect) if the session is absent or invalid.
 *
 * Usage in server actions and RSC pages:
 *   const superAdmin = await currentSuperAdmin();
 *
 * Mirrors peopleCore's currentTenant() pattern.
 */
export async function currentSuperAdmin(): Promise<SuperAdminSession> {
  const session = await auth();

  if (
    !session?.user?.id ||
    !(session.user as { isSuperAdmin?: boolean }).isSuperAdmin
  ) {
    redirect("/login");
  }

  return {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name,
  };
}
