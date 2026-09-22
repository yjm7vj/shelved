"use client";

import { Check, Trash2 } from "lucide-react";
import { useTransition, useState } from "react";

import { removeFromLibrary, setGameStatus } from "@/lib/actions";
import { GAME_STATUSES, STATUS_LABELS, type GameStatus } from "@/lib/types";
import { Button } from "@/components/ui";

export function StatusSelect({
  gameId,
  current,
}: {
  gameId: string;
  current: GameStatus | null;
}) {
  const [status, setStatus] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(next: GameStatus) {
    const previous = status;
    setStatus(next);
    setError(null);
    startTransition(async () => {
      const result = await setGameStatus(gameId, next);
      if (!result.ok) {
        setStatus(previous);
        setError(result.error);
      }
    });
  }

  function remove() {
    const previous = status;
    setStatus(null);
    startTransition(async () => {
      const result = await removeFromLibrary(gameId);
      if (!result.ok) {
        setStatus(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {GAME_STATUSES.map((option) => (
          <Button
            key={option}
            size="sm"
            variant={status === option ? "primary" : "secondary"}
            disabled={pending}
            onClick={() => choose(option)}
          >
            {status === option && <Check size={14} />}
            {STATUS_LABELS[option]}
          </Button>
        ))}
        {status && (
          <Button size="sm" variant="danger" disabled={pending} onClick={remove}>
            <Trash2 size={14} />
            Remove
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-dropped">{error}</p>}
    </div>
  );
}
