import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ServiceCard } from "@/components/ServiceCard";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken, requireUser } from "@/lib/auth";
import { categoryImage } from "@/lib/images";
import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react";

type RequestRow = {
  id: string;
  zip_code: string;
  city: string | null;
  status: string;
  urgency: string;
  created_at: string;
  service_categories:
    | { name: string; slug: string }
    | { name: string; slug: string }[]
    | null;
};

type Cat = { slug: string; name: string; description: string | null };

async function getRequests(): Promise<RequestRow[]> {
  const token = await getAccessToken();
  if (!token) return [];
  const insforge = createServerClient(token);
  const me = await insforge.auth.getCurrentUser();
  if (!me.data?.user) return [];

  const { data } = await insforge.database
    .from("requests")
    .select(
      "id, zip_code, city, status, urgency, created_at, service_categories(name, slug)"
    )
    .eq("buyer_id", me.data.user.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as RequestRow[];
}

function pickCategory(
  cat: RequestRow["service_categories"]
): { name: string; slug: string } | null {
  if (!cat) return null;
  if (Array.isArray(cat)) return cat[0] ?? null;
  return cat;
}

async function getOtherCategories(): Promise<Cat[]> {
  const insforge = createServerClient();
  const { data } = await insforge.database
    .from("service_categories")
    .select("slug, name, description")
    .eq("is_active", true)
    .order("sort_order")
    .limit(4);
  return (data ?? []) as Cat[];
}

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  open: { label: "Awaiting matches", tone: "text-amber-accent border-amber-accent/30 bg-amber-accent/10" },
  matched: { label: "Quotes received", tone: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
  closed: { label: "Closed", tone: "text-ink-300 border-ink-50/10 bg-ink-50/5" },
  cancelled: { label: "Cancelled", tone: "text-ink-300 border-ink-50/10 bg-ink-50/5" },
};

export default async function BuyerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const user = await requireUser("/buyer/dashboard");
  const { new: newId } = await searchParams;
  const [requests, alsoNeed] = await Promise.all([getRequests(), getOtherCategories()]);

  return (
    <>
      <Header user={user} variant="solid" />
      <main className="container-page py-12">
        {newId && (
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <CheckCircle2 className="h-5 w-5" />
            <span>
              Request submitted. Vetted security teams in your area are being
              notified — expect outreach within 1 hour.
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">My requests</p>
            <h1 className="display-h2 mt-2">Hello, {user.name ?? "there"}.</h1>
          </div>
          <Link href="/buyer/request/new" className="btn-primary">
            New request <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="card mt-10 grid place-items-center gap-3 p-12 text-center">
            <p className="font-display text-2xl font-bold">No requests yet.</p>
            <p className="text-sm text-ink-300">
              Place your first request — we&apos;ll match you with vetted
              security teams.
            </p>
            <Link href="/buyer/request/new" className="btn-primary mt-2">
              Place a request
            </Link>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {requests.map((r) => {
              const tone = STATUS_LABEL[r.status] ?? STATUS_LABEL.open;
              return (
                <li
                  key={r.id}
                  className="card flex flex-col justify-between gap-4 p-5 transition hover:border-amber-accent/40"
                >
                  <div>
                    <p className="font-display text-xl font-bold">
                      {pickCategory(r.service_categories)?.name ?? "Security request"}
                    </p>
                    <p className="mt-1 text-sm text-ink-300">
                      {r.city ? `${r.city}, ` : ""}
                      {r.zip_code} ·{" "}
                      <span className="inline-flex items-center gap-1 align-middle">
                        <Clock3 className="h-3.5 w-3.5" />
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${tone.tone}`}
                    >
                      {tone.label}
                    </span>
                    <Link
                      href={`/buyer/requests/${r.id}`}
                      className="text-sm text-amber-accent hover:text-amber-deep"
                    >
                      View →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {alsoNeed.length > 0 && (
          <section className="mt-20">
            <p className="eyebrow">You may also need</p>
            <h2 className="display-h2 mt-3">Other ways to harden up.</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {alsoNeed.map((c) => (
                <ServiceCard
                  key={c.slug}
                  slug={c.slug}
                  name={c.name}
                  description={c.description ?? undefined}
                  image={categoryImage(c.slug)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
