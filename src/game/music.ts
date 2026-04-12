let current: HTMLAudioElement | null = null;
let currentSrc: string | null = null;

let fadeTimer: number | null = null;

let muted = false;
let masterVolume = 0.5;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function stopFade() {
  if (fadeTimer !== null) {
    window.clearInterval(fadeTimer);
    fadeTimer = null;
  }
}

function hardStop(a: HTMLAudioElement) {
  a.pause();
  a.currentTime = 0;
}

function play(src: string, opts?: { loop?: boolean; volume?: number; fadeMs?: number }) {
  const loop = opts?.loop ?? true;
  const targetVol = muted ? 0 : clamp01((opts?.volume ?? masterVolume));
  const fadeMs = Math.max(0, opts?.fadeMs ?? 350);

  // If already playing same track, do nothing
  if (current && currentSrc === src) return;

  // Create next track
  const next = new Audio(src);
  next.loop = loop;
  next.volume = 0; // start silent
  next.play().catch(() => {});

  // Swap references
  const prev = current;
  current = next;
  currentSrc = src;

  // No fade? hard swap
  if (!prev || fadeMs === 0) {
    if (prev) hardStop(prev);
    next.volume = targetVol;
    return;
  }

  // Fade prev out + next in
  stopFade();

  const steps = 20;
  const stepMs = Math.max(10, Math.floor(fadeMs / steps));
  let i = 0;

  const prevStartVol = prev.volume;
  const nextStartVol = 0;

  fadeTimer = window.setInterval(() => {
    i++;

    const t = i / steps; // 0..1
    const nextVol = nextStartVol + (targetVol - nextStartVol) * t;
    const prevVol = prevStartVol * (1 - t);

    next.volume = clamp01(nextVol);
    prev.volume = clamp01(prevVol);

    if (i >= steps) {
      stopFade();
      hardStop(prev);
      next.volume = targetVol;
    }
  }, stepMs);
}

export const music = {
  menu() {
    play("/music/menu.ogg", { loop: true, fadeMs: 300 });
  },

  gameplay() {
    play("/music/gameplay.ogg", { loop: true, fadeMs: 300 });
  },

  boss() {
    play("/music/boss.ogg", { loop: true, fadeMs: 220 }); // slightly faster feels snappier
  },

  victory() {
    play("/music/victory.ogg", { loop: false, fadeMs: 250 });
  },

  stop() {
    stopFade();
    if (!current) return;
    hardStop(current);
    current = null;
    currentSrc = null;
  },

  setVolume(v: number) {
    masterVolume = clamp01(v);
    if (current) current.volume = muted ? 0 : masterVolume;
  },

  setMuted(m: boolean) {
    muted = m;
    if (current) current.volume = muted ? 0 : masterVolume;
  },

  preload() {
    const files = ["/music/menu.ogg", "/music/gameplay.ogg", "/music/boss.ogg", "/music/victory.ogg"];
    for (const src of files) {
      const a = new Audio(src);
      a.preload = "auto";
      a.volume = 0;
    }
  },
};