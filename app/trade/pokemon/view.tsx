import Link from "next/link";
import { searchPokemon } from "../../../lib/tcgplayer";
import { money } from "../../../lib/validation";
import type { PokemonProduct } from "../../../lib/tcgplayer";
import { PokemonSearchForm } from "./search-form";
export async function PokemonBrowser({ query, page, refresh }: { query: string; page: number; refresh?: string }) {
  const results = await searchPokemon(query, page, refresh);
  return <><section className="page-intro"><span className="eyebrow">The Pokémon Trading Post</span><h1>Choose a Pokémon card</h1><p>Search TCGplayer or start with a few explorer recommendations.</p></section>
    <PokemonSearchForm query={query} />
    <p className="data-note">{results.source}</p><section className="pokemon-grid">{results.products.map((p: PokemonProduct) => <Link className="pokemon-card" key={p.id} href={`/trade/pokemon/${p.id}`}><div className="pokemon-image"><img src={p.imageUrl} alt="" /></div><h2>{p.name}</h2><p>Market Price</p><strong>{money(p.marketPriceCents)}</strong></Link>)}</section>
    {results.totalPages > 1 && <nav className="pagination" aria-label="Search results pages">{results.page > 1 && <Link href={`/trade/pokemon?q=${encodeURIComponent(query)}&page=${results.page - 1}`}>← Previous</Link>}<span>Page {results.page} of {results.totalPages}</span>{results.page < results.totalPages && <Link href={`/trade/pokemon?q=${encodeURIComponent(query)}&page=${results.page + 1}`}>Next →</Link>}</nav>}
  </>;
}
