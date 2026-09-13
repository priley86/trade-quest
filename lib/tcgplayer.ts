import "server-only";
import fx from "money";
export type PokemonProduct = {
  id: string;
  name: string;
  cardCodeNumber: string;
  cardNumber: number | null;
  episodeName: string | null;
  episodeReleasedAt: string | null;
  episodeSeriesName: string | null;
  rarity: string | null;
  links: { tcgplayer: string | null; cardmarket: string | null };
  url: string;
  apiUrl: string;
  imageUrl: string;
  marketPriceCents: number;
  nearMintNormalCents: number;
  lowCents: number;
  midCents?: number;
  highCents: number;
  cardmarket?: { lowestNearMint: number; avg30: number; avg7: number };
  ebay?: { grader: string; cents: number }[];
  totalSold: null;
  dailySold: null;
  history: { date: string; cents: number }[];
};
const base = "https://cardmarket-api-tcg.p.rapidapi.com",
  host = "pokemon-tcg-api.p.rapidapi.com";
const searchCache = new Map<string, PokemonProduct[]>(),
  productCache = new Map<string, PokemonProduct>();
let ratesPromise: Promise<Record<string, number>> | undefined;
async function amount(v: any, currency = "USD") {
  const n =
    typeof v === "number" ? v : Number(v?.value ?? v?.amount ?? v?.price);
  if (!Number.isFinite(n) || currency.toUpperCase() === "USD") return n;
  if (!ratesPromise)
    ratesPromise = fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${encodeURIComponent(process.env.OPEN_EXCHANGE_RATES_APP_ID ?? "")}`,
      { next: { revalidate: 3600 } },
    )
      .then((r) =>
        r.ok ? (r.json() as Promise<{ rates?: Record<string, number> }>) : {},
      )
      .then((j) => (j as { rates?: Record<string, number> }).rates ?? {})
      .catch(() => ({}));
  fx.base = "USD";
  fx.rates = await ratesPromise;
  const code = currency.toUpperCase();
  const rate = fx.rates[code];
  if (!rate) {
    const fallback: Record<string, number> = {
      EUR: 1.1,
      GBP: 1.28,
      CAD: 0.73,
      AUD: 0.66,
    };
    return n * (fallback[code] ?? 1);
  }
  try {
    return fx.convert(n, { from: code, to: "USD" });
  } catch {
    return n;
  }
}
async function map(c: any): Promise<PokemonProduct | null> {
  const market = c?.prices?.tcg_player?.market_price;
  if (market == null) return null;
  const cur = c.prices.tcg_player.currency ?? c.currency ?? "USD",
    cm = c.cardmarket ?? {},
    cc = cm.currency ?? c.currency ?? "USD",
    m = Math.round((await amount(market, cur)) * 100);
  return {
    id: String(c.id),
    name: c.name,
    cardCodeNumber: c.card_code_number ?? "",
    cardNumber: c.card_number ?? null,
    episodeName: c.episode?.name ?? null,
    episodeReleasedAt: c.episode?.released_at ?? null,
    episodeSeriesName: c.episode?.series?.name ?? null,
    rarity: c.rarity ?? null,
    links: {
      tcgplayer: c.links?.tcgplayer ?? null,
      cardmarket: c.links?.cardmarket ?? null,
    },
    url:
      c.url ??
      `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(c.name)}`,
    apiUrl: `${base}/cards/${c.id}`,
    imageUrl: c.image ?? "/pokeball.svg",
    marketPriceCents: m,
    nearMintNormalCents: m,
    lowCents: m,
    midCents: m,
    highCents: m,
    cardmarket:
      cm.lowest_near_mint != null &&
      cm["30d_average"] != null &&
      cm["7d_average"] != null
        ? {
            lowestNearMint: await amount(cm.lowest_near_mint, cc),
            avg30: await amount(cm["30d_average"], cc),
            avg7: await amount(cm["7d_average"], cc),
          }
        : undefined,
    ebay: Object.entries(c.prices?.ebay?.graded ?? {}).map(
      async ([grader, grades]: [string, any]) => ({
        grader: grader.toUpperCase(),
        cents: Math.round(
          (await amount(grades?.["10"]?.median_price, c.prices.ebay.currency)) *
            100,
        ),
      }),
    ).length
      ? await Promise.all(
          Object.entries(c.prices?.ebay?.graded ?? {}).map(
            async ([grader, grades]: [string, any]) => ({
              grader: grader.toUpperCase(),
              cents: Math.round(
                (await amount(
                  grades?.["10"]?.median_price,
                  c.prices.ebay.currency,
                )) * 100,
              ),
            }),
          ),
        ).then((items) => items.filter((item) => item.cents > 0))
      : undefined,
    totalSold: null,
    dailySold: null,
    history: [],
  };
}
async function request(path: string) {
  const r = await fetch(path, {
    headers: {
      "X-RapidAPI-Key": process.env.POKEMON_API_KEY ?? "",
      "X-RapidAPI-Host": host,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) return null;
  return r.json();
}
export async function searchPokemon(query: string, page = 1, refresh?: string) {
  const q = query.trim();
  if (!q)
    return {
      products: [],
      page: 1,
      totalPages: 1,
      source: "Search for a Pokémon card",
    };
  const key = refresh ? `${q}:${refresh}` : q;
  let all = searchCache.get(key);
  if (!all) {
    const j = await request(
      `${base}/cards?search=${encodeURIComponent(q)}&sort=relevance&per_page=100`,
    );
    const cards = Array.isArray(j?.data)
      ? j.data
      : Array.isArray(j?.data?.data)
        ? j.data.data
        : Array.isArray(j?.results)
          ? j.results
          : [];
    all = (await Promise.all(cards.map(map))).filter(
      Boolean,
    ) as PokemonProduct[];
    searchCache.set(key, all);
    all.forEach((p) => productCache.set(p.id, p));
  }
  const safe = Math.max(1, page);
  return {
    products: all.slice((safe - 1) * 10, safe * 10),
    page: safe,
    totalPages: Math.max(1, Math.ceil(all.length / 10)),
    source: all.length
      ? "Pokemon API results"
      : "No matching cards with a TCGplayer market price",
  };
}
export async function getPokemonProduct(id: string) {
  let p: PokemonProduct | null = productCache.get(id) ?? null;
  if (!p) {
    const j = await request(`${base}/cards/${encodeURIComponent(id)}`);
    p = await map(j?.data ?? j);
    if (p) productCache.set(id, p);
  }
  if (!p) return null;
  const end = new Date(),
    start = new Date(end);
  start.setFullYear(end.getFullYear() - 1);
  const j = await request(
    `${base}/history-prices?id=${encodeURIComponent(id)}&lang=en&date_from=${start.toISOString().slice(0, 10)}&date_to=${end.toISOString().slice(0, 10)}&sort=desc`,
  );
  const historyEntries = Object.entries(j?.data ?? {});
  p.history = (
    await Promise.all(
      historyEntries.map(async ([date, v]: [string, any]) => ({
        date,
        cents: Math.round(
          (await amount(v.tcg_player_market, v.currency ?? "USD")) * 100,
        ),
      })),
    )
  )
    .filter((x) => x.cents > 0)
    .reverse();
  return p;
}
