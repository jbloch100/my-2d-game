export type SfxId =
  | "shoot1"
  | "shoot2"
  | "shoot3"
  | "enemy_die1"
  | "enemy_die2"
  | "enemy_die3"
  | "level_up"
  | "boss_spawn"
  | "player_hit"
  | "game_over"
  | "ui_click"
  | "upgrade_buy";

const FILES: Record<SfxId, string> = {
  shoot1: "/sfx/shoot1.ogg",
  shoot2: "/sfx/shoot2.ogg",
  shoot3: "/sfx/shoot3.ogg", // ✅ comma was missing

  enemy_die1: "/sfx/enemy_die1.ogg",
  enemy_die2: "/sfx/enemy_die2.ogg",
  enemy_die3: "/sfx/enemy_die3.ogg",

  level_up: "/sfx/level_up.ogg",
  boss_spawn: "/sfx/boss_spawn.ogg",
  player_hit: "/sfx/player_hit.ogg",
  game_over: "/sfx/game_over.ogg",
  ui_click: "/sfx/ui_click.ogg",
  upgrade_buy: "/sfx/upgrade_buy.ogg",
};

export function createAudio() {
  const base = new Map<SfxId, HTMLAudioElement>();
  const lastPlay = new Map<SfxId, number>();

  let volume = 0.6;
  let muted = false;

  // ✅ shared cooldowns across variants
  let lastShootAt = -1e9;
  let lastEnemyDieAt = -1e9;

  function rand(min: number, max: number) {
    return min + Math.random() * (max - min);
  }

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

  function playShoot(opts?: { cooldownMs?: number; volumeMul?: number }) {
    if (muted) return;

    const now = performance.now();
    const cooldown = opts?.cooldownMs ?? 0;
    if (now - lastShootAt < cooldown) return;
    lastShootAt = now;

    const r = Math.random();
    const id: SfxId = r < 0.34 ? "shoot1" : r < 0.67 ? "shoot2" : "shoot3";

    const a0 = base.get(id);
    if (!a0) return;

    const a = a0.cloneNode(true) as HTMLAudioElement;
    a.volume = Math.max(
      0,
      Math.min(1, volume * (opts?.volumeMul ?? 1) * rand(0.92, 1.08))
    );
    a.playbackRate = rand(0.96, 1.04);

    void a.play().catch(() => {});
  }

  function playEnemyDie(opts?: { cooldownMs?: number; volumeMul?: number }) {
    if (muted) return;

    // ✅ shared cooldown across enemy_die1/2/3
    const now = performance.now();
    const cooldown = opts?.cooldownMs ?? 25;
    if (now - lastEnemyDieAt < cooldown) return;
    lastEnemyDieAt = now;

    const ids: SfxId[] = ["enemy_die1", "enemy_die2", "enemy_die3"];
    const id = ids[Math.floor(Math.random() * ids.length)];

    const a0 = base.get(id);
    if (!a0) return;

    const a = a0.cloneNode(true) as HTMLAudioElement;
    a.volume = Math.max(
      0,
      Math.min(1, volume * (opts?.volumeMul ?? 1) * rand(0.9, 1.1))
    );
    a.playbackRate = rand(0.96, 1.04);

    void a.play().catch(() => {});
  }

  return { preload, play, playShoot, playEnemyDie, setVolume, setMuted };
}

// ✅ shared instance for UI + engine
export const audio = createAudio();