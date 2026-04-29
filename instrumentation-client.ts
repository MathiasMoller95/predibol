import * as Sentry from "@sentry/nextjs";
import { sentryBaseInit } from "@/lib/sentry-common-init";

Sentry.init({
  ...sentryBaseInit,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.5,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
