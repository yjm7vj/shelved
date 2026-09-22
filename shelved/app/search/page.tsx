import { Search } from "lucide-react";

import { GameCard, GameGrid } from "@/components/game-card";
import { Button, Card, EmptyState, Input } from "@/components/ui";
import { isRawgConfigured, searchGames } from "@/lib/rawg";

export const metadata = { title: "Search games — Shelved" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? await searchGames(query) : [];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Search games</h1>
        <p className="text-sm text-muted">Powered by the RAWG game database.</p>
      </div>

      <form className="flex gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Hollow Knight, Elden Ring, Factorio…"
          autoFocus
        />
        <Button type="submit" className="w-28">
          <Search size={16} />
          Search
        </Button>
      </form>

      {!isRawgConfigured() ? (
        <Card className="p-5 text-sm text-muted">
          Search needs a RAWG API key. Grab a free one at{" "}
          <a
            href="https://rawg.io/apidocs"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline"
          >
            rawg.io/apidocs
          </a>{" "}
          and set <code className="text-ink">RAWG_API_KEY</code> in{" "}
          <code className="text-ink">.env.local</code>.
        </Card>
      ) : !query ? (
        <EmptyState
          title="Search for a game"
          description="Find anything in the RAWG catalogue, then rate it or add it to your backlog."
        />
      ) : results.length ? (
        <GameGrid>
          {results.map((game) => (
            <GameCard
              key={game.rawgId}
              href={`/games/rawg/${game.rawgId}`}
              title={game.title}
              coverUrl={game.coverUrl}
              footnote={game.released?.slice(0, 4)}
            />
          ))}
        </GameGrid>
      ) : (
        <EmptyState title={`No results for "${query}"`} description="Try a different spelling." />
      )}
    </div>
  );
}
