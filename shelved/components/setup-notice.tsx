import { AlertTriangle } from "lucide-react";

import { Card } from "@/components/ui";

/**
 * Shown when the database is not wired up yet. Without it a fresh clone just
 * renders blank pages and it is not obvious why.
 */
export function SetupNotice() {
  return (
    <Card className="mb-8 flex gap-3 border-accent/40 bg-accent/5 p-5">
      <AlertTriangle className="mt-0.5 shrink-0 text-accent" size={18} />
      <div className="space-y-2 text-sm">
        <p className="font-semibold">Database not connected</p>
        <p className="text-muted">
          Add <code className="text-ink">SUPABASE_URL</code> and{" "}
          <code className="text-ink">SUPABASE_SECRET_KEY</code> to{" "}
          <code className="text-ink">shelved/.env.local</code>, then run{" "}
          <code className="text-ink">supabase/migrations/0001_init.sql</code> in the
          Supabase SQL editor. See <code className="text-ink">README.md</code> for the
          full checklist.
        </p>
      </div>
    </Card>
  );
}
