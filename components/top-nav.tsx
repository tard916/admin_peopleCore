import Link from "next/link";
import { auth } from "@/lib/auth";

interface Crumb {
  label: string;
  href?: string;
}

interface TopNavProps {
  crumbs?: Crumb[];
  actions?: React.ReactNode;
}

export async function TopNav({ crumbs = [], actions }: TopNavProps) {
  const session = await auth();
  const user = session?.user as { name?: string; email?: string } | undefined;
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "SA";
  const email = user?.email ?? "";

  return (
    <nav
      className="h-12 bg-surface border-b border-border flex items-center px-5 gap-1.5 sticky top-0 z-20 shrink-0"
    >
      <Link
        href="/tenants"
        className="flex items-center gap-[7px] no-underline"
      >
        <div className="w-[22px] h-[22px] rounded-[5px] bg-primary flex items-center justify-center shrink-0">
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="4.5" r="2.5" fill="white" />
            <path
              d="M1 12c0-3.314 2.686-6 6-6s6 2.686 6 6"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="text-[13px] font-semibold text-foreground tracking-[-0.02em]">
          PeopleCore Admin
        </span>
      </Link>

      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="text-border text-sm select-none">/</span>
          {c.href ? (
            <Link
              href={c.href}
              className="text-[13px] text-muted-foreground no-underline hover:text-foreground transition-colors"
            >
              {c.label}
            </Link>
          ) : (
            <span className="text-[13px] text-foreground font-medium">
              {c.label}
            </span>
          )}
        </span>
      ))}

      <div className="flex-1" />

      {actions}

      <div className="flex items-center gap-2 ml-3">
        <div className="w-[26px] h-[26px] rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
          {initials}
        </div>
        <span className="text-[12px] text-muted-foreground hidden sm:block">{email}</span>
      </div>
    </nav>
  );
}
