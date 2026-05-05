import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AssistantWidget } from "@/components/AssistantWidget";
import { UserMenu } from "@/components/UserMenu";
import { requireUser, getAccessToken } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { createServerClient } from "@/lib/insforge";
import { totalUnread } from "@/lib/messaging";

const NAV = [
  { href: "/pros/dashboard", label: "Dashboard" },
  { href: "/pros/leads", label: "Leads" },
  { href: "/pros/responses", label: "Responses" },
  { href: "/pros/billing", label: "Billing" },
  { href: "/affiliate", label: "Refer" },
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
  const [proRes, profileRes] = await Promise.all([
    insforge.database
      .from("pros")
      .select("id, company_name")
      .eq("id", user.id)
      .maybeSingle(),
    insforge.database
      .from("profiles")
      .select("avatar_url, full_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const pro = proRes;
  if (!pro.data) redirect("/pros/join");
  const profile = profileRes.data as
    | { avatar_url: string | null; full_name: string | null }
    | null;

  const isAdmin = await isAdminEmail(user.email);
  const unread = await totalUnread(token!, user.id).catch(() => 0);

  return (
    <div className="min-h-screen flex flex-col bg-ink-950">
      <header className="sticky top-0 z-30 border-b border-ink-700 bg-white/95 backdrop-blur">
        <div className="container-page flex h-20 items-center justify-between gap-4">
          <div className="flex items-center gap-4 lg:gap-6 min-w-0">
            <Logo />
            <nav className="hidden lg:flex items-center gap-0.5 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="whitespace-nowrap rounded-full px-3 py-1.5 text-ink-300 hover:bg-ink-800 hover:text-ink-50"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-none items-center gap-2 text-sm">
            <Link
              href="/messages"
              title="Messages"
              className="relative inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-white px-2.5 py-1.5 text-xs text-ink-200 hover:border-amber-accent hover:text-amber-accent"
              aria-label={`Messages${unread > 0 ? `, ${unread} unread` : ""}`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Messages</span>
              {unread > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-amber-accent px-1 text-[10px] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                title="Admin"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-accent bg-amber-accent/10 px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-amber-accent hover:bg-amber-accent hover:text-white"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">Admin</span>
              </Link>
            )}
            <UserMenu
              name={
                pro.data.company_name ??
                profile?.full_name ??
                user.name ??
                user.email
              }
              avatarUrl={profile?.avatar_url ?? null}
              isAdmin={isAdmin}
            />
          </div>
        </div>
        <div className="lg:hidden border-t border-ink-700">
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
      <AssistantWidget companyName={pro.data.company_name ?? undefined} />
    </div>
  );
}
