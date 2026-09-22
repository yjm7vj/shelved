import { notFound, redirect } from "next/navigation";

import { importGameByRawgId } from "@/lib/rawg";

/**
 * Bridge from a RAWG search result to our own game page.
 *
 * A search hit is not in `games` until somebody opens it, which keeps the
 * catalogue to games people actually care about.
 */
export default async function RawgGamePage({
  params,
}: {
  params: Promise<{ rawgId: string }>;
}) {
  const { rawgId } = await params;
  const id = Number(rawgId);
  if (!Number.isInteger(id)) notFound();

  const game = await importGameByRawgId(id);
  if (!game) notFound();

  redirect(`/games/${game.id}`);
}
