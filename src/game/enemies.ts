import type { Player } from "./player";
import type { Bullet } from "./bullets";

export type Enemy = {
	x: number;
	y: number;
	r: number;
	speed: number;
	hp: number;
	kind: "normal" | "boss";
  elite?: boolean;
};

export function spawnEnemy(bounds: { w: number; h: number }): Enemy {
	// spawn just outside one of the 4 sides
	const side = Math.floor(Math.random() * 4);
	const margin = 40;

	let x = 0;
	let y = 0;

	if (side === 0) {
		x = Math.random() * bounds.w;
		y = -margin;
	} else if (side === 1) {
		x = bounds.w + margin;
		y = Math.random() * bounds.h;
	} else if (side === 2) {
		x = Math.random() * bounds.w;
		y = bounds.h + margin;
	} else {
		x = -margin;
		y = Math.random() * bounds.h;
	}

	return {
		x,
		y,
		r: 14,
		speed: 120 + Math.random() * 60,
		hp: 2,
		kind: "normal",
	};
}


export function spawnEliteEnemy(bounds: { w: number; h: number }): Enemy {
  const side = Math.floor(Math.random() * 4);

  let x = 0;
  let y = 0;

  if (side === 0) {
    x = Math.random() * bounds.w;
    y = -30;
  } else if (side === 1) {
    x = bounds.w + 30;
    y = Math.random() * bounds.h;
  } else if (side === 2) {
    x = Math.random() * bounds.w;
    y = bounds.h + 30;
  } else {
    x = -30;
    y = Math.random() * bounds.h;
  }

  return {
    x,
    y,
    r: 22,
    speed: 95,
    hp: 5,
    kind: "normal",
    elite: true,
  };
}

export function spawnBoss(bounds: { w: number; h: number }): Enemy {
	// spawn from top
	return {
		x: bounds.w / 2,
		y: 90,
		r: 38,
		speed: 70,
		hp: 80,
		kind: "boss",
	};
}

export function updateEnemies(enemies: Enemy[], player: Player, dt: number) {
  for (const e of enemies) {
    // ✅ tick down hit flash (if it exists)
    (e as any).hitFlash = Math.max(0, ((e as any).hitFlash ?? 0) - dt);

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;

    e.x += ux * e.speed * dt;
    e.y += uy * e.speed * dt;
  }
}

export function drawEnemies(ctx: CanvasRenderingContext2D, enemies: Enemy[]) {
  for (const e of enemies) {
    const isBoss = e.kind === "boss";
    const flash = ((e as any).hitFlash ?? 0) as number;

    // ✅ flash ring first (so body draws on top)
    if (flash > 0) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + (isBoss ? 7 : 5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // body
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fillStyle = isBoss ? "rgba(190,80,255,1)" : "rgba(255,80,80,1)";
    ctx.fill();

    // hp bar
    const barW = isBoss ? 120 : 28;
    const barH = isBoss ? 10 : 5;
    const px = e.x - barW / 2;
    const py = e.y - e.r - (isBoss ? 18 : 12);

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(px, py, barW, barH);

    // ✅ IMPORTANT: match your boss hp max
    const maxHp = isBoss ? 80 : 2; // was 60 before
    const hpPct = Math.max(0, Math.min(1, e.hp / maxHp));

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(px, py, barW * hpPct, barH);
  }
}

export function handleBulletEnemyCollisions(args: {
  bullets: Bullet[];
  enemies: Enemy[];
  bulletDamage: number;
  onKill?: (info: { kind: Enemy["kind"]; x: number; y: number }) => void;
  onHit?: (info: {x: number; y: number; dmg: number; kind: Enemy["kind"]; killed: boolean }) => void; // ⭐ NEW
}) {
  const { bullets, enemies, bulletDamage, onKill, onHit } = args;

  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];

    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];

      const dx = b.x - e.x;
      const dy = b.y - e.y;
      const hit = dx * dx + dy * dy <= (b.r + e.r) * (b.r + e.r);

      if (hit) {
        bullets.splice(bi, 1);

        // ✅ real damage dealt (clamp to remaining hp so last-hit looks right)
        const dealt = Math.min(bulletDamage, e.hp);
        e.hp -= bulletDamage;

        const killed = e.hp <= 0;

        // ⭐ impact spark + damage number hook
        onHit?.({ x: b.x, y: b.y, dmg: dealt, kind: e.kind, killed });

        // ⭐ enemy flash
        (e as any).hitFlash = 0.08;

        if (killed) {
          enemies.splice(ei, 1);
          onKill?.({ kind: e.kind, x: e.x, y: e.y });
        }

        break;
      }
    }
  }
}

export function playerIsHit(player: Player, enemies: Enemy[]) {
	for (const e of enemies) {
		const dx = player.x - e.x;
		const dy = player.y - e.y;
		const hit = dx * dx + dy * dy <= (player.r + e.r) * (player.r + e.r);
		if (hit) return true;
	}
	return false;
}