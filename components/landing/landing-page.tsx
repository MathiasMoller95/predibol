"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

const KICKOFF_UTC_MS = Date.UTC(2026, 5, 11, 0, 0, 0);
const LOCALES = ["es", "en", "pt"] as const;
const THEME_KEY = "predibol-theme";

type LandingTheme = "dark" | "light";

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

function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path
        strokeLinecap="round"
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
      />
    </svg>
  );
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
      />
    </svg>
  );
}

function FloatingSoccerEmoji({ className }: { className?: string }) {
  return (
    <span className={`select-none ${className ?? ""}`} aria-hidden>
      ⚽
    </span>
  );
}

function CountdownUnit({
  value,
  label,
  pad = 2,
}: {
  value: number;
  label: string;
  pad?: number;
}) {
  const prev = useRef(value);
  const [tick, setTick] = useState(false);
  const display = String(value).padStart(pad, "0");

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setTick(true);
      const id = window.setTimeout(() => setTick(false), 450);
      return () => window.clearTimeout(id);
    }
  }, [value]);

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <div className="relative w-full min-w-[4.5rem] max-w-[7rem] overflow-hidden rounded-xl p-px">
        <div className="landing-countdown-border-spin" aria-hidden />
        <div
          className={`relative z-[1] flex w-full flex-col items-center rounded-[11px] border px-2 py-4 sm:px-4 sm:py-5 ${
            tick ? "landing-countdown-tick" : ""
          }`}
          style={{
            backgroundColor: "var(--landing-countdown-inner)",
            borderColor: "var(--landing-countdown-border)",
          }}
        >
          <span
            className="font-mono text-3xl font-bold tabular-nums sm:text-4xl md:text-5xl"
            style={{ color: "var(--landing-countdown-num)" }}
          >
            {display}
          </span>
        </div>
      </div>
      <span
        className="mt-2 text-center text-[10px] font-medium uppercase tracking-wider sm:text-xs"
        style={{ color: "var(--landing-countdown-label)" }}
      >
        {label}
      </span>
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

  return (
    <div ref={gridRef} className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
      <div className="relative flex min-h-[5rem] flex-col items-center justify-center">
        <TrophyWatermark />
        <p className="relative z-[1] flex flex-col items-center sm:block">
          <span className="font-mono text-4xl font-extrabold tabular-nums text-emerald-500 sm:text-5xl">{teams}</span>
          <span className="mt-0.5 block text-sm font-semibold text-emerald-500/90 sm:mt-1 sm:text-base">{t("stats.teamsLabel")}</span>
        </p>
      </div>
      <div className="flex flex-col items-center justify-center">
        <p className="flex flex-col items-center sm:block">
          <span className="font-mono text-4xl font-extrabold tabular-nums text-emerald-500 sm:text-5xl">{matches}</span>
          <span className="mt-0.5 block text-sm font-semibold text-emerald-500/90 sm:mt-1 sm:text-base">{t("stats.matchesLabel")}</span>
        </p>
      </div>
      <div className="flex flex-col items-center justify-center">
        <p className="flex flex-col items-center sm:block">
          <span className="font-mono text-4xl font-extrabold tabular-nums text-emerald-500 sm:text-5xl">{groups}</span>
          <span className="mt-0.5 block text-sm font-semibold text-emerald-500/90 sm:mt-1 sm:text-base">{t("stats.groupsLabel")}</span>
        </p>
      </div>
    </div>
  );
}

export default function LandingPage({ locale }: Props) {
  const t = useTranslations("LandingPage");
  const [theme, setTheme] = useState<LandingTheme>("dark");
  const [mounted, setMounted] = useState(false);
  const [remaining, setRemaining] = useState(() => KICKOFF_UTC_MS - Date.now());
  const [groupCount, setGroupCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    }
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setGroupCount(d.groups ?? 0))
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

  function toggleTheme() {
    setTheme((prev) => {
      const next: LandingTheme = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        window.localStorage.setItem(THEME_KEY, next);
      }
      return next;
    });
  }

  const { days, hours, minutes, seconds } = splitRemaining(remaining);
  const featureKeys = ["leaderboard", "odds", "ai", "groups", "rules", "mobile"] as const;
  const isLight = theme === "light";

  const wordmarkPredi = <span className={isLight ? "text-emerald-600" : "text-emerald-400"}>{t("header.wordmark").slice(0, 5)}</span>;
  const wordmarkBol = (
    <span style={{ color: isLight ? "#1e293b" : "inherit" }} className={isLight ? "" : "text-white"}>
      {t("header.wordmark").slice(5)}
    </span>
  );

  const pillClass = isLight
    ? "inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm text-gray-600"
    : "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-400";

  return (
    <div
      className="landing-root min-h-screen animate-page-in motion-reduce:animate-none"
      data-theme={mounted ? theme : "dark"}
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
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
          <Link href={`/${locale}`} className="text-lg font-bold tracking-tight" style={{ color: "var(--landing-text-heading)" }}>
            {wordmarkPredi}
            {wordmarkBol}
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className={`rounded-lg p-2 transition ${isLight ? "hover:bg-gray-200 text-slate-700" : "hover:bg-white/10 text-slate-300"}`}
              aria-label={isLight ? t("theme.toggleDark") : t("theme.toggleLight")}
            >
              {isLight ? <IconMoon className="h-5 w-5" /> : <IconSun className="h-5 w-5" />}
            </button>
            <Link
              href={`/${locale}/login`}
              className="min-h-[44px] min-w-[44px] content-center text-center text-sm font-medium transition"
              style={{ color: "var(--landing-header-login)" }}
            >
              {t("header.login")}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Live counter pill */}
        {groupCount >= 10 && (
          <div className="flex justify-center px-4 pt-4">
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              {t("stats.groupsCreated", { count: groupCount })}
            </span>
          </div>
        )}

        {/* Hero */}
        <section className={`relative overflow-x-hidden px-4 pb-20 ${groupCount >= 10 ? "pt-6 sm:pt-10 md:pt-14" : "pt-12 sm:pt-16 md:pt-20"}`}>
          {/* Subtle radial backdrop — works with Option A; strengthens hero if Option B (emoji-only) is removed */}
          <div
            className="pointer-events-none absolute left-1/2 top-0 z-0 h-[min(28rem,55vh)] w-full max-w-3xl -translate-x-1/2 bg-[radial-gradient(ellipse_80%_70%_at_50%_28%,rgba(16,185,129,0.05),transparent_72%)]"
            aria-hidden
          />

          {/*
            Option A: minimalist dashed ring + emoji (left) and large trophy emoji (right).
            Option B fallback: delete the next two absolutely-positioned blocks for zero floating decor —
            typography + the radial gradient above carries the page.
          */}
          <div className="landing-hero-dash-wrap pointer-events-none absolute -left-[22px] top-[16%] z-0 sm:top-[18%]" aria-hidden>
            <div className="landing-hero-dash-circle">
              <span className="landing-hero-dash-emoji">⚽</span>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-2 top-14 z-0 sm:-right-4 sm:top-20 md:top-24" aria-hidden>
            <span className="landing-hero-trophy-emoji text-[100px] opacity-[0.15] sm:text-[120px]">🏆</span>
          </div>

          <div className="relative z-10 mx-auto max-w-6xl text-center">
            <p className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl" style={{ color: "var(--landing-text-heading)" }}>
              {wordmarkPredi}
              {wordmarkBol}
            </p>

            <h1
              className="mx-auto mt-6 max-w-3xl text-balance text-2xl font-bold leading-tight sm:text-3xl md:text-4xl"
              style={{ color: "var(--landing-text-heading)" }}
            >
              {t("hero.tagline")}
            </h1>

            <p
              className="mx-auto mt-5 max-w-2xl text-pretty text-base font-medium leading-relaxed sm:text-lg"
              style={{ color: "var(--landing-text-muted)" }}
            >
              {t("hero.subtitle")}
            </p>

            <div className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-3">
              <span className={pillClass}>{t("hero.pill1")}</span>
              <span className={pillClass}>{t("hero.pill2")}</span>
              <span className={pillClass}>{t("hero.pill3")}</span>
            </div>

            <p className="mt-10 text-balance text-lg font-semibold text-emerald-400 sm:text-xl">{t("countdown.urgency")}</p>
            <div
              className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-3 sm:gap-4"
              aria-live="polite"
              aria-atomic="true"
            >
              <CountdownUnit value={days} label={t("countdown.days")} />
              <CountdownUnit value={hours} label={t("countdown.hours")} />
              <CountdownUnit value={minutes} label={t("countdown.minutes")} />
              <CountdownUnit value={seconds} label={t("countdown.seconds")} />
            </div>

            <div className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              <Link
                href={`/${locale}/signup`}
                className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-emerald-500 px-8 py-3 text-center text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
              >
                {t("hero.cta.createAccount")}
              </Link>
              <Link
                href={`/${locale}/login`}
                className="inline-flex min-h-[48px] items-center justify-center rounded-lg border px-8 py-3 text-center text-base font-semibold transition hover:border-emerald-500/50"
                style={{
                  borderColor: "var(--landing-secondary-border)",
                  backgroundColor: "var(--landing-secondary-bg)",
                  color: "var(--landing-secondary-text)",
                }}
              >
                {t("hero.cta.login")}
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          data-landing-reveal
          className="landing-reveal relative overflow-hidden border-t px-4 py-16 sm:py-20"
          style={{ borderColor: "var(--landing-border-subtle)" }}
        >
          <div className="landing-how-pattern pointer-events-none absolute inset-0" aria-hidden />
          <div className="landing-mini-ball pointer-events-none absolute right-[6%] top-[14%] opacity-[0.1]" aria-hidden>
            <FloatingSoccerEmoji className="text-2xl sm:text-3xl" />
          </div>
          <div className="landing-mini-ball landing-mini-ball--b pointer-events-none absolute bottom-[18%] left-[4%] opacity-[0.08]" aria-hidden>
            <FloatingSoccerEmoji className="text-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold sm:text-3xl" style={{ color: "var(--landing-text-heading)" }}>
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
                    className={`flex h-16 w-16 items-center justify-center rounded-full text-3xl ${isLight ? "bg-emerald-600/10" : "bg-emerald-500/10"}`}
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
        <section
          id="differentiators"
          data-landing-reveal
          className="landing-reveal relative overflow-hidden border-t px-4 py-16 sm:py-20"
          style={{ borderColor: "var(--landing-border-subtle)" }}
        >
          <div className="relative mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold sm:text-3xl" style={{ color: "var(--landing-text-heading)" }}>
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
            <h2 className="text-center text-2xl font-bold sm:text-3xl" style={{ color: "var(--landing-text-heading)" }}>
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
        <section
          id="stats"
          data-landing-reveal
          className="landing-reveal relative overflow-hidden border-t px-4 py-16 sm:py-20"
          style={{ borderColor: "var(--landing-border-subtle)" }}
        >
          <div className="landing-mini-ball pointer-events-none absolute right-[12%] top-[20%] opacity-[0.08]" aria-hidden>
            <FloatingSoccerEmoji className="text-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl text-center">
            <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: "var(--landing-text-heading)" }}>
              {t("stats.title")}
            </h2>
            <LandingStatsGrid locale={locale} />
            <p className="mx-auto mt-10 max-w-2xl text-pretty text-sm leading-relaxed sm:text-base" style={{ color: "var(--landing-text-muted)" }}>
              {t("stats.body")}
            </p>
          </div>
        </section>

        {/* Bottom CTA */}
        <section id="cta" data-landing-reveal className="landing-reveal px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <div
              className="landing-cta-grass overflow-hidden rounded-2xl border border-emerald-500/40 p-8 sm:p-10"
              style={{
                backgroundColor: "var(--landing-cta-card)",
                boxShadow: "var(--landing-gradient-cta)",
              }}
            >
              <h2 className="text-center text-2xl font-bold sm:text-3xl" style={{ color: "var(--landing-text-heading)" }}>
                {t("cta.title")}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-center text-sm sm:text-base" style={{ color: "var(--landing-text-muted)" }}>
                {t("cta.subtitle")}
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
