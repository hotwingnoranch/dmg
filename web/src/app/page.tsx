import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeroSearch } from "@/components/HeroSearch";
import { ServiceCard } from "@/components/ServiceCard";
import { createServerClient } from "@/lib/insforge";
import { getCurrentUser } from "@/lib/auth";
import { categoryImage, PRO_HERO } from "@/lib/images";
import { CheckCircle2, ShieldCheck, Clock, Star, ArrowRight } from "lucide-react";

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
};

async function getCategories(): Promise<Category[]> {
  const insforge = createServerClient();
  const { data, error } = await insforge.database
    .from("service_categories")
    .select("id, slug, name, description, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data as Category[];
}

export default async function Page() {
  const [user, categories] = await Promise.all([getCurrentUser(), getCategories()]);
  const featured = categories.slice(0, 8);

  return (
    <>
      <Header user={user} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-vanguard-wash">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-grid-faint opacity-50 [mask-image:radial-gradient(60%_60%_at_50%_30%,#000_30%,transparent_75%)]"
        />

        <div className="container-page pt-20 pb-28 lg:pt-28 lg:pb-36">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-accent shadow-[0_0_10px] shadow-amber-accent" />
              On-call protection · Vetted operators · United States
            </p>
            <h1 className="display-h1 mt-6 text-balance text-ink-50">
              Security professionals you can{" "}
              <em className="not-italic">
                <span className="bg-gradient-to-br from-amber-glow via-amber-accent to-amber-deep bg-clip-text font-display italic text-transparent">
                  trust
                </span>
              </em>
              <br />
              when minutes matter.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-ink-300">
              Vetted private security, executive protection, surveillance, and
              cyber experts. Get matched with the right team in minutes — not
              days.
            </p>

            <HeroSearch />

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs uppercase tracking-[0.2em] text-ink-400">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-accent" /> License-verified
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-accent" /> Avg. response 18&nbsp;min
              </span>
              <span className="inline-flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-accent" /> 4.9/5 client rating
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container-page -mt-10 pb-20 lg:pb-28">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Browse by service</p>
            <h2 className="display-h2 mt-3 text-ink-50">
              The full spectrum of protection.
            </h2>
          </div>
          <Link
            href="/services"
            className="hidden md:inline-flex items-center gap-2 text-sm text-amber-accent hover:text-amber-deep"
          >
            All categories
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((c, i) => (
            <ServiceCard
              key={c.slug}
              slug={c.slug}
              name={c.name}
              description={c.description ?? undefined}
              image={categoryImage(c.slug)}
              size={i === 0 || i === 5 ? "tall" : "default"}
              badge={i % 3 === 0 ? "Available 24/7" : undefined}
            />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container-page py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="display-h2 mt-3">
              From request to <em className="not-italic font-display italic text-amber-accent">on-site</em>{" "}
              in three steps.
            </h2>
            <p className="mt-5 text-ink-200">
              We pre-vet every team for licensing, insurance, and incident
              record so you can hire the right specialists with zero guesswork.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/buyer/request/new" className="btn-primary">
                Request protection
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pros/join" className="btn-outline">
                Join as a Pro
              </Link>
            </div>
          </div>

          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              {
                k: "01",
                t: "Tell us the situation",
                d: "Service, location, and timing — takes about a minute.",
              },
              {
                k: "02",
                t: "Get matched in minutes",
                d: "Up to 5 vetted teams reach out with availability and quotes.",
              },
              {
                k: "03",
                t: "Hire with confidence",
                d: "Compare credentials, response time, and reviews. Hire the right fit.",
              },
            ].map((s) => (
              <li
                key={s.k}
                className="card relative flex flex-col gap-3 p-6 transition hover:border-amber-accent/40"
              >
                <span className="font-mono text-xs tracking-[0.2em] text-amber-accent/80">
                  {s.k}
                </span>
                <h3 className="font-display text-xl font-bold leading-snug">
                  {s.t}
                </h3>
                <p className="text-sm text-ink-300">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* TRUST BAND */}
      <section className="border-y border-ink-700 bg-ink-900">
        <div className="container-page grid grid-cols-2 gap-y-8 py-12 sm:grid-cols-4">
          {[
            { v: "1,400+", l: "Vetted teams" },
            { v: "47", l: "States covered" },
            { v: "18 min", l: "Avg response" },
            { v: "4.9 / 5", l: "Client rating" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <p className="font-display text-3xl md:text-4xl tracking-tightest text-ink-50">
                {s.v}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-ink-400">
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="container-page py-24">
        <p className="eyebrow">Trusted by risk teams</p>
        <h2 className="display-h2 mt-3 max-w-2xl">
          Hand-picked operators. Real results.
        </h2>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {[
            {
              q: "We staffed a 4,000-person product launch in 72 hours. Their team handled credentialing, perimeter, and VIP escort flawlessly.",
              n: "Marisol G.",
              r: "Director of Risk, FinTech",
              s: 5,
            },
            {
              q: "License checks built into the platform meant we skipped two weeks of vendor diligence. The detail showed up early, in plain clothes.",
              n: "Daniel K.",
              r: "Chief of Staff, Family Office",
              s: 5,
            },
            {
              q: "Cyber posture scoped, pen-tested, and remediated inside one quarter. Worth every credit.",
              n: "Aisha R.",
              r: "VP Engineering, Logistics",
              s: 5,
            },
          ].map((t, i) => (
            <figure
              key={i}
              className="card flex h-full flex-col gap-5 p-6 transition hover:border-amber-accent/40"
            >
              <div className="flex items-center gap-1 text-amber-accent">
                {Array.from({ length: t.s }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="font-display text-lg leading-snug text-ink-50">
                &ldquo;{t.q}&rdquo;
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-3 border-t border-ink-50/5 pt-5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-amber-accent/15 font-display text-sm text-amber-accent">
                  {t.n.charAt(0)}
                </span>
                <span className="text-sm">
                  <span className="block font-medium">{t.n}</span>
                  <span className="block text-xs text-ink-300">{t.r}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* PRO CTA */}
      <section className="container-page pb-24">
        <div className="overflow-hidden rounded-3xl border border-ink-700 bg-navy-900 text-white">
          <div className="grid lg:grid-cols-[1.2fr_1fr]">
            <div className="relative px-8 py-14 lg:px-14 lg:py-20">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-glow">For professionals</p>
              <h2 className="display-h2 mt-3 max-w-md text-white">
                Win quality contracts. Keep <em className="not-italic font-display italic text-amber-glow">100%</em> of the job.
              </h2>
              <p className="mt-5 max-w-md text-white/80">
                Tens of thousands of clients are searching Vanguard every
                week. Set your service area, choose the leads you want, and
                pay only for the ones you respond to.
              </p>

              <ul className="mt-8 grid max-w-md gap-3 text-sm text-white/90">
                {[
                  "Real-time leads filtered by your service area",
                  "Background-checked client profile + verified phone",
                  "No commission on jobs you win",
                  "Elite Pro program for top-rated teams",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-amber-glow" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href="/pros/join"
                  className="btn bg-amber-accent text-white hover:bg-amber-deep shadow-[0_8px_28px_-12px_rgba(168,122,37,0.55)]"
                >
                  Join as a Pro
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pros"
                  className="btn border border-white/30 text-white hover:bg-white/10"
                >
                  How leads work
                </Link>
              </div>
            </div>
            <div
              className="relative min-h-[280px] bg-cover bg-center lg:min-h-0"
              style={{ backgroundImage: `url(${PRO_HERO})` }}
              aria-hidden
            >
              <span className="absolute inset-0 bg-gradient-to-l from-transparent via-navy-900/30 to-navy-900" />
              <span className="absolute bottom-6 right-6 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-glow shadow-[0_0_8px] shadow-amber-glow" />
                Live leads
              </span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
