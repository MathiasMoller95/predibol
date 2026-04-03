"use client";

import { useMemo } from "react";
import { getFlag } from "@/lib/team-metadata";
import { getTeamsGroupedForPicks, isKnownTeamName } from "@/lib/teams-for-picks";

type Props = {
  value: string;
  onChange: (teamName: string) => void;
  label: React.ReactNode;
  placeholder: string;
  disabled?: boolean;
};

const LEGACY_VALUE = "__legacy_pick__";

export default function TeamPicker({ value, onChange, label, placeholder, disabled }: Props) {
  const groups = useMemo(() => getTeamsGroupedForPicks(), []);
  const legacyUnknown = value !== "" && !isKnownTeamName(value);

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <select
        disabled={disabled}
        value={legacyUnknown ? LEGACY_VALUE : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === LEGACY_VALUE) return;
          onChange(v);
        }}
        className="mt-1 w-full min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {legacyUnknown ? (
          <option value={LEGACY_VALUE}>{value}</option>
        ) : null}
        {groups.map((g) => (
          <optgroup key={g.letter} label={g.optgroupLabel}>
            {g.teams.map((team) => (
              <option key={team} value={team}>
                {getFlag(team)} {team}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
