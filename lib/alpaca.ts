export type StockProduct = {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  imageUrl?: string;
  treasuryYield?: number;
  bars?: { date: string; cents: number }[];
};
const base = process.env.ALPACA_DATA_URL || "https://data.alpaca.markets";
const headers = {
  "APCA-API-KEY-ID": process.env.ALPACA_API_KEY || "",
  "APCA-API-SECRET-KEY": process.env.ALPACA_API_SECRET || "",
};
const treasuryUrl =
  "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml";

export async function getOneMonthTreasuryYield() {
  const month = new Date().toISOString().slice(0, 7).replace("-", "");
  const r = await fetch(
    `${treasuryUrl}?data=daily_treasury_yield_curve&field_tdr_date_value_month=${month}`,
    { cache: "no-store", signal: AbortSignal.timeout(10000) },
  );
  if (!r.ok) throw new Error(`Treasury rates unavailable (${r.status})`);
  const xml = await r.text();
  const values = [...xml.matchAll(/<[^>]*BC_1MONTH[^>]*>([^<]+)</g)]
    .map((match) => Number(match[1]))
    .filter(Number.isFinite);
  const yieldPercent = values.at(-1);
  if (yieldPercent === undefined)
    throw new Error("The Treasury feed did not include a 1-month rate.");
  return yieldPercent;
}

export function treasuryReturns(yieldPercent: number) {
  const dailyRate = yieldPercent / 100 / 365;
  const returnFor = (days: number) => (1 + dailyRate) ** days - 1;
  return {
    daily: returnFor(1),
    monthly: returnFor(30),
    yearly: returnFor(365),
  };
}

function treasuryProduct(yieldPercent: number): StockProduct {
  return {
    symbol: "TREASURY",
    name: "1-Month U.S. Treasury Yield",
    exchange: "U.S. Treasury",
    price: 100,
    change: 0,
    treasuryYield: yieldPercent,
  };
}
export async function searchStocks(query: string): Promise<StockProduct[]> {
  if (!query.trim()) return [];
  if (query.trim().toUpperCase() === "TREASURY") {
    try {
      return [treasuryProduct(await getOneMonthTreasuryYield())];
    } catch {
      return [];
    }
  }
  const r = await fetch(
    `${base}/v2/stocks/snapshots?symbols=${encodeURIComponent(query.toUpperCase())}&feed=iex`,
    { headers, cache: "no-store" },
  );
  if (!r.ok) return [];
  const j = await r.json();
  return Promise.all(
    Object.entries(j).map(async ([symbol, v]: any) => {
      const asset = await fetch(
        `https://paper-api.alpaca.markets/v2/assets/${encodeURIComponent(symbol)}`,
        { headers, cache: "no-store" },
      );
      const metadata = asset.ok ? await asset.json() : {};
      return {
        symbol,
        name: metadata.name || symbol,
        exchange: metadata.exchange || "US",
        price: Number(v.latestTrade?.p || v.dailyBar?.c || 0),
        change:
          Number(v.dailyBar?.c || 0) -
          Number(v.prevDailyBar?.c || v.dailyBar?.c || 0),
      };
    }),
  );
}
export async function getStock(symbol: string) {
  if (symbol.toUpperCase() === "TREASURY") {
    try {
      return treasuryProduct(await getOneMonthTreasuryYield());
    } catch {
      return null;
    }
  }
  const r = await fetch(
    `${base}/v2/stocks/${encodeURIComponent(symbol)}/snapshot?feed=iex`,
    { headers, cache: "no-store" },
  );
  if (!r.ok) return null;
  const v = await r.json();
  const end = new Date(),
    start = new Date(end);
  start.setFullYear(end.getFullYear() - 1);
  const br = await fetch(
    `${base}/v2/stocks/${encodeURIComponent(symbol)}/bars?timeframe=1Day&start=${start.toISOString().slice(0, 10)}&end=${end.toISOString().slice(0, 10)}&limit=260&feed=iex&sort=asc`,
    { headers, cache: "no-store" },
  );
  const bj = br.ok ? await br.json() : {};
  return {
    symbol,
    name: symbol,
    exchange: "US",
    price: Number(v.latestTrade?.p || v.dailyBar?.c || 0),
    change:
      Number(v.dailyBar?.c || 0) -
      Number(v.prevDailyBar?.c || v.dailyBar?.c || 0),
    bars: (bj.bars || []).map((b: any) => ({
      date: b.t,
      cents: Math.round(Number(b.c) * 100),
    })),
  } as StockProduct;
}

export async function getStockValueCents(symbol: string, quantity: number) {
  const r = await fetch(
    `${base}/v2/stocks/${encodeURIComponent(symbol)}/snapshot?feed=iex`,
    { headers, cache: "no-store", signal: AbortSignal.timeout(10000) },
  );
  if (!r.ok) throw new Error("The stock price is temporarily unavailable. Try selling again shortly.");
  const snapshot = await r.json();
  const price = Number(snapshot.latestTrade?.p || snapshot.dailyBar?.c || 0);
  const value = Math.round(price * 100 * Number(quantity));
  if (!value) throw new Error("The stock price is temporarily unavailable. Try selling again shortly.");
  return value;
}
