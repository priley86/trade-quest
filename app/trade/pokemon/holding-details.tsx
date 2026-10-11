import { getPokemonProduct, type PokemonProduct } from "../../../lib/tcgplayer";

export async function PokemonHoldingDetails({ id }: { id: string }) {
  const product = await getPokemonProduct(id);
  if (!product) return null;
  return <PokemonHoldingSnapshot product={product} />;
}

function PokemonHoldingSnapshot({ product }: { product: PokemonProduct }) {
  const query = [
    product.name,
    product.episodeName,
    product.cardCodeNumber,
    product.cardNumber == null ? null : `#${product.cardNumber}`,
  ]
    .filter(Boolean)
    .join(" ");
  const tcgplayerUrl =
    product.links.tcgplayer ||
    `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(query)}&view=grid&productLineName=pokemon`;
  return (
    <>
      <h2>Card details</h2>
      <dl className="snapshot-grid">
        <div><dt>Card code</dt><dd>{product.cardCodeNumber || "—"}</dd></div>
        <div><dt>Card number</dt><dd>{product.cardNumber ?? "—"}</dd></div>
        <div><dt>Episode</dt><dd>{product.episodeName || "—"}</dd></div>
        <div><dt>Released</dt><dd>{product.episodeReleasedAt || "—"}</dd></div>
        <div><dt>Series</dt><dd>{product.episodeSeriesName || "—"}</dd></div>
        <div><dt>Rarity</dt><dd>{product.rarity || "—"}</dd></div>
      </dl>
      <a className="text-link" href={tcgplayerUrl} target="_blank" rel="noreferrer">
        Review card on TCGplayer ↗
      </a>
    </>
  );
}
