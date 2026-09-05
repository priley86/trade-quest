import { requirePlayer } from "../../../lib/auth";
import { AppShell } from "../../ui";
import { PokemonBrowser } from "./view";
export default async function PokemonPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; refresh?: string }> }) {
  const { profile } = await requirePlayer();
  const params = await searchParams;
  const query = (params.q || "").slice(0, 80);
  const page = Math.max(1, Number(params.page) || 1);
  return <AppShell active="trade" profile={profile}><PokemonBrowser query={query} page={page} /></AppShell>;
}
