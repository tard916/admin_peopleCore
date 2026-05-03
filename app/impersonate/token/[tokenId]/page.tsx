import { currentSuperAdmin } from "@/lib/super-admin";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Redirecting… — PeopleCore Admin" };

/**
 * Impersonation POST handoff page (PC-78).
 *
 * Validates the token, then renders a hidden form that auto-POSTs to
 * PeopleCore's /api/impersonate. Token ID is only in the POST body —
 * not in any URL that could appear in server logs or Referer headers.
 */
export default async function ImpersonateHandoffPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const admin = await currentSuperAdmin();
  const { tokenId } = await params;

  const token = await prisma.impersonationToken.findUnique({
    where: { id: tokenId },
    select: {
      id: true,
      createdById: true,
      expiresAt: true,
      usedAt: true,
      tenant: { select: { name: true } },
    },
  });

  if (!token) notFound();
  if (token.createdById !== admin.id) notFound(); // not your token

  if (token.usedAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="bg-surface border border-border rounded-xl p-7 max-w-[400px] text-center">
          <h1 className="text-[16px] font-semibold text-foreground mb-2">Token already used</h1>
          <p className="text-[13px] text-muted-foreground mb-5">
            This impersonation link has already been consumed. Return to the tenant and generate a new one.
          </p>
          <a href="/tenants" className="inline-block px-4 py-2 bg-primary text-white text-[13px] font-medium rounded-lg hover:bg-[#001e6e] transition-colors">
            ← Back to tenants
          </a>
        </div>
      </div>
    );
  }

  if (token.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="bg-surface border border-border rounded-xl p-7 max-w-[400px] text-center">
          <h1 className="text-[16px] font-semibold text-foreground mb-2">Token expired</h1>
          <p className="text-[13px] text-muted-foreground mb-5">
            This impersonation link expired. Return to the tenant and generate a new one.
          </p>
          <a href="/tenants" className="inline-block px-4 py-2 bg-primary text-white text-[13px] font-medium rounded-lg hover:bg-[#001e6e] transition-colors">
            ← Back to tenants
          </a>
        </div>
      </div>
    );
  }

  const peoplecoreUrl = process.env.PEOPLECORE_URL ?? "http://localhost:3000";
  const actionUrl = `${peoplecoreUrl}/api/impersonate`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-2">
        <p className="text-[13px] text-muted-foreground">
          Signing in to <strong>{token.tenant.name}</strong>…
        </p>
        <form id="handoff" method="POST" action={actionUrl}>
          <input type="hidden" name="tokenId" value={tokenId} />
          <noscript>
            <button type="submit" className="underline text-sm">
              Click here if not redirected automatically
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
