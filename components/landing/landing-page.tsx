"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

const KICKOFF_UTC_MS = Date.UTC(2026, 5, 11, 0, 0, 0);
const LOCALES = ["es", "en", "pt"] as const;

type Props = {
  locale: string;
};

function splitRemaining(ms: number) {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return { days, hours, minutes, seconds };
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function FloatingSoccerEmoji({ className }: { className?: string }) {
  return (
    <span className={`select-none ${className ?? ""}`} aria-hidden>
      ⚽
    </span>
  );
}

const WC_DIVIDER_COLORS = [
  "from-emerald-500/40 via-amber-500/30 to-blue-500/40",
  "from-red-500/30 via-white/20 to-emerald-500/40",
  "from-blue-500/40 via-amber-500/30 to-red-500/40",
  "from-amber-500/40 via-emerald-500/30 to-purple-500/40",
] as const;

function WcDivider({ index = 0 }: { index?: number }) {
  return (
    <div className="mx-auto max-w-6xl px-4" aria-hidden>
      <div
        className={`h-px w-full bg-gradient-to-r opacity-30 ${WC_DIVIDER_COLORS[index % WC_DIVIDER_COLORS.length]}`}
      />
    </div>
  );
}

function TrophyWatermark() {
  return (
    <svg
      className="landing-stats-trophy-wrap pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 text-emerald-600 sm:h-48 sm:w-48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={0.9}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 4h12M6 4v4a6 6 0 0 0 12 0V4M6 4H4m14 0h2m-2 0v4a6 6 0 0 1-12 0V4m6 16v-4m0 4H9m3 0h3m-6 0h6"
      />
    </svg>
  );
}

function LandingStatsGrid({ locale }: { locale: string }) {
  const t = useTranslations("LandingPage");
  const gridRef = useRef<HTMLDivElement>(null);
  const [teams, setTeams] = useState(0);
  const [matches, setMatches] = useState(0);
  const [groups, setGroups] = useState(0);
  const ran = useRef(false);

  useEffect(() => {
    ran.current = false;
    setTeams(0);
    setMatches(0);
    setGroups(0);
  }, [locale]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const targetTeams = Number.parseInt(t("stats.teamsNumber"), 10);
    const targetMatches = Number.parseInt(t("stats.matchesNumber"), 10);
    const targetGroups = Number.parseInt(t("stats.groupsNumber"), 10);

    if (Number.isNaN(targetTeams) || Number.isNaN(targetMatches) || Number.isNaN(targetGroups)) {
      setTeams(targetTeams);
      setMatches(targetMatches);
      setGroups(targetGroups);
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setTeams(targetTeams);
      setMatches(targetMatches);
      setGroups(targetGroups);
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || ran.current) return;
        ran.current = true;
        obs.disconnect();

        const durationMs = 1500;
        const t0 = performance.now();

        const frame = (now: number) => {
          const p = Math.min(1, (now - t0) / durationMs);
          const e = easeOutCubic(p);
          setTeams(Math.round(targetTeams * e));
          setMatches(Math.round(targetMatches * e));
          setGroups(Math.round(targetGroups * e));
          if (p < 1) requestAnimationFrame(frame);
          else {
            setTeams(targetTeams);
            setMatches(targetMatches);
            setGroups(targetGroups);
          }
        };
        requestAnimationFrame(frame);
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [t, locale]);

  const targetHosts = Number.parseInt(t("stats.hostCountriesNumber"), 10);

  return (
    <div ref={gridRef} className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-4">
      <div className="relative flex min-h-[5rem] flex-col items-center justify-center">
        <TrophyWatermark />
        <p className="relative z-[1] flex flex-col items-center sm:block">
          <span className="font-mono text-4xl font-extrabold tabular-nums text-emerald-500 sm:text-5xl">{teams}</span>
          <span className="mt-0.5 block text-sm font-semibold text-emerald-500/90 sm:mt-1 sm:text-base">{t("stats.teamsLabel")}</span>
        </p>
      </div>
      <div className="flex flex-col items-center justify-center">
        <p className="flex flex-col items-center sm:block">
          <span className="font-mono text-4xl font-extrabold tabular-nums text-amber-500 sm:text-5xl">{matches}</span>
          <span className="mt-0.5 block text-sm font-semibold text-amber-500/90 sm:mt-1 sm:text-base">{t("stats.matchesLabel")}</span>
        </p>
      </div>
      <div className="flex flex-col items-center justify-center">
        <p className="flex flex-col items-center sm:block">
          <span className="font-mono text-4xl font-extrabold tabular-nums text-emerald-500 sm:text-5xl">{groups}</span>
          <span className="mt-0.5 block text-sm font-semibold text-emerald-500/90 sm:mt-1 sm:text-base">{t("stats.groupsLabel")}</span>
        </p>
      </div>
      <div className="flex flex-col items-center justify-center">
        <p className="flex flex-col items-center sm:block">
          <span className="font-mono text-4xl font-extrabold tabular-nums text-amber-500 sm:text-5xl">{Number.isNaN(targetHosts) ? 3 : targetHosts}</span>
          <span className="mt-0.5 block text-sm font-semibold text-amber-500/90 sm:mt-1 sm:text-base">{t("stats.hostCountriesLabel")}</span>
        </p>
      </div>
    </div>
  );
}

function fmtCountdownLine({ days, hours, minutes, seconds }: { days: number; hours: number; minutes: number; seconds: number }) {
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${days}d · ${hh}h · ${mm}m · ${ss}s`;
}

export default function LandingPage({ locale }: Props) {
  const t = useTranslations("LandingPage");
  const [remaining, setRemaining] = useState(() => KICKOFF_UTC_MS - Date.now());
  const [groupCount, setGroupCount] = useState(0);
  const [activePlayers, setActivePlayers] = useState(0);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => {
        setGroupCount(d.groups ?? 0);
        setActivePlayers(d.active_players ?? 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setRemaining(KICKOFF_UTC_MS - Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const nodes = document.querySelectorAll("[data-landing-reveal]");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("landing-reveal-in");
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    nodes.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, []);

  const { days, hours, minutes, seconds } = splitRemaining(remaining);
  const featureKeys = ["leaderboard", "odds", "ai", "groups", "rules", "mobile"] as const;

  const wordmarkPredi = <span className="text-emerald-400">{t("header.wordmark").slice(0, 5)}</span>;
  const wordmarkBol = <span className="text-white">{t("header.wordmark").slice(5)}</span>;

  return (
    <div
      className="landing-root min-h-screen animate-page-in motion-reduce:animate-none"
      data-theme="dark"
      style={{
        backgroundColor: "var(--landing-bg)",
        color: "var(--landing-text)",
      }}
    >
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={{
          backgroundColor: "var(--landing-header-bg)",
          borderColor: "var(--landing-border-subtle)",
        }}
      >
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-2 px-4">
          <Link
            href={`/${locale}`}
            className="text-lg font-bold tracking-tight"
            style={{ color: "var(--landing-text-heading)" }}
          >
            {wordmarkPredi}
            {wordmarkBol}
          </Link>
          <Link
            href={`/${locale}/login`}
            className="min-h-[44px] min-w-[44px] content-center text-center text-sm font-medium transition"
            style={{ color: "var(--landing-header-login)" }}
          >
            {t("header.login")}
          </Link>
        </div>
        <div
          className="landing-wc-header-stripe h-[3px] w-full"
          style={{ opacity: 0.45 }}
          aria-hidden
        />
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-x-hidden px-4 pb-10 pt-8 sm:pt-10">
          {/* "26" watermark */}
          <span
            className="pointer-events-none absolute left-1/2 top-[8%] z-0 -translate-x-1/2 select-none font-mono text-[280px] font-black leading-none tracking-tighter sm:text-[360px] md:text-[420px]"
            style={{ color: "rgba(255,255,255,0.02)" }}
            aria-hidden
          >
            26
          </span>
          {/* Subtle radial backdrop */}
          <div
            className="pointer-events-none absolute left-1/2 top-0 z-0 h-[min(28rem,55vh)] w-full max-w-3xl -translate-x-1/2 bg-[radial-gradient(ellipse_80%_70%_at_50%_28%,rgba(16,185,129,0.05),transparent_72%)]"
            aria-hidden
          />

          <div className="landing-hero-dash-wrap pointer-events-none absolute -left-[22px] top-[16%] z-0 sm:top-[18%]" aria-hidden>
            <div className="landing-hero-dash-circle">
              <span className="landing-hero-dash-emoji">⚽</span>
            </div>
          </div>

          <div className="relative z-10 mx-auto max-w-6xl md:flex md:items-center md:justify-between md:gap-10">
            <div className="mx-auto max-w-xl text-center md:mx-0 md:text-left">
              <h1 className="text-balance text-3xl font-black tracking-tight text-white sm:text-4xl">
                {t.rich("hero.headlineLine1", {
                  wc: (chunks) => (
                    <span className="bg-gradient-to-r from-teal-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
                      {chunks}
                    </span>
                  ),
                })}
                <br />
                <span>{t("hero.headlineLine2")}</span>
              </h1>

              <p className="mt-3 text-base font-medium text-slate-400">{t("hero.subtitleOneLine")}</p>

              <div className="mt-5">
                <p className="font-mono text-base font-bold text-slate-200" aria-live="polite" aria-atomic="true">
                  {fmtCountdownLine({ days, hours, minutes, seconds })}
                </p>
                <p className="mt-1 text-xs text-slate-500">{t("countdown.untilFirstMatch")}</p>
              </div>

              <div className="mt-5">
                <Link
                  href={`/${locale}/signup`}
                  className="animate-cta-pulse inline-flex w-full min-h-[56px] items-center justify-center rounded-xl bg-gpri px-6 py-4 text-lg font-bold text-white shadow-lg transition hover:brightness-110 md:max-w-sm"
                >
                  {t("hero.primaryCta")}
                </Link>
                <p className="mt-2 text-xs text-slate-500">{t("hero.primaryCtaHint")}</p>
              </div>

              <div className="mt-4 text-sm text-slate-500">
                {groupCount >= 20 ? (
                  <p>
                    ⚽ {groupCount} {t("social.groupsCreated")} · 🏟️ {activePlayers} {t("social.activePlayers")}
                  </p>
                ) : (
                  <p>{t("social.countries")}</p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-400 md:justify-start">
                <span>⚡ {t("hero.iconRow.superpowers")}</span>
                <span>🎴 {t("hero.iconRow.album")}</span>
                <span>🤖 {t("hero.iconRow.aiRival")}</span>
              </div>
            </div>

            <div className="mt-8 hidden md:block md:shrink-0">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-emerald-500/10">
                <Image
                  src="/landing/phone-mockup.svg"
                  alt=""
                  width={360}
                  height={720}
                  className="h-[520px] w-auto"
                  priority={false}
                />
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <WcDivider index={0} />
        <section
          id="how-it-works"
          data-landing-reveal
          className="landing-reveal relative overflow-hidden px-4 py-16 sm:py-20"
        >
          <div className="landing-how-pattern pointer-events-none absolute inset-0" aria-hidden />
          <div className="landing-mini-ball pointer-events-none absolute right-[6%] top-[14%] opacity-[0.1]" aria-hidden>
            <FloatingSoccerEmoji className="text-2xl sm:text-3xl" />
          </div>
          <div className="landing-mini-ball landing-mini-ball--b pointer-events-none absolute bottom-[18%] left-[4%] opacity-[0.08]" aria-hidden>
            <FloatingSoccerEmoji className="text-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold uppercase tracking-wider sm:text-3xl" style={{ color: "var(--landing-text-heading)" }}>
              {t("howItWorks.title")}
            </h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {[
                { emoji: "👥", step: "step1" as const },
                { emoji: "⚽", step: "step2" as const },
                { emoji: "🏆", step: "step3" as const },
              ].map(({ emoji, step }) => (
                <div key={step} className="flex flex-col items-center text-center">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-3xl"
                    aria-hidden
                  >
                    {emoji}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold" style={{ color: "var(--landing-text-heading)" }}>
                    {t(`howItWorks.${step}.title`)}
                  </h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed" style={{ color: "var(--landing-text-muted)" }}>
                    {t(`howItWorks.${step}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Differentiators */}
        <WcDivider index={1} />
        <section
          id="differentiators"
          data-landing-reveal
          className="landing-reveal relative overflow-hidden px-4 py-16 sm:py-20"
        >
          <div className="relative mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold uppercase tracking-wider sm:text-3xl" style={{ color: "var(--landing-text-heading)" }}>
              {t("differentiators.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-base" style={{ color: "var(--landing-text-muted)" }}>
              {t("differentiators.subtitle")}
            </p>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {/* Superpowers */}
              <div
                className="group rounded-xl border-l-4 border-amber-500 p-8 shadow-lg shadow-amber-500/10 transition hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/15"
                style={{ backgroundColor: "var(--landing-card)", borderRightWidth: 1, borderTopWidth: 1, borderBottomWidth: 1, borderRightColor: "var(--landing-border-subtle)", borderTopColor: "var(--landing-border-subtle)", borderBottomColor: "var(--landing-border-subtle)" }}
              >
                <span className="text-5xl" aria-hidden>⚡</span>
                <h3 className="mt-4 text-lg font-bold" style={{ color: "var(--landing-text-heading)" }}>
                  {t("differentiators.superpowers.title")}
                </h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--landing-text-muted)" }}>
                  {t("differentiators.superpowers.description")}
                </p>
              </div>

              {/* Album */}
              <div
                className="group rounded-xl border-l-4 border-emerald-500 p-8 shadow-lg shadow-emerald-500/10 transition hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/15"
                style={{ backgroundColor: "var(--landing-card)", borderRightWidth: 1, borderTopWidth: 1, borderBottomWidth: 1, borderRightColor: "var(--landing-border-subtle)", borderTopColor: "var(--landing-border-subtle)", borderBottomColor: "var(--landing-border-subtle)" }}
              >
                <span className="text-5xl" aria-hidden>🎴</span>
                <h3 className="mt-4 text-lg font-bold" style={{ color: "var(--landing-text-heading)" }}>
                  {t("differentiators.album.title")}
                </h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--landing-text-muted)" }}>
                  {t("differentiators.album.description")}
                </p>
                <p className="mt-3 text-lg" aria-hidden>🥉🥈🥇</p>
              </div>

              {/* AI */}
              <div
                className="group rounded-xl border-l-4 border-purple-500 p-8 shadow-lg shadow-purple-500/10 transition hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/15"
                style={{ backgroundColor: "var(--landing-card)", borderRightWidth: 1, borderTopWidth: 1, borderBottomWidth: 1, borderRightColor: "var(--landing-border-subtle)", borderTopColor: "var(--landing-border-subtle)", borderBottomColor: "var(--landing-border-subtle)" }}
              >
                <span className="text-5xl" aria-hidden>🤖</span>
                <h3 className="mt-4 text-lg font-bold" style={{ color: "var(--landing-text-heading)" }}>
                  {t("differentiators.ai.title")}
                </h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--landing-text-muted)" }}>
                  {t("differentiators.ai.description")}
                </p>
              </div>
            </div>

            {/* Comparison tagline */}
            <p className="mx-auto mt-14 max-w-xl text-center text-xl italic text-gray-400">
              {t.rich("differentiators.comparison", {
                brand: (chunks) => <span className="font-bold not-italic text-emerald-400">{chunks}</span>,
                action: (chunks) => <span className="font-bold not-italic text-white">{chunks}</span>,
              })}
            </p>
          </div>
        </section>

        {/* Features */}
        <section id="features" data-landing-reveal className="landing-reveal relative overflow-hidden px-4 py-16 sm:py-20">
          <div className="landing-mini-ball landing-mini-ball--c pointer-events-none absolute right-[3%] top-[22%] opacity-[0.09]" aria-hidden>
            <FloatingSoccerEmoji className="text-2xl" />
          </div>
          <div className="landing-mini-ball landing-mini-ball--d pointer-events-none absolute bottom-[30%] left-[8%] opacity-[0.07]" aria-hidden>
            <FloatingSoccerEmoji className="text-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold uppercase tracking-wider sm:text-3xl" style={{ color: "var(--landing-text-heading)" }}>
              {t("features.title")}
            </h2>
            <ul className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {featureKeys.map((key) => (
                <li
                  key={key}
                  className="rounded-xl border p-5 transition hover:border-emerald-500/30"
                  style={{
                    borderColor: "var(--landing-border-subtle)",
                    backgroundColor: "var(--landing-card)",
                  }}
                >
                  <span className="text-2xl" aria-hidden>
                    {t(`features.${key}.emoji`)}
                  </span>
                  <h3 className="mt-2 font-semibold" style={{ color: "var(--landing-text-heading)" }}>
                    {t(`features.${key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--landing-text-muted)" }}>
                    {t(`features.${key}.description`)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Stats */}
        <WcDivider index={2} />
        <section
          id="stats"
          data-landing-reveal
          className="landing-reveal relative overflow-hidden px-4 py-16 sm:py-20"
        >
          <div className="landing-mini-ball pointer-events-none absolute right-[12%] top-[20%] opacity-[0.08]" aria-hidden>
            <FloatingSoccerEmoji className="text-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl text-center">
            <h2 className="text-2xl font-bold uppercase tracking-wider sm:text-3xl" style={{ color: "var(--landing-text-heading)" }}>
              {t("stats.title")}
            </h2>
            <LandingStatsGrid locale={locale} />
            <p className="mx-auto mt-6 text-sm" style={{ color: "var(--landing-text-subtle)" }}>
              {t("countdown.hostCountries")}
            </p>
            <p className="mx-auto mt-1 text-xs font-medium" style={{ color: "var(--landing-text-subtle)" }}>
              {t("stats.dates")}
            </p>
            <p className="mx-auto mt-8 max-w-2xl text-pretty text-sm leading-relaxed sm:text-base" style={{ color: "var(--landing-text-muted)" }}>
              {t("stats.body")}
            </p>
          </div>
        </section>

        {/* Bottom CTA */}
        <WcDivider index={3} />
        <section id="cta" data-landing-reveal className="landing-reveal px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <div
              className="landing-cta-grass overflow-hidden rounded-2xl border border-emerald-500/40 p-8 sm:p-10"
              style={{
                backgroundColor: "var(--landing-cta-card)",
                boxShadow: "var(--landing-gradient-cta)",
              }}
            >
              <h2 className="text-center text-2xl font-bold uppercase tracking-wider sm:text-3xl" style={{ color: "var(--landing-text-heading)" }}>
                {t("cta.title")}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-center text-sm sm:text-base" style={{ color: "var(--landing-text-muted)" }}>
                {t("cta.subtitle")}
              </p>
              <p className="mt-2 text-center text-xs" style={{ color: "var(--landing-text-subtle)" }}>
                {t("cta.dates")}
              </p>
              <div className="mt-8 flex flex-col items-center">
                <Link
                  href={`/${locale}/signup`}
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-emerald-500 px-8 py-3 text-base font-semibold text-white transition hover:bg-emerald-600 sm:w-auto"
                >
                  {t("cta.button")}
                </Link>
                <p className="mt-3 text-center text-sm text-gray-500">
                  {t("cta.features")}
                </p>
                <p className="mt-2 text-center text-xs" style={{ color: "var(--landing-text-subtle)" }}>
                  {t("cta.belowButton")}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer
        className="border-t px-4 py-10"
        style={{
          borderColor: "var(--landing-border-subtle)",
          backgroundColor: "var(--landing-footer-bg)",
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <p className="text-sm" style={{ color: "var(--landing-text-muted)" }}>
            {t("footer.copyright")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link
              href={`/${locale}/privacy`}
              className="underline-offset-2 transition hover:underline"
              style={{ color: "var(--landing-text-muted)" }}
            >
              {t("footer.privacy")}
            </Link>
            <Link
              href={`/${locale}/terms`}
              className="underline-offset-2 transition hover:underline"
              style={{ color: "var(--landing-text-muted)" }}
            >
              {t("footer.terms")}
            </Link>
          </div>
          <nav className="flex items-center gap-2" aria-label="Language">
            {LOCALES.map((loc) => (
              <Link
                key={loc}
                href={`/${loc}`}
                className={`min-h-[44px] min-w-[44px] content-center rounded-md px-3 text-center text-sm font-semibold transition ${
                  locale === loc ? "text-emerald-500" : ""
                }`}
                style={locale === loc ? undefined : { color: "var(--landing-text-muted)" }}
                aria-current={locale === loc ? "page" : undefined}
              >
                {loc === "es" ? t("footer.langEs") : loc === "en" ? t("footer.langEn") : t("footer.langPt")}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
