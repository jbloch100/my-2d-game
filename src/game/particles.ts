export type Particle =
  | {
      kind: "dot";
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      r: number;
      a: number; // alpha
    }
  | {
      kind: "text";
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      text: string;
      size: number;
      a: number; // alpha
      isBoss?: boolean;
      isKill?: boolean;
    };

export function spawnDamageText(
  particles: Particle[],
  x: number,
  y: number,
  dmg: number,
  opts?: { isBoss?: boolean; isKill?: boolean }
) {
  const jitterX = (Math.random() * 2 - 1) * 6;

  particles.push({
    kind: "text",
    x: x + jitterX,
    y: y - 6,
    vx: (Math.random() * 2 - 1) * 12,
    vy: -55 - Math.random() * 25,
    life: 0.55,
    text: `${dmg}`,
    size: opts?.isBoss ? 18 : 16,
    a: 1,
    isBoss: opts?.isBoss,
    isKill: opts?.isKill,
  });
}

export function spawnExplosion(
  particles: Particle[],
  x: number,
  y: number,
  count: number
) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 240;

    particles.push({
      kind: "dot",
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + Math.random() * 0.25,
      r: 2 + Math.random() * 2,
      a: 1,
    });
  }
}

export function spawnTrail(
  particles: Particle[],
  x: number,
  y: number
) {
  particles.push({
    kind: "dot",
    x,
    y,
    vx: (Math.random() * 2 - 1) * 20,
    vy: (Math.random() * 2 - 1) * 20,
    life: 0.12 + Math.random() * 0.08,
    r: 1.2 + Math.random() * 0.8,
    a: 0.6,
  });
}

export function updateParticles(particles: Particle[], dt: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.kind === "dot") {
      p.vy += 140 * dt;
      p.a = Math.max(0, Math.min(1, p.life / 0.6));
    } else {
      p.a = Math.max(0, Math.min(1, p.life / 0.55));
    }
  }
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[]
) {
  for (const p of particles) {
    if (p.kind === "dot") {
      ctx.save();
      ctx.globalAlpha = p.a;
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }

    ctx.save();
    ctx.globalAlpha = p.a;

    ctx.font = `bold ${p.size}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.strokeText(p.text, p.x, p.y);

    ctx.fillStyle = p.isBoss ? "rgba(190,80,255,1)" : "white";
    ctx.fillText(p.text, p.x, p.y);

    if (p.isKill) {
      ctx.globalAlpha = p.a * 0.6;
      ctx.font = `bold ${p.size - 2}px system-ui`;
      ctx.fillText("!", p.x + 16, p.y - 10);
    }

    ctx.restore();
  }
}