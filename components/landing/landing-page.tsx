"use client";

import Link from "next/link";
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
      <div
        className={`flex w-full min-w-[4.5rem] max-w-[7rem] flex-col items-center rounded-xl border border-dark-600 bg-dark-800 px-2 py-4 sm:px-4 sm:py-5 ${
          tick ? "landing-countdown-tick" : ""
        }`}
      >
        <span className="font-mono text-3xl font-bold tabular-nums text-white sm:text-4xl md:text-5xl">
          {display}
        </span>
      </div>
      <span className="mt-2 text-center text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:text-xs">
        {label}
      </span>
    </div>
  );
}

function IconUsers() {
  return (
    <svg className="h-12 w-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <circle cx="9" cy="7" r="3" strokeWidth="1.5" />
      <circle cx="16" cy="9" r="2.5" strokeWidth="1.5" />
      <path strokeLinecap="round" strokeWidth="1.5" d="M3 20c0-3.5 3.5-6 8-6 1.2 0 2.3.2 3.3.5" />
      <path strokeLinecap="round" strokeWidth="1.5" d="M21 20c0-2.8-2.2-5-5-5-1 0-1.9.3-2.7.8" />
    </svg>
  );
}

function IconBall() {
  return (
    <svg className="h-12 w-12 text-emerald-400" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function IconTrophy() {
  return (
    <svg className="h-12 w-12 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M6 4h12M6 4v4a6 6 0 0 0 12 0V4M6 4H4m14 0h2m-2 0v4a6 6 0 0 1-12 0V4m6 16v-4m0 4H9m3 0h3m-6 0h6"
      />
    </svg>
  );
}

export default function LandingPage({ locale }: Props) {
  const t = useTranslations("LandingPage");
  const [remaining, setRemaining] = useState(() => KICKOFF_UTC_MS - Date.now());

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

  return (
    <div className="min-h-screen bg-dark-900 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-dark-600/60 bg-dark-900/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link
            href={`/${locale}`}
            className="text-lg font-bold tracking-tight text-white"
          >
            <span className="text-emerald-400">{t("header.wordmark").slice(0, 5)}</span>
            <span>{t("header.wordmark").slice(5)}</span>
          </Link>
          <Link
            href={`/${locale}/login`}
            className="min-h-[44px] min-w-[44px] content-center text-center text-sm font-medium text-slate-300 transition hover:text-white"
          >
            {t("header.login")}
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-20 pt-12 sm:pt-16 md:pb-28 md:pt-20">
          <div
            className="landing-hero-ambient pointer-events-none absolute -left-1/4 top-0 h-[480px] w-[480px] rounded-full bg-emerald-500/15 blur-3xl"
            aria-hidden
          />
          <div
            className="landing-blob pointer-events-none absolute -right-1/4 top-1/4 h-72 w-72 rounded-full bg-gold/10 blur-3xl"
            aria-hidden
          />
          <div
            className="landing-blob-delayed pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-emerald-600/10 blur-2xl"
            aria-hidden
          />
          <svg
            className="landing-blob pointer-events-none absolute right-[8%] top-[20%] h-32 w-32 text-dark-600/40 sm:h-40 sm:w-40"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M50 8 L62 38 L95 38 L68 58 L78 92 L50 72 L22 92 L32 58 L5 38 L38 38 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
          <svg
            className="landing-blob-delayed pointer-events-none absolute left-[10%] bottom-[25%] h-24 w-24 text-dark-600/30"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <circle cx="50" cy="50" r="40" fill="currentColor" opacity="0.35" />
            <circle cx="50" cy="50" r="18" fill="none" stroke="#0A0E14" strokeWidth="1" opacity="0.5" />
          </svg>

          <div className="relative z-10 mx-auto max-w-6xl text-center">
            <p className="mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              <span className="text-emerald-400">{t("header.wordmark").slice(0, 5)}</span>
              <span>{t("header.wordmark").slice(5)}</span>
            </p>
            <h1 className="text-balance bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl md:text-4xl">
              {t("hero.tagline")}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-slate-400 sm:text-lg">
              {t("hero.subtitle")}
            </p>

            <p className="mt-10 text-xs font-semibold uppercase tracking-widest text-slate-500">
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
                {t("hero.ctaCreateGroup")}
              </Link>
              <Link
                href={`/${locale}/login`}
                className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-dark-500 bg-dark-800 px-8 py-3 text-center text-base font-semibold text-slate-200 transition hover:border-emerald-500/50 hover:bg-dark-700"
              >
                {t("hero.ctaLogin")}
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          data-landing-reveal
          className="landing-reveal border-t border-dark-600/80 px-4 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">{t("howItWorks.title")}</h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              <div className="flex flex-col items-center text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-dark-600 bg-dark-800">
                  <IconUsers />
                </div>
                <h3 className="text-lg font-semibold text-white">{t("howItWorks.step1.title")}</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
                  {t("howItWorks.step1.description")}
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-dark-600 bg-dark-800">
                  <IconBall />
                </div>
                <h3 className="text-lg font-semibold text-white">{t("howItWorks.step2.title")}</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
                  {t("howItWorks.step2.description")}
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-dark-600 bg-dark-800">
                  <IconTrophy />
                </div>
                <h3 className="text-lg font-semibold text-white">{t("howItWorks.step3.title")}</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
                  {t("howItWorks.step3.description")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          data-landing-reveal
          className="landing-reveal px-4 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">{t("features.title")}</h2>
            <ul className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {featureKeys.map((key) => (
                <li
                  key={key}
                  className="rounded-xl border border-dark-600 bg-dark-800 p-5 transition hover:border-dark-500"
                >
                  <span className="text-2xl" aria-hidden>
                    {t(`features.${key}.emoji`)}
                  </span>
                  <h3 className="mt-2 font-semibold text-white">{t(`features.${key}.title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{t(`features.${key}.description`)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Stats */}
        <section
          id="stats"
          data-landing-reveal
          className="landing-reveal border-t border-dark-600/80 px-4 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-6xl text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">{t("stats.title")}</h2>
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div>
                <p className="text-4xl font-extrabold tabular-nums text-gold sm:text-5xl">{t("stats.teams")}</p>
              </div>
              <div>
                <p className="text-4xl font-extrabold tabular-nums text-gold sm:text-5xl">{t("stats.matches")}</p>
              </div>
              <div>
                <p className="text-4xl font-extrabold tabular-nums text-gold sm:text-5xl">{t("stats.groups")}</p>
              </div>
            </div>
            <p className="mx-auto mt-10 max-w-2xl text-pretty text-sm leading-relaxed text-slate-400 sm:text-base">
              {t("stats.body")}
            </p>
          </div>
        </section>

        {/* Bottom CTA */}
        <section id="cta" data-landing-reveal className="landing-reveal px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-emerald-500/40 bg-dark-800 p-8 shadow-[0_0_40px_-8px_rgba(16,185,129,0.35)] sm:p-10">
              <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">{t("cta.title")}</h2>
              <div className="mt-8 flex flex-col items-center">
                <Link
                  href={`/${locale}/signup`}
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-emerald-500 px-8 py-3 text-base font-semibold text-white transition hover:bg-emerald-600 sm:w-auto"
                >
                  {t("cta.button")}
                </Link>
                <p className="mt-4 text-center text-xs text-slate-500">{t("cta.footnote")}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-dark-600/80 px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <p className="text-sm text-slate-500">{t("footer.copyright")}</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <a href="#" className="text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline">
              {t("footer.privacy")}
            </a>
            <a href="#" className="text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline">
              {t("footer.terms")}
            </a>
          </div>
          <nav className="flex items-center gap-2" aria-label="Language">
            {LOCALES.map((loc) => (
              <Link
                key={loc}
                href={`/${loc}`}
                className={`min-h-[44px] min-w-[44px] content-center rounded-md px-3 text-center text-sm font-semibold transition ${
                  locale === loc
                    ? "text-emerald-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
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
