import * as Sentry from "@sentry/nextjs";

/**
 * Sentry is opt-in: with no DSN set, init is skipped and the app runs normally.
 */
export function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

export const onRequestError = Sentry.captureRequestError;
