import Link from "next/link";
import { notFound } from "next/navigation";

import { ReviewForm } from "@/components/review-form";
import { StarRating } from "@/components/star-rating";
import { StatusSelect } from "@/components/status-select";
import { Avatar, Badge, Card } from "@/components/ui";
import {
  averageRating,
  getGame,
  getGameReviews,
  getUserGame,
  getUserReview,
} from "@/lib/queries";
import { enrichGame } from "@/lib/rawg";
import { ensureUser } from "@/lib/user";
import { formatHours, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  const found = await getGame(gameId);
  if (!found) notFound();

  // Steam imports arrive with just a title; fill in the rest on first view.
  const game = await enrichGame(found);

  const user = await ensureUser().catch(() => null);
  const [reviews, userGame, userReview] = await Promise.all([
    getGameReviews(game.id),
    user ? getUserGame(user.id, game.id) : null,
    user ? getUserReview(user.id, game.id) : null,
  ]);

  const average = averageRating(reviews);

  return (
    <div className="space-y-8">
      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            {game.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- covers come from RAWG and the Steam CDN
              <img src={game.cover_url} alt="" className="aspect-[3/4] w-full object-cover" />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center p-4 text-center text-sm text-muted">
                {game.title}
              </div>
            )}
          </div>

          {userGame && userGame.hours_played > 0 && (
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold">{formatHours(userGame.hours_played)}</p>
              <p className="text-xs text-muted">your playtime</p>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{game.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
              {average !== null ? (
                <span className="flex items-center gap-2">
                  <StarRating value={average} />
                  <span className="text-ink">{average.toFixed(1)}</span>
                  <span>
                    ({reviews.length} review{reviews.length === 1 ? "" : "s"})
                  </span>
                </span>
              ) : (
                <span>No ratings yet</span>
              )}
              {game.released && <span>· {game.released.slice(0, 4)}</span>}
            </div>
          </div>

          {game.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {game.genres.map((genre) => (
                <Badge key={genre}>{genre}</Badge>
              ))}
            </div>
          )}

          {game.description && (
            <p className="max-w-2xl whitespace-pre-line text-sm leading-relaxed text-muted">
              {game.description.slice(0, 900)}
              {game.description.length > 900 ? "…" : ""}
            </p>
          )}

          {user ? (
            <div className="space-y-5">
              <StatusSelect gameId={game.id} current={userGame?.status ?? null} />
              <ReviewForm gameId={game.id} existing={userReview} />
            </div>
          ) : (
            <Card className="p-5 text-sm text-muted">
              Sign in to rate this game and add it to your library.
            </Card>
          )}
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Reviews {reviews.length > 0 && <span className="text-muted">({reviews.length})</span>}
        </h2>

        {reviews.length ? (
          <div className="space-y-3">
            {reviews.map((review) => (
              <Card key={review.id} className="space-y-2 p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Avatar src={review.users.avatar_url} name={review.users.username} size={26} />
                  <Link
                    href={`/users/${review.users.username}`}
                    className="font-medium hover:text-accent"
                  >
                    {review.users.username}
                  </Link>
                  <StarRating value={review.rating} size={14} />
                  <span className="ml-auto text-xs text-muted">{timeAgo(review.created_at)}</span>
                </div>
                {review.body && (
                  <p className="whitespace-pre-line text-sm text-muted">{review.body}</p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Nobody has reviewed this yet. Go first.</p>
        )}
      </section>
    </div>
  );
}
