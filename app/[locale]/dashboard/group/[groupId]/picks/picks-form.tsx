"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

export type InitialPicks = {
  champion: string | null;
  runner_up: string | null;
  third_place: string | null;
  top_scorer: string | null;
  best_player: string | null;
  best_goalkeeper: string | null;
} | null;

type Props = {
  locked: boolean;
  initial: InitialPicks;
};

type FieldKey =
  | "champion"
  | "runnerUp"
  | "thirdPlace"
  | "topScorer"
  | "bestPlayer"
  | "bestGoalkeeper";

function toInputMap(initial: InitialPicks): Record<FieldKey, string> {
  if (!initial) {
    return {
      champion: "",
      runnerUp: "",
      thirdPlace: "",
      topScorer: "",
      bestPlayer: "",
      bestGoalkeeper: "",
    };
  }
  return {
    champion: initial.champion ?? "",
    runnerUp: initial.runner_up ?? "",
    thirdPlace: initial.third_place ?? "",
    topScorer: initial.top_scorer ?? "",
    bestPlayer: initial.best_player ?? "",
    bestGoalkeeper: initial.best_goalkeeper ?? "",
  };
}

export default function PicksForm({ locked, initial }: Props) {
  const t = useTranslations("Picks");
  const initialValues = useMemo(() => toInputMap(initial), [initial]);
  const [values, setValues] = useState<Record<FieldKey, string>>(initialValues);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function setField(key: FieldKey, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) {
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch("./api", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          champion: values.champion,
          runnerUp: values.runnerUp,
          thirdPlace: values.thirdPlace,
          topScorer: values.topScorer,
          bestPlayer: values.bestPlayer,
          bestGoalkeeper: values.bestGoalkeeper,
        }),
      });

      if (response.status === 403) {
        const data = (await response.json().catch(() => ({}))) as { code?: string };
        if (data.code === "PICKS_LOCKED") {
          setMessage({ type: "error", text: t("messages.lockedError") });
        } else {
          setMessage({ type: "error", text: t("messages.saveError") });
        }
        setIsSaving(false);
        return;
      }

      if (!response.ok) {
        setMessage({ type: "error", text: t("messages.saveError") });
        setIsSaving(false);
        return;
      }

      setMessage({ type: "success", text: t("messages.saveSuccess") });
    } catch {
      setMessage({ type: "error", text: t("messages.saveError") });
    } finally {
      setIsSaving(false);
    }
  }

  const disabled = locked || isSaving;

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      {locked ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("lockedNotice")}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          {t("champion")}
          <input
            type="text"
            name="champion"
            value={values.champion}
            onChange={(e) => setField("champion", e.target.value)}
            disabled={disabled}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          {t("runnerUp")}
          <input
            type="text"
            name="runnerUp"
            value={values.runnerUp}
            onChange={(e) => setField("runnerUp", e.target.value)}
            disabled={disabled}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          {t("thirdPlace")}
          <input
            type="text"
            name="thirdPlace"
            value={values.thirdPlace}
            onChange={(e) => setField("thirdPlace", e.target.value)}
            disabled={disabled}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          {t("topScorer")}
          <input
            type="text"
            name="topScorer"
            value={values.topScorer}
            onChange={(e) => setField("topScorer", e.target.value)}
            disabled={disabled}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          {t("bestPlayer")}
          <input
            type="text"
            name="bestPlayer"
            value={values.bestPlayer}
            onChange={(e) => setField("bestPlayer", e.target.value)}
            disabled={disabled}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          {t("bestGoalkeeper")}
          <input
            type="text"
            name="bestGoalkeeper"
            value={values.bestGoalkeeper}
            onChange={(e) => setField("bestGoalkeeper", e.target.value)}
            disabled={disabled}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
          />
        </label>
      </div>

      {message ? (
        <p
          className={
            message.type === "success" ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-red-600"
          }
        >
          {message.text}
        </p>
      ) : null}

      {!locked ? (
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? t("saveSaving") : t("saveButton")}
        </button>
      ) : null}
    </form>
  );
}
