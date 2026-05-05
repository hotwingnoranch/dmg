"use client";

import { useState } from "react";
import { Check, Copy, Mail } from "lucide-react";

/**
 * Brand-accurate inline SVG icons. Kept here to avoid pulling in another
 * icon dependency just for share buttons.
 */
const XIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M18.244 2H21.5l-7.55 8.633L23 22h-7.052l-5.524-7.225L4.04 22H.78l8.082-9.236L1 2h7.225l4.99 6.6L18.244 2Zm-1.236 18h1.832L7.046 4H5.13l11.878 16Z" />
  </svg>
);
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.05-1.86-3.05-1.86 0-2.14 1.45-2.14 2.95v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.86 3.36-1.86 3.6 0 4.27 2.37 4.27 5.46v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45C23.21 24 24 23.23 24 22.28V1.72C24 .77 23.21 0 22.22 0Z" />
  </svg>
);
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M22 12.07C22 6.48 17.52 2 11.93 2 6.34 2 1.86 6.48 1.86 12.07c0 5.04 3.7 9.22 8.53 9.93v-7.02H7.85v-2.91h2.54V9.84c0-2.51 1.5-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22c4.83-.71 8.53-4.89 8.53-9.93Z" />
  </svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 0 1-.9 1.38 3.7 3.7 0 0 1-1.38.9c-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07ZM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.91.33 4.15.63a5.85 5.85 0 0 0-2.12 1.38A5.85 5.85 0 0 0 .65 4.13c-.3.76-.5 1.63-.56 2.9C.03 8.31.02 8.72.02 12s.01 3.69.07 4.97c.06 1.27.26 2.14.56 2.9.32.83.74 1.53 1.38 2.17a5.85 5.85 0 0 0 2.12 1.38c.76.3 1.63.5 2.9.56 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c1.27-.06 2.14-.26 2.9-.56a5.85 5.85 0 0 0 2.12-1.38 5.85 5.85 0 0 0 1.38-2.12c.3-.76.5-1.63.56-2.9.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.14-.56-2.9a5.85 5.85 0 0 0-1.38-2.12A5.85 5.85 0 0 0 19.85.63c-.76-.3-1.63-.5-2.9-.56C15.67.01 15.26 0 12 0Zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32Zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z" />
  </svg>
);
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.94a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1.84-.31Z" />
  </svg>
);

type Props = {
  /** Public URL to share. */
  url: string;
  /** Short message used in tweet/email body. */
  message?: string;
  /** Optional headline shown above the buttons. */
  label?: string;
};

export function ShareButtons({
  url,
  message = "Check out Vanguard Security — vetted private security pros, fast quotes.",
  label,
}: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const tweetText = `${message} ${url}`;
  const emailHref = `mailto:?subject=${encodeURIComponent(
    "Vanguard Security"
  )}&body=${encodeURIComponent(`${message}\n\n${url}`)}`;
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    tweetText
  )}`;
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    url
  )}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    url
  )}`;

  async function copyAndOpen(targetLabel: string, opener?: () => void) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(targetLabel);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // ignore
    }
    if (opener) {
      // Slight delay so the toast registers before tabbing away.
      setTimeout(opener, 120);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-400">
          {label}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <a
          href={emailHref}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-white px-3.5 py-2 text-sm text-ink-200 hover:border-amber-accent hover:text-amber-accent"
        >
          <Mail className="h-4 w-4" />
          Email
        </a>
        <a
          href={xHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-white px-3.5 py-2 text-sm text-ink-200 hover:border-amber-accent hover:text-amber-accent"
        >
          <XIcon />X
        </a>
        <a
          href={facebookHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-white px-3.5 py-2 text-sm text-ink-200 hover:border-amber-accent hover:text-amber-accent"
        >
          <FacebookIcon />
          Facebook
        </a>
        <a
          href={linkedinHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-white px-3.5 py-2 text-sm text-ink-200 hover:border-amber-accent hover:text-amber-accent"
        >
          <LinkedInIcon />
          LinkedIn
        </a>
        {/* Instagram + TikTok have no web-share intent. We copy the link
            and open the app's homepage so the user can paste into a story
            / bio / DM from there. */}
        <button
          type="button"
          onClick={() =>
            copyAndOpen("Instagram", () =>
              window.open("https://www.instagram.com/", "_blank", "noopener")
            )
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-white px-3.5 py-2 text-sm text-ink-200 hover:border-amber-accent hover:text-amber-accent"
          title="Copy link and open Instagram"
        >
          <InstagramIcon />
          Instagram
        </button>
        <button
          type="button"
          onClick={() =>
            copyAndOpen("TikTok", () =>
              window.open("https://www.tiktok.com/", "_blank", "noopener")
            )
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-white px-3.5 py-2 text-sm text-ink-200 hover:border-amber-accent hover:text-amber-accent"
          title="Copy link and open TikTok"
        >
          <TikTokIcon />
          TikTok
        </button>
        <button
          type="button"
          onClick={() => copyAndOpen("link")}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-white px-3.5 py-2 text-sm text-ink-200 hover:border-amber-accent hover:text-amber-accent"
        >
          {copied === "link" ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied === "link" ? "Copied" : "Copy link"}
        </button>
      </div>
      {(copied === "Instagram" || copied === "TikTok") && (
        <p className="text-xs text-emerald-700">
          Link copied — paste it into your {copied} bio, story, or DM.
        </p>
      )}
    </div>
  );
}
