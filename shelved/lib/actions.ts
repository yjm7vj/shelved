"use server";

import { revalidatePath } from "next/cache";

import { ensureUser, getUserByUsername } from "./user";
import { db } from "./supabase";
import { GAME_STATUSES, type GameStatus } from "./types";

async function requireUser() {
  const user = await ensureUser();
  if (!user) throw new Error("You must be signed in to do that");
  return user;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

function failure(error: unknown): ActionResult {
  return { ok: false, error: error instanceof Error ? error.message : "Something went wrong" };
}

export async function setGameStatus(gameId: string, status: GameStatus): Promise<ActionResult> {
  try {
    if (!GAME_STATUSES.includes(status)) throw new Error("Unknown status");
    const user = await requireUser();

    await db()
      .from("user_games")
      .upsert(
        { user_id: user.id, game_id: gameId, status },
        { onConflict: "user_id,game_id" },
      )
      .throwOnError();

    revalidatePath(`/games/${gameId}`);
    revalidatePath("/library");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function removeFromLibrary(gameId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await db()
      .from("user_games")
      .delete()
      .eq("user_id", user.id)
      .eq("game_id", gameId)
      .throwOnError();

    revalidatePath(`/games/${gameId}`);
    revalidatePath("/library");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function submitReview(
  gameId: string,
  rating: number,
  body: string,
): Promise<ActionResult> {
  try {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("Pick a rating between 1 and 5 stars");
    }
    const user = await requireUser();

    await db()
      .from("reviews")
      .upsert(
        { user_id: user.id, game_id: gameId, rating, body: body.trim().slice(0, 5000) },
        { onConflict: "user_id,game_id" },
      )
      .throwOnError();

    // Reviewing something implies it is in your library. `ignoreDuplicates`
    // keeps a status you already chose. The review is the write that matters,
    // so a failure here is logged rather than reported as a failed review —
    // the user's words are already saved, and the next save repairs this.
    const { error: libraryError } = await db()
      .from("user_games")
      .upsert(
        { user_id: user.id, game_id: gameId, status: "completed" },
        { onConflict: "user_id,game_id", ignoreDuplicates: true },
      );
    if (libraryError) {
      console.error("Review saved but library entry failed", {
        userId: user.id,
        gameId,
        error: libraryError.message,
      });
    }

    revalidatePath(`/games/${gameId}`);
    revalidatePath(`/users/${user.username}`);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteReview(gameId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await db()
      .from("reviews")
      .delete()
      .eq("user_id", user.id)
      .eq("game_id", gameId)
      .throwOnError();

    revalidatePath(`/games/${gameId}`);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function toggleFollow(username: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const target = await getUserByUsername(username);
    if (!target) throw new Error("No such user");
    if (target.id === user.id) throw new Error("You cannot follow yourself");

    const { data: existing } = await db()
      .from("friendships")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", target.id)
      .maybeSingle();

    if (existing) {
      await db().from("friendships").delete().eq("id", existing.id).throwOnError();
    } else {
      await db()
        .from("friendships")
        .insert({ follower_id: user.id, following_id: target.id })
        .throwOnError();
    }

    revalidatePath(`/users/${username}`);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateProfile(username: string, bio: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const normalised = username.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,24}$/.test(normalised)) {
      throw new Error("Username must be 3–24 characters: letters, numbers or underscores");
    }

    const { error } = await db()
      .from("users")
      .update({ username: normalised, bio: bio.trim().slice(0, 500) })
      .eq("id", user.id);

    if (error) {
      throw new Error(error.code === "23505" ? "That username is taken" : error.message);
    }

    revalidatePath(`/users/${normalised}`);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Hand the Steam import to the FastAPI service, which queues it on Redis and
 * returns a job id the browser then watches over Supabase Realtime.
 */
export async function startSteamSync(
  steamInput: string,
): Promise<{ ok: true; jobId: string } | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    const base = process.env.API_BASE_URL ?? "http://localhost:8000";

    const response = await fetch(`${base}/sync-steam`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steam_id: steamInput.trim(), user_id: user.id }),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.detail ?? `Sync service returned ${response.status}`);
    }

    return { ok: true, jobId: payload.job_id };
  } catch (error) {
    if (error instanceof TypeError) {
      return {
        ok: false,
        error: "Could not reach the sync service. Is the API running on port 8000?",
      };
    }
    return failure(error) as { ok: false; error: string };
  }
}
