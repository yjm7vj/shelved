"use client";

import { useState, useTransition } from "react";

import { updateProfile } from "@/lib/actions";
import { Button, Card, Input, Textarea } from "@/components/ui";

export function ProfileForm({
  username,
  bio,
}: {
  username: string;
  bio: string;
}) {
  const [name, setName] = useState(username);
  const [about, setAbout] = useState(bio);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="space-y-5 p-6">
      <div className="space-y-1.5">
        <label htmlFor="username" className="text-sm font-medium">
          Username
        </label>
        <Input
          id="username"
          value={name}
          maxLength={24}
          onChange={(event) => setName(event.target.value)}
        />
        <p className="text-xs text-muted">
          Your profile lives at /users/{name || "…"}. Letters, numbers and underscores.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bio" className="text-sm font-medium">
          Bio
        </label>
        <Textarea
          id="bio"
          rows={3}
          value={about}
          maxLength={500}
          placeholder="Mostly CRPGs and roguelikes."
          onChange={(event) => setAbout(event.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              setSaved(false);
              const result = await updateProfile(name, about);
              if (result.ok) setSaved(true);
              else setError(result.error);
            })
          }
        >
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {saved && <span className="text-xs text-completed">Saved</span>}
        {error && <span className="text-xs text-dropped">{error}</span>}
      </div>
    </Card>
  );
}
