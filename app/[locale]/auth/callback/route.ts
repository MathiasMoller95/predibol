import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
type RouteContext = {
  params: { locale: string };
};

function getSafeNextPath(next: string | null, locale: string) {
  if (!next) {
    return null;
  }

  if (!next.startsWith(`/${locale}/`)) {
    return null;
  }

  if (next.startsWith("//")) {
    return null;
  }

  return next;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { locale } = params;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"), locale);
  const loginUrl = new URL(`/${locale}/login`, request.url);

  if (!code) {
    loginUrl.searchParams.set("error", "auth_failed");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    loginUrl.searchParams.set("error", "auth_failed");
    return NextResponse.redirect(loginUrl);
  }

  const redirectPath = nextPath ?? `/${locale}/dashboard`;
  const redirectUrl = new URL(redirectPath, request.url);
  return NextResponse.redirect(redirectUrl);
}
