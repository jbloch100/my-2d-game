export type UpgradeId =
	| "fireRateUp"
	| "damageUp"
	| "moveSpeedUp"
	| "bulletSpeedUp"
	| "maxHpUp"
	| "multiShot";

export type Upgrade = {
	id: UpgradeId;
	title: string;
	description: string;
};

export function getAllUpgrades(): Upgrade[] {
	return [
		{
			id: "fireRateUp",
			title: "Rapid Fire",
			description: "+20% fire rate",
		},
		{
			id: "damageUp",
			title: "Harder Hits",
			description: "+1 bullet damage",
		},
		{
			id: "moveSpeedUp",
			title: "Light Feet",
			description: "+12% move speed",
		},
		{
			id: "bulletSpeedUp",
			title: "Faster Bullets",
			description: "+15% bullet speed",
		},
		{
			id: "maxHpUp",
			title: "Tougher Body",
			description: "+1 max HP (and heal +1)",
		},
		{
			id: "multiShot",
			title: "Multi-Shot",
			description: "+2 bullets (spread)"
		},
	];
}

export function pick3RandomUpgrades(): Upgrade[] {
	const all = getAllUpgrades().slice();
	shuffle(all);
	return all.slice(0, 3);
}

function shuffle<T>(arr: T[]) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
}