export type Pickup = {
  x: number;
  y: number;
  r: number;
  kind: "xp";
  value: number;
};

export function spawnXpPickup(
  pickups: Pickup[],
  x: number,
  y: number,
  value = 1
) {
  pickups.push({
    x,
    y,
    r: 8,
    kind: "xp",
    value,
  });
}

export function updatePickups(
  pickups: Pickup[],
  player: { x: number; y: number; r: number },
  onCollect: (p: Pickup) => void
) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];

    const dx = player.x - p.x;
    const dy = player.y - p.y;
    const d2 = dx * dx + dy * dy;

    // magnet effect
    if (d2 < 140 * 140) {
      const len = Math.hypot(dx, dy) || 1;

      p.x += (dx / len) * 220 * (1 / 60);
      p.y += (dy / len) * 220 * (1 / 60);
    }

    const rr = p.r + player.r;

    if (d2 <= rr * rr) {
      pickups.splice(i, 1);
      onCollect(p);
    }
  }
}

export function drawPickups(
  ctx: CanvasRenderingContext2D,
  pickups: Pickup[]
) {
  for (const p of pickups) {
    ctx.save();

    ctx.fillStyle = "rgba(80,255,180,1)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}