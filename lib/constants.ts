export const SUPER_ADMIN_ID = "0fc45aae-652f-49db-963b-8784bae42fea";

export const AI_PLAYER_ID = "00000000-0000-0000-0000-000000000001";
export const AI_PLAYER_NAME = "🤖 Predibol IA";

export const MAX_GROUPS_PER_USER = 3;

export type PowerType = "double_down" | "spy" | "shield";

export const POWER_TYPES: PowerType[] = ["double_down", "spy", "shield"];

export const POWER_LIMITS: Record<PowerType, number> = {
  double_down: 3,
  spy: 2,
  shield: 2,
} as const;
