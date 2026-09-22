import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Library, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui";

const LINKS = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/library", label: "Library", icon: Library },
  { href: "/import", label: "Import", icon: Sparkles },
];

export function Nav({ username }: { username?: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          shelved<span className="text-accent">.</span>
        </Link>

        <Show when="signed-in">
          <div className="flex items-center gap-1">
            {LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-surface hover:text-ink"
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </div>
        </Show>

        <div className="ml-auto flex items-center gap-3">
          <Show when="signed-in">
            {username && (
              <Link
                href={`/users/${username}`}
                className="hidden text-sm text-muted transition hover:text-ink sm:block"
              >
                @{username}
              </Link>
            )}
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button size="sm">Sign in</Button>
            </SignInButton>
          </Show>
        </div>
      </nav>
    </header>
  );
}
