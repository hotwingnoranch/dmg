import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Download,
  FileText,
  Image as ImageIcon,
  Mail,
  Megaphone,
  PlayCircle,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ShareButtons } from "@/components/ShareButtons";
import { getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { categoryImage } from "@/lib/images";

export const metadata: Metadata = {
  title: "Affiliate marketing docs — Vanguard",
  description:
    "Branded images, sample emails, talking points and videos to help you promote Vanguard.",
};

type Asset = {
  title: string;
  desc: string;
  /** Optional download href; null = "coming soon" placeholder. */
  href: string | null;
  /** Optional preview image src. */
  preview?: string;
};

const LOGOS: Asset[] = [
  {
    title: "Shield (PNG, 2000×2000)",
    desc: "Square shield mark on transparent background.",
    href: "/logo-shield.webp",
    preview: "/logo-shield.webp",
  },
  {
    title: "Full lockup (PNG, 1600×900)",
    desc: "Shield + Vanguard wordmark, transparent background.",
    href: "/logo-full.webp",
    preview: "/logo-full.webp",
  },
  {
    title: "Brand guide (PDF)",
    desc: "Color tokens, typography, do's and don'ts.",
    href: null,
  },
];

const SOCIAL_IMAGES: Asset[] = [
  {
    title: "Square 1080×1080 — Hero",
    desc: "For Instagram feed and LinkedIn posts.",
    href: null,
    preview: categoryImage("executive-protection"),
  },
  {
    title: "Story 1080×1920 — CTA",
    desc: "For Instagram + Facebook stories with overlay text space.",
    href: null,
    preview: categoryImage("event-security"),
  },
  {
    title: "Landscape 1200×630 — Open Graph",
    desc: "For Facebook + LinkedIn link previews and Twitter Card.",
    href: null,
    preview: categoryImage("security-guard"),
  },
  {
    title: "Vertical 9:16 — TikTok hook",
    desc: "Static frame to overlay on top of motion footage.",
    href: null,
    preview: categoryImage("bodyguard"),
  },
];

const VIDEOS: Asset[] = [
  {
    title: "30-sec brand reel",
    desc: "Cinematic operator B-roll, voice-over included.",
    href: null,
  },
  {
    title: "60-sec founder pitch",
    desc: 'Short on "why Vanguard exists" — usable for paid social.',
    href: null,
  },
  {
    title: "TikTok hook templates (×3)",
    desc: "Vertical 9:16 with on-screen captions, ready to remix.",
    href: null,
  },
];

const COPY_PACK: { title: string; body: string }[] = [
  {
    title: "Cold email — security operators",
    body: `Subject: Vetted leads for {{Company}}

Hey {{First name}},

Quick one — there's a new marketplace I think you'll want on your radar.
Vanguard is a vetted directory just for private security: guards, EP, event,
PI, cyber. Buyers post requests with verified phone numbers. You pay a few
credits to respond — never a percentage of the contract.

Their pricing is honest, the leads are local, and they never take a cut of
the job. I joined and the first lead I unlocked turned into a $5,400
contract.

Take a look: {{REFERRAL_LINK}}

— {{Your name}}`,
  },
  {
    title: "Short social caption",
    body: `Found the security marketplace I wish existed years ago.
✅ Vetted, real-time leads
✅ No commission on contracts
✅ Transparent credit pricing

Try it: {{REFERRAL_LINK}}`,
  },
  {
    title: "Talking points",
    body: `• Vanguard never takes a cut of the contract — credits only
• Every buyer phone number is verified before the lead goes out
• Real-time notifications when a matching request is posted
• Free Standard plan; Pro and Elite Pro tiers for higher placement
• 24/7 dispatch and human support`,
  },
];

export default async function AffiliateMarketingDocsPage() {
  const user = await getCurrentUser();
  const isAdmin = await isAdminEmail(user?.email);

  return (
    <>
      <Header user={user} isAdmin={isAdmin} variant="solid" />
      <main className="container-page py-12">
        <Link
          href="/affiliates"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-ink-400 hover:text-amber-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          For affiliates
        </Link>

        <header className="mt-6 max-w-3xl">
          <p className="eyebrow">Marketing docs</p>
          <h1 className="display-h2 mt-3">
            Promote Vanguard with on-brand assets.
          </h1>
          <p className="mt-3 text-base text-ink-300">
            Logos, social images, video reels, and copy packs you can ship in
            minutes. Pull what you need, swap your referral link in, and post.
          </p>
        </header>

        <Section
          title="Logos & brand"
          icon={<ImageIcon className="h-4 w-4" />}
          subtitle="Use these on landing pages, email signatures, and social."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LOGOS.map((a) => (
              <AssetCard key={a.title} asset={a} kind="logo" />
            ))}
          </div>
        </Section>

        <Section
          title="Social images"
          icon={<ImageIcon className="h-4 w-4" />}
          subtitle="Pre-sized for the major networks. Drop your link into the caption."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SOCIAL_IMAGES.map((a) => (
              <AssetCard key={a.title} asset={a} kind="social" />
            ))}
          </div>
        </Section>

        <Section
          title="Video reels"
          icon={<PlayCircle className="h-4 w-4" />}
          subtitle="Short-form content for TikTok, Reels, and paid placements."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VIDEOS.map((a) => (
              <AssetCard key={a.title} asset={a} kind="video" />
            ))}
          </div>
        </Section>

        <Section
          title="Email + caption templates"
          icon={<Mail className="h-4 w-4" />}
          subtitle="Replace {{REFERRAL_LINK}} with your /r/<code>."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {COPY_PACK.map((c) => (
              <article
                key={c.title}
                className="card-elev p-5"
              >
                <p className="font-display text-base font-bold">{c.title}</p>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-ink-700 bg-ink-900 p-3 font-mono text-[11px] leading-relaxed text-ink-200">
                  {c.body}
                </pre>
              </article>
            ))}
          </div>
        </Section>

        <Section
          title="Quick share"
          icon={<Megaphone className="h-4 w-4" />}
          subtitle="One-tap share to social with the affiliates landing pre-filled."
        >
          <div className="card-elev p-6">
            <ShareButtons
              url={`${
                process.env.NEXT_PUBLIC_APP_URL ?? "https://vanguard.insforge.site"
              }/affiliates`}
              message="Vanguard is the vetted directory for private security pros. Refer pros, earn 20% on first credit purchases + 15% on subscriptions for a year."
              label="Share the affiliate program"
            />
          </div>
        </Section>

        <section className="mt-16 rounded-2xl border border-amber-accent/30 bg-amber-accent/5 p-6">
          <p className="eyebrow">Need something custom?</p>
          <h2 className="font-display text-xl font-bold mt-2">
            Email{" "}
            <a
              href="mailto:partners@vanguardsecurity.com"
              className="text-amber-accent hover:text-amber-deep"
            >
              partners@vanguardsecurity.com
            </a>
          </h2>
          <p className="mt-2 text-sm text-ink-300">
            Looking for a co-branded landing page, custom UTM tracking, or
            higher-tier commissions on a volume deal? We&apos;ll work with you.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <div className="mb-5 flex items-end justify-between gap-3 border-b border-ink-700 pb-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-amber-accent">
            {icon}
            {title}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-ink-300">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function AssetCard({
  asset,
  kind,
}: {
  asset: Asset;
  kind: "logo" | "social" | "video";
}) {
  const ready = !!asset.href;
  return (
    <article className="card-elev overflow-hidden">
      <div className="relative aspect-video w-full overflow-hidden bg-ink-900">
        {asset.preview ? (
          <Image
            src={asset.preview}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-ink-400">
            {kind === "video" ? (
              <PlayCircle className="h-10 w-10" />
            ) : (
              <FileText className="h-10 w-10" />
            )}
          </div>
        )}
        {!ready && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-amber-accent bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-accent">
            Coming soon
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="font-medium">{asset.title}</p>
        <p className="mt-1 text-xs text-ink-400">{asset.desc}</p>
        <div className="mt-3">
          {ready ? (
            <a
              href={asset.href!}
              download
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-white px-3 py-1.5 text-xs text-ink-200 hover:border-amber-accent hover:text-amber-accent"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-900 px-3 py-1.5 text-xs text-ink-400">
              Awaiting upload
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
