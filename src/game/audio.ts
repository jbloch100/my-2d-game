export type SfxId =
  | "shoot"
  | "enemy_die"
  | "level_up"
  | "boss_spawn"
  | "player_hit"
  | "game_over";

const FILES: Record<SfxId, string> = {
  shoot: "/sfx/shoot.wav",
  enemy_die: "/sfx/enemy_die.wav",
  level_up: "/sfx/level_up.wav",
  boss_spawn: "/sfx/boss_spawn.wav",
  player_hit: "/sfx/player_hit.wav",
  game_over: "/sfx/game_over.wav",
};

export function createAudio() {
  const base = new Map<SfxId, HTMLAudioElement>();
  const lastPlay = new Map<SfxId, number>();

  let volume = 0.6;
  let muted = false;

  function preload() {
    (Object.keys(FILES) as SfxId[]).forEach((id) => {
      const a = new Audio(FILES[id]);
      a.preload = "auto";
      a.volume = volume;
      base.set(id, a);
    });
  }

  function setVolume(v: number) {
    volume = Math.max(0, Math.min(1, v));
    for (const a of base.values()) a.volume = volume;
  }

  function setMuted(m: boolean) {
    muted = m;
  }

  function play(id: SfxId, opts?: { cooldownMs?: number; volumeMul?: number }) {
    if (muted) return;

    const now = performance.now();
    const cooldown = opts?.cooldownMs ?? 0;
    const last = lastPlay.get(id) ?? -1e9;
    if (now - last < cooldown) return;
    lastPlay.set(id, now);

    const a0 = base.get(id);
    if (!a0) return;

    const a = a0.cloneNode(true) as HTMLAudioElement;
    a.volume = Math.max(0, Math.min(1, volume * (opts?.volumeMul ?? 1)));
    void a.play().catch(() => {});
  }

  return { preload, play, setVolume, setMuted };
}