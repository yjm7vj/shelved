import Link from "next/link";
import { redirect } from "next/navigation";

import { GameCard, GameGrid } from "@/components/game-card";
import { Button, Card, EmptyState } from "@/components/ui";
import { getLibrary } from "@/lib/queries";
import { GAME_STATUSES, STATUS_LABELS, type GameStatus } from "@/lib/types";
import { ensureUser } from "@/lib/user";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your library — Shelved" };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await ensureUser().catch(() => null);
  if (!user) redirect("/sign-in");

  const { status } = await searchParams;
  const filter = GAME_STATUSES.includes(status as GameStatus)
    ? (status as GameStatus)
    : undefined;

  const entries = await getLibrary(user.id, filter);
  const totalHours = entries.reduce((total, entry) => total + Number(entry.hours_played), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Your library</h1>
          <p className="text-sm text-muted">
            {entries.length} game{entries.length === 1 ? "" : "s"} ·{" "}
            {Math.round(totalHours).toLocaleString()} hours played
          </p>
        </div>
        <Link href="/import">
          <Button variant="secondary">Sync Steam</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterLink href="/library" label="All" active={!filter} />
        {GAME_STATUSES.map((option) => (
          <FilterLink
            key={option}
            href={`/library?status=${option}`}
            label={STATUS_LABELS[option]}
            active={filter === option}
          />
        ))}
      </div>

      {entries.length ? (
        <GameGrid>
          {entries.map((entry) => (
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
        <EmptyState
          title={filter ? `Nothing in ${STATUS_LABELS[filter].toLowerCase()}` : "Your shelf is empty"}
          description={
            filter
              ? "Change a game's status from its page to see it here."
              : "Import your Steam library to fill this in seconds, or search for a game to add it by hand."
          }
        >
          <div className="flex gap-2">
            <Link href="/import">
              <Button>Import from Steam</Button>
            </Link>
            <Link href="/search">
              <Button variant="secondary">Search games</Button>
            </Link>
          </div>
        </EmptyState>
      )}

      {entries.length > 0 && (
        <Card className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          {GAME_STATUSES.map((option) => (
            <div key={option}>
              <p className="text-xl font-bold">
                {entries.filter((entry) => entry.status === option).length}
              </p>
              <p className="text-xs text-muted">{STATUS_LABELS[option]}</p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function FilterLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-sm transition",
        active
          ? "border-accent bg-accent text-accent-ink"
          : "border-line text-muted hover:bg-surface hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
}
