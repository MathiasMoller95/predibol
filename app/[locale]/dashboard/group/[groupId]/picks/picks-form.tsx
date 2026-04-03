"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import PlayerPicker from "@/components/picks/player-picker";
import TeamPicker from "@/components/picks/team-picker";
import { goalkeepers, players } from "@/lib/player-data";

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

  useEffect(() => {
    setValues(toInputMap(initial));
  }, [initial]);

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
          setMessage({ type: "error", text: t("locked") });
        } else {
          setMessage({ type: "error", text: t("error") });
        }
        setIsSaving(false);
        return;
      }

      if (!response.ok) {
        setMessage({ type: "error", text: t("error") });
        setIsSaving(false);
        return;
      }

      setMessage({ type: "success", text: t("saved") });
    } catch {
      setMessage({ type: "error", text: t("error") });
    } finally {
      setIsSaving(false);
    }
  }

  const disabled = locked || isSaving;

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      {locked ? (
        <p className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span aria-hidden>🔒</span>
          {t("locked")}
        </p>
      ) : null}

      <div className="flex flex-col gap-5">
        <TeamPicker
          label={t("champion")}
          placeholder={t("selectTeam")}
          value={values.champion}
          onChange={(v) => setField("champion", v)}
          disabled={disabled}
        />
        <TeamPicker
          label={t("runnerUp")}
          placeholder={t("selectTeam")}
          value={values.runnerUp}
          onChange={(v) => setField("runnerUp", v)}
          disabled={disabled}
        />
        <TeamPicker
          label={t("thirdPlace")}
          placeholder={t("selectTeam")}
          value={values.thirdPlace}
          onChange={(v) => setField("thirdPlace", v)}
          disabled={disabled}
        />
        <PlayerPicker
          label={t("topScorer")}
          placeholder={t("searchPlayer")}
          playerList={players}
          value={values.topScorer}
          onChange={(v) => setField("topScorer", v)}
          disabled={disabled}
        />
        <PlayerPicker
          label={t("bestPlayer")}
          placeholder={t("searchPlayer")}
          playerList={players}
          value={values.bestPlayer}
          onChange={(v) => setField("bestPlayer", v)}
          disabled={disabled}
        />
        <PlayerPicker
          label={t("bestGoalkeeper")}
          placeholder={t("searchGoalkeeper")}
          playerList={goalkeepers}
          value={values.bestGoalkeeper}
          onChange={(v) => setField("bestGoalkeeper", v)}
          disabled={disabled}
        />
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
          className="w-full min-h-[48px] rounded-md bg-emerald-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSaving ? t("saving") : t("save")}
        </button>
      ) : null}
    </form>
  );
}
