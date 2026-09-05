"use client";
import { useState } from "react";
import type { PokemonProduct } from "../../../../lib/tcgplayer";
import { money } from "../../../../lib/validation";
import { buyPokemonCard } from "../actions";

export function PokemonDetail({ product }: { product: PokemonProduct }) {
  const [message, setMessage] = useState("");
  async function buy() { setMessage("Buying…"); const result = await buyPokemonCard({}, product); setMessage(result.message || ""); }
  return <section className="pokemon-detail"><div className="detail-art"><img src={product.imageUrl} alt="" /></div><div><span className="eyebrow">Near Mint · Normal</span><h1>{product.name}</h1><p className="detail-price">{money(product.nearMintNormalCents)}</p><p>Pokémon TCG API market price used in TradeQuest</p><button className="primary-button" onClick={buy}>Buy this card</button>{message && <p className="form-status" role="status">{message}</p>}</div><div className="price-history"><h2>Recent snapshot</h2><dl className="snapshot-grid"><div><dt>Market price</dt><dd>{money(product.marketPriceCents)}</dd></div><div><dt>Low sale price</dt><dd>{money(product.lowCents)}</dd></div><div><dt>Mid sale price</dt><dd>{money(product.midCents ?? product.marketPriceCents)}</dd></div><div><dt>High sale price</dt><dd>{money(product.highCents)}</dd></div></dl> {product.cardmarket && <><h2>Cardmarket data</h2><dl className="snapshot-grid"><div><dt>Trend price</dt><dd>{money(Math.round(product.cardmarket.trendPrice*100))}</dd></div><div><dt>Avg. 1 day price</dt><dd>{money(Math.round(product.cardmarket.avg1*100))}</dd></div><div><dt>Avg. 7 day price</dt><dd>{money(Math.round(product.cardmarket.avg7*100))}</dd></div><div><dt>Avg. 30 day price</dt><dd>{money(Math.round(product.cardmarket.avg30*100))}</dd></div></dl></>}<div className="detail-links"><a className="text-link" href={product.url} target="_blank" rel="noreferrer">View on TCGplayer ↗</a><a className="text-link" href={product.apiUrl} target="_blank" rel="noreferrer">View Pokémon TCG API data ↗</a></div></div></section>;
}
