import { Sparkles } from "lucide-react";

import { GameCard, GameGrid } from "@/components/game-card";
import type { Recommendation } from "@/lib/types";

async function fetchRecommendations(userId: string): Promise<Recommendation[]> {
  const base = process.env.API_BASE_URL ?? "http://localhost:8000";
  try {
    const response = await fetch(`${base}/recommendations/${userId}?limit=6`, {
      next: { revalidate: 300 },
      // The home page must not hang waiting on an optional service.
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const payload = await response.json();
    return payload.recommendations ?? [];
  } catch {
    // The recommendation service is optional; the feed should still render.
    return [];
  }
}

export async function Recommendations({ userId }: { userId: string }) {
  const recommendations = await fetchRecommendations(userId);
  if (!recommendations.length) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-accent" />
        <h2 className="text-lg font-semibold">Recommended for you</h2>
      </div>

      <GameGrid>
        {recommendations.map((game) => (
          <GameCard
            key={game.id}
            href={`/games/${game.id}`}
            title={game.title}
            coverUrl={game.cover_url}
            footnote={`Because you played ${game.because_of}`}
          />
        ))}
      </GameGrid>
    </section>
  );
}
