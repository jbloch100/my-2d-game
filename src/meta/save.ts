export type MetaUpgradeId =
  | "hp"
  | "damage"
  | "fireRate"
  | "moveSpeed"
  | "multiShotStart";

export type MetaUpgrades = Record<MetaUpgradeId, number>;

export type CharacterId = "soldier" | "tank" | "scout";

export type CharactersState = {
  selected: CharacterId;
  unlocked: Record<CharacterId, boolean>;
};

const DEFAULT_CHARACTERS: CharactersState = {
  selected: "soldier",
  unlocked: {
    soldier: true,
    tank: false,
    scout: false,
  },
};

export type HighScore = {
  bestScore: number;
  bestLevel: number;
  bestTimeSec: number;
};

export type SaveV1 = {
  version: 1;
  shards: number;
  upgrades: MetaUpgrades;
  best: HighScore;
  characters: CharactersState;
};

const KEY = "arena_survivor_save_v1";

const DEFAULT: SaveV1 = {
  version: 1,
  shards: 0,
  upgrades: {
    hp: 0,
    damage: 0,
    fireRate: 0,
    moveSpeed: 0,
    multiShotStart: 0,
  },
  best: { bestScore: 0, bestLevel: 0, bestTimeSec: 0 },
  characters: DEFAULT_CHARACTERS,
};

export function characterCost(id: CharacterId) {
  const cost: Record<CharacterId, number> = {
    soldier: 0,
    tank: 120,
    scout: 120,
  };
  return cost[id];
}

export function loadSave(): SaveV1 {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const parsed = JSON.parse(raw) as Partial<SaveV1>;

    return {
      ...DEFAULT,
      ...parsed,
      version: 1,
      upgrades: { ...DEFAULT.upgrades, ...(parsed.upgrades ?? {}) },
      best: { ...DEFAULT.best, ...(parsed.best ?? {}) },
      characters: {
        ...DEFAULT.characters,
        ...(parsed.characters ?? {}),
        unlocked: { ...DEFAULT.characters.unlocked, ...(parsed.characters?.unlocked ?? {}) },
      },
    };
  } catch {
    return structuredClone(DEFAULT);
  }
}

export function writeSave(save: SaveV1) {
  localStorage.setItem(KEY, JSON.stringify(save));
}

export function upgradeCost(id: MetaUpgradeId, currentLevel: number) {
  // cost for buying NEXT level
  const base: Record<MetaUpgradeId, number> = {
    hp: 25,
    damage: 35,
    fireRate: 30,
    moveSpeed: 25,
    multiShotStart: 70,
  };
  return Math.floor(base[id] * (1 + currentLevel * 0.45));
}

export function resetSave() {
  localStorage.removeItem(KEY);
}