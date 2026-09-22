import Link from "next/link";
import { notFound } from "next/navigation";

import { FollowButton } from "@/components/follow-button";
import { GameCard, GameGrid } from "@/components/game-card";
import { StarRating } from "@/components/star-rating";
import { Avatar, Button, Card } from "@/components/ui";
import {
  getLibrary,
  getProfileStats,
  getRecentReviews,
  isFollowing,
} from "@/lib/queries";
import { ensureUser, getUserByUsername } from "@/lib/user";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return { title: `${username} — Shelved` };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await getUserByUsername(username);
  if (!profile) notFound();

  const viewer = await ensureUser().catch(() => null);
  const isOwnProfile = viewer?.id === profile.id;

  const [stats, library, reviews, following] = await Promise.all([
    getProfileStats(profile.id),
    getLibrary(profile.id),
    getRecentReviews(profile.id),
    viewer && !isOwnProfile ? isFollowing(viewer.id, profile.id) : Promise.resolve(false),
  ]);

  const STATS = [
    ["Games", stats.totalGames.toLocaleString()],
    ["Hours", stats.totalHours.toLocaleString()],
    ["Completed", stats.completed.toLocaleString()],
    ["Reviews", stats.reviewCount.toLocaleString()],
    ["Followers", stats.followers.toLocaleString()],
    ["Following", stats.following.toLocaleString()],
  ] as const;

  const completionRate = stats.totalGames
    ? Math.round((stats.completed / stats.totalGames) * 100)
    : 0;

  return (
    <div className="space-y-10">
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-accent/25 via-backlog/20 to-transparent" />

        <div className="flex flex-wrap items-end gap-5 px-6 pb-6">
          <div className="-mt-12">
            <Avatar src={profile.avatar_url} name={profile.username} size={88} />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-2xl font-bold">{profile.username}</h1>
            <p className="max-w-xl text-sm text-muted">
              {profile.bio || "No bio yet."}
            </p>
          </div>

          {isOwnProfile ? (
            <Link href="/settings">
              <Button variant="secondary">Edit profile</Button>
            </Link>
          ) : viewer ? (
            <FollowButton username={profile.username} initiallyFollowing={following} />
          ) : null}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {STATS.map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs text-muted">{label}</p>
          </Card>
        ))}
      </div>

      {stats.totalGames > 0 && (
        <Card className="space-y-2 p-5">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Completion rate</span>
            <span className="text-muted">
              {completionRate}% · {stats.completed} of {stats.totalGames}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-canvas">
            <div
              className="h-full rounded-full bg-completed transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </Card>
      )}

      {reviews.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Recent reviews</h2>
          <div className="space-y-3">
            {reviews.map((review) => (
              <Card key={review.id} className="flex gap-4 p-4">
                <Link href={`/games/${review.games!.id}`} className="shrink-0">
                  {review.games!.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- covers come from RAWG and the Steam CDN
                    <img
                      src={review.games!.cover_url}
                      alt=""
                      className="h-20 w-14 rounded-md border border-line object-cover"
                    />
                  ) : (
                    <div className="h-20 w-14 rounded-md border border-line bg-surface-hover" />
                  )}
                </Link>
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/games/${review.games!.id}`}
                      className="font-medium hover:text-accent"
                    >
                      {review.games!.title}
                    </Link>
                    <StarRating value={review.rating} size={14} />
                    <span className="text-xs text-muted">{timeAgo(review.created_at)}</span>
                  </div>
                  {review.body && (
                    <p className="line-clamp-3 text-sm text-muted">{review.body}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Most played</h2>
        {library.length ? (
          <GameGrid>
            {library.slice(0, 12).map((entry) => (
              <GameCard
                key={entry.id}
                href={`/games/${entry.games.id}`}
                title={entry.games.title}
                coverUrl={entry.games.cover_url}
                status={entry.status}
                hours={Number(entry.hours_played)}
              />
            ))}
          </GameGrid>
        ) : (
          <p className="text-sm text-muted">
            {profile.username} hasn&apos;t shelved any games yet.
          </p>
        )}
      </section>
    </div>
  );
}
