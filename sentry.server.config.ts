import * as Sentry from "@sentry/nextjs";
import { sentryBaseInit } from "@/lib/sentry-common-init";

Sentry.init({
  ...sentryBaseInit,
});
