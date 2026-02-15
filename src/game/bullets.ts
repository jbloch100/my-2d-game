export type Bullet = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	r: number;
	life: number; // seconds left
};

export function spawnBullet(args: {
fromX: number;
fromY: number;
toX: number;
toY: number;
speed: number;
}): Bullet | null {
	const dx = args.toX - args.fromX;
	const dy = args.toY - args.fromY;
	const len = Math.hypot(dx, dy);
	if (len === 0) return null;

	const ux = dx / len;
	const uy = dy / len;

	return {
		x: args.fromX,
		y: args.fromY,
		vx: ux * args.speed,
		vy: uy * args.speed,
		r: 4,
		life: 1.2,
	};
}

export function updateBullets(
bullets: Bullet[],
dt: number,
bounds: { w: number; h: number }
) {
	for (const b of bullets) {
		b.x += b.vx * dt;
		b.y += b.vy * dt;
		b.life -= dt;
	}

	// remove dead/offscreen bullets
	for (let i = bullets.length - 1; i >= 0; i--) {
		const b = bullets[i];
		const off =
		b.x < -50 || b.x > bounds.w + 50 || b.y < -50 || b.y > bounds.h + 50;
		if (b.life <= 0 || off) bullets.splice(i, 1);
	}
}

export function drawBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[]) {
	ctx.fillStyle = "white";
	for (const b of bullets) {
		ctx.beginPath();
		ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
		ctx.fill();
	}
}