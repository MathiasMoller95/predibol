/** Shared runtime options for Sentry (server, edge, client). Keep in sync across init files. */
export const sentryBaseInit = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1 as const,
};
