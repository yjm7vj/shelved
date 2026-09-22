import "server-only";

import { db } from "./supabase";
import type { FeedItem, Game, GameStatus, LibraryEntry, Review, User } from "./types";

const GAME_FIELDS = "id, rawg_id, steam_app_id, title, slug, cover_url, description, genres, released";

export async function getLibrary(userId: string, status?: GameStatus): Promise<LibraryEntry[]> {
  let query = db()
    .from("user_games")
    .select(`id, hours_played, status, updated_at, games (${GAME_FIELDS})`)
    .eq("user_id", userId)
    .order("hours_played", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as LibraryEntry[];
}

export async function getGame(gameId: string): Promise<Game | null> {
  const { data } = await db().from("games").select(GAME_FIELDS).eq("id", gameId).maybeSingle();
  return (data as Game) ?? null;
}

export async function getGameReviews(gameId: string): Promise<Review[]> {
  const { data, error } = await db()
    .from("reviews")
    .select("id, body, rating, created_at, users (id, username, avatar_url)")
    .eq("game_id", gameId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Review[];
}

export function averageRating(reviews: Pick<Review, "rating">[]): number | null {
  if (!reviews.length) return null;
  return reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;
}

export async function getUserGame(userId: string, gameId: string) {
  const { data } = await db()
    .from("user_games")
    .select("id, hours_played, status")
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .maybeSingle();
  return data as { id: string; hours_played: number; status: GameStatus } | null;
}

export async function getUserReview(userId: string, gameId: string) {
  const { data } = await db()
    .from("reviews")
    .select("id, body, rating")
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .maybeSingle();
  return data as { id: string; body: string; rating: number } | null;
}

export type ProfileStats = {
  totalGames: number;
  totalHours: number;
  completed: number;
  playing: number;
  backlog: number;
  reviewCount: number;
  followers: number;
  following: number;
};

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const supabase = db();

  const [library, reviews, followers, following] = await Promise.all([
    supabase.from("user_games").select("hours_played, status").eq("user_id", userId),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);

  const rows = (library.data ?? []) as { hours_played: number; status: GameStatus }[];
  const count = (status: GameStatus) => rows.filter((row) => row.status === status).length;

  return {
    totalGames: rows.length,
    totalHours: Math.round(rows.reduce((total, row) => total + Number(row.hours_played), 0)),
    completed: count("completed"),
    playing: count("playing"),
    backlog: count("backlog"),
    reviewCount: reviews.count ?? 0,
    followers: followers.count ?? 0,
    following: following.count ?? 0,
  };
}

export async function getRecentReviews(userId: string, limit = 6): Promise<Review[]> {
  const { data } = await db()
    .from("reviews")
    .select(`id, body, rating, created_at, users (id, username, avatar_url), games (id, title, cover_url)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as unknown as Review[];
}

export async function isFollowing(followerId: string, followingId: string) {
  const { data } = await db()
    .from("friendships")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return Boolean(data);
}

export async function getFollowingIds(userId: string): Promise<string[]> {
  const { data } = await db().from("friendships").select("following_id").eq("follower_id", userId);
  return (data ?? []).map((row) => row.following_id as string);
}

/**
 * Activity feed: reviews and library changes from people you follow.
 *
 * Your own activity is included so a brand new account still sees something —
 * an empty home page is the fastest way to lose a first-time user.
 */
export async function getFeed(userId: string, limit = 30): Promise<FeedItem[]> {
  const supabase = db();
  const authorIds = [userId, ...(await getFollowingIds(userId))];

  const [reviews, statuses] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, body, rating, created_at, users (username, avatar_url), games (id, title, cover_url)")
      .in("user_id", authorIds)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("user_games")
      .select("id, status, hours_played, updated_at, users (username, avatar_url), games (id, title, cover_url)")
      .in("user_id", authorIds)
      .in("status", ["completed", "playing"])
      .order("updated_at", { ascending: false })
      .limit(limit),
  ]);

  type ReviewRow = {
    id: string;
    body: string;
    rating: number;
    created_at: string;
    users: Pick<User, "username" | "avatar_url">;
    games: Pick<Game, "id" | "title" | "cover_url">;
  };
  type StatusRow = {
    id: string;
    status: GameStatus;
    hours_played: number;
    updated_at: string;
    users: Pick<User, "username" | "avatar_url">;
    games: Pick<Game, "id" | "title" | "cover_url">;
  };

  const items: FeedItem[] = [
    ...((reviews.data ?? []) as unknown as ReviewRow[]).map((row) => ({
      kind: "review" as const,
      id: `review-${row.id}`,
      createdAt: row.created_at,
      user: row.users,
      game: row.games,
      rating: row.rating,
      body: row.body,
    })),
    ...((statuses.data ?? []) as unknown as StatusRow[]).map((row) => ({
      kind: "status" as const,
      id: `status-${row.id}`,
      createdAt: row.updated_at,
      user: row.users,
      game: row.games,
      status: row.status,
      hours: Number(row.hours_played),
    })),
  ];

  return items
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit);
}
