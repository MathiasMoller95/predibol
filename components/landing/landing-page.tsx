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

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3L4 6v5.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V6l-8-3z"
      />
    </svg>
  );
}

function HeroFootballDecor({ className }: { className?: string }) {
  return (
    <div className={`landing-hero-football pointer-events-none ${className ?? ""}`} aria-hidden>
      <div className="landing-hero-football-inner opacity-[var(--landing-football-opacity,0.2)]">
        <svg viewBox="0 0 100 100" className="h-20 w-20 text-[var(--landing-text-muted)] sm:h-[120px] sm:w-[120px]" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="currentColor" opacity="0.25" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            d="M50 6 L62 34 L92 34 L68 52 L78 88 L50 70 L22 88 L32 52 L8 34 L38 34 Z"
            opacity="0.45"
          />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            d="M50 10v80M10 50h80M18 18l64 64M82 18L18 82"
            opacity="0.25"
          />
        </svg>
      </div>
    </div>
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

function IconUsers({ bright }: { bright?: boolean }) {
  return (
    <svg
      className={`h-12 w-12 ${bright ? "text-emerald-600" : "text-emerald-400"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <circle cx="9" cy="7" r="3" strokeWidth="1.5" />
      <circle cx="16" cy="9" r="2.5" strokeWidth="1.5" />
      <path strokeLinecap="round" strokeWidth="1.5" d="M3 20c0-3.5 3.5-6 8-6 1.2 0 2.3.2 3.3.5" />
      <path strokeLinecap="round" strokeWidth="1.5" d="M21 20c0-2.8-2.2-5-5-5-1 0-1.9.3-2.7.8" />
    </svg>
  );
}

function IconBall({ bright }: { bright?: boolean }) {
  return (
    <svg
      className={`h-12 w-12 ${bright ? "text-emerald-600" : "text-emerald-400"}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function IconTrophy({ bright }: { bright?: boolean }) {
  return (
    <svg
      className={`h-12 w-12 ${bright ? "text-gold" : "text-gold"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M6 4h12M6 4v4a6 6 0 0 0 12 0V4M6 4H4m14 0h2m-2 0v4a6 6 0 0 1-12 0V4m6 16v-4m0 4H9m3 0h3m-6 0h6"
      />
    </svg>
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
        // football opacity: slightly lower on light per spec
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
          <div
            className="landing-hero-ambient pointer-events-none absolute -left-1/4 top-0 h-[480px] w-[480px] rounded-full blur-3xl"
            style={{ background: "var(--landing-blob-1)" }}
            aria-hidden
          />
          <div
            className="landing-blob pointer-events-none absolute -right-1/4 top-1/4 h-72 w-72 rounded-full blur-3xl"
            style={{ background: "var(--landing-blob-2)" }}
            aria-hidden
          />
          <div
            className="landing-blob-delayed pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full blur-2xl"
            style={{ background: "var(--landing-blob-3)" }}
            aria-hidden
          />

          <HeroFootballDecor className="absolute -right-4 top-24 z-0 sm:right-0 sm:top-20 md:top-28" />

          <svg
            className="landing-blob pointer-events-none absolute left-[6%] top-[18%] hidden h-28 w-28 sm:block md:h-32 md:w-32"
            style={{ color: "var(--landing-blob-svg)" }}
            viewBox="0 0 100 100"
            aria-hidden
          >
            <circle cx="50" cy="50" r="40" fill="currentColor" opacity="0.2" />
          </svg>
          <svg
            className="landing-blob-delayed pointer-events-none absolute bottom-[20%] left-[8%] h-20 w-20 sm:h-24 sm:w-24"
            style={{ color: "var(--landing-blob-dot)" }}
            viewBox="0 0 100 100"
            aria-hidden
          >
            <circle cx="50" cy="50" r="38" fill="currentColor" opacity="0.35" />
            <circle cx="50" cy="50" r="16" fill="none" stroke="var(--landing-blob-dot-stroke)" strokeWidth="1" opacity="0.4" />
          </svg>

          <div className="relative z-10 mx-auto max-w-6xl text-center">
            <p className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl" style={{ color: "var(--landing-text-heading)" }}>
              {wordmarkPredi}
              {wordmarkBol}
            </p>
            <h1
              className="text-balance text-2xl font-bold sm:text-3xl md:text-4xl"
              style={{
                backgroundImage: `linear-gradient(to right, var(--landing-tagline-from), var(--landing-tagline-via), var(--landing-tagline-to))`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {t("hero.tagline")}
            </h1>
            <p
              className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed sm:text-lg"
              style={{ color: "var(--landing-text-muted)" }}
            >
              {t("hero.subtitle")}
            </p>

            <div
              className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
              style={{
                backgroundColor: "var(--landing-safe-bg)",
                borderColor: "var(--landing-safe-border)",
                color: "var(--landing-safe-text)",
              }}
            >
              <IconShield className="h-4 w-4 shrink-0" />
              <span>{t("hero.safeBadge")}</span>
            </div>

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
          className="landing-reveal border-t px-4 py-16 sm:py-20"
          style={{ borderColor: "var(--landing-border-subtle)" }}
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold sm:text-3xl" style={{ color: "var(--landing-text-heading)" }}>
              {t("howItWorks.title")}
            </h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {[
                { Icon: IconUsers, step: "step1" as const },
                { Icon: IconBall, step: "step2" as const },
                { Icon: IconTrophy, step: "step3" as const },
              ].map(({ Icon, step }) => (
                <div key={step} className="flex flex-col items-center text-center">
                  <div
                    className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border"
                    style={{ borderColor: "var(--landing-icon-border)", backgroundColor: "var(--landing-icon-bg)" }}
                  >
                    <Icon bright={iconBright} />
                  </div>
                  <h3 className="text-lg font-semibold" style={{ color: "var(--landing-text-heading)" }}>
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
        <section id="features" data-landing-reveal className="landing-reveal px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
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
          className="landing-reveal border-t px-4 py-16 sm:py-20"
          style={{ borderColor: "var(--landing-border-subtle)" }}
        >
          <div className="mx-auto max-w-6xl text-center">
            <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: "var(--landing-text-heading)" }}>
              {t("stats.title")}
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div className="relative flex min-h-[5rem] flex-col items-center justify-center">
                <TrophyWatermark />
                <p className="relative z-[1] text-4xl font-extrabold tabular-nums text-emerald-500 sm:text-5xl">{t("stats.teams")}</p>
              </div>
              <div>
                <p className="text-4xl font-extrabold tabular-nums text-emerald-500 sm:text-5xl">{t("stats.matches")}</p>
              </div>
              <div>
                <p className="text-4xl font-extrabold tabular-nums text-emerald-500 sm:text-5xl">{t("stats.groups")}</p>
              </div>
            </div>
            <p className="mx-auto mt-10 max-w-2xl text-pretty text-sm leading-relaxed sm:text-base" style={{ color: "var(--landing-text-muted)" }}>
              {t("stats.body")}
            </p>
          </div>
        </section>

        {/* Bottom CTA */}
        <section id="cta" data-landing-reveal className="landing-reveal px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <div
              className="rounded-2xl border border-emerald-500/40 p-8 sm:p-10"
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
            <a
              href="#"
              className="underline-offset-2 transition hover:underline"
              style={{ color: "var(--landing-text-muted)" }}
            >
              {t("footer.privacy")}
            </a>
            <a
              href="#"
              className="underline-offset-2 transition hover:underline"
              style={{ color: "var(--landing-text-muted)" }}
            >
              {t("footer.terms")}
            </a>
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
