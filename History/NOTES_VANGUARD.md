# Vanguard Security Marketplace — Handoff Notes

A bark.com-style marketplace for private security services. Buyers post requests; vetted pros respond with quotes. Built as a contractor project for DMG Security; their team will run it.

---

## Live URLs & Repo

- **Production:** https://7q593khw.insforge.site
- **GitHub:** https://github.com/hotwingnoranch/dmg (public, `main` branch)
- **InsForge project:** `DMG` (id `b3927430-8f0f-4dc7-b918-0e2ca89c3a06`, region us-east, app key `7q593khw`)
- **Stripe:** test mode (`pk_test_…`/`sk_test_…`); webhook configured at `/api/stripe/webhook`
- **Resend:** Full Access key `re_EZkx…`; **domain not yet verified** — sender is `onboarding@resend.dev` so transactional emails only deliver to `tk@dmgsecurityco.com` until DNS is set up

---

## Stack — important conventions

- **Next.js 16.2.4** (App Router). Breaking changes vs older Next:
  - `params` and `searchParams` are `Promise`s — `await` them
  - `cookies()` is async
  - `middleware.ts` was renamed `proxy.ts` (file lives at `web/src/proxy.ts`)
  - Auto-generated `PageProps<...>` / `LayoutProps<...>` global helper types
- **Tailwind 3.4** (NOT v4 — InsForge deployment doesn't support v4). Color palette in `web/tailwind.config.ts`, utility classes in `web/src/app/globals.css`.
- **TypeScript** strict-ish; we use `unknown` casts for InsForge relation results because the SDK types relations as arrays even when one-to-one.
- **InsForge SDK** — `@insforge/sdk` in `isServerMode: true` for SSR. Auth tokens live in httpOnly cookies, refreshed transparently by `src/proxy.ts`.
- **No streaming AI** yet. Non-streaming Gemini API call.

---

## What's Done

### Infrastructure / Backend

- 4 SQL migrations applied (`migrations/`):
  - `…_init-marketplace.sql` — profiles, pros, service_categories (14 seeded), pro_services, service_areas, requests, responses, response_activity, reviews, pro_photos
  - `…_payments.sql` — payments table + subscription/customer columns on pros
  - `…_auto-topup.sql` — auto-topup columns + saved PM
  - `…_admins.sql` — admins table + `is_admin()` SECURITY DEFINER function + 3 seeded emails
  - `…_admin-audit.sql` — admin_audit table
- All tables have RLS. Buyer/pro tokens go through user policies; admin client (`createAdminClient()`) uses the InsForge api_key and bypasses RLS for webhooks + admin pages.
- Storage buckets: `avatars`, `pro-photos` (created, not yet wired to UI).

### Auth

- Sign up + email-code verification (6-digit OTP) at `/signup`; sign in at `/login`.
- **Remember me** checkbox (default checked) — controls refresh-cookie persistence: 30 days if checked, browser-session-only if unchecked.
- **Show/hide password** toggle (eye icon) on the login form.
- Access cookie 1h, refresh cookie 7d (or 30d with remember). Proxy refreshes silently in `src/proxy.ts`.
- `requireUser()` / `requireAdmin()` helpers in `src/lib/auth.ts` and `src/lib/admin.ts`.

### Public marketing pages

- `/` — landing with hero search + 8 category cards + how-it-works + trust band + 3 testimonials + Pro CTA
- `/how-it-works` — buyer + pro flows with vetting band
- `/pros` — pro funnel marketing page (sample lead preview, pricing snapshot, FAQ)
- `/pricing` — public pricing breakdown (sub tiers + credit packs)
- `/services` — index of all 14 categories
- `/services/[slug]` — category detail with pros listing (sorted Elite → rating → hires)
- `/pros/profile/[slug]` — public pro profile with photos, services, areas, reviews, contact card
- `/about`, `/trust`, `/press`, `/contact`, `/help`, `/legal/{terms,privacy,cookies}` — marketing/legal stubs
- `/pros/elite` — Elite Pro program landing (ties into the `sub-elite` Stripe tier)

### Buyer flow

- `/buyer/request/new` — multi-section request form (category, location, urgency, details, contact)
- `/buyer/dashboard` — list of buyer's requests with status pills
- `/buyer/requests/[id]` — request detail with responses + estimates

### Pro flow

- `/pros/join` — multi-step onboarding (team, services, service area, website) → publishes profile
- `/pros/dashboard` — profile completeness, services + area, leads count, responses count
- `/pros/leads` — split-pane lead browser with **functional one-click response**:
  - Quick-message + estimate inline form
  - Cost varies by urgency: 25 / 18 / 12 credits (urgent/soon/flexible)
  - Debits credits, inserts `responses` row, redirects to response detail
  - "Not interested" inserts a `declined` response so the lead drops out of the feed
  - Insufficient credits → `/pros/billing?result=insufficient` with explanatory banner
- `/pros/responses` — Pending / Hired tabs
- `/pros/responses/[id]` — response detail with activity timeline (read-only for now; logging buttons are stubs)
- `/pros/billing` — credits tab + subscription tab
  - Three credit packs ($225.60 / $451.20 / $902.40, BEST VALUE on the largest)
  - Three subscription tiers (Standard $0 / Pro $79 / Elite Pro $249), Stripe-managed
  - Auto top-up settings panel (toggle, refill pack, threshold) with "Trigger now (test)" button
- `/pros/settings` — placeholder, links to re-run onboarding

### Stripe (direct, not via InsForge gateway)

InsForge payments are not enabled on this backend, so Stripe is wired directly via the Node SDK.

- `src/lib/stripe.ts` — Stripe client + catalog (CREDIT_PACKS, SUBSCRIPTION_TIERS, formatPrice helper)
- `src/app/pros/(app)/billing/actions.ts`:
  - `startCreditCheckout` — creates Checkout session, optional `setup_future_usage='off_session'` to save the card
  - `startSubscriptionCheckout` — Stripe Checkout in subscription mode, inline `price_data` with `recurring`
  - `reconcileCheckoutSession` — runs on success-page hit, idempotent on `stripe_session_id`
  - `setAutoTopUp`, `triggerAutoTopUp` — auto-topup settings + manual off-session charge
- `src/app/api/stripe/webhook/route.ts` — raw-body signature verification, handles 9 event types, uses `createAdminClient()` for cross-user writes:
  - `checkout.session.completed`
  - `customer.subscription.{created,updated,deleted}`
  - `invoice.payment_{succeeded,failed}`
  - `payment_intent.{succeeded,payment_failed}` (auto-topup)
  - `payment_method.attached` (saves default PM)

### Email (Resend)

- `src/lib/email.ts` — Resend client + branded HTML wrapper + 8 typed sends:
  - **Transactional:** buyer request confirmation, new lead alert (fan-out to up to 5 matching pros), pro welcome, auto-topup failed, subscription past-due
  - **Admin alerts:** new Elite Pro signup, pro payment failed, auto-topup failed
- All emails wrapped in a Vanguard-branded HTML template (navy header, amber accent).
- Admin alert recipients fetched fresh from `admins` table per event via `listAdminEmails()`.
- **Currently restricted** to `tk@dmgsecurityco.com` because Resend domain isn't verified yet.

### AI Assistant

- Floating "Ask Vanguard" widget on every `/pros/(app)/*` page (`src/components/AssistantWidget.tsx`)
- Backend route at `/api/ai/chat` — calls Google Gemini API directly (bypassing InsForge gateway)
- Model: `gemini-2.5-flash` (free tier: 15 RPM, 1500 req/day on this key — `gemini-2.0-flash` was quota-restricted on the user's project)
- System prompt embeds the pro's profile, services, areas, recent leads, recent responses, plan, credits, auto-topup state — all read with the user's own session token (RLS-respecting)
- `react-markdown` + `remark-gfm` render the assistant bubble; internal `/paths` route through Next.js `<Link>` for client-side nav
- Header reads "Powered by Vanguard AI"

### Admin dashboard (`/admin`)

- Visible only to emails in the `admins` table (3 seeded; can add more from the UI)
- Amber "Admin" pill in the nav (Header + pro app layout) when logged in as an admin
- KPIs: MRR (live from Stripe-side counts), Revenue MTD, Signups MTD, Churn % (red >5%)
- Three panels: Subscription mix, Revenue split (subs vs credits), Marketplace activity
- Time-series charts:
  - **Signups by week** — 12-week SVG sparkline with hover tooltips
  - **Subscription revenue by month** — 6-month amber bar chart
- Recent payments table with Export CSV (`/admin/export/payments`)
- Recent signups table with Export CSV + chevron link to per-pro detail
- **Per-pro deep dive** at `/admin/pros/[id]`: LTV, plan, credits, engagement, contact, services, service areas, full payments history, recent responses
- **Admins section**: add admin form, remove admin (self-removal blocked), audit-logged
- **Audit log panel** showing last 12 actions with green/red action tags

### Images / assets

- **Custom logo** in `web/public/logo-shield.webp` (header) + `logo-full.webp` (auth/footer)
- **Favicon**: `web/src/app/icon.png` (512×512) + `apple-icon.png` (180×180) — Next.js auto-generates the `<link>` tags
- **8 category PNGs** from `site_images/` converted to WebP via `scripts/convert-images.mjs` (sharp-based; 17 MB → 681 KB, 96% reduction)
- **6 categories** still on Unsplash (alarm-monitoring, cybersecurity, locksmith, k9-security, concierge-security, risk-consulting) — local art needed
- All photo backgrounds migrated to `next/image` with `fill` + responsive `sizes` for AVIF/WebP delivery + lazy loading
- `images.unsplash.com` whitelisted in `next.config.ts`
- Request-flow image override (`/categories/request/<slug>.webp`) — currently used for `security-guard`; pattern is extensible

### Mobile responsiveness

- `.btn` global class has `whitespace-nowrap` + tighter padding on mobile (`px-4 sm:px-5`)
- Logo wordmark "· SECURITY" hidden below sm:; main "Vanguard" text scales down
- Header CTA: "Join as a Pro" → "Join Pro" on mobile; admin pill hidden below sm:
- Tighter gap-3 on mobile, gap-6 sm: up

### Misc

- Local repo at `c:\Users\13057\Desktop\DMG\` with `.git` at root
- `web_examples/` is gitignored (reference screenshots + this notes file)
- Key envs in `web/.env.local` (also configured on InsForge deployment env): InsForge URL/keys, Stripe (publishable/secret/webhook), Resend, Gemini, app URL

---

## What's Pending

### High priority — explicitly requested for next session

1. **Affiliate program**
   - Spec: referral codes per pro/buyer, commission tracking on Stripe payments, pages for affiliates to view earnings, payout flow
   - DB: `referrals` table (id, code, owner_user_id, kind: pro|buyer, created_at) + `referral_clicks` + `referral_conversions` (linked to a `payments.id` and computed commission_cents)
   - URL convention: `?ref=CODE` cookies for 30 days, attached to next signup or purchase
   - Likely tier: 10–20% on first credit purchase, recurring % on subscription invoices for 12 months
   - Resend a payout-ready email when commission ≥ threshold

2. **Social tags (OG / Twitter Cards)**
   - Add `openGraph` and `twitter` to every public page's `metadata` export
   - Generate dynamic OG images via `app/<route>/opengraph-image.tsx` (Next 16 supports it natively) — use the brand shield + page title
   - Per-page coverage: landing, /services/[slug], /pros/profile/[slug], /pros/elite, /pricing, /about, /trust, marketing pages
   - Default OG fallback image at `app/opengraph-image.tsx` using the full lockup

3. **Document uploads (insurance, credentials, license)**
   - Storage bucket: a private `pro-documents` bucket (already need to create — current buckets are `avatars` + `pro-photos`)
   - `pro_documents` table: id, pro_id, kind (license/insurance/coi/certification/other), storage_key, file_name, mime, size_bytes, expires_at, status (pending/verified/rejected), reviewer_id, notes, created_at
   - Upload UI on `/pros/settings` — multipart form, server action calls InsForge storage SDK
   - Admin verification queue at `/admin/documents` — review + approve/reject
   - Surfacing on public pro profile: "License-verified" badge tied to a verified license + COI on file
   - Webhook hook into Resend: notify pros when docs near expiry

4. **Realtime conversation between users**
   - Use InsForge realtime channels — pattern docs at `C:\Users\13057\.claude\skills\insforge\` (realtime SDK + channel triggers)
   - DB: `conversations` (id, buyer_id, pro_id, request_id?, response_id?, created_at) + `messages` (id, conversation_id, sender_id, body, created_at, read_at)
   - Channel pattern: `conversation:<id>` published from a trigger on `messages` insert
   - RLS: only the two participants in the conversation can read/insert
   - UI: inline chat box on `/buyer/requests/[id]` and `/pros/responses/[id]`; new top-level `/messages` inbox; unread-message badge in nav
   - SDK: `insforge.realtime.subscribe('conversation:<id>')` on the client, `insforge.realtime.publish` from the trigger

### Other pending (lower priority but flagged during build)

- **Resend domain verification** — DNS access required (user said "we'll do that later"). Until done, transactional emails only deliver to `tk@dmgsecurityco.com`. Step-by-step in chat history; effectively "Add domain → set 5 DNS records → swap `EMAIL_FROM` env var → redeploy."
- **`/forgot-password` flow** — login page doesn't currently have a "Forgot password?" link. Wire `insforge.auth.sendResetPasswordEmail()` + a code-input page (config uses code-method).
- **Streaming AI** — currently returns full response after Gemini finishes. Migrate to SSE streaming for snappier UX.
- **AI tool/function calling** — assistant can read context but can't take actions. Add tools: respond to a lead, enable auto top-up, edit profile.
- **Persist AI conversations** — chat history is lost on widget close.
- **Buyer-side AI assistant** — same widget on `/buyer/dashboard`, advising on hiring.
- **Activity logging UI** — `/pros/responses/[id]` has stub "Log call / Log email / Add note" buttons. Wire to insert into `response_activity`.
- **6 remaining category images** still placeholder Unsplash. Need local art for: alarm-monitoring, cybersecurity, locksmith, k9-security, concierge-security, risk-consulting.
- **Request-flow image overrides** — only `security-guard` has a custom request-flow image. Add for the other 13 if/when art arrives.
- **Buyer profile photos / pro photos** — `pro_photos` table exists, no upload UI yet (covered partially by doc upload task above; gallery is separate).
- **Reviews flow** — table + RLS exist; no UI to leave or moderate reviews yet.
- **Search** — header search input is a static decorative element; not wired.
- **Real-data charts** — admin charts work but show mostly zeros until there's volume. Adding more granular intervals (per-day, last 30 days) would be nice.

---

## Key file locations (cheat sheet)

```
DMG/
├── migrations/                              ← All SQL migrations
│   ├── 20260505041555_init-marketplace.sql
│   ├── 20260505045527_payments.sql
│   ├── 20260505052858_auto-topup.sql
│   ├── 20260505063218_admins.sql
│   └── 20260505064440_admin-audit.sql
├── web/
│   ├── .env.local                           ← Local secrets (gitignored)
│   ├── .env.example                         ← Required env reference
│   ├── next.config.ts                       ← images.remotePatterns whitelisted
│   ├── tailwind.config.ts                   ← Vanguard palette (ink + navy + amber)
│   ├── scripts/convert-images.mjs           ← PNG/JPG → WebP via sharp
│   ├── public/
│   │   ├── logo-shield.webp                 ← Header logo
│   │   ├── logo-full.webp                   ← Auth/Footer lockup
│   │   └── categories/                      ← 8 local category webps + request/ overrides
│   └── src/
│       ├── proxy.ts                         ← Refresh-token proxy (Next 16 middleware)
│       ├── app/
│       │   ├── layout.tsx, globals.css, icon.png, apple-icon.png
│       │   ├── page.tsx                     ← Landing
│       │   ├── (auth)/                      ← login, signup, layout
│       │   ├── buyer/                       ← request/new + dashboard + requests/[id]
│       │   ├── pros/
│       │   │   ├── page.tsx                 ← Pro marketing funnel
│       │   │   ├── join/                    ← Onboarding
│       │   │   └── (app)/                   ← Authenticated pro layout
│       │   │       ├── layout.tsx           ← Includes AssistantWidget
│       │   │       ├── dashboard/, leads/, responses/, billing/, elite/, settings/
│       │   ├── services/                    ← Public services
│       │   ├── admin/                       ← Admin dashboard (gated)
│       │   ├── api/
│       │   │   ├── ai/chat/                 ← Gemini direct
│       │   │   ├── stripe/webhook/          ← Stripe webhook
│       │   │   └── auth/signout/
│       │   ├── about/, trust/, press/, contact/, pricing/, help/, how-it-works/
│       │   └── legal/[slug]/
│       ├── components/
│       │   ├── Logo.tsx, LogoFull           ← Logo variants
│       │   ├── Header.tsx, Footer.tsx
│       │   ├── HeroSearch.tsx, ServiceCard.tsx, ProCard.tsx
│       │   └── AssistantWidget.tsx          ← Gemini chat
│       └── lib/
│           ├── insforge.ts                  ← createServerClient + createAdminClient
│           ├── auth.ts                      ← Cookie helpers, requireUser
│           ├── admin.ts                     ← isAdminEmail, requireAdmin, listAdminEmails
│           ├── stripe.ts                    ← Stripe client + catalog
│           ├── email.ts                     ← Resend client + branded sends
│           ├── images.ts                    ← Image path mapping
│           └── cn.ts                        ← clsx + tailwind-merge
└── .insforge/                               ← Project link (gitignored)
```

---

## Key conventions to know before editing

1. **Read `web/AGENTS.md`** at the start of any session — it warns about Next.js 16 breaking changes. The Next docs are bundled at `web/node_modules/next/dist/docs/` and should be consulted before writing routing/cache/server-action code.
2. **InsForge SDK skills** are at `C:\Users\13057\.claude\skills\insforge\` (SDK) and `C:\Users\13057\.claude\skills\insforge-cli\` (CLI). Read the relevant module file before adding new InsForge integrations.
3. **Tailwind 3.4 only** — never upgrade to v4 (deployment will break).
4. **InsForge service-role key** (`INSFORGE_API_KEY` in env) bypasses RLS. Used by `createAdminClient()` for webhooks and admin pages. Never expose to the client.
5. **All public anon keys** are safe in NEXT_PUBLIC_ env vars. The Stripe secret + webhook secret + Gemini key + InsForge api key are server-only.
6. **CLI commands** for InsForge always use `npx @insforge/cli …` (never global install). Run from repo root, not from `web/`.
7. **Migration workflow**: `npx @insforge/cli db migrations new <name>` → write SQL → `npx @insforge/cli db migrations up --all`. Never put `BEGIN`/`COMMIT` in migration files (managed transaction).
8. **Deployment**: from repo root, `npx @insforge/cli deployments deploy web`. Env vars set with `npx @insforge/cli deployments env set KEY value`. Always run `npm run build` locally first to catch type errors.
9. **Visual style** — Vanguard light theme. Navy (#0b1730) + amber-accent (#a87a25) on white/off-white. The `ink` palette in tailwind.config is repurposed for light mode (low numbers = dark text, high = white surface). `text-amber-glow` only on dark navy backgrounds; `text-amber-accent` on white. Buttons use `.btn-primary` (navy fill), `.btn-amber` (amber fill, used on dark sections), `.btn-outline`, `.btn-ghost`. Cards use `.card` (sm shadow) or `.card-elev` (stronger).
10. **next/image** is used everywhere now — no more `<div style={{backgroundImage}}>`. Parent gets `relative` + dimensions or aspect-ratio; `<Image fill sizes="..." className="object-cover" />` inside.

---

## How to verify the project still works (5-minute smoke test)

1. https://7q593khw.insforge.site/ — landing should load with "Vanguard" logo, 8 category cards, no console errors
2. Sign in as `tk@dmgsecurityco.com` (admin) — see amber "Admin" pill in nav
3. `/admin` — KPI cards render, charts have at least the buckets, audit log shows past actions
4. `/pros/dashboard` — credit count + auto-topup status visible (if you completed onboarding)
5. `/pros/leads` — if you created any test buyer requests, leads should show with `12/18/25 credits` cost based on urgency. Click "Not interested" — lead drops out of feed
6. Mobile: resize to 360px wide. Header should read `Vanguard | Log in | Join Pro` on one line, no buttons wrapping

If any of these break, check:
- Browser console for client errors
- InsForge deployment logs (`npx @insforge/cli logs insforge.logs --limit 50`)
- Stripe webhook event deliveries page (Workbench → Webhooks → Vanguard production → Event deliveries)

---

## Stuff worth being careful with

- **Don't push to `main`** without local `npm run build` passing — proxy.ts can break in subtle ways (e.g. the `x-pathname` header injection).
- **Service-role key** has full DB access. Don't accidentally pass it into a server-action that takes user input — use the user's session client (`createServerClient(token)`) for anything driven by user data.
- **Webhook idempotency** is enforced via the unique `stripe_session_id` constraint on `payments`. Always check existing rows before granting credits / activating subscriptions.
- **Email fan-out caps at 5 pros** in `notifyMatchingPros` to avoid hammering Resend. Bump deliberately when there are real pros on the platform.
- **Domain verification** must happen before launch. Email is currently single-recipient (account holder only).

---

End of handoff.
