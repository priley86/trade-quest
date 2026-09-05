import Link from "next/link"; import { BackButton } from "../../back-button";
import { notFound } from "next/navigation";
import { requirePlayer } from "../../../../lib/auth";
import { getPokemonProduct } from "../../../../lib/tcgplayer";
import { AppShell } from "../../../ui";
import { PokemonDetail } from "./view";
export default async function PokemonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requirePlayer();
  const { id } = await params;
  const product = await getPokemonProduct(id);
  if (!product) notFound();
  return <AppShell active="trade" profile={profile}><BackButton label="← Back to Pokémon cards" /><PokemonDetail product={product} /></AppShell>;
}
