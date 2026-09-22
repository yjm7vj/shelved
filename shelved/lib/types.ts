export const GAME_STATUSES = ["playing", "completed", "backlog", "dropped"] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export const STATUS_LABELS: Record<GameStatus, string> = {
  playing: "Playing",
  completed: "Completed",
  backlog: "Backlog",
  dropped: "Dropped",
};

export type User = {
  id: string;
  clerk_id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  steam_id: string | null;
  created_at: string;
};

export type Game = {
  id: string;
  rawg_id: number | null;
  steam_app_id: number | null;
  title: string;
  slug: string | null;
  cover_url: string | null;
  description: string | null;
  genres: string[];
  released: string | null;
};

export type LibraryEntry = {
  id: string;
  hours_played: number;
  status: GameStatus;
  updated_at: string;
  games: Game;
};

export type Review = {
  id: string;
  body: string;
  rating: number;
  created_at: string;
  users: Pick<User, "id" | "username" | "avatar_url">;
  games?: Pick<Game, "id" | "title" | "cover_url">;
};

export type FeedItem = {
  kind: "review" | "status";
  id: string;
  createdAt: string;
  user: Pick<User, "username" | "avatar_url">;
  game: Pick<Game, "id" | "title" | "cover_url">;
  rating?: number;
  body?: string;
  status?: GameStatus;
  hours?: number;
};

export type Recommendation = {
  id: string;
  title: string;
  cover_url: string | null;
  genres: string[];
  similarity: number;
  because_of: string;
};

export type SyncJob = {
  job_id: string;
  status: "queued" | "running" | "complete" | "failed";
  game_count: number;
  error: string | null;
};
