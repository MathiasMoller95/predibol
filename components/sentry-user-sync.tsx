"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/client";

/** Keeps Sentry browser user context aligned with Supabase auth. */
export default function SentryUserSync() {
  useEffect(() => {
    const supabase = createClient();

    void supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) {
        Sentry.setUser({ id: u.id, email: u.email ?? undefined });
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      if (u) {
        Sentry.setUser({ id: u.id, email: u.email ?? undefined });
      } else {
        Sentry.setUser(null);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  return null;
}
