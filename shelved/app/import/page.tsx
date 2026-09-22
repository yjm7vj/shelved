import { redirect } from "next/navigation";

import { SteamImport } from "@/components/steam-import";
import { Card } from "@/components/ui";
import { ensureUser } from "@/lib/user";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import from Steam — Shelved" };

export default async function ImportPage() {
  const user = await ensureUser().catch(() => null);
  if (!user) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Import from Steam</h1>
        <p className="text-sm text-muted">
          Every game you own and every hour you have played, pulled in one go.
          {user.steam_id && " Re-running this refreshes playtime without touching the statuses you have set."}
        </p>
      </div>

      <SteamImport />

      <Card className="space-y-3 p-5 text-sm text-muted">
        <p className="font-medium text-ink">How this works</p>
        <p>
          Your request goes to the Shelved API, which puts a job on a Redis queue and
          replies immediately with a job id. A background worker then calls Steam and
          writes the results to the database — a 3,000-game library would otherwise time
          out the HTTP request. This page watches the job over Supabase Realtime and
          redirects you as soon as it lands.
        </p>
      </Card>
    </div>
  );
}
