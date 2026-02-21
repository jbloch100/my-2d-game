export type Phase = "menu" | "playing" | "paused" | "gameover" | "victory";

export type RunSummary = {
  timeSurvivedSec: number;
  kills: number;
  bossKills: number;
  finalScore: number;
  finalLevel: number;
  upgrades: string[];
};

export type HighScore = {
  bestScore: number;
  bestLevel: number;
  bestTimeSec: number;
};