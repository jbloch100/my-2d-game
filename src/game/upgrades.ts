export type UpgradeRarity =
  | "common"
  | "rare"
  | "epic";

export type UpgradeId =
	| "fireRateUp"
	| "damageUp"
	| "moveSpeedUp"
	| "bulletSpeedUp"
	| "maxHpUp"
	| "multiShot"
	| "lifesteal"
	| "chain"
	| "pierce"
	| "explosion"
	| "crit"
	| "drone";

export type Upgrade = {
	id: UpgradeId;
	title: string;
	description: string;
	rarity: UpgradeRarity;
};

export function getAllUpgrades(): Upgrade[] {
	return [
		{
			id: "fireRateUp",
			title: "Rapid Fire",
			description: "+20% fire rate",
			rarity: "common",
		},
		{
			id: "damageUp",
			title: "Harder Hits",
			description: "+1 bullet damage",
			rarity: "common",
		},
		{
			id: "moveSpeedUp",
			title: "Light Feet",
			description: "+12% move speed",
			rarity: "common",
		},
		{
			id: "bulletSpeedUp",
			title: "Faster Bullets",
			description: "+15% bullet speed",
			rarity: "common",
		},
		{
			id: "maxHpUp",
			title: "Tougher Body",
			description: "+1 max HP (and heal +1)",
			rarity: "common",
		},
		{
			id: "multiShot",
			title: "Multi-Shot",
			description: "+2 bullets (spread)",
			rarity: "rare",
		},
		{
		  id: "chain",
		  title: "Chain Lightning",
		  description: "Shots bounce to nearby enemies",
		  rarity: "rare",
		},
		{
		  id: "pierce",
		  title: "Piercing Shots",
		  description: "Bullets pass through enemies",
		  rarity: "rare",
		},
		{
		  id: "explosion",
		  title: "Explosive Shots",
		  description: "Bullets explode and damage nearby enemies",
		  rarity: "epic",
		},
		{
		  id: "lifesteal",
		  title: "Lifesteal",
		  description: "Every 8 kills restores 1 HP",
		  rarity: "rare",
		},
		{
		  id: "crit",
		  title: "Critical Hits",
		  description: "+10% crit chance",
		  rarity: "rare",
		},
		{
		  id: "drone",
		  title: "Attack Drone",
		  description: "A drone circles and damages enemies",
		  rarity: "rare",
		},
	];
}

export function pick3RandomUpgrades(): Upgrade[] {
  const pool = getAllUpgrades();

  const result: Upgrade[] = [];
  const used = new Set<UpgradeId>();

  while (result.length < 3) {
    const u = weightedRandom(pool);

    if (!used.has(u.id)) {
      used.add(u.id);
      result.push(u);
    }
  }

  return result;
}

function weightedRandom(pool: Upgrade[]): Upgrade {
  const weighted: Upgrade[] = [];

  for (const u of pool) {
    const weight =
      u.rarity === "common"
        ? 10
        : u.rarity === "rare"
        ? 4
        : 1;

    for (let i = 0; i < weight; i++) {
      weighted.push(u);
    }
  }

  return weighted[Math.floor(Math.random() * weighted.length)];
}