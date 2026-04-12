import type { CharacterId } from "./save";

export type CharacterAbility =
  | { kind: "none" }
  | { kind: "dash"; cooldownSec: number; dashSpeed: number; dashDurationSec: number }
  | { kind: "xpBoost"; xpMul: number }
  | { kind: "guard"; cooldownSec: number }; // next hit blocked after cooldown ready


export type CharacterDef = {
  id: CharacterId;
  name: string;
  desc: string;
  // base stats (before meta upgrades)
  maxHp: number;
  speed: number;
  fireRate: number;
  damage: number;
  ability: CharacterAbility;
};

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  soldier: {
    id: "soldier",
    name: "Soldier",
    desc: "Balanced starter.",
    maxHp: 5,
    speed: 260,
    fireRate: 10,
    damage: 1,
    ability: { kind: "xpBoost", xpMul: 1.1 },  // +10% XP
  },
  tank: {
    id: "tank",
    name: "Tank",
    desc: "More HP, slower fire, hits harder.",
    maxHp: 8,
    speed: 240,
    fireRate: 8,
    damage: 1,
    ability: { kind: "guard", cooldownSec: 5 },  // block one hit when ready
  },
  scout: {
    id: "scout",
    name: "Scout",
    desc: "Fast, fragile, shoots faster.",
    maxHp: 4,
    speed: 300,
    fireRate: 11,
    damage: 1,
    ability: { kind: "dash", cooldownSec: 3.5, dashSpeed: 680, dashDurationSec: 0.15 },
  },
};