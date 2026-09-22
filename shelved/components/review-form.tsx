"use client";

import { useState, useTransition } from "react";

import { deleteReview, submitReview } from "@/lib/actions";
import { Button, Card, Textarea } from "@/components/ui";
import { StarInput } from "@/components/star-rating";

export function ReviewForm({
  gameId,
  existing,
}: {
  gameId: string;
  existing: { rating: number; body: string } | null;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [body, setBody] = useState(existing?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await submitReview(gameId, rating, body);
      if (result.ok) setSaved(true);
      else setError(result.error);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteReview(gameId);
      if (result.ok) {
        setRating(0);
        setBody("");
        setSaved(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">{existing ? "Your review" : "Rate this game"}</h3>
        <StarInput value={rating} onChange={setRating} />
      </div>

      <Textarea
        rows={4}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="What did you make of it? (optional)"
      />

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending || rating === 0}>
          {pending ? "Saving…" : existing ? "Update review" : "Post review"}
        </Button>
        {existing && (
          <Button variant="ghost" size="md" onClick={remove} disabled={pending}>
            Delete
          </Button>
        )}
        {saved && <span className="text-xs text-completed">Saved</span>}
        {error && <span className="text-xs text-dropped">{error}</span>}
      </div>
    </Card>
  );
}
