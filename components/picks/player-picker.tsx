"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { getFlag } from "@/lib/team-metadata";
import type { Player } from "@/lib/player-data";

type Props = {
  value: string;
  onChange: (name: string) => void;
  label: React.ReactNode;
  placeholder: string;
  playerList: Player[];
  disabled?: boolean;
};

function filterAndGroup(players: Player[], query: string) {
  const q = query.trim().toLowerCase();
  const filtered =
    q === ""
      ? players
      : players.filter(
          (p) => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q),
        );
  const byTeam = new Map<string, Player[]>();
  for (const p of filtered) {
    const list = byTeam.get(p.team) ?? [];
    list.push(p);
    byTeam.set(p.team, list);
  }
  const teams = Array.from(byTeam.keys()).sort((a, b) => a.localeCompare(b));
  return teams.map((team) => ({
    team,
    players: (byTeam.get(team) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export default function PlayerPicker({ value, onChange, label, placeholder, playerList, disabled }: Props) {
  const t = useTranslations("Picks");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => filterAndGroup(playerList, value), [playerList, value]);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  if (disabled) {
    return (
      <div>
        <span className="mb-1 block text-sm font-medium text-slate-300">{label}</span>
        <div className="mt-1 flex min-h-[44px] items-center rounded-lg border border-dark-600 bg-dark-800/80 px-4 py-3 text-sm text-slate-300">
          {value || "—"}
        </div>
      </div>
    );
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-300">{label}</span>
      <div className="relative" ref={containerRef}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          className="mt-1 w-full min-h-[44px] rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-white placeholder:text-slate-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        {open ? (
          <ul
            className="absolute z-20 mt-1 max-h-[min(60vh,16rem)] w-full overflow-auto rounded-lg border border-dark-600 bg-dark-800 py-1 shadow-lg"
            role="listbox"
          >
            {grouped.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">{t("noPlayerMatches")}</li>
            ) : (
              grouped.map(({ team, players: teamPlayers }) => (
                <li key={team} className="border-b border-dark-600 last:border-b-0">
                  <div className="bg-dark-700/80 px-2 py-1 text-xs font-semibold text-slate-400">{team}</div>
                  <ul>
                    {teamPlayers.map((p) => (
                      <li key={`${p.team}-${p.name}`}>
                        <button
                          type="button"
                          className="flex w-full min-h-[44px] items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-dark-700 active:bg-dark-600"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            onChange(p.name);
                            setOpen(false);
                          }}
                        >
                          <span aria-hidden>{getFlag(p.team)}</span>
                          <span className="font-medium">{p.name}</span>
                          <span className="ml-auto truncate text-xs text-slate-500">{p.team}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
