import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

interface Crumb {
  label: string;
  href?: string;
}

interface TopNavProps {
  crumbs?: Crumb[];
  actions?: React.ReactNode;
}

export async function TopNav({ crumbs = [], actions }: TopNavProps) {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  return (
    <nav className="h-12 bg-surface border-b border-border flex items-center px-5 gap-1.5 sticky top-0 z-20 shrink-0">
      <Link href="/tenants" className="flex items-center gap-2 no-underline">
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
        <span className="t-subheading">PeopleCore Admin</span>
      </Link>

      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="text-border text-sm select-none">/</span>
          {c.href ? (
            <Link
              href={c.href}
              className="t-ui-muted no-underline hover:text-foreground transition-colors"
            >
              {c.label}
            </Link>
          ) : (
            <span className="t-ui font-medium">{c.label}</span>
          )}
        </span>
      ))}

      <div className="flex-1" />
      {actions}

      <div className="flex items-center gap-2 ml-3">
        <span className="t-small hidden sm:block">{email}</span>
        <UserButton appearance={{ elements: { avatarBox: "w-[26px] h-[26px]" } }} />
      </div>
    </nav>
  );
}
