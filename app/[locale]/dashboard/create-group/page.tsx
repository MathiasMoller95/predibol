"use client";

import { FormEvent, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast-provider";
import { createClient } from "@/lib/supabase/client";
import { getDisplayNameForMemberInsert } from "@/lib/display-name";
import { PRIMARY_BUTTON_CLASSES } from "@/lib/primary-button-classes";
import type { GroupAccessMode } from "@/types/supabase";

type TiebreakerRule = "most_exact_scores" | "most_correct_results" | "earliest_submission";

type GroupFormState = {
  name: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
  pointsCorrectResult: number;
  pointsCorrectDifference: number;
  pointsExactScore: number;
  bonusChampion: number;
  bonusRunnerUp: number;
  bonusThirdPlace: number;
  bonusTopScorer: number;
  bonusBestPlayer: number;
  bonusBestGoalkeeper: number;
  tiebreakerRule: TiebreakerRule;
};

type NumericGroupField =
  | "pointsCorrectResult"
  | "pointsCorrectDifference"
  | "pointsExactScore"
  | "bonusChampion"
  | "bonusRunnerUp"
  | "bonusThirdPlace"
  | "bonusTopScorer"
  | "bonusBestPlayer"
  | "bonusBestGoalkeeper";

const initialState: GroupFormState = {
  name: "",
  slug: "",
  primaryColor: "#16a34a",
  secondaryColor: "#0f172a",
  pointsCorrectResult: 1,
  pointsCorrectDifference: 2,
  pointsExactScore: 3,
  bonusChampion: 0,
  bonusRunnerUp: 0,
  bonusThirdPlace: 0,
  bonusTopScorer: 0,
  bonusBestPlayer: 0,
  bonusBestGoalkeeper: 0,
  tiebreakerRule: "most_exact_scores",
};

function randomSixDigitCode() {
  return Math.floor(100_000 + Math.random() * 900_000).toString();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Maps Supabase/Postgres errors from `groups.insert` to user-facing copy (avoids raw SQL in the UI). */
function messageForGroupInsertError(
  err: { message?: string; code?: string } | null,
  t: (key: "errors.createFailed" | "errors.duplicateSlug") => string
): string {
  if (!err) return t("errors.createFailed");
  const msg = err.message ?? "";
  if (err.code === "23505" && (msg.includes("groups_slug_key") || /unique constraint.*slug/i.test(msg))) {
    return t("errors.duplicateSlug");
  }
  return msg || t("errors.createFailed");
}

export default function CreateGroupPage() {
  const t = useTranslations("Groups");
  const tc = useTranslations("CreateGroup");
  const ta = useTranslations("AccessCode");
  const locale = useLocale();
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState<GroupFormState>(initialState);
  const [isPublic, setIsPublic] = useState(false);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessMode, setAccessMode] = useState<GroupAccessMode>("open");
  const [accessCode, setAccessCode] = useState("");

  const canSubmit = useMemo(() => {
    if (form.name.trim().length === 0 || form.slug.trim().length === 0) return false;
    if (accessMode === "protected" && !/^\d{6}$/.test(accessCode.trim())) return false;
    return true;
  }, [form, accessMode, accessCode]);

  function onNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: slugEdited ? prev.slug : slugify(name),
    }));
  }

  function onNumberChange(key: NumericGroupField, value: string) {
    const number = Number(value);
    setForm((prev) => ({ ...prev, [key]: Number.isNaN(number) ? 0 : Math.max(0, number) }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      if (form.name.trim().length === 0 || form.slug.trim().length === 0) {
        setError(t("errors.missingRequired"));
      } else if (accessMode === "protected") {
        setError(ta("codeRequired"));
      }
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace(`/${locale}/login`);
      return;
    }

    const descriptionTrimmed = isPublic ? description.trim().slice(0, 200) : "";
    const codeTrim = accessCode.trim();
    const accessCodeInsert = accessMode === "protected" ? codeTrim : null;

    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({
        name: form.name.trim(),
        slug: form.slug.trim(),
        primary_color: form.primaryColor,
        secondary_color: form.secondaryColor,
        admin_id: user.id,
        points_correct_result: form.pointsCorrectResult,
        points_correct_difference: form.pointsCorrectDifference,
        points_exact_score: form.pointsExactScore,
        pre_tournament_bonus_champion: form.bonusChampion,
        pre_tournament_bonus_runner_up: form.bonusRunnerUp,
        pre_tournament_bonus_third_place: form.bonusThirdPlace,
        pre_tournament_bonus_top_scorer: form.bonusTopScorer,
        pre_tournament_bonus_best_player: form.bonusBestPlayer,
        pre_tournament_bonus_best_goalkeeper: form.bonusBestGoalkeeper,
        tiebreaker_rule: form.tiebreakerRule,
        is_public: isPublic,
        description: descriptionTrimmed,
        access_mode: accessMode,
        access_code: accessCodeInsert,
      })
      .select("id")
      .single();

    if (groupError || !group?.id) {
      setError(messageForGroupInsertError(groupError, t));
      setIsSubmitting(false);
      return;
    }

    const memberDisplayName = await getDisplayNameForMemberInsert(supabase, user.id, user.email);

    const { error: memberError } = await supabase.from("group_members").upsert(
      {
        group_id: group.id,
        user_id: user.id,
        display_name: memberDisplayName,
      },
      { onConflict: "group_id,user_id" }
    );

    if (memberError) {
      setError(memberError.message || t("errors.memberSaveFailed"));
      setIsSubmitting(false);
      return;
    }

    showToast(`${t("create.submit")} ✓`, "success");
    router.push(`/${locale}/dashboard/group/${group.id}`);
  }

  return (
    <main className="min-h-screen bg-dark-900 px-4 py-8">
      <section className="mx-auto w-full max-w-2xl rounded-xl border border-dark-600 bg-dark-800 p-5 sm:p-6">
        <h1 className="text-2xl font-bold text-white">{t("create.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("create.subtitle")}</p>

        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="group-name">
              {t("fields.name")}
            </label>
            <input
              id="group-name"
              type="text"
              value={form.name}
              onChange={(event) => onNameChange(event.target.value)}
              className="w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="group-slug">
              {t("fields.slug")}
            </label>
            <input
              id="group-slug"
              type="text"
              value={form.slug}
              onChange={(event) => {
                setSlugEdited(true);
                setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }));
              }}
              className="w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>

          <fieldset className="rounded-lg border border-dark-600 bg-dark-700/50 p-4">
            <legend className="px-1 text-sm font-medium text-slate-200">{tc("visibility")}</legend>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-dark-600 bg-dark-800 p-3 has-[:checked]:border-emerald-500 has-[:checked]:ring-1 has-[:checked]:ring-emerald-500">
                <input
                  type="radio"
                  name="visibility"
                  checked={!isPublic}
                  onChange={() => {
                    setIsPublic(false);
                    setDescription("");
                  }}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-white">{tc("private")}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">{tc("privateDescription")}</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-dark-600 bg-dark-800 p-3 has-[:checked]:border-emerald-500 has-[:checked]:ring-1 has-[:checked]:ring-emerald-500">
                <input
                  type="radio"
                  name="visibility"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-white">{tc("public")}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">{tc("publicDescription")}</span>
                </span>
              </label>
            </div>

            {isPublic ? (
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="group-desc">
                  {tc("groupDescription")}
                </label>
                <textarea
                  id="group-desc"
                  value={description}
                  onChange={(event) => setDescription(event.target.value.slice(0, 200))}
                  placeholder={tc("groupDescriptionPlaceholder")}
                  rows={3}
                  className="w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <p className="mt-1 text-xs text-slate-500">{tc("groupDescriptionHelp")}</p>
              </div>
            ) : null}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="primary-color">
                {t("fields.primaryColor")}
              </label>
              <input
                id="primary-color"
                type="color"
                value={form.primaryColor}
                onChange={(event) => setForm((prev) => ({ ...prev, primaryColor: event.target.value }))}
                className="h-11 w-full cursor-pointer rounded-lg border border-dark-500 bg-dark-700 p-1"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="secondary-color">
                {t("fields.secondaryColor")}
              </label>
              <input
                id="secondary-color"
                type="color"
                value={form.secondaryColor}
                onChange={(event) => setForm((prev) => ({ ...prev, secondaryColor: event.target.value }))}
                className="h-11 w-full cursor-pointer rounded-lg border border-dark-500 bg-dark-700 p-1"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">{t("fields.pointsCorrectResult")}</label>
              <input
                type="number"
                min={0}
                value={form.pointsCorrectResult}
                onChange={(event) => onNumberChange("pointsCorrectResult", event.target.value)}
                className="w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">{t("fields.pointsCorrectDifference")}</label>
              <input
                type="number"
                min={0}
                value={form.pointsCorrectDifference}
                onChange={(event) => onNumberChange("pointsCorrectDifference", event.target.value)}
                className="w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">{t("fields.pointsExactScore")}</label>
              <input
                type="number"
                min={0}
                value={form.pointsExactScore}
                onChange={(event) => onNumberChange("pointsExactScore", event.target.value)}
                className="w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">{t("fields.bonusChampion")}</label>
              <input
                type="number"
                min={0}
                value={form.bonusChampion}
                onChange={(event) => onNumberChange("bonusChampion", event.target.value)}
                className="w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">{t("fields.bonusRunnerUp")}</label>
              <input
                type="number"
                min={0}
                value={form.bonusRunnerUp}
                onChange={(event) => onNumberChange("bonusRunnerUp", event.target.value)}
                className="w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">{t("fields.bonusThirdPlace")}</label>
              <input
                type="number"
                min={0}
                value={form.bonusThirdPlace}
                onChange={(event) => onNumberChange("bonusThirdPlace", event.target.value)}
                className="w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">{t("fields.bonusTopScorer")}</label>
              <input
                type="number"
                min={0}
                value={form.bonusTopScorer}
                onChange={(event) => onNumberChange("bonusTopScorer", event.target.value)}
                className="w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">{t("fields.bonusBestPlayer")}</label>
              <input
                type="number"
                min={0}
                value={form.bonusBestPlayer}
                onChange={(event) => onNumberChange("bonusBestPlayer", event.target.value)}
                className="w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">{t("fields.bonusBestGoalkeeper")}</label>
              <input
                type="number"
                min={0}
                value={form.bonusBestGoalkeeper}
                onChange={(event) => onNumberChange("bonusBestGoalkeeper", event.target.value)}
                className="w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="tiebreaker-rule">
              {t("fields.tiebreakerRule")}
            </label>
            <select
              id="tiebreaker-rule"
              value={form.tiebreakerRule}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, tiebreakerRule: event.target.value as TiebreakerRule }))
              }
              className="w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="most_exact_scores">{t("tiebreakers.mostExactScores")}</option>
              <option value="most_correct_results">{t("tiebreakers.mostCorrectResults")}</option>
              <option value="earliest_submission">{t("tiebreakers.earliestSubmission")}</option>
            </select>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-200">{ta("title")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setAccessMode("open");
                  setAccessCode("");
                }}
                className={`rounded-xl border border-dark-600 p-4 text-left transition-all duration-200 ${
                  accessMode === "open"
                    ? "bg-emerald-500/5 ring-2 ring-emerald-500"
                    : "bg-[#111720] ring-0"
                }`}
              >
                <span className="text-lg" aria-hidden>
                  🔓
                </span>
                <p className="mt-2 text-sm font-medium text-white">{ta("open")}</p>
                <p className="mt-1 text-xs text-slate-400">{ta("openDescription")}</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccessMode("protected");
                  if (!/^\d{6}$/.test(accessCode)) {
                    setAccessCode(randomSixDigitCode());
                  }
                }}
                className={`rounded-xl border border-dark-600 p-4 text-left transition-all duration-200 ${
                  accessMode === "protected"
                    ? "bg-emerald-500/5 ring-2 ring-emerald-500"
                    : "bg-[#111720] ring-0"
                }`}
              >
                <span className="text-lg" aria-hidden>
                  🔒
                </span>
                <p className="mt-2 text-sm font-medium text-white">{ta("protected")}</p>
                <p className="mt-1 text-xs text-slate-400">{ta("protectedDescription")}</p>
              </button>
            </div>

            {accessMode === "protected" ? (
              <div className="mt-4 space-y-2 rounded-lg border border-dark-600 bg-dark-700/50 p-4">
                <label className="block text-xs font-medium text-slate-400" htmlFor="access-code">
                  {ta("protected")}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    id="access-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 font-mono text-lg tracking-widest text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 sm:max-w-[12rem]"
                    placeholder="000000"
                    aria-describedby="access-code-hint"
                  />
                  <button
                    type="button"
                    onClick={() => setAccessCode(randomSixDigitCode())}
                    className="shrink-0 rounded-lg border border-dark-500 bg-dark-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-emerald-500/50"
                  >
                    {ta("generateCode")}
                  </button>
                </div>
                <p id="access-code-hint" className="text-xs text-slate-500">
                  {ta("shareCodeHint")}
                </p>
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || !canSubmit}
            className={`min-h-[48px] w-full rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700 disabled:bg-emerald-400 ${PRIMARY_BUTTON_CLASSES}`}
          >
            {isSubmitting ? t("create.submitting") : t("create.submit")}
          </button>
        </form>
      </section>
    </main>
  );
}
