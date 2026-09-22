import Link from "next/link";

import { STATUS_LABELS, type GameStatus } from "@/lib/types";
import { cn, formatHours } from "@/lib/utils";

const STATUS_DOT: Record<GameStatus, string> = {
  playing: "bg-playing",
  completed: "bg-completed",
  backlog: "bg-backlog",
  dropped: "bg-dropped",
};

export function StatusBadge({ status }: { status: GameStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas/80 px-2.5 py-1 text-xs backdrop-blur">
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function GameCard({
  href,
  title,
  coverUrl,
  status,
  hours,
  footnote,
}: {
  href: string;
  title: string;
  coverUrl?: string | null;
  status?: GameStatus;
  hours?: number;
  footnote?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 focus-visible:outline-none"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-line bg-surface">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- covers come from RAWG and the Steam CDN
          <img
            src={coverUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="flex size-full items-center justify-center p-4 text-center text-sm text-muted">
            {title}
          </span>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-canvas/90 to-transparent opacity-0 transition group-hover:opacity-100" />

        {status && (
          <div className="absolute left-2 top-2">
            <StatusBadge status={status} />
          </div>
        )}
        {hours !== undefined && hours > 0 && (
          <span className="absolute bottom-2 right-2 rounded-full border border-line bg-canvas/80 px-2 py-0.5 text-xs backdrop-blur">
            {formatHours(hours)}
          </span>
        )}
      </div>

      <div>
        <p className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-accent">
          {title}
        </p>
        {footnote && <p className="mt-0.5 text-xs text-muted">{footnote}</p>}
      </div>
    </Link>
  );
}

export function GameGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {children}
    </div>
  );
}
