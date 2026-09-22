"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { startSteamSync } from "@/lib/actions";
import { createBrowserClient } from "@/lib/supabase-browser";
import type { SyncJob } from "@/lib/types";
import { Button, Card, Input } from "@/components/ui";

type Phase = "idle" | "queued" | "running" | "complete" | "failed";

const PHASE_COPY: Record<Exclude<Phase, "idle">, string> = {
  queued: "Queued — waiting for a worker to pick it up…",
  running: "Talking to Steam and saving your library…",
  complete: "Import complete.",
  failed: "Import failed.",
};

export function SteamImport() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [gameCount, setGameCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  function applyJob(job: Partial<Pick<SyncJob, "status" | "game_count" | "error">>) {
    // A DELETE event carries an empty `new` payload, so ignore anything without
    // a status rather than driving the UI into an undefined phase.
    if (!job.status) return;
    setPhase(job.status);
    setGameCount(job.game_count ?? 0);
    if (job.status === "failed") setError(job.error ?? "The sync job failed");
  }

  /**
   * Watch the job over Supabase Realtime. A short poll runs alongside it so the
   * page still resolves if the websocket is blocked or the job finished before
   * the subscription was established.
   */
  useEffect(() => {
    if (!jobId) return;

    const supabase = createBrowserClient();
    const channel = supabase
      ?.channel(`sync-${jobId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sync_jobs", filter: `job_id=eq.${jobId}` },
        (payload) => applyJob(payload.new as SyncJob),
      )
      .subscribe();

    async function poll() {
      const { data } = (await supabase
        ?.from("sync_jobs")
        .select("status, game_count, error")
        .eq("job_id", jobId)
        .maybeSingle()) ?? { data: null };
      if (data) applyJob(data as SyncJob);
    }

    void poll();
    pollTimer.current = setInterval(poll, 4000);

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      if (channel) void supabase?.removeChannel(channel);
    };
  }, [jobId]);

  useEffect(() => {
    if (phase !== "complete") return;
    if (pollTimer.current) clearInterval(pollTimer.current);
    const timer = setTimeout(() => router.push("/library"), 1200);
    return () => clearTimeout(timer);
  }, [phase, router]);

  function start() {
    setError(null);
    setPhase("queued");
    void startSteamSync(input).then((result) => {
      if (result.ok) setJobId(result.jobId);
      else {
        setPhase("failed");
        setError(result.error);
      }
    });
  }

  const busy = phase === "queued" || phase === "running";

  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-1">
        <label htmlFor="steam" className="text-sm font-medium">
          Steam profile
        </label>
        <p className="text-xs text-muted">
          Paste your profile URL, vanity name, or 17-digit Steam ID. Your profile and
          game details must be set to Public.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="steam"
          value={input}
          disabled={busy}
          placeholder="https://steamcommunity.com/id/yourname"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && input.trim() && start()}
        />
        <Button onClick={start} disabled={busy || !input.trim()} className="sm:w-40">
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          {busy ? "Syncing…" : "Import library"}
        </Button>
      </div>

      {phase !== "idle" && (
        <div className="space-y-2 rounded-lg border border-line bg-canvas p-4">
          <div className="flex items-center gap-2 text-sm">
            {busy && <Loader2 size={14} className="animate-spin text-accent" />}
            <span className={phase === "failed" ? "text-dropped" : ""}>
              {PHASE_COPY[phase]}
            </span>
          </div>
          {phase === "complete" && (
            <p className="text-xs text-muted">
              Imported {gameCount} games. Taking you to your library…
            </p>
          )}
          {error && <p className="text-xs text-dropped">{error}</p>}
        </div>
      )}
    </Card>
  );
}
