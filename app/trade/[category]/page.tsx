import { notFound } from "next/navigation";
import { requirePlayer } from "../../../lib/auth";
import { AppShell } from "../../ui";
import { CategoryPreview, options } from "../options";
import { redirect } from "next/navigation";
export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { profile } = await requirePlayer();
  const { category } = await params;
  if (!options.some(o => o.type === category)) notFound();
  if (category === "pokemon") redirect("/trade/pokemon");
  if (category === "sports") redirect("/trade/sports");
  return <AppShell active="trade" profile={profile}><CategoryPreview category={category} /></AppShell>;
}
