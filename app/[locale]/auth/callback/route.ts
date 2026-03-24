import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: { locale: string };
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { locale } = params;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const loginUrl = new URL(`/${locale}/login`, request.url);

  if (!code) {
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(loginUrl);
  }

  const dashboardUrl = new URL(`/${locale}/dashboard`, request.url);
  return NextResponse.redirect(dashboardUrl);
}
