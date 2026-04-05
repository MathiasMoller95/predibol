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

function PentagonBallSvg({ className }: { className?: string }) {
  const pentFill = "rgba(16, 185, 129, 0.15)";
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r="46" fill="none" stroke="#1e293b" strokeWidth="1.4" />
      <path
        fill={pentFill}
        stroke="#1e293b"
        strokeWidth="0.55"
        strokeLinejoin="round"
        d="M50 28 L61.76 40.34 L57.64 55.91 L42.36 55.91 L38.24 40.34 Z"
      />
      <path fill={pentFill} stroke="#1e293b" strokeWidth="0.45" strokeLinejoin="round" d="M50 6 L54 19 L46 19 Z" />
      <path fill={pentFill} stroke="#1e293b" strokeWidth="0.45" strokeLinejoin="round" d="M88 36 L75 42 L78 32 Z" />
      <path fill={pentFill} stroke="#1e293b" strokeWidth="0.45" strokeLinejoin="round" d="M72 78 L62 66 L71 60 Z" />
      <path fill={pentFill} stroke="#1e293b" strokeWidth="0.45" strokeLinejoin="round" d="M28 78 L38 66 L29 60 Z" />
      <path fill={pentFill} stroke="#1e293b" strokeWidth="0.45" strokeLinejoin="round" d="M12 36 L25 42 L22 32 Z" />
      <path
        fill="none"
        stroke="#1e293b"
        strokeWidth="0.4"
        opacity="0.35"
        d="M50 28 L50 6 M61.76 40.34 L88 36 M57.64 55.91 L72 78 M42.36 55.91 L28 78 M38.24 40.34 L12 36"
      />
    </svg>
  );
}

function HeroTrophyOutline({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(16, 185, 129, 0.35)"
      strokeWidth={1.35}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 4h12M6 4v4a6 6 0 0 0 12 0V4M6 4H4m14 0h2m-2 0v4a6 6 0 0 1-12 0V4m6 16v-4m0 4H9m3 0h3m-6 0h6" />
    </svg>
  );
}

function HowIconJersey({ bright }: { bright?: boolean }) {
  return (
    <svg
      className={`h-16 w-16 shrink-0 ${bright ? "text-emerald-600" : "text-emerald-400"}`}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M22 14 L14 24v34h36V24L46 14 32 20 22 14z M16 26c4-4 10-6 16-6s12 2 16 6"
      />
      <text x="32" y="45" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor" stroke="none">
        10
      </text>
    </svg>
  );
}

function HowIconBallGoal({ bright }: { bright?: boolean }) {
  return (
    <svg
      className={`h-16 w-16 shrink-0 ${bright ? "text-emerald-600" : "text-emerald-400"}`}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      aria-hidden
    >
      <path strokeLinecap="round" d="M36 46h20M36 46V20M56 20v26" />
      <path strokeLinecap="round" d="M40 24h12M40 30h12M40 36h8" opacity="0.85" />
      <circle cx="22" cy="42" r="11" />
      <path
        strokeLinecap="round"
        strokeWidth="1.35"
        d="M22 33v18M13 42h18M15.5 35.5l13 13M28.5 35.5l-13 13"
        opacity="0.65"
      />
    </svg>
  );
}

function HowIconTrophyStar({ bright }: { bright?: boolean }) {
  return (
    <svg
      className={`h-16 w-16 shrink-0 ${bright ? "text-emerald-600" : "text-emerald-400"}`}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M22 38v-6h20v6M22 38h20M26 32v-6h12v6M24 20h16v6H24z M21 20h-3v3a3 3 0 006 0v-3h-3 M43 20h3v3a3 3 0 01-6 0v-3h3"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M32 8l2.6 5.8 6.3 1.2-4.8 4.2 1.3 6.5L32 23l-5.4 2.7 1.3-6.5-4.8-4.2 6.3-1.2L32 8z" />
    </svg>
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
          <span className="text-4xl font-extrabold tabular-nums text-emerald-500 sm:text-5xl">{teams}</span>
          <span className="mt-0.5 block text-sm font-semibold text-emerald-500/90 sm:mt-1 sm:text-base">{t("stats.teamsLabel")}</span>
        </p>
      </div>
      <div className="flex flex-col items-center justify-center">
        <p className="flex flex-col items-center sm:block">
          <span className="text-4xl font-extrabold tabular-nums text-emerald-500 sm:text-5xl">{matches}</span>
          <span className="mt-0.5 block text-sm font-semibold text-emerald-500/90 sm:mt-1 sm:text-base">{t("stats.matchesLabel")}</span>
        </p>
      </div>
      <div className="flex flex-col items-center justify-center">
        <p className="flex flex-col items-center sm:block">
          <span className="text-4xl font-extrabold tabular-nums text-emerald-500 sm:text-5xl">{groups}</span>
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

  useEffect(() => {
    setMounted(true);
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    }
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

  const iconBright = isLight;

  return (
    <div
      className="landing-root min-h-screen animate-page-in motion-reduce:animate-none"
      data-theme={mounted ? theme : "dark"}
      style={{
        backgroundColor: "var(--landing-bg)",
        color: "var(--landing-text)",
        ["--landing-football-opacity" as string]: isLight ? "0.1" : "0.2",
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
        {/* Hero */}
        <section className="relative overflow-x-hidden px-4 pb-20 pt-12 sm:pt-16 md:pb-28 md:pt-20">
          <div className="landing-hero-football pointer-events-none absolute -left-[30px] top-[18%] z-0 sm:top-[20%]" aria-hidden>
            <div className="landing-hero-football-inner opacity-20">
              <PentagonBallSvg className="h-20 w-20 sm:h-[150px] sm:w-[150px]" />
            </div>
          </div>

          <div className="pointer-events-none absolute -right-10 top-16 z-0 sm:-right-6 md:top-24" aria-hidden>
            <div className="landing-hero-trophy-gleam opacity-[0.2] sm:opacity-25">
              <HeroTrophyOutline className="h-28 w-28 sm:h-[180px] sm:w-[180px]" />
            </div>
          </div>

          <div className="relative z-10 mx-auto max-w-6xl text-center">
            <p className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl" style={{ color: "var(--landing-text-heading)" }}>
              {wordmarkPredi}
              {wordmarkBol}
            </p>

            <h1
              className="mx-auto mt-6 flex max-w-3xl flex-col flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-balance text-lg font-semibold leading-snug sm:inline-flex sm:max-w-4xl sm:flex-row sm:text-xl md:text-2xl lg:text-3xl"
              style={{ color: "var(--landing-text-heading)" }}
            >
              <span className="inline text-center sm:inline">{t("hero.linePrefix")}</span>
              <span className="-rotate-2 inline-block text-center text-red-400/70 line-through decoration-red-400/50 dark:text-slate-500 dark:decoration-slate-500/60">
                {t("hero.lineStrike")}
              </span>
              <span className="text-center font-bold text-emerald-400 no-underline">{t("hero.lineEmphasis")}</span>
              <span className="inline text-center sm:inline">{t("hero.lineSuffix")}</span>
            </h1>

            <p
              className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed sm:text-lg"
              style={{ color: "var(--landing-text-muted)" }}
            >
              {t("hero.subTagline")}
            </p>

            <p className="mt-10 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--landing-text-subtle)" }}>
              {t("countdown.label")}
            </p>
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
          <div className="landing-mini-ball pointer-events-none absolute right-[6%] top-[14%] opacity-[0.09]" aria-hidden>
            <PentagonBallSvg className="h-9 w-9 sm:h-10 sm:w-10" />
          </div>
          <div className="landing-mini-ball landing-mini-ball--b pointer-events-none absolute bottom-[18%] left-[4%] opacity-[0.07]" aria-hidden>
            <PentagonBallSvg className="h-10 w-10" />
          </div>
          <div className="relative mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold sm:text-3xl" style={{ color: "var(--landing-text-heading)" }}>
              {t("howItWorks.title")}
            </h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {[
                { Icon: HowIconJersey, step: "step1" as const },
                { Icon: HowIconBallGoal, step: "step2" as const },
                { Icon: HowIconTrophyStar, step: "step3" as const },
              ].map(({ Icon, step }) => (
                <div key={step} className="flex flex-col items-center text-center">
                  <Icon bright={iconBright} />
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

        {/* Features */}
        <section id="features" data-landing-reveal className="landing-reveal relative overflow-hidden px-4 py-16 sm:py-20">
          <div className="landing-mini-ball landing-mini-ball--c pointer-events-none absolute right-[3%] top-[22%] opacity-[0.08]" aria-hidden>
            <PentagonBallSvg className="h-8 w-8" />
          </div>
          <div className="landing-mini-ball landing-mini-ball--d pointer-events-none absolute bottom-[30%] left-[8%] opacity-[0.06]" aria-hidden>
            <PentagonBallSvg className="h-10 w-10" />
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
          <div className="landing-mini-ball pointer-events-none absolute right-[12%] top-[20%] opacity-[0.07]" aria-hidden>
            <PentagonBallSvg className="h-9 w-9" />
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
                <p className="mt-4 text-center text-xs" style={{ color: "var(--landing-text-subtle)" }}>
                  {t("cta.footnote")}
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
