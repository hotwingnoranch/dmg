// Public placeholder photos. Swap with your own CDN URLs when ready.
// All hosted on Unsplash CDN; no API key needed for direct photo URLs.
const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

export const SERVICE_IMAGES: Record<string, string> = {
  "security-guard": u("1591622180917-d40d83b6f6e8", 1400),
  "armed-security": u("1583912086096-8c60d75a53f9", 1400),
  bodyguard: u("1521791136064-7986c2920216", 1400),
  "executive-protection": u("1521799022345-481a897e45ca", 1400),
  "event-security": u("1505740420928-5e560c06d30e", 1400),
  "private-investigation": u("1521488674200-72ef9a9b3263", 1400),
  "loss-prevention": u("1542838132-92c53300491e", 1400),
  "cctv-surveillance": u("1518709268805-4e9042af2176", 1400),
  "alarm-monitoring": u("1568952433726-3896e3881c65", 1400),
  cybersecurity: u("1550751827-4bd374c3f58b", 1400),
  locksmith: u("1581094794329-c8112a89af12", 1400),
  "k9-security": u("1561638655-eb6fae6a9442", 1400),
  "concierge-security": u("1564540583246-934409427776", 1400),
  "risk-consulting": u("1573497019418-b400bb3ab074", 1400),
};

export const HERO_BACKDROP = u("1495020689067-958852a7765e", 2000);
export const PRO_HERO = u("1556157382-97eda2d62296", 1600);
export const TESTIMONIAL_PHOTO_1 = u("1573496359142-b8d87734a5a2", 400);
export const TESTIMONIAL_PHOTO_2 = u("1559893088-c0787ebfc084", 400);
export const TESTIMONIAL_PHOTO_3 = u("1494790108377-be9c29b29330", 400);

export function categoryImage(slug: string) {
  return SERVICE_IMAGES[slug] ?? u("1495020689067-958852a7765e", 1400);
}
