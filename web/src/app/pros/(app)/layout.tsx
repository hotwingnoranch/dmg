import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { requireUser, getAccessToken } from "@/lib/auth";
import { createServerClient } from "@/lib/insforge";

const NAV = [
  { href: "/pros/dashboard", label: "Dashboard" },
  { href: "/pros/leads", label: "Leads" },
  { href: "/pros/responses", label: "My Responses" },
  { href: "/pros/billing", label: "Billing" },
  { href: "/pros/settings", label: "Settings" },
];

export default async function ProAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/pros/dashboard");

  // Make sure they have a pro row; otherwise route them to /pros/join
  const token = await getAccessToken();
  const insforge = createServerClient(token);
  const pro = await insforge.database
    .from("pros")
    .select("id, company_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!pro.data) redirect("/pros/join");

  return (
    <div className="min-h-screen flex flex-col bg-ink-950">
      <header className="sticky top-0 z-30 border-b border-ink-700 bg-white/95 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden md:flex items-center gap-1 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-full px-3 py-1.5 text-ink-300 hover:bg-ink-800 hover:text-ink-50"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline-flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-accent/15 font-display text-amber-accent">
                {(user.name ?? user.email ?? "P").charAt(0).toUpperCase()}
              </span>
              <span className="hidden lg:inline text-ink-200">
                {pro.data.company_name}
              </span>
            </span>
            <form action="/api/auth/signout" method="post">
              <button className="btn-outline">Sign out</button>
            </form>
          </div>
        </div>
        <div className="md:hidden border-t border-ink-700">
          <div className="container-page flex items-center gap-1 overflow-x-auto py-2 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-ink-300 hover:bg-ink-800 hover:text-ink-50"
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      </header>
      <main className="flex-1 container-page py-10">{children}</main>
    </div>
  );
}
