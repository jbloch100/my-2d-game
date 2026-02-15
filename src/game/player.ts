import type { InputState } from "./input";

export type Player = {
	x: number;
	y: number;
	r: number;
	speed: number; // pixels/sec
	hp: number;
	maxHp: number;
	invuln: number; // seconds remaining of invulnerability
};

export function createPlayer(): Player {
	return { x: 450, y: 275, r: 14, speed: 260, hp: 5, maxHp: 5, invuln: 0, };
}

export function updatePlayer(p: Player, input: InputState, dt: number, bounds: { w: number; h: number }) {
	let dx = 0;
	let dy = 0;

	const k = input.keys;

	if (k.has("w") || k.has("arrowup")) dy -= 1;
	if (k.has("s") || k.has("arrowdown")) dy += 1;
	if (k.has("a") || k.has("arrowleft")) dx -= 1;
	if (k.has("d") || k.has("arrowright")) dx += 1;

	// normalize so diagonal isn’t faster
	const len = Math.hypot(dx, dy);
	if (len > 0) {
		dx /= len;
		dy /= len;
	}

	p.x += dx * p.speed * dt;
	p.y += dy * p.speed * dt;

	// keep inside bounds
	p.x = clamp(p.x, p.r, bounds.w - p.r);
	p.y = clamp(p.y, p.r, bounds.h - p.r);
}

export function drawPlayer(ctx: CanvasRenderingContext2D, p: Player) {
	ctx.beginPath();
	ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);

	if(p.invuln > 0){
		ctx.fillStyle = "yellow";
	} else{
		ctx.fillStyle = "white";
	}
	ctx.fill();
}

function clamp(v: number, min: number, max: number) {
	return Math.max(min, Math.min(max, v));
}