import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatHours(hours: number) {
  const value = Number(hours);
  if (!value) return "—";
  return value >= 100 ? `${Math.round(value)}h` : `${value.toFixed(1)}h`;
}

export function timeAgo(iso: string) {
  const seconds = Math.max(1, (Date.now() - Date.parse(iso)) / 1000);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.35, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];

  let value = seconds;
  for (const [step, unit] of units) {
    if (value < step) {
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        -Math.floor(value),
        unit,
      );
    }
    value /= step;
  }
  return "a while ago";
}
