import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Calendar,
  Clock,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ServiceCard } from "@/components/ServiceCard";
import { createServerClient } from "@/lib/insforge";
import { getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { categoryImage } from "@/lib/images";
import { LeaveReviewForm } from "./LeaveReviewForm";
import { deleteOwnReviewAction } from "./actions";
import { Trash2 } from "lucide-react";

type ProRow = {
  id: string;
  slug: string;
  company_name: string;
  tagline: string | null;
  bio: string | null;
  website: string | null;
  contact_email: string | null;
  facebook_url: string | null;
  address: string | null;
  years_in_business: number | null;
  staff_size: string | null;
  hires_count: number;
  response_time_minutes: number | null;
  rating_avg: number | string | null;
  review_count: number;
  is_elite: boolean;
  is_published: boolean;
  license_verified: boolean;
  insurance_verified: boolean;
  created_at: string;
};

type ProfileRow = {
  full_name: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
};

type ServiceRow = {
  service_categories:
    | { name: string; slug: string }
    | { name: string; slug: string }[]
    | null;
};

type AreaRow = {
  zip_code: string;
  city: string | null;
  state: string | null;
  radius_miles: number;
};

type ReviewRow = {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  buyer_id: string;
};

type PhotoRow = {
  id: string;
  url: string;
  caption: string | null;
  media_kind: "image" | "video";
};

type ProfilePhoto = {
  full_name: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  avatar_url: string | null;
};

function pickCat(rel: ServiceRow["service_categories"]) {
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel;
}

function safeUrl(input: string | null): { display: string; href: string } | null {
  if (!input) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    return { display: u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, ""), href: u.toString() };
  } catch {
    return null;
  }
}

async function loadPro(slug: string) {
  const insforge = createServerClient();
  const proRes = await insforge.database
    .from("pros")
    .select(
      "id, slug, company_name, tagline, bio, website, contact_email, facebook_url, address, years_in_business, staff_size, hires_count, response_time_minutes, rating_avg, review_count, is_elite, is_published, license_verified, insurance_verified, created_at"
    )
    .eq("slug", slug)
    .maybeSingle();
  const pro = proRes.data as ProRow | null;
  if (!pro || !pro.is_published) return null;

  const [profileRes, servicesRes, areasRes, reviewsRes, photosRes] =
    await Promise.all([
      insforge.database
        .from("profiles")
        .select("full_name, phone, city, state, zip_code, avatar_url")
        .eq("id", pro.id)
        .maybeSingle(),
      insforge.database
        .from("pro_services")
        .select("service_categories(name, slug)")
        .eq("pro_id", pro.id),
      insforge.database
        .from("service_areas")
        .select("zip_code, city, state, radius_miles")
        .eq("pro_id", pro.id),
      insforge.database
        .from("reviews")
        .select("id, rating, body, created_at, buyer_id")
        .eq("pro_id", pro.id)
        .order("created_at", { ascending: false })
        .limit(50),
      insforge.database
        .from("pro_photos")
        .select("id, url, caption, media_kind")
        .eq("pro_id", pro.id)
        .order("created_at", { ascending: false })
        .limit(24),
    ]);

  const reviews = (reviewsRes.data ?? []) as ReviewRow[];

  // Resolve reviewer names in a single follow-up batch.
  const buyerIds = Array.from(new Set(reviews.map((r) => r.buyer_id)));
  const reviewerMap = new Map<string, string | null>();
  if (buyerIds.length > 0) {
    const reviewerRes = await insforge.database
      .from("profiles")
      .select("id, full_name")
      .in("id", buyerIds);
    for (const row of (reviewerRes.data ?? []) as {
      id: string;
      full_name: string | null;
    }[]) {
      reviewerMap.set(row.id, row.full_name);
    }
  }

  return {
    pro,
    profile: (profileRes.data ?? null) as ProfileRow | null,
    services: (servicesRes.data ?? []) as unknown as ServiceRow[],
    areas: (areasRes.data ?? []) as AreaRow[],
    reviews,
    reviewerMap,
    photos: (photosRes.data ?? []) as PhotoRow[],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadPro(slug);
  if (!data) return { title: "Pro not found — Vanguard" };
  return {
    title: `${data.pro.company_name} — Vanguard`,
    description:
      data.pro.tagline ??
      data.pro.bio?.slice(0, 160) ??
      `${data.pro.company_name} on the Vanguard security marketplace.`,
  };
}

const REVIEW_MSG: Record<string, { tone: "ok" | "err"; text: string }> = {
  ok: { tone: "ok", text: "Review posted — thanks for the feedback!" },
  deleted: { tone: "ok", text: "Review removed." },
  self: { tone: "err", text: "You can't review your own profile." },
  bad_rating: { tone: "err", text: "Pick a rating from 1 to 5." },
  body_too_long: { tone: "err", text: "Review is too long. Max 2000 chars." },
  insert_failed: { tone: "err", text: "Could not post review. Try again." },
  delete_failed: { tone: "err", text: "Could not remove review." },
};

export default async function ProProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ review_msg?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await loadPro(slug);
  if (!data) notFound();

  const user = await getCurrentUser();
  const isAdmin = await isAdminEmail(user?.email);

  const { pro, profile, services, areas, reviews, reviewerMap, photos } = data;
  const histogram = reviewHistogram(reviews);
  const reviewMsg = sp.review_msg ? REVIEW_MSG[sp.review_msg] : null;
  const canReview = !!user && user.id !== pro.id;
  const myReview = reviews.find((r) => r.buyer_id === user?.id) ?? null;
  const ratingNum =
    pro.rating_avg == null
      ? null
      : typeof pro.rating_avg === "string"
        ? parseFloat(pro.rating_avg)
        : pro.rating_avg;
  const websiteLink = safeUrl(pro.website);
  const facebookLink = safeUrl(pro.facebook_url);
  const cats = services
    .map((s) => pickCat(s.service_categories))
    .filter((c): c is { name: string; slug: string } => !!c);
  const primaryCategory = cats[0];

  return (
    <>
      <Header user={user} isAdmin={isAdmin} />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <Image
          aria-hidden
          src={categoryImage(primaryCategory?.slug ?? "security-guard")}
          alt=""
          fill
          sizes="100vw"
          priority
          className="-z-20 object-cover opacity-25"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-white/70 via-white/85 to-white"
        />
        <div className="container-page pt-16 pb-10 lg:pt-20">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink-400">
                {primaryCategory && (
                  <Link
                    href={`/services/${primaryCategory.slug}`}
                    className="hover:text-amber-accent"
                  >
                    {primaryCategory.name}
                  </Link>
                )}
                {pro.is_elite && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-accent bg-amber-accent/10 px-2.5 py-0.5 font-bold text-amber-accent normal-case tracking-normal">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Elite Pro
                  </span>
                )}
              </div>
              <h1 className="display-h1 mt-4 text-balance">
                {pro.company_name}
              </h1>
              {pro.tagline && (
                <p className="mt-4 max-w-xl text-pretty text-lg text-ink-300">
                  {pro.tagline}
                </p>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-300">
                {ratingNum != null && ratingNum > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-accent text-amber-accent" />
                    <span className="font-display text-base font-bold text-ink-50">
                      {ratingNum.toFixed(1)}
                    </span>
                    <span>({pro.review_count} reviews)</span>
                  </span>
                )}
                {pro.hires_count > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4" /> {pro.hires_count} hires
                  </span>
                )}
                {typeof pro.years_in_business === "number" && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />{" "}
                    {pro.years_in_business} yrs in business
                  </span>
                )}
                {pro.response_time_minutes != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" /> ~{pro.response_time_minutes}m
                    response
                  </span>
                )}
                {pro.staff_size && (
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4" /> {pro.staff_size}
                  </span>
                )}
              </div>
            </div>

            {/* Right rail: contact card */}
            <aside className="card-elev p-6">
              <p className="eyebrow">Contact</p>
              <h2 className="font-display text-xl font-bold mt-2">
                Request a quote
              </h2>
              <p className="mt-1 text-sm text-ink-300">
                Submit a request and we&apos;ll route it to {pro.company_name}{" "}
                — they typically respond within an hour.
              </p>
              <Link
                href={`/buyer/request/new${primaryCategory ? `?category=${primaryCategory.slug}` : ""}`}
                className="btn-primary mt-4 w-full"
              >
                Request a quote <ArrowRight className="h-4 w-4" />
              </Link>

              <hr className="my-5 border-ink-700" />

              <ul className="grid gap-2 text-sm">
                {pro.contact_email && (
                  <li className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4 text-ink-400" />
                    <a
                      href={`mailto:${pro.contact_email}`}
                      className="font-mono text-xs hover:text-amber-accent"
                    >
                      {pro.contact_email}
                    </a>
                  </li>
                )}
                {profile?.phone && (
                  <li className="inline-flex items-center gap-2">
                    <Phone className="h-4 w-4 text-ink-400" />
                    <a
                      href={`tel:${profile.phone.replace(/\D/g, "")}`}
                      className="font-mono text-xs hover:text-amber-accent"
                    >
                      {profile.phone}
                    </a>
                  </li>
                )}
                {websiteLink && (
                  <li className="inline-flex items-center gap-2">
                    <Globe className="h-4 w-4 text-ink-400" />
                    <a
                      href={websiteLink.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs hover:text-amber-accent"
                    >
                      {websiteLink.display}
                    </a>
                  </li>
                )}
                {(profile?.city || profile?.state || profile?.zip_code) && (
                  <li className="inline-flex items-center gap-2 text-xs text-ink-300">
                    <MapPin className="h-4 w-4 text-ink-400" />
                    {profile?.city ? `${profile.city}, ` : ""}
                    {profile?.state ?? ""} {profile?.zip_code ?? ""}
                  </li>
                )}
              </ul>

              {(pro.license_verified || pro.insurance_verified) ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {pro.license_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400 bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900">
                      <ShieldCheck className="h-3 w-3" />
                      License verified
                    </span>
                  )}
                  {pro.insurance_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400 bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900">
                      <ShieldCheck className="h-3 w-3" />
                      Insured
                    </span>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-[11px] text-ink-400">
                  Verification pending.
                </p>
              )}
            </aside>
          </div>
        </div>
      </section>

      {/* PAST JOBS — gallery (images + videos) */}
      {photos.length > 0 && (
        <section className="container-page py-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <p className="eyebrow">Past jobs</p>
            <span className="text-xs text-ink-400">
              {photos.length} {photos.length === 1 ? "item" : "items"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.slice(0, 12).map((p) => (
              <figure
                key={p.id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-ink-700 bg-ink-900"
                title={p.caption ?? undefined}
              >
                {p.media_kind === "video" ? (
                  <video
                    src={p.url}
                    className="h-full w-full object-cover"
                    controls
                    preload="metadata"
                    playsInline
                  />
                ) : (
                  <Image
                    src={p.url}
                    alt={p.caption ?? ""}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover"
                  />
                )}
                {p.caption && (
                  <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-[11px] text-white opacity-0 transition group-hover:opacity-100">
                    {p.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* MAIN GRID */}
      <section className="container-page grid gap-10 py-10 lg:grid-cols-[1.4fr_1fr]">
        {/* About + reviews */}
        <div className="grid gap-10">
          <div>
            <p className="eyebrow">About</p>
            <h2 className="display-h2 mt-2">
              {pro.company_name}
            </h2>
            {pro.bio ? (
              <p className="mt-5 whitespace-pre-wrap text-pretty text-base leading-relaxed text-ink-200">
                {pro.bio}
              </p>
            ) : (
              <p className="mt-5 text-sm italic text-ink-400">
                No bio yet.
              </p>
            )}
          </div>

          <div id="reviews" className="scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Reviews</p>
                <h2 className="display-h2 mt-2">
                  {pro.review_count > 0
                    ? `${ratingNum?.toFixed(1) ?? "—"} from ${pro.review_count} client${pro.review_count === 1 ? "" : "s"}`
                    : "No reviews yet"}
                </h2>
              </div>
              {ratingNum != null && ratingNum > 0 && (
                <div className="flex items-center gap-1 text-amber-accent">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < Math.round(ratingNum) ? "fill-amber-accent" : "fill-transparent"}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {reviewMsg && (
              <div
                className={`mt-4 rounded-xl border px-4 py-2.5 text-sm ${
                  reviewMsg.tone === "ok"
                    ? "border-emerald-400 bg-emerald-100 text-emerald-900"
                    : "border-red-400 bg-red-100 text-red-900"
                }`}
              >
                {reviewMsg.text}
              </div>
            )}

            {/* Histogram + leave-review CTA */}
            {pro.review_count > 0 && (
              <div className="mt-6 grid gap-6 rounded-2xl border border-ink-700 bg-white p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <div className="text-center">
                  <p className="font-display text-5xl font-bold tracking-tightest text-amber-accent">
                    {ratingNum?.toFixed(1) ?? "—"}
                  </p>
                  <div className="mt-1 flex items-center justify-center gap-0.5 text-amber-accent">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < Math.round(ratingNum ?? 0) ? "fill-amber-accent" : "fill-transparent"}`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-ink-400">
                    {pro.review_count} reviews
                  </p>
                </div>

                <ul className="grid gap-1.5 text-xs">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = histogram[star] ?? 0;
                    const pct = pro.review_count
                      ? Math.round((count / pro.review_count) * 100)
                      : 0;
                    return (
                      <li
                        key={star}
                        className="grid grid-cols-[20px_1fr_50px] items-center gap-2"
                      >
                        <span className="inline-flex items-center gap-0.5 text-ink-300">
                          {star}
                          <Star className="h-3 w-3 fill-amber-accent text-amber-accent" />
                        </span>
                        <span className="relative h-2 overflow-hidden rounded-full bg-ink-900">
                          <span
                            className="absolute inset-y-0 left-0 rounded-full bg-amber-accent"
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <span className="text-right font-mono text-ink-400">
                          {pct}%
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {canReview && !myReview && (
                  <div className="self-end">
                    <LeaveReviewForm
                      slug={pro.slug}
                      proId={pro.id}
                      proCompany={pro.company_name}
                    />
                  </div>
                )}
              </div>
            )}

            {canReview && !myReview && pro.review_count === 0 && (
              <div className="mt-6">
                <LeaveReviewForm
                  slug={pro.slug}
                  proId={pro.id}
                  proCompany={pro.company_name}
                />
              </div>
            )}

            {!user && (
              <p className="mt-4 text-sm text-ink-300">
                <Link
                  href={`/login?next=${encodeURIComponent(`/pros/profile/${pro.slug}`)}`}
                  className="font-medium text-amber-accent hover:text-amber-deep"
                >
                  Log in
                </Link>{" "}
                to leave a review.
              </p>
            )}

            {reviews.length === 0 ? (
              <p className="mt-6 text-sm text-ink-400">
                Be the first to hire and review this team.
              </p>
            ) : (
              <ul className="mt-6 grid gap-4">
                {reviews.map((r) => {
                  const reviewerName =
                    reviewerMap.get(r.buyer_id) ?? "Vanguard client";
                  const isMine = user?.id === r.buyer_id;
                  return (
                    <li key={r.id} className="card-elev p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1 text-amber-accent">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-accent" : "fill-transparent"}`}
                              />
                            ))}
                          </div>
                          <p className="mt-1 font-medium">
                            {reviewerName}
                            {isMine && (
                              <span className="ml-2 inline-flex items-center rounded-full border border-amber-accent/40 bg-amber-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-accent">
                                you
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="text-xs text-ink-400">
                          {new Date(r.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {r.body && (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-200">
                          {r.body}
                        </p>
                      )}
                      {isMine && (
                        <form action={deleteOwnReviewAction} className="mt-3">
                          <input type="hidden" name="slug" value={pro.slug} />
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 bg-white px-2.5 py-1 text-[11px] text-ink-300 hover:border-red-500/40 hover:text-red-900"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete my review
                          </button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right column: services + areas + facts */}
        <aside className="grid gap-4 self-start">
          <section className="card-elev p-5">
            <p className="eyebrow">Services</p>
            <h3 className="font-display text-lg font-bold mt-2">
              What we offer
            </h3>
            {cats.length === 0 ? (
              <p className="mt-3 text-sm text-ink-400">
                No services configured yet.
              </p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {cats.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/services/${c.slug}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 text-sm transition hover:border-amber-accent"
                    >
                      <span>{c.name}</span>
                      <ArrowRight className="h-4 w-4 text-ink-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {areas.length > 0 && (
            <section className="card-elev p-5">
              <p className="eyebrow">Service area</p>
              <h3 className="font-display text-lg font-bold mt-2">
                Where we work
              </h3>
              <ul className="mt-3 grid gap-2 text-sm">
                {areas.map((a, i) => (
                  <li
                    key={`${a.zip_code}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink-700 bg-ink-900 px-3 py-2"
                  >
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-amber-accent" />
                      {a.city ? `${a.city}, ` : ""}
                      {a.state ?? ""} {a.zip_code}
                    </span>
                    <span className="font-mono text-xs text-ink-300">
                      {a.radius_miles}mi
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(facebookLink || pro.address) && (
            <section className="card-elev p-5">
              <p className="eyebrow">More</p>
              <ul className="mt-3 grid gap-2 text-sm text-ink-200">
                {pro.address && (
                  <li className="inline-flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-ink-400" />
                    {pro.address}
                  </li>
                )}
                {facebookLink && (
                  <li className="inline-flex items-center gap-2">
                    <Globe className="h-4 w-4 text-ink-400" />
                    <a
                      href={facebookLink.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs hover:text-amber-accent"
                    >
                      {facebookLink.display}
                    </a>
                  </li>
                )}
              </ul>
            </section>
          )}
        </aside>
      </section>

      {/* Related services CTA */}
      {cats.length > 1 && (
        <section className="container-page pb-20">
          <p className="eyebrow">More from {pro.company_name}</p>
          <h2 className="display-h2 mt-2">Other services</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cats.slice(1, 4).map((c) => (
              <ServiceCard
                key={c.slug}
                slug={c.slug}
                name={c.name}
                image={categoryImage(c.slug)}
              />
            ))}
          </div>
        </section>
      )}

      <Footer />
    </>
  );
}

function reviewHistogram(rows: ReviewRow[]): Record<number, number> {
  const out: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of rows) {
    if (r.rating >= 1 && r.rating <= 5) out[r.rating] = (out[r.rating] ?? 0) + 1;
  }
  return out;
}
