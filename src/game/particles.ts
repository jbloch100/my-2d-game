export type Particle = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	r: number;
};

export function spawnExplosion( particles: Particle[], x: number, y: number, count: number) 
{
	for (let i = 0; i < count; i++) {
		const a = Math.random() * Math.PI * 2;
		const sp = 60 + Math.random() * 240;
		particles.push({
			x,
			y,
			vx: Math.cos(a) * sp,
			vy: Math.sin(a) * sp,
			life: 0.35 + Math.random() * 0.25,
			r: 2 + Math.random() * 2,
		});
	}
}

export function updateParticles(p: Particle[], dt: number) {
	for (const part of p) 
	{
		part.x += part.vx * dt;
		part.y += part.vy * dt;
		part.vx *= 0.9;
		part.vy *= 0.9;
		part.life -= dt;
	}

	for (let i = p.length - 1; i >= 0; i--) 
	{
		if (p[i].life <= 0) p.splice(i, 1);
	}
}

export function drawParticles(ctx: CanvasRenderingContext2D, p: Particle[]) {
	for (const part of p) 
	{
		const alpha = Math.max(0, Math.min(1, part.life / 0.6));
		ctx.fillStyle = `rgba(255,255,255,${alpha})`;
		ctx.beginPath();
		ctx.arc(part.x, part.y, part.r, 0, Math.PI * 2);
		ctx.fill();
	}
}