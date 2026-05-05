import Link from "next/link";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken, requireUser } from "@/lib/auth";

type Resp = {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
  request: {
    id: string;
    zip_code: string;
    city: string | null;
    contact_name: string | null;
    service_categories: { name: string } | null;
  } | null;
};

export default async function ProResponsesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const active = tab === "hired" ? "hired" : "pending";

  const user = await requireUser("/pros/responses");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const { data } = await insforge.database
    .from("responses")
    .select(
      "id, status, message, created_at, request:requests(id, zip_code, city, contact_name, service_categories(name))"
    )
    .eq("pro_id", user.id)
    .eq("status", active)
    .order("created_at", { ascending: false });

  const list = (data ?? []) as unknown as Resp[];

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h1 className="display-h2 mt-2">My Responses</h1>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Tab active={active === "pending"} href="/pros/responses?tab=pending">
          Pending
        </Tab>
        <Tab active={active === "hired"} href="/pros/responses?tab=hired">
          Hired
        </Tab>
      </div>

      <ul className="mt-6 grid gap-3">
        {list.map((r) => (
          <li
            key={r.id}
            className="card flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center"
          >
            <div>
              <p className="font-display text-lg font-bold">
                {r.request?.contact_name?.split(" ")[0] ?? "Client"} ·{" "}
                {r.request?.service_categories?.name ?? "Security"}
              </p>
              <p className="text-sm text-ink-300">
                {r.request?.city ? `${r.request.city}, ` : ""}
                {r.request?.zip_code} · responded{" "}
                {new Date(r.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`pill ${
                  active === "pending"
                    ? "border-amber-accent/30 text-amber-accent"
                    : "border-emerald-500/30 text-emerald-800"
                }`}
              >
                {active === "pending" ? "Pending" : "Hired"}
              </span>
              <Link
                href={`/pros/responses/${r.id}`}
                className="text-sm text-amber-accent hover:text-amber-deep"
              >
                Open →
              </Link>
            </div>
          </li>
        ))}
        {list.length === 0 && (
          <li className="card p-10 text-center text-sm text-ink-300">
            No {active} responses yet.
          </li>
        )}
      </ul>
    </div>
  );
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-1.5 text-sm transition ${
        active
          ? "border-amber-accent bg-amber-accent/15 text-amber-accent"
          : "border-ink-50/10 text-ink-200 hover:border-ink-50/20"
      }`}
    >
      {children}
    </Link>
  );
}
