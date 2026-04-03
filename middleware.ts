import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

const intlMiddleware = createMiddleware(routing);

function getLocaleFromPathname(pathname: string) {
  const segments = pathname.split("/");
  return segments[1] ?? routing.defaultLocale;
}

function isProtectedDashboardRoute(pathname: string) {
  return /^\/(es|en|pt)\/dashboard(\/.*)?$/.test(pathname);
}

function isSetNameRoute(pathname: string) {
  return pathname.includes("/dashboard/set-name");
}

export default async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  const { pathname } = request.nextUrl;

  if (!isProtectedDashboardRoute(pathname)) {
    return intlResponse;
  }

  let response = intlResponse;
  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          response = intlResponse;
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const locale = getLocaleFromPathname(pathname);
    const loginUrl = new URL(`/${locale}/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  const locale = getLocaleFromPathname(pathname);

  if (isSetNameRoute(pathname)) {
    return response;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profileError &&
    (!profile || !String(profile.display_name ?? "").trim())
  ) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard/set-name`, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
