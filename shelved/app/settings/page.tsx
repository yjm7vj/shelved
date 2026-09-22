import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile-form";
import { Button } from "@/components/ui";
import { ensureUser } from "@/lib/user";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings — Shelved" };

export default async function SettingsPage() {
  const user = await ensureUser().catch(() => null);
  if (!user) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Link href={`/users/${user.username}`}>
          <Button variant="ghost" size="sm">
            View profile
          </Button>
        </Link>
      </div>

      <ProfileForm username={user.username} bio={user.bio ?? ""} />
    </div>
  );
}
