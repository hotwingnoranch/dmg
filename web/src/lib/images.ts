// Local WebPs in /public/categories/ for the 8 categories the design team
// supplied art for. Source PNGs were converted with scripts/convert-images.mjs
// at quality 82, ~96% smaller. The remaining 6 still use Unsplash CDN URLs
// as placeholders — swap those when more art lands.
const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

export const SERVICE_IMAGES: Record<string, string> = {
  "security-guard": "/categories/security-guard.webp",
  "armed-security": "/categories/armed-security.webp",
  bodyguard: "/categories/bodyguard.webp",
  "executive-protection": "/categories/executive-protection.webp",
  "event-security": "/categories/event-security.webp",
  "private-investigation": "/categories/private-investigation.webp",
  "loss-prevention": "/categories/loss-prevention.webp",
  "cctv-surveillance": "/categories/cctv-surveillance.webp",
  // Still placeholders — swap to local paths when art lands.
  "alarm-monitoring": u("1568952433726-3896e3881c65", 1400),
  cybersecurity: u("1550751827-4bd374c3f58b", 1400),
  locksmith: u("1581094794329-c8112a89af12", 1400),
  "k9-security": u("1561638655-eb6fae6a9442", 1400),
  "concierge-security": u("1564540583246-934409427776", 1400),
  "risk-consulting": u("1573497019418-b400bb3ab074", 1400),
};

// Auth split-screen art. Local file in public/.
export const AUTH_IMAGE = "/categories/executive-protection.webp";

// Request-flow specific art (the preview card on /buyer/request/new).
// Falls back to the regular category image when no override is set.
export const REQUEST_IMAGES: Record<string, string> = {
  "security-guard": "/categories/request/security-guard.webp",
};

export function categoryImageForRequest(slug: string) {
  return REQUEST_IMAGES[slug] ?? categoryImage(slug);
}

// Pro CTA section on the landing — kept on Unsplash per request.
export const PRO_HERO = u("1556157382-97eda2d62296", 1600);

// Legacy / unused — kept for any old import sites.
export const HERO_BACKDROP = u("1495020689067-958852a7765e", 2000);
export const TESTIMONIAL_PHOTO_1 = u("1573496359142-b8d87734a5a2", 400);
export const TESTIMONIAL_PHOTO_2 = u("1559893088-c0787ebfc084", 400);
export const TESTIMONIAL_PHOTO_3 = u("1494790108377-be9c29b29330", 400);

export function categoryImage(slug: string) {
  return (
    SERVICE_IMAGES[slug] ?? "/categories/security-guard.webp"
  );
}
