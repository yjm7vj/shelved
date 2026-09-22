import "server-only";

import { currentUser } from "@clerk/nextjs/server";

import { db } from "./supabase";
import type { User } from "./types";

const USERNAME_SAFE = /[^a-z0-9_]/g;

function candidateUsername(clerkUsername: string | null, email: string | undefined, id: string) {
  const base = (clerkUsername || email?.split("@")[0] || `player${id.slice(-6)}`)
    .toLowerCase()
    .replace(USERNAME_SAFE, "");
  return base.length >= 3 ? base.slice(0, 24) : `player${id.slice(-6)}`;
}

/**
 * Resolve the signed-in Clerk user to a row in `users`, creating it on first
 * visit.
 *
 * Doing this lazily rather than through a Clerk webhook keeps the whole auth
 * story in one place and means there is no webhook secret to configure before
 * the app works locally.
 */
export async function ensureUser(): Promise<User | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const supabase = db();

  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkUser.id)
    .maybeSingle();

  if (existing) return existing as User;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  let username = candidateUsername(clerkUser.username, email, clerkUser.id);

  // Usernames are unique; on a collision, suffix until one sticks.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("users")
      .insert({
        clerk_id: clerkUser.id,
        username,
        avatar_url: clerkUser.imageUrl,
      })
      .select()
      .single();

    if (!error) return data as User;
    if (error.code !== "23505") throw error;

    username = `${candidateUsername(clerkUser.username, email, clerkUser.id).slice(0, 20)}${Math.floor(
      Math.random() * 10000,
    )}`;
  }

  throw new Error("Could not allocate a username");
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const { data } = await db()
    .from("users")
    .select("*")
    .ilike("username", username)
    .maybeSingle();
  return (data as User) ?? null;
}
