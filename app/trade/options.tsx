import Link from "next/link";
import { CategoryIcon, PageIntro } from "../ui";
export const options = [
  { type: "pokemon", title: "Pokémon cards", copy: "Collect colorful heroes and track what your cards are worth.", color: "red" },
  { type: "stock", title: "Stocks", copy: "Own tiny pieces of companies you know.", color: "blue" },
  { type: "sports", title: "Sports cards", copy: "Scout star players and collect cards from your favorite teams.", color: "green" },
] as const;
export function TradeOptions({ base = "" }: { base?: string }) {
  return <><PageIntro eyebrow="The Trading Post" title="What do you want to explore?" text="Pick a world below. Buying and selling will open in a future quest." />
    <section className="trade-grid">{options.map(o => <Link href={`${base}/trade/${o.type === "stock" ? "stocks" : o.type}`} key={o.type} className={`trade-option ${o.color}`}><span className="mini-badge">{o.type === "pokemon" || o.type === "sports" || o.type === "stock" ? "Explore now" : "Coming soon"}</span><CategoryIcon type={o.type} large /><h2>{o.title}</h2><p>{o.copy}</p><span className="explore">Explore {o.title} <b>→</b></span></Link>)}</section>
    <aside className="coach-tip"><span>🧭</span><div><b>Coach Quest says:</b><p>A smart explorer doesn’t spend all their gold in one place. Try collecting a mix!</p></div></aside></>;
}
export function CategoryPreview({ category, base = "" }: { category: string; base?: string }) {
  const option = options.find(o => o.type === category)!;
  return <><PageIntro eyebrow="Coming in the next quest" title={`${option.title} trading`} text="Soon you’ll be able to search, buy, and sell here." /><div className="empty-state"><span>🗺️</span><h2>This trail opens soon!</h2><p>For now, explore your crew and collection.</p><Link className="primary-button" href={`${base}/trade`}>Back to the Trading Post</Link></div></>;
}
