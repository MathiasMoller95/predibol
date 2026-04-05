/** Sort knockout_label strings (R16-10 after R16-9, not before R16-2). */

const PREFIX_ORDER: Record<string, number> = {
  R16: 0,
  QF: 1,
  SF: 2,
  "3RD": 3,
  F: 4,
};

function parseKnockoutLabel(label: string): { ord: number; n: number; raw: string } {
  const u = label.trim().toUpperCase();
  const mR = u.match(/^R16-(\d+)$/);
  if (mR) return { ord: PREFIX_ORDER.R16, n: Number(mR[1]), raw: u };
  const mQ = u.match(/^QF-(\d+)$/);
  if (mQ) return { ord: PREFIX_ORDER.QF, n: Number(mQ[1]), raw: u };
  const mS = u.match(/^SF-(\d+)$/);
  if (mS) return { ord: PREFIX_ORDER.SF, n: Number(mS[1]), raw: u };
  if (u === "3RD") return { ord: PREFIX_ORDER["3RD"], n: 0, raw: u };
  if (u === "F") return { ord: PREFIX_ORDER.F, n: 0, raw: u };
  return { ord: 99, n: 0, raw: u };
}

export function compareKnockoutLabels(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const pa = parseKnockoutLabel(a);
  const pb = parseKnockoutLabel(b);
  if (pa.ord !== pb.ord) return pa.ord - pb.ord;
  if (pa.n !== pb.n) return pa.n - pb.n;
  return pa.raw.localeCompare(pb.raw);
}

export const BRACKET_R16_LEFT = ["R16-1", "R16-2", "R16-3", "R16-4", "R16-5", "R16-6", "R16-7", "R16-8"] as const;
export const BRACKET_R16_RIGHT = [
  "R16-9",
  "R16-10",
  "R16-11",
  "R16-12",
  "R16-13",
  "R16-14",
  "R16-15",
  "R16-16",
] as const;
export const BRACKET_QF_LEFT = ["QF-1", "QF-2", "QF-3", "QF-4"] as const;
export const BRACKET_QF_RIGHT = ["QF-5", "QF-6", "QF-7", "QF-8"] as const;
export const BRACKET_SF_LEFT = ["SF-1", "SF-2"] as const;
export const BRACKET_SF_RIGHT = ["SF-3", "SF-4"] as const;

export const BRACKET_NODE_HEIGHT = 74;
export const BRACKET_NODE_GAP = 16;

export function stackedTops(count: number, nodeH: number, gap: number): number[] {
  return Array.from({ length: count }, (_, i) => i * (nodeH + gap));
}

export function parentTops(childTops: number[], nodeH: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < childTops.length; i += 2) {
    const c1 = childTops[i]! + nodeH / 2;
    const c2 = childTops[i + 1]! + nodeH / 2;
    out.push((c1 + c2) / 2 - nodeH / 2);
  }
  return out;
}

export function bracketTreeHeight(leafCount: number, nodeH: number, gap: number): number {
  if (leafCount <= 0) return 0;
  return (leafCount - 1) * (nodeH + gap) + nodeH;
}

export type BracketHubStatusKey =
  | "comingSoon"
  | "roundOf16"
  | "quarterFinal"
  | "semiFinal"
  | "final"
  | "thirdPlace"
  | "complete";

const HUB_PHASE_WALK = [
  "round_of_16",
  "quarter_final",
  "quarter",
  "semi_final",
  "semi",
  "final",
  "third_place",
] as const;

/** Knockout rows for group hub card — phases that are not group stage. */
export function computeBracketHubStatus(
  rows: { phase: string; home_team: string; away_team: string; status: string }[],
): BracketHubStatusKey {
  if (rows.length === 0) return "comingSoon";
  const ko = rows.filter((r) => r.phase !== "group");
  if (ko.length === 0) return "comingSoon";
  const hasBothKnown = ko.some((r) => r.home_team !== "TBD" && r.away_team !== "TBD");
  if (!hasBothKnown) return "comingSoon";

  for (const ph of HUB_PHASE_WALK) {
    const inPhase = ko.filter((r) => r.phase === ph);
    if (inPhase.length === 0) continue;
    if (inPhase.some((m) => m.status === "scheduled" || m.status === "live")) {
      if (ph === "round_of_16") return "roundOf16";
      if (ph === "quarter_final" || ph === "quarter") return "quarterFinal";
      if (ph === "semi_final" || ph === "semi") return "semiFinal";
      if (ph === "final") return "final";
      if (ph === "third_place") return "thirdPlace";
    }
  }

  return "complete";
}
