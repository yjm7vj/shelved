import { Show, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { Suspense } from "react";

import { Recommendations } from "@/components/recommendations";
import { StarRating } from "@/components/star-rating";
import { Avatar, Button, Card, EmptyState } from "@/components/ui";
import { getFeed } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";
import { STATUS_LABELS, type FeedItem } from "@/lib/types";
import { ensureUser } from "@/lib/user";
import { formatHours, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Landing() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-16 text-center">
      <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl">
        Your games, <span className="text-accent">shelved</span>.
      </h1>
      <p className="text-balance text-lg text-muted">
        Import your Steam library in one paste, rate what you have finished, see what
        your friends are playing, and get recommendations built from what you actually
        put hours into.
      </p>
      <Show when="signed-out">
        <SignUpButton mode="modal">
          <Button size="lg">Get started — it&apos;s free</Button>
        </SignUpButton>
      </Show>

      <div className="grid gap-4 pt-8 text-left sm:grid-cols-3">
        {[
          ["Import from Steam", "One paste pulls every game and every hour played."],
          ["Rate and review", "Five stars and as many words as you want."],
          ["Get recommendations", "Vector search over what you have actually played."],
        ].map(([title, body]) => (
          <Card key={title} className="space-y-1.5 p-5">
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted">{body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FeedEntry({ item }: { item: FeedItem }) {
  return (
    <Card className="flex gap-4 p-4">
      <Link href={`/games/${item.game.id}`} className="shrink-0">
        {item.game.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- covers come from RAWG and the Steam CDN
          <img
            src={item.game.cover_url}
            alt=""
            className="h-24 w-16 rounded-md border border-line object-cover"
          />
        ) : (
          <div className="h-24 w-16 rounded-md border border-line bg-surface-hover" />
        )}
      </Link>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2 text-sm">
          <Avatar src={item.user.avatar_url} name={item.user.username} size={22} />
          <Link href={`/users/${item.user.username}`} className="font-medium hover:text-accent">
            {item.user.username}
          </Link>
          <span className="text-muted">
            {item.kind === "review"
              ? "reviewed"
              : item.status === "completed"
                ? "completed"
                : "is playing"}
          </span>
          <Link href={`/games/${item.game.id}`} className="truncate font-medium hover:text-accent">
            {item.game.title}
          </Link>
          <span className="ml-auto shrink-0 text-xs text-muted">{timeAgo(item.createdAt)}</span>
        </div>

        {item.kind === "review" ? (
          <>
            <StarRating value={item.rating ?? 0} />
            {item.body && <p className="line-clamp-3 text-sm text-muted">{item.body}</p>}
          </>
        ) : (
          <p className="text-sm text-muted">
            {STATUS_LABELS[item.status!]}
            {item.hours ? ` · ${formatHours(item.hours)} played` : ""}
          </p>
        )}
      </div>
    </Card>
  );
}

export default async function HomePage() {
  if (!isSupabaseConfigured()) return <Landing />;

  const user = await ensureUser().catch(() => null);
  if (!user) return <Landing />;

  const feed = await getFeed(user.id);

  return (
    <div className="space-y-10">
      <Suspense fallback={null}>
        <Recommendations userId={user.id} />
      </Suspense>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recent activity</h2>

        {feed.length ? (
          <div className="space-y-3">
            {feed.map((item) => (
              <FeedEntry key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nothing here yet"
            description="Import your Steam library or follow someone to fill this feed."
          >
            <Link href="/import">
              <Button>Import from Steam</Button>
            </Link>
          </EmptyState>
        )}
      </section>
    </div>
  );
}
