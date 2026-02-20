export type Phase = "menu" | "playing" | "paused" | "gameover";

export type RunSummary = {
  timeSurvivedSec: number;
  kills: number;
  bossKills: number;
  finalScore: number;
  finalLevel: number;
  upgrades: string[];
};
