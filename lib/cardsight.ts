import "server-only";
export type SportsProduct = {
  id: string;
  name: string;
  year?: string;
  manufacturerName?: string;
  releaseName?: string;
  setName?: string;
  cardNumber?: string;
  segmentName?: string;
  url: string;
  apiUrl: string;
  imageUrl: string;
  marketPriceCents: number;
  lowCents: number;
  midCents: number;
  highCents: number;
  recentRecords?: {
    title: string;
    price: number;
    date: string;
    source: string;
    url?: string;
  }[];
  history?: { date: string; cents: number }[];
};
const base = "https://api.cardsight.ai";
const sportsCache = new Map<string, SportsProduct[]>();
async function request(path: string) {
  const key = process.env.CARDSIGHT_API_KEY;
  if (!key) return null;
  const r = await fetch(`${base}${path}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      "X-Api-Key": key,
      accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  return r.ok ? r.json() : null;
}
export function findImage(
  value: unknown,
  allowDirect = false,
): string | undefined {
  if (typeof value === "string") {
    const candidate = value.trim();
    return allowDirect && /^(https?:\/\/|\/\/|\/)/i.test(candidate)
      ? candidate
      : undefined;
  }
  if (!value || typeof value !== "object") return undefined;
  for (const [key, nested] of Object.entries(value)) {
    if (/image|photo|picture|thumbnail|front|back/i.test(key)) {
      const image = findImage(nested, true);
      if (image) return image;
    }
  }
  for (const nested of Object.values(value)) {
    const image = findImage(nested, allowDirect);
    if (image) return image;
  }
  return undefined;
}
function map(c: any): SportsProduct {
  const p = c.pricing || c.price || {};
  const recordWithImage = [
    ...(c.pricing?.raw?.records || []),
    ...(c.raw?.records || []),
    ...(c.records || []),
  ].find((record: any) => record.image_url || record.imageUrl);
  const imageUrl = findImage(c) || findImage(recordWithImage);
  return {
    id: String(c.id),
    name:
      c.name ||
      c.title ||
      [c.player, c.year, c.setName || c.set, c.releaseName]
        .filter(Boolean)
        .join(" · ") ||
      "Sports card",
    year: c.year || c.releaseYear,
    manufacturerName: c.manufacturerName,
    setName: c.setName,
    segmentName: c.segmentName,
    releaseName: c.releaseName,
    cardNumber: c.cardNumber || c.number,
    url: c.url || `https://cardsight.ai/cards/${c.id}`,
    apiUrl: `${base}/v1/catalog/cards/${c.id}`,
    imageUrl: imageUrl || `/api/sports-card-image/${encodeURIComponent(c.id)}`,
    marketPriceCents: Math.round(
      Number(p.market || p.market_price || p.value || 0) * 100,
    ),
    lowCents: Math.round(Number(p.low || 0) * 100),
    midCents: Math.round(Number(p.mid || p.average || 0) * 100),
    highCents: Math.round(Number(p.high || 0) * 100),
  };
}
export async function searchSports(query: string, sport = "") {
  const q = query.trim();
  if (!q)
    return { products: [], source: "Search for a player or card to begin." };
  const key = `${q}|${sport}`;
  const cached = sportsCache.get(key);
  if (cached) return { products: cached, source: "CardSight results (cached)" };
  const segment = sport
    ? `&segment=${encodeURIComponent(sport.toLowerCase())}`
    : "";
  const j = await request(
    `/v1/catalog/search?q=${encodeURIComponent(q)}&limit=50&page_size=50${segment}`,
  );
  if (!j)
    return {
      products: [],
      source:
        "CardSight search is unavailable right now. Check your API key or try again.",
    };
  const data = j.data || j.results || [],
    products = data.map(map);
  if (products.length) sportsCache.set(key, products);
  return {
    products,
    source: products.length
      ? "CardSight results"
      : "No CardSight cards matched that search.",
  };
}
export async function getSportsProduct(id: string, sport = "") {
  const j = await request(`/v1/catalog/cards/${encodeURIComponent(id)}`);
  if (!j) return null;
  const p = map(j.data || j);
  if (sport) p.segmentName = sport;
  else {
    const catalog = await request(
      `/v1/catalog/search?q=${encodeURIComponent(`id:${id}`)}&page_size=1`,
    );
    const match = (catalog?.results || catalog?.data || [])[0];
    if (match?.segmentName) p.segmentName = match.segmentName;
  }
  const pricing = await request(`/v1/pricing/${encodeURIComponent(id)}`);
  const records = (pricing?.raw?.records || [])
    .filter((r: any) => Number.isFinite(Number(r.price)))
    .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
  if (records.length) {
    const recent = records.slice(0, 10),
      average =
        recent.reduce((sum: number, r: any) => sum + Number(r.price), 0) /
        recent.length;
    p.marketPriceCents = Math.round(average * 100);
    p.midCents = Math.round(average * 100);
    p.lowCents = Math.round(
      Math.min(...recent.map((r: any) => Number(r.price))) * 100,
    );
    p.highCents = Math.round(
      Math.max(...recent.map((r: any) => Number(r.price))) * 100,
    );
    p.imageUrl = findImage(records) || p.imageUrl;
    p.recentRecords = recent.map((r: any) => ({
      title: r.title,
      price: Number(r.price),
      date: r.date,
      source: r.source,
      url: r.url,
    }));
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    const weekly = new Map<string, number[]>();
    for (const record of records) {
      const date = new Date(record.date);
      if (date.getTime() < yearAgo.getTime()) continue;
      const monday = new Date(date);
      monday.setUTCHours(0, 0, 0, 0);
      monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
      const week = monday.toISOString().slice(0, 10);
      weekly.set(week, [...(weekly.get(week) || []), Number(record.price)]);
    }
    p.history = [...weekly.entries()]
      .map(([date, prices]) => ({
        date,
        cents: Math.round(
          (prices.reduce((sum, price) => sum + price, 0) / prices.length) * 100,
        ),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  return p;
}
