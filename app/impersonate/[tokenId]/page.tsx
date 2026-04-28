import { currentSuperAdmin } from "@/lib/super-admin";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Redirecting… — PeopleCore Admin" };

/**
 * Impersonation handoff page.
 *
 * This page is the intermediate step between the admin app and PeopleCore.
 * It renders a hidden form that auto-submits via POST to PeopleCore's
 * /api/impersonate endpoint, passing the tokenId in the request body.
 *
 * The token never appears in a URL, server log, or Referer header.
 */
export default async function ImpersonatePage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  await currentSuperAdmin();
  const { tokenId } = await params;

  // Guard: verify token exists and is not yet consumed/expired
  const token = await prisma.impersonationToken.findUnique({
    where: { id: tokenId },
    select: { usedAt: true, expiresAt: true },
  });

  if (!token) notFound();

  if (token.usedAt || token.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-foreground">
            Impersonation link expired
          </h1>
          <p className="text-sm text-muted-foreground">
            This token has already been used or has expired. Return to the
            tenant detail page and try again.
          </p>
        </div>
      </div>
    );
  }

  const peoplecoreUrl = process.env.PEOPLECORE_URL ?? "http://localhost:3000";
  const actionUrl = `${peoplecoreUrl}/api/impersonate`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Redirecting to tenant workspace…
        </p>
        {/*
          Hidden form — auto-submits via script below.
          Token is in POST body, never in the URL.
        */}
        <form id="handoff" method="POST" action={actionUrl}>
          <input type="hidden" name="tokenId" value={tokenId} />
          <noscript>
            <button type="submit" className="underline text-sm">
              Click here if you are not redirected automatically
            </button>
          </noscript>
        </form>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.getElementById('handoff').submit();`,
          }}
        />
      </div>
    </div>
  );
}
