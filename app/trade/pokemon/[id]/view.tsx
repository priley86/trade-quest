"use client";
import { useState } from "react";
import type { PokemonProduct } from "../../../../lib/tcgplayer";
import { money } from "../../../../lib/validation";
import { buyPokemonCard } from "../actions";
import { HistoryChart } from "../../../portfolio/history-chart";

export function PokemonDetail({ product }: { product: PokemonProduct }) {
  const [message, setMessage] = useState("");
  async function buy() {
    setMessage("Buying…");
    const result = await buyPokemonCard({}, product);
    setMessage(result.message || "");
  }
  return (
    <>
      <section className="pokemon-detail">
        <div className="detail-art">
          <img src={product.imageUrl} alt="" />
        </div>
        <div>
          <span className="eyebrow">Near Mint · Normal</span>
          <h1>{product.name}</h1>
          <p className="detail-price">{money(product.nearMintNormalCents)}</p>
          <p>Pokémon TCG API market price used in TradeQuest</p>
          <button className="primary-button" onClick={buy}>
            Buy this card
          </button>
          {message && (
            <p className="form-status" role="status">
              {message}
            </p>
          )}
          <dl className="snapshot-grid">
            <div>
              <dt>Card code</dt>
              <dd>{product.cardCodeNumber || "—"}</dd>
            </div>
            <div>
              <dt>Card number</dt>
              <dd>{product.cardNumber ?? "—"}</dd>
            </div>
            <div>
              <dt>Episode</dt>
              <dd>{product.episodeName || "—"}</dd>
            </div>
            <div>
              <dt>Released</dt>
              <dd>{product.episodeReleasedAt || "—"}</dd>
            </div>
            <div>
              <dt>Series</dt>
              <dd>{product.episodeSeriesName || "—"}</dd>
            </div>
            <div>
              <dt>Rarity</dt>
              <dd>{product.rarity || "—"}</dd>
            </div>
          </dl>
        </div>
        <div className="price-history">
          {product.cardmarket && (
            <>
              <h2>Cardmarket data</h2>
              <dl className="snapshot-grid">
                <div>
                  <dt>Trend price</dt>
                  <dd>
                    {money(Math.round(product.cardmarket.lowestNearMint * 100))}
                  </dd>
                </div>
                <div>
                  <dt>Avg. 7 day price</dt>
                  <dd>{money(Math.round(product.cardmarket.avg7 * 100))}</dd>
                </div>
                <div>
                  <dt>Avg. 30 day price</dt>
                  <dd>{money(Math.round(product.cardmarket.avg30 * 100))}</dd>
                </div>
              </dl>
            </>
          )}
        </div>
      </section>
      {product.history.length > 1 && (
        <section className="chart-card">
          <h2>1-year price history</h2>
          <HistoryChart values={product.history} />
        </section>
      )}
      <div className="detail-links">
        <a
          className="text-link"
          href={product.links.tcgplayer ?? product.url}
          target="_blank"
          rel="noreferrer"
        >
          View on TCGplayer ↗
        </a>
        {product.links.cardmarket && (
          <a
            className="text-link"
            href={product.links.cardmarket}
            target="_blank"
            rel="noreferrer"
          >
            View Cardmarket data ↗
          </a>
        )}
      </div>
    </>
  );
}
