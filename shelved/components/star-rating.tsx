"use client";

import { Star } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function StarRating({
  value,
  size = 16,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${value.toFixed(1)} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={star <= Math.round(value) ? "fill-accent text-accent" : "text-line"}
        />
      ))}
    </span>
  );
}

export function StarInput({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
}) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          aria-pressed={value === star}
          onMouseEnter={() => setHovered(star)}
          onClick={() => onChange(star)}
          className="rounded transition hover:scale-110"
        >
          <Star
            size={size}
            className={star <= active ? "fill-accent text-accent" : "text-line"}
          />
        </button>
      ))}
    </div>
  );
}
