import "server-only";

import { db } from "./supabase";
import type { Game } from "./types";

const RAWG_BASE = "https://api.rawg.io/api";

export function isRawgConfigured() {
  return Boolean(process.env.RAWG_API_KEY);
}

type RawgGame = {
  id: number;
  slug: string;
  name: string;
  background_image: string | null;
  released: string | null;
  genres?: { name: string }[];
  description_raw?: string;
  metacritic?: number | null;
};

async function rawg<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  if (!isRawgConfigured()) return null;

  const url = new URL(`${RAWG_BASE}${path}`);
  url.searchParams.set("key", process.env.RAWG_API_KEY!);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  // RAWG data is stable; a day of caching keeps us well inside the free tier.
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export type SearchResult = {
  rawgId: number;
  title: string;
  coverUrl: string | null;
  released: string | null;
  genres: string[];
};

export async function searchGames(query: string): Promise<SearchResult[]> {
  const data = await rawg<{ results: RawgGame[] }>("/games", {
    search: query,
    page_size: "24",
  });

  return (data?.results ?? []).map((game) => ({
    rawgId: game.id,
    title: game.name,
    coverUrl: game.background_image,
    released: game.released,
    genres: game.genres?.map((genre) => genre.name) ?? [],
  }));
}

/**
 * Find a game in our own table by RAWG id, importing it on first reference.
 *
 * Search results link straight to `/games/rawg/<id>`, so a game only ever
 * enters the catalogue when somebody actually looks at it.
 */
export async function importGameByRawgId(rawgId: number): Promise<Game | null> {
  const supabase = db();

  const { data: existing } = await supabase
    .from("games")
    .select("*")
    .eq("rawg_id", rawgId)
    .maybeSingle();
  if (existing) return existing as Game;

  const detail = await rawg<RawgGame>(`/games/${rawgId}`);
  if (!detail) return null;

  const { data, error } = await supabase
    .from("games")
    .upsert(
      {
        rawg_id: detail.id,
        slug: detail.slug,
        title: detail.name,
        cover_url: detail.background_image,
        description: detail.description_raw ?? null,
        genres: detail.genres?.map((genre) => genre.name) ?? [],
        released: detail.released,
      },
      { onConflict: "rawg_id" },
    )
    .select()
    .single();

  if (error) throw error;
  return data as Game;
}

/**
 * Backfill metadata for a game that arrived from Steam with only a title.
 * Returns the game unchanged when RAWG has no key or no match.
 */
export async function enrichGame(game: Game): Promise<Game> {
  if (game.rawg_id || game.description || !isRawgConfigured()) return game;

  const title = game.title.replace(/[™®©]/g, "").trim();
  const data = await rawg<{ results: RawgGame[] }>("/games", {
    search: title,
    page_size: "1",
  });
  const match = data?.results?.[0];
  if (!match) return game;

  const detail = await rawg<RawgGame>(`/games/${match.id}`);

  const patch = {
    rawg_id: match.id,
    slug: match.slug,
    description: detail?.description_raw ?? null,
    genres: match.genres?.map((genre) => genre.name) ?? [],
    released: match.released,
    // Steam header art is already good; only fall back to RAWG's image.
    cover_url: game.cover_url ?? match.background_image,
  };

  const { data: updated } = await db()
    .from("games")
    .update(patch)
    .eq("id", game.id)
    .select()
    .single();

  return (updated as Game) ?? game;
}
