import { teamFlags, teamGroup } from "@/lib/team-metadata";

const GROUP_ORDER = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;

export type TeamGroupOption = {
  letter: string;
  /** e.g. "Group A" */
  optgroupLabel: string;
  teams: string[];
};

/** All 48 teams grouped by World Cup group, sorted within each group. */
export function getTeamsGroupedForPicks(): TeamGroupOption[] {
  return GROUP_ORDER.map((letter) => ({
    letter,
    optgroupLabel: `Group ${letter}`,
    teams: Object.keys(teamFlags)
      .filter((name) => teamGroup[name] === letter)
      .sort((a, b) => a.localeCompare(b)),
  }));
}

export function isKnownTeamName(name: string): boolean {
  return name !== "" && teamFlags[name] !== undefined;
}
