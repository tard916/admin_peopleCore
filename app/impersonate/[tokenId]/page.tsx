import { currentSuperAdmin } from "@/lib/super-admin";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Redirecting… — PeopleCore Admin" };

/**
 * Impersonation handoff page.
 *
 * Renders a hidden form that auto-POSTs to PeopleCore's /api/impersonate.
 * Token never appears in a URL, server log, or Referer header.
 *
 * TODO (PC-78): ImpersonationToken model requires PC-69 migration.
 * Until then, this page shows a placeholder.
 */
export default async function ImpersonatePage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  await currentSuperAdmin();
  const { tokenId } = await params;

  // TODO (PC-78): uncomment after PC-69 migration adds ImpersonationToken model
  // const token = await prisma.impersonationToken.findUnique({ ... });
  void prisma; // referenced for future use

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
