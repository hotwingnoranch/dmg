import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

type LegalDoc = {
  slug: "terms" | "privacy" | "cookies";
  title: string;
  subtitle: string;
  effective: string;
  sections: { heading: string; body: string[] }[];
};

const DOCS: Record<string, LegalDoc> = {
  terms: {
    slug: "terms",
    title: "Terms of Service",
    subtitle: "The rules of using the Vanguard marketplace.",
    effective: "May 5, 2026",
    sections: [
      {
        heading: "Acceptance",
        body: [
          "By creating a Vanguard account, requesting a quote, or responding to a lead, you agree to these Terms. If you don't agree, don't use the platform.",
          "We may update these Terms from time to time; the effective date above tracks the latest version. Material changes will be emailed to active accounts at least 14 days before they take effect.",
        ],
      },
      {
        heading: "Accounts",
        body: [
          "You must be at least 18 to create an account. Pros must hold valid licenses and insurance for the services they offer.",
          "You're responsible for everything that happens on your account. Don't share credentials. Tell us immediately at security@vanguard.example if you suspect unauthorized access.",
        ],
      },
      {
        heading: "Buyer requests",
        body: [
          "When you submit a request, we route it to vetted security professionals in your area whose service categories match your need.",
          "Vanguard is a marketplace. We don't perform the security work itself, set rates, or enter contracts on your behalf. The agreement, the work, and the warranty live between you and the pro you hire.",
        ],
      },
      {
        heading: "Pro responsibilities",
        body: [
          "Pros must respond to leads in good faith, charge only the rates they advertised in their response, and abide by all federal, state, and local laws governing private security operations.",
          "Misrepresenting credentials, soliciting off-platform to evade fees, or harassing buyers will result in immediate termination of your Vanguard account.",
        ],
      },
      {
        heading: "Credits and subscriptions",
        body: [
          "Credit packs are non-refundable but never expire. Auto top-up charges your saved card up to the pack you selected when your balance drops below your threshold.",
          "Subscriptions renew monthly. Cancel anytime from /pros/billing — access continues to the end of the paid period.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "Vanguard is provided \"as is.\" To the maximum extent permitted by law, we disclaim all implied warranties.",
          "Our aggregate liability for any claim arising out of or relating to the platform is capped at the fees you paid Vanguard in the 12 months preceding the claim.",
        ],
      },
      {
        heading: "Contact",
        body: [
          "Questions: legal@vanguard.example. We'll respond within five business days.",
        ],
      },
    ],
  },
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    subtitle: "What we collect, why we collect it, and how to control it.",
    effective: "May 5, 2026",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Account data: name, email, phone, password hash, role (buyer or pro).",
          "Pro data: company info, services, service area, licensing details, profile media, payment method (handled by Stripe — we don't store card numbers).",
          "Usage data: pages viewed, features used, request and response history. Anonymized analytics for improving the product.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "Match buyers with relevant pros, deliver lead alerts, process payments, prevent fraud, and improve the platform.",
          "Send transactional emails (e.g., new lead alerts, payment receipts). We don't send marketing emails without explicit opt-in.",
        ],
      },
      {
        heading: "Sharing",
        body: [
          "Buyer contact details are shared with a pro only after they respond to the buyer's request.",
          "Pro public profile data (company name, services, area, reviews) is visible to anyone browsing the marketplace.",
          "We use service providers (Stripe for payments, Resend for email, InsForge for backend hosting). They process data only on our instructions.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "Access, export, or delete your data: email privacy@vanguard.example. We respond within 30 days.",
          "California, EU, and UK residents have additional rights under CCPA / GDPR / UK GDPR — same email, we'll honor them in your jurisdiction.",
        ],
      },
      {
        heading: "Retention",
        body: [
          "Active accounts: as long as you use the platform.",
          "Closed accounts: identifying data is deleted within 90 days. Anonymized transaction records may be retained for accounting and fraud prevention.",
        ],
      },
      {
        heading: "Security",
        body: [
          "All traffic is encrypted in transit (TLS). Sensitive credentials are encrypted at rest.",
          "Report a vulnerability: security@vanguard.example. We acknowledge within 24 hours.",
        ],
      },
    ],
  },
  cookies: {
    slug: "cookies",
    title: "Cookie Policy",
    subtitle: "What we set, why, and how to opt out.",
    effective: "May 5, 2026",
    sections: [
      {
        heading: "Strictly necessary",
        body: [
          "insforge_access_token, insforge_refresh_token: keep you signed in. httpOnly, sameSite=lax. Required for the site to work.",
          "insforge_code_verifier: brief OAuth handshake artifact. Cleared after use.",
        ],
      },
      {
        heading: "Functional",
        body: [
          "We don't use third-party tracking cookies. There are no advertising or social pixels on Vanguard.",
        ],
      },
      {
        heading: "Analytics",
        body: [
          "Server-side request logs only. We don't load Google Analytics, Mixpanel, or similar client-side trackers.",
        ],
      },
      {
        heading: "Controls",
        body: [
          "Block or delete cookies via your browser settings. Note: clearing the auth cookies will sign you out.",
        ],
      },
    ],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = DOCS[slug];
  return {
    title: `${doc?.title ?? "Legal"} — Vanguard`,
    description: doc?.subtitle ?? "Legal information for Vanguard.",
  };
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) notFound();

  const user = await getCurrentUser();
  const isAdmin = await isAdminEmail(user?.email);

  const others = (Object.values(DOCS) as LegalDoc[]).filter(
    (d) => d.slug !== doc.slug
  );

  return (
    <>
      <Header user={user} isAdmin={isAdmin} />
      <main className="container-page py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_2.4fr]">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="eyebrow">Legal</p>
            <h1 className="display-h2 mt-3">Vanguard policies</h1>
            <nav className="mt-6 grid gap-2 text-sm">
              {(Object.values(DOCS) as LegalDoc[]).map((d) => (
                <Link
                  key={d.slug}
                  href={`/legal/${d.slug}`}
                  className={`rounded-xl border px-3 py-2.5 transition ${
                    d.slug === doc.slug
                      ? "border-amber-accent bg-amber-accent/5 text-amber-accent"
                      : "border-ink-700 bg-white hover:border-ink-600"
                  }`}
                >
                  {d.title}
                </Link>
              ))}
            </nav>
            <p className="mt-6 text-xs text-ink-400">
              Effective {doc.effective}
            </p>
          </aside>

          {/* Body */}
          <article>
            <header className="border-b border-ink-700 pb-6">
              <p className="eyebrow">{doc.title}</p>
              <h2 className="display-h2 mt-3">{doc.subtitle}</h2>
            </header>

            <div className="mt-8 grid gap-10">
              {doc.sections.map((s) => (
                <section key={s.heading}>
                  <h3 className="font-display text-xl font-bold">
                    {s.heading}
                  </h3>
                  <div className="mt-3 grid gap-3 text-sm leading-relaxed text-ink-200">
                    {s.body.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <hr className="my-12 border-ink-700" />

            <div className="grid gap-3 sm:grid-cols-2">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  href={`/legal/${o.slug}`}
                  className="card-elev flex items-center justify-between p-4 text-sm transition hover:border-amber-accent"
                >
                  <span>
                    <span className="block text-xs uppercase tracking-[0.18em] text-amber-accent">
                      Continue
                    </span>
                    <span className="mt-1 block font-display text-base font-bold">
                      {o.title}
                    </span>
                  </span>
                  <span className="text-amber-accent">→</span>
                </Link>
              ))}
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
