import type { Player } from "./player";
import type { Bullet } from "./bullets";

export type Enemy = {
	x: number;
	y: number;
	r: number;
	speed: number;
	hp: number;
	kind: "normal" | "boss" | "runner" | "shooter";
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
  // spawn just outside one of the 4 sides
  const side = Math.floor(Math.random() * 4);
  const margin = 50;

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
    r: 22,
    speed: 95 + Math.random() * 35,
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

export function spawnRunnerEnemy(bounds: { w: number; h: number }): Enemy {
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
    r: 10,
    speed: 200 + Math.random() * 80,
    hp: 1,
    kind: "runner",
  };
}

export function spawnShooterEnemy(bounds: { w: number; h: number }): Enemy {
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
    r: 13,
    speed: 85 + Math.random() * 20,
    hp: 3,
    kind: "shooter",
  };
}


export function updateEnemies(enemies: Enemy[], player: Player, dt: number) {
  for (const e of enemies) {
    (e as any).hitFlash = Math.max(0, ((e as any).hitFlash ?? 0) - dt);

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;

    if (e.kind === "shooter") {
      const preferredDist = 220;

      if (len > preferredDist + 20) {
        e.x += ux * e.speed * dt;
        e.y += uy * e.speed * dt;
      } else if (len < preferredDist - 20) {
        e.x -= ux * e.speed * dt;
        e.y -= uy * e.speed * dt;
      } else {
        // strafe a bit
        const sx = -uy;
        const sy = ux;
        e.x += sx * e.speed * 0.55 * dt;
        e.y += sy * e.speed * 0.55 * dt;
      }
    } else {
      e.x += ux * e.speed * dt;
      e.y += uy * e.speed * dt;
    }
  }
}

export function drawEnemies(ctx: CanvasRenderingContext2D, enemies: Enemy[]) {
  for (const e of enemies) {
    const isBoss = e.kind === "boss";
    const isRunner = e.kind === "runner";
    const isShooter = e.kind === "shooter";
    const isElite = e.elite === true;
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
    if (isElite) {
      const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.12;

      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "rgba(255,220,80,1)";

      ctx.beginPath();
      ctx.arc(e.x, e.y, (e.r + 6) * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    if (isShooter) {
      ctx.beginPath();
      ctx.rect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2);
    } else if (isRunner) {
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - e.r);
      ctx.lineTo(e.x + e.r, e.y + e.r);
      ctx.lineTo(e.x - e.r, e.y + e.r);
      ctx.closePath();
    } else {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    }

    ctx.fillStyle = isBoss
      ? "rgba(190,80,255,1)"
      : isElite
      ? "rgba(255,190,60,1)"
      : isRunner
      ? "rgba(80,200,255,1)"
      : isShooter
      ? "rgba(120,255,120,1)"
      : "rgba(255,80,80,1)";
    ctx.fill();

    // hp bar
    const barW = isBoss ? 120 : 28;
    const barH = isBoss ? 10 : 5;
    const px = e.x - barW / 2;
    const py = e.y - e.r - (isBoss ? 18 : 12);

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(px, py, barW, barH);

    // ✅ IMPORTANT: match your boss hp max
    const maxHp = isBoss ? 80 : isElite ? 5 : isRunner ? 1 : isShooter ? 3 : 2;
    const hpPct = Math.max(0, Math.min(1, e.hp / maxHp));

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(px, py, barW * hpPct, barH);
  }
}

export function handleBulletEnemyCollisions(args: {
  bullets: Bullet[];
  enemies: Enemy[];
  bulletDamage: number;
  onKill?: (info: { kind: Enemy["kind"]; x: number; y: number; elite?: boolean; }) => void;
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
        if ((b as any).pierceLeft === undefined) {
          (b as any).pierceLeft = 0;
        }

        if ((b as any).pierceLeft <= 0) {
          bullets.splice(bi, 1);
        } else {
          (b as any).pierceLeft -= 1;
        }

        const isCrit = Math.random() < ((b as any).critChance ?? 0);

        const dmg = isCrit
          ? Math.ceil(bulletDamage * ((b as any).critMultiplier ?? 1.5))
          : bulletDamage;

        const dealt = Math.min(dmg, e.hp);

        e.hp -= dmg;

        const killed = e.hp <= 0;

        // ⭐ impact spark + damage number hook
        onHit?.({ x: b.x, y: b.y, dmg: dealt, kind: e.kind, killed });

        // ⭐ enemy flash
        (e as any).hitFlash = 0.08;

        if (killed) {
          enemies.splice(ei, 1);
          onKill?.({ kind: e.kind, x: e.x, y: e.y, elite: e.elite });
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