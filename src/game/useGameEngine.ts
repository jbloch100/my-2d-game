import { useEffect, useRef } from "react";
import { createAbilityRuntime } from "./abilities";
import { attachInputListeners, createInput } from "./input";
import { createPlayer, updatePlayer, drawPlayer } from "./player";
import type { CharacterId, MetaUpgrades } from "../meta/save";
import { CHARACTERS } from "../meta/characters";
import {
  spawnBullet,
  spawnBulletByAngle,
  updateBullets,
  type Bullet,
} from "./bullets";
import {
  drawEnemies,
  handleBulletEnemyCollisions,
  playerIsHit,
  spawnEnemy,
  spawnEliteEnemy,
  spawnRunnerEnemy,
  spawnShooterEnemy,
  spawnBoss,
  updateEnemies,
  type Enemy,
} from "./enemies";
import { pick3RandomUpgrades, type Upgrade } from "./upgrades";
import {
  drawParticles,
  spawnExplosion,
  updateParticles,
  spawnTrail,
  spawnDamageText,
  type Particle,
} from "./particles";
import {
  spawnXpPickup,
  updatePickups,
  drawPickups,
  type Pickup,
} from "./pickups";
import type { Phase, RunSummary } from "../types";
import { audio } from "./audio";

type HighScore = { bestScore: number; bestLevel: number; bestTimeSec: number };

type DamageText = {
  x: number;
  y: number;
  vy: number;
  life: number;     // seconds left
  maxLife: number;  // for fade
  value: number;
  isBoss?: boolean;
  isKill?: boolean;
};

export function useGameEngine(args: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  phaseRef: React.RefObject<Phase>;
  setPhase: (p: Phase) => void;
  setRunSummary: (s: RunSummary | null) => void;
  setCopied: (v: boolean) => void;

  // audio settings from UI
  sfxVolume: number;
  sfxMuted: boolean;

  // high score persistence handled by App
  highScore: HighScore;
  setHighScore: (hs: HighScore) => void;

  // META progression
  metaUpgrades: MetaUpgrades;
  addShards: (amount: number) => void;

  // character selection
  selectedCharacter: CharacterId;

  onBossMusic?: (active: boolean) => void;
}) {
  const rafRef = useRef<number | null>(null);
  const startRequestedRef = useRef(false);

  // must match your spawnBoss hp
  const BOSS_MAX_HP = 80;
  const BOSSES_TO_WIN = 3;
  const bossEvery = 30; // seconds

  function requestStart() {
    startRequestedRef.current = true;
  }

  useEffect(() => {
    const canvasEl = args.canvasRef.current;
    if (!canvasEl) return;

    // ✅ non-null aliases safe for closures
    const canvas = canvasEl;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const c = ctx;

    // audio
    audio.preload();
    audio.setVolume(args.sfxVolume);
    audio.setMuted(args.sfxMuted);

    // resize
    const dpr = window.devicePixelRatio || 1;
    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // input
    const input = createInput();
    const detach = attachInputListeners(canvas, input);

    // ---- engine state ----
    const player = createPlayer();
    const bullets: Bullet[] = [];
    const enemies: Enemy[] = [];
    const particles: Particle[] = [];
    const enemyBullets: Bullet[] = [];
    const dmgTexts: DamageText[] = [];
    const pickups: Pickup[] = [];

    // combat stats
    let fireRate = 10; // bullets/sec
    let bulletSpeed = 650;
    let bulletDamage = 1;
    let shootCooldown = 0;
    let multiShotLevel = 0; // 0=single, 1=3 bullets, 2=5 bullets
    let chainLevel = 0;
    let pierceLevel = 0;
    let critChance = 0;
    let critMultiplier = 1.5;
    let droneLevel = 0;
    let droneHitTimer = 0;
    let droneAngle = 0;
    let explosionLevel = 0;
    let lifestealLevel = 0;
    let lifestealKills = 0;

    // enemies/difficulty
    let spawnTimer = 0;
    let spawnEvery = 0.9;
    let difficultyTimer = 0;
    let shooterFireTimer = 0;

    // boss system
    let bossTimer = 0;
    let bossAlive = false;
    let bossShootTimer = 0;

    // boss warning banner
    let bossWarningTimer = 0; // counts down
    let showBossWarning = false;

    // run state
    let score = 0;
    let shake = 0;

    let runTime = 0;
    let kills = 0;
    let bossKills = 0;
    let upgradesPicked: string[] = [];
    let summarySaved = false;

    // input edge triggers
    let wasRDown = false;
    let wasEscDown = false;

    // leveling
    let level = 1;
    let xp = 0;
    let xpToNext = 5;
    let isLevelUp = false;
    let choices: Upgrade[] = [];

    // juice
    let hitStop = 0;      // seconds of freeze-frame
    let playerFlash = 0;  // seconds of white flash overlay on player
    let levelUpFlash = 0; // seconds
    let zoomKick = 0;     // 0..1

    // ✅ abilities runtime must live in engine scope (NOT inside applyMetaUpgrades)
    let ability = createAbilityRuntime(CHARACTERS[args.selectedCharacter]);
    let wasSpaceDown = false; // SPACE edge press

    function applyUpgrade(u: Upgrade) {
      upgradesPicked.push(u.title);
      switch (u.id) {
        case "fireRateUp":
          fireRate *= 1.2;
          break;
        case "damageUp":
          bulletDamage += 1;
          break;
        case "moveSpeedUp":
          player.speed *= 1.12;
          break;
        case "bulletSpeedUp":
          bulletSpeed *= 1.15;
          break;
        case "maxHpUp":
          player.maxHp += 1;
          player.hp = Math.min(player.maxHp, player.hp + 1);
          break;
        case "multiShot":
          multiShotLevel = Math.min(2, multiShotLevel + 1);
          break;
        case "chain":
          chainLevel += 1;
          break;
        case "pierce":
          pierceLevel += 1;
          break;
        case "explosion":
          explosionLevel += 1;
          break;
        case "lifesteal":
          lifestealLevel += 1;
          break;
        case "crit":
          critChance += 0.10;
          break;
        case "drone":
          droneLevel += 1;
          break;
      }
    }

    function maybeUpdateHighScore() {
      const candidate: HighScore = {
        bestScore: score,
        bestLevel: level,
        bestTimeSec: runTime,
      };
      const prev = args.highScore;

      const isBetter =
        candidate.bestScore > prev.bestScore ||
        (candidate.bestScore === prev.bestScore &&
          candidate.bestLevel > prev.bestLevel) ||
        (candidate.bestScore === prev.bestScore &&
          candidate.bestLevel === prev.bestLevel &&
          candidate.bestTimeSec > prev.bestTimeSec);

      if (isBetter) args.setHighScore(candidate);
    }

    function awardShardsOnce() {
      // Simple formula that "feels fair"
      // tweak whenever you want
      const earned =
        Math.floor(score / 10) + bossKills * 15 + Math.min(30, Math.floor(runTime / 10));

      args.addShards(earned);
    }

    // ✅ only stats go here (character base + meta upgrades)
    function applyMetaUpgrades() {
      const m = args.metaUpgrades;
      const ch = CHARACTERS[args.selectedCharacter];

      // base from character
      player.maxHp = ch.maxHp;
      player.hp = player.maxHp;

      bulletDamage = ch.damage;
      fireRate = ch.fireRate;
      player.speed = ch.speed;

      // apply meta progression on top
      player.maxHp = player.maxHp + m.hp;
      player.hp = player.maxHp;

      bulletDamage = bulletDamage + m.damage;

      fireRate = fireRate * Math.pow(1.08, m.fireRate);
      player.speed = player.speed * Math.pow(1.06, m.moveSpeed);

      multiShotLevel = m.multiShotStart > 0 ? 1 : 0;
    }

    function resetGame(w: number, h: number) {
      bullets.length = 0;
      enemies.length = 0;
      particles.length = 0;
      enemyBullets.length = 0;
      pickups.length = 0;
      hitStop = 0;
      playerFlash = 0;
      lifestealLevel = 0;
      lifestealKills = 0;
      droneHitTimer = 0;

      // boss reset
      bossShootTimer = 0;
      bossTimer = 0;
      bossAlive = false;  
      args.onBossMusic?.(false);  // ✅ back to gameplay music

      // warning banner reset
      showBossWarning = false;
      bossWarningTimer = 0;

      // reset player position + invuln
      player.x = w / 2;
      player.y = h / 2;
      player.invuln = 0;

      // reset base combat stats (defaults)
      fireRate = 10;
      bulletSpeed = 650;
      bulletDamage = 1;
      shootCooldown = 0;
      multiShotLevel = 0;

      // reset base movement stats
      player.speed = 260;

      // ✅ reset ability runtime for the current character
      ability = createAbilityRuntime(CHARACTERS[args.selectedCharacter]);
      wasSpaceDown = false;

      // ✅ apply character base stats + meta progression
      applyMetaUpgrades();

      // reset feel
      score = 0;
      shake = 0;

      // reset spawns
      spawnTimer = 0;
      spawnEvery = 0.9;
      difficultyTimer = 0;
      shooterFireTimer = 0;

      // reset leveling
      level = 1;
      xp = 0;
      xpToNext = 5;
      isLevelUp = false;
      choices = [];

      // reset run summary data
      runTime = 0;
      kills = 0;
      bossKills = 0;
      upgradesPicked = [];
      summarySaved = false;

      args.setRunSummary(null);
      args.setCopied(false);
    }

    let last = performance.now();

    function loop(now: number) {
      const rawDt = Math.min(0.033, (now - last) / 1000);
      last = now;

      // timers always tick using real time
      hitStop = Math.max(0, hitStop - rawDt);
      playerFlash = Math.max(0, playerFlash - rawDt);
      levelUpFlash = Math.max(0, levelUpFlash - rawDt);
      zoomKick = Math.max(0, zoomKick - rawDt * 4.5); // fades fast

      // dt used for gameplay updates (freeze updates during hitstop)
      const dt = hitStop > 0 ? 0 : rawDt;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      // audio settings can change from UI
      audio.setVolume(args.sfxVolume);
      audio.setMuted(args.sfxMuted);

      // start requested from UI
      if (startRequestedRef.current) {
        resetGame(w, h);
        startRequestedRef.current = false;
      }

      const currentPhase = args.phaseRef.current;

      // ESC toggles pause (pressed once)
      const escDown = input.keys.has("Escape");
      const escJustPressed = escDown && !wasEscDown;
      wasEscDown = escDown;

      if (escJustPressed) {
        if (currentPhase === "playing" && !isLevelUp) args.setPhase("paused");
        else if (currentPhase === "paused") args.setPhase("playing");
      }

      // R restarts (pressed once) from non-menu phases
      const rDown = input.keys.has("r");
      const rJustPressed = rDown && !wasRDown;
      wasRDown = rDown;

      if (rJustPressed && currentPhase !== "menu") {
        startRequestedRef.current = true;
        args.setPhase("playing");
      }

      // level-up selection
      if (isLevelUp && currentPhase === "playing") {
        const k = input.keys;
        const pick = k.has("1") ? 0 : k.has("2") ? 1 : k.has("3") ? 2 : -1;
        if (pick !== -1) {
          applyUpgrade(choices[pick]);
          isLevelUp = false;
          choices = [];
        }
      }

      // ----- UPDATE (only in playing and not levelup) -----
      if (currentPhase === "playing" && !isLevelUp) {
        runTime += dt;

        // ability cooldowns tick down
        ability.dashCd = Math.max(0, ability.dashCd - dt);

        if (ability.guardReady === false) {
          ability.guardCd = Math.max(0, ability.guardCd - dt);
          if (ability.guardCd === 0) ability.guardReady = true;
        }

        // dash active timer
        ability.dashTime = Math.max(0, ability.dashTime - dt);

        // SPACE dash (scout)
        const spaceDown = input.keys.has(" ");
        const spaceJustPressed = spaceDown && !wasSpaceDown;
        wasSpaceDown = spaceDown;

        const chDef = CHARACTERS[args.selectedCharacter];
        if (
          chDef.ability.kind === "dash" &&
          spaceJustPressed &&
          ability.dashCd === 0
        ) {
          const a = chDef.ability;

          const dx = input.mouse.x - player.x;
          const dy = input.mouse.y - player.y;
          const len = Math.hypot(dx, dy) || 1;

          ability.dashVX = (dx / len) * a.dashSpeed;
          ability.dashVY = (dy / len) * a.dashSpeed;
          ability.dashTime = a.dashDurationSec;
          ability.dashCd = a.cooldownSec;
        }

        player.invuln = Math.max(0, player.invuln - dt);

        // boss warning timer counts down
        if (showBossWarning) {
          bossWarningTimer -= dt;
          if (bossWarningTimer <= 0) {
            bossWarningTimer = 0;
            showBossWarning = false;
          }
        }

        for (let i = dmgTexts.length - 1; i >= 0; i--) {
          const t = dmgTexts[i];
          t.life -= dt;
          t.y += t.vy * dt;
          t.vy += 80 * dt; // gravity-ish slowdown
          if (t.life <= 0) dmgTexts.splice(i, 1);
        }

        updatePlayer(player, input, dt, { w, h });

        droneAngle += dt * 2.8;

        droneHitTimer = Math.max(0, droneHitTimer - dt);

        if (droneLevel > 0) {
          const droneX = player.x + Math.cos(droneAngle) * 48;
          const droneY = player.y + Math.sin(droneAngle) * 48;
          const droneR = 9;

          if (droneHitTimer === 0) {
            for (const e of enemies) {
              const dx = droneX - e.x;
              const dy = droneY - e.y;
              const hit = dx * dx + dy * dy <= (droneR + e.r) * (droneR + e.r);

              if (hit) {
                e.hp -= droneLevel;
                (e as any).hitFlash = 0.08;
                spawnExplosion(particles, droneX, droneY, 4);

                droneHitTimer = 0.25;
                break;
              }
            }
          }
        }


        // If dashing, override movement for a short burst (stacks on top of normal movement)
        if (ability.dashTime > 0) {
          player.x += ability.dashVX * dt;
          player.y += ability.dashVY * dt;

          // clamp to bounds
          player.x = Math.max(player.r, Math.min(w - player.r, player.x));
          player.y = Math.max(player.r, Math.min(h - player.r, player.y));
        }

        // boss spawn
        bossTimer += dt;
        if (!bossAlive && bossTimer >= bossEvery) {
          bossTimer = 0;

          // show warning for 3 seconds
          showBossWarning = true;
          bossWarningTimer = 3;

          enemies.push(spawnBoss({ w, h }));
          bossAlive = true;
          bossShootTimer = 0;

          audio.play("boss_spawn");
          args.onBossMusic?.(true); // ✅ switch to boss music
        }

        // shooting
        shootCooldown = Math.max(0, shootCooldown - dt);
        if (input.mouse.down && shootCooldown === 0) {
          const baseAngle = Math.atan2(
            input.mouse.y - player.y,
            input.mouse.x - player.x
          );

          if (multiShotLevel === 0) {
            const b = spawnBullet({
              fromX: player.x,
              fromY: player.y,
              toX: input.mouse.x,
              toY: input.mouse.y,
              speed: bulletSpeed,
            });

            if (b) {
              (b as any).pierceLeft = pierceLevel;

              (b as any).critChance = critChance;
              (b as any).critMultiplier = critMultiplier;
              
              bullets.push(b);
            }
          } else {
            const spread = multiShotLevel === 1 ? 0.18 : 0.28;
            const angles =
              multiShotLevel === 1
                ? [baseAngle - spread, baseAngle, baseAngle + spread]
                : [
                    baseAngle - 2 * spread,
                    baseAngle - spread,
                    baseAngle,
                    baseAngle + spread,
                    baseAngle + 2 * spread,
                  ];

            for (const a of angles) {
              const b = spawnBulletByAngle({
                fromX: player.x,
                fromY: player.y,
                angleRad: a,
                speed: bulletSpeed,
              });

              if (!b) continue;

              (b as any).pierceLeft = pierceLevel;

              (b as any).critChance = critChance;
              (b as any).critMultiplier = critMultiplier;

              bullets.push(b);
            }
          }

          audio.playShoot({ cooldownMs: 35, volumeMul: 0.7 });
          shootCooldown = 1 / fireRate;
        }

        updateBullets(bullets, dt, { w, h });

        for (const b of bullets) {
          spawnTrail(particles, b.x, b.y);
        }

        // spawn enemies
        spawnTimer += dt;
        if (spawnTimer >= spawnEvery) {
          spawnTimer = 0;

          const r = Math.random();

          if (level >= 4 && r < 0.10) {
            enemies.push(spawnEliteEnemy({ w, h }));
          } else if (level >= 3 && r < 0.28) {
            enemies.push(spawnShooterEnemy({ w, h }));
          } else if(level >= 2 && r < 0.45) {
            enemies.push(spawnRunnerEnemy({ w, h }));
          } else {
            enemies.push(spawnEnemy({ w, h }));
          }
        }

        // difficulty ramp
        difficultyTimer += dt;
        if (difficultyTimer >= 6) {
          difficultyTimer = 0;
          spawnEvery = Math.max(0.25, spawnEvery * 0.92);
        }

        updateEnemies(enemies, player, dt);

        shooterFireTimer += dt;
        if (shooterFireTimer >= 1.4) {
          shooterFireTimer = 0;

          for (const e of enemies) {
            if (e.kind !== "shooter") continue;

            const b = spawnBullet({
              fromX: e.x,
              fromY: e.y,
              toX: player.x,
              toY: player.y,
              speed: 300,
            });

            if (b) {
              b.r = 5;
              b.life = 2.2;
              enemyBullets.push(b);
            }
          }
        }

        // boss shooting
        bossShootTimer += dt;

        const boss = enemies.find((e) => e.kind === "boss");
        const bossFireRate = boss && boss.hp <= BOSS_MAX_HP * 0.3 ? 0.65 : 1.2;

        if (boss && bossShootTimer >= bossFireRate) {
          bossShootTimer = 0;

          // normal aimed shot
          const b = spawnBullet({
            fromX: boss.x,
            fromY: boss.y,
            toX: player.x,
            toY: player.y,
            speed: 380,
          });

          if (b) {
            b.r = 7;
            b.life = 2.5;
            enemyBullets.push(b);
          }

          // radial burst below 70% HP
          if (boss.hp <= BOSS_MAX_HP * 0.7 && Math.random() < 0.45) {
            for (let i = 0; i < 12; i++) {
              const angle = (Math.PI * 2 * i) / 12;

              const rb = spawnBulletByAngle({
                fromX: boss.x,
                fromY: boss.y,
                angleRad: angle,
                speed: 240,
              });

              if (rb) {
                rb.r = 6;
                rb.life = 3;
                enemyBullets.push(rb);
              }
            }

            shake = Math.max(shake, 10);
          }
        }

        updateBullets(enemyBullets, dt, { w, h });

        for (const b of enemyBullets) {
          spawnTrail(particles, b.x, b.y);
        }

        // collisions
        handleBulletEnemyCollisions({
          bullets,
          enemies,
          bulletDamage,

          onHit: ({ x, y, dmg, kind, killed }) => {
            spawnExplosion(particles, x, y, 6);

            spawnDamageText(particles, x, y, dmg, {
              isBoss: kind === "boss",
              isKill: killed,
            });

            if (chainLevel > 0) {
              const maxChains = chainLevel; // 1 or more jumps

              let lastX = x;
              let lastY = y;

              for (let i = 0; i < maxChains; i++) {
                let closest: Enemy | null = null;
                let bestDist = 120 * 120;

                for (const other of enemies) {
                  const dx = other.x - lastX;
                  const dy = other.y - lastY;
                  const d2 = dx * dx + dy * dy;

                  if (d2 < bestDist) {
                    bestDist = d2;
                    closest = other;
                  }
                }

                if (!closest) break;

                // damage
                const dealt = Math.min(bulletDamage, closest.hp);
                closest.hp -= bulletDamage;

                spawnDamageText(particles, closest.x, closest.y, dealt, {
                  isBoss: closest.kind === "boss",
                });

                spawnExplosion(particles, closest.x, closest.y, 6);

                lastX = closest.x;
                lastY = closest.y;

                if (closest.hp <= 0) {
                  enemies.splice(enemies.indexOf(closest), 1);
                }
              }
            }

            if (explosionLevel > 0) {
              const radius = 60 + explosionLevel * 10; // scales a bit
              const r2 = radius * radius;

              for (let i = enemies.length - 1; i >= 0; i--) {
                const e = enemies[i];

                const dx = e.x - x;
                const dy = e.y - y;
                const d2 = dx * dx + dy * dy;

                if (d2 > r2) continue;

                // deal damage (slightly reduced vs direct hit)
                const aoeDmg = Math.max(1, Math.floor(bulletDamage * 0.75));
                const dealt = Math.min(aoeDmg, e.hp);
                e.hp -= aoeDmg;

                // visuals
                spawnDamageText(particles, e.x, e.y, dealt, {
                  isBoss: e.kind === "boss",
                });
                spawnExplosion(particles, e.x, e.y, 6);

                if (e.hp <= 0) {
                  enemies.splice(i, 1);
                  // optional: you can also trigger your onKill effects here if you want full rewards
                }
              }

              // main explosion visual at impact point
              spawnExplosion(particles, x, y, 20);

              shake = Math.max(shake, 10);
              hitStop = Math.max(hitStop, 0.03);
            }
          },

          onKill: ({ kind, x, y, elite }) => {
            if (kind !== "boss") {
              spawnExplosion(particles, x, y, 18);
              hitStop = 0.03; // normal enemy slow-motion
            }

            audio.playEnemyDie({
              cooldownMs: 25,
              volumeMul: kind === "boss" ? 1.1 : 0.9,
            });

            if (kind === "boss") {
              bossKills += 1;

              // WIN condition
              if (bossKills >= BOSSES_TO_WIN) {
                if (!summarySaved) {
                  summarySaved = true;
                  maybeUpdateHighScore();
                  args.setRunSummary({
                    timeSurvivedSec: runTime,
                    kills,
                    bossKills,
                    finalScore: score,
                    finalLevel: level,
                    upgrades: upgradesPicked.slice(),
                  });
                  awardShardsOnce();
                }

                args.setPhase("victory");
                return;
              }

              score += 20;
              xp += 10 * ability.xpMul;
              bossAlive = false;
              args.onBossMusic?.(false);
              shake = 35;
              hitStop = 0.18; // BIG cinematic boss freeze
              spawnExplosion(particles, x, y, 90);
              spawnXpPickup(pickups, x, y, 12);
            } else {
              kills += 1;

              if (lifestealLevel > 0) {
                lifestealKills += 1;

                const killsNeeded = Math.max(3, 8 - lifestealLevel);

                if (lifestealKills >= killsNeeded) {
                  lifestealKills = 0;

                  if (player.hp < player.maxHp) {
                    player.hp += 1;
                    spawnDamageText(particles, player.x, player.y - 18, 1, {
                      isKill: true,
                    });
                    audio.play("level_up", { cooldownMs: 300, volumeMul: 0.5 });
                  }
                }
              }
              
              if (kind === "runner") {
                score += 2;
                xp += 2 * ability.xpMul;
              } else if (kind === "shooter") {
                score += 3;
                xp += 3 * ability.xpMul;
              } else {
                score += elite ? 3 : 1;
                xp += (elite ? 3 : 1) * ability.xpMul;
              }

              spawnXpPickup(
                pickups,
                x,
                y,
                elite ? 3 : kind === "runner" ? 2 : 1
              );

              if(elite) {
                shake = 18;
                hitStop = 0.06;
                spawnExplosion(particles, x, y, 30);
              }
            }

            if (xp >= xpToNext) {
              level += 1;
              xp = 0;
              xpToNext = Math.ceil(xpToNext * 1.35);
              isLevelUp = true;
              choices = pick3RandomUpgrades();
              shake = 18;
              hitStop = 0.06;
              levelUpFlash = 0.20;
              zoomKick = 1;
              audio.play("level_up");
            }
          },
        });

        updateParticles(particles, dt);

        updatePickups(pickups, player, (p) => {
          xp += p.value;

          spawnDamageText(
            particles,
            player.x,
            player.y - 28,
            p.value
          );

          if (xp >= xpToNext) {
            level += 1;
            xp = 0;
            xpToNext = Math.ceil(xpToNext * 1.35);
            isLevelUp = true;
            choices = pick3RandomUpgrades();

            shake = 18;
            hitStop = 0.06;
            audio.play("level_up");
          }
        });

        // player damage from touching enemies
        if (playerIsHit(player, enemies) && player.invuln === 0) {
          player.hp -= 1;
          player.invuln = 1;
          shake = 12;

          hitStop = 0.05;      // 50ms freeze
          playerFlash = 0.18;  // 180ms flash

          audio.play("player_hit", { cooldownMs: 120 });

          if (player.hp <= 0) {
            if (!summarySaved) {
              summarySaved = true;
              audio.play("game_over", { cooldownMs: 250 });
              maybeUpdateHighScore();
              args.setRunSummary({
                timeSurvivedSec: runTime,
                kills,
                bossKills,
                finalScore: score,
                finalLevel: level,
                upgrades: upgradesPicked.slice(),
              });
              awardShardsOnce();
            }
            args.onBossMusic?.(false);
            args.setPhase("gameover");
          }
        }

        // player damage from enemy bullets
        if (player.invuln === 0) {
          for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const b = enemyBullets[i];
            const dx = b.x - player.x;
            const dy = b.y - player.y;
            const hit = dx * dx + dy * dy <= (b.r + player.r) * (b.r + player.r);

            if (hit) {
              enemyBullets.splice(i, 1);
              player.hp -= 1;
              player.invuln = 1;
              shake = 12;

              hitStop = 0.05;      // 50ms freeze
              playerFlash = 0.18;  // 180ms flash

              audio.play("player_hit", { cooldownMs: 120 });

              if (player.hp <= 0) {
                if (!summarySaved) {
                  summarySaved = true;
                  audio.play("game_over", { cooldownMs: 250 });
                  maybeUpdateHighScore();
                  args.setRunSummary({
                    timeSurvivedSec: runTime,
                    kills,
                    bossKills,
                    finalScore: score,
                    finalLevel: level,
                    upgrades: upgradesPicked.slice(),
                  });
                  awardShardsOnce();
                }
                args.onBossMusic?.(false);
                args.setPhase("gameover");
              }
              break;
            }
          }
        }

        shake = Math.max(0, shake - 40 * dt);
      }

      // ----- DRAW -----
      c.clearRect(0, 0, w, h);
      c.fillStyle = "black";
      c.fillRect(0, 0, w, h);

      c.save();

      const idleDrift = Math.sin(runTime * 0.6) * 0.5;
      c.translate(idleDrift, idleDrift);

      // ✅ level-up zoom pulse
      if (zoomKick > 0) {
        const z = 1 + 0.06 * zoomKick; // max 6% zoom
        c.translate(w / 2, h / 2);
        c.scale(z, z);
        c.translate(-w / 2, -h / 2);
      }


      if (shake > 0) {
        const dx = (Math.random() * 2 - 1) * shake;
        const dy = (Math.random() * 2 - 1) * shake;
        c.translate(dx, dy);
      }

      if (currentPhase !== "menu") {
        c.beginPath();
        c.moveTo(player.x, player.y);
        c.lineTo(input.mouse.x, input.mouse.y);
        c.strokeStyle = "rgba(255,255,255,0.35)";
        c.lineWidth = 2;
        c.stroke();
      }

      // player bullets
      c.fillStyle = "white";
      for (const b of bullets) {
        c.beginPath();
        c.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        c.fill();
      }

      // enemy bullets
      c.fillStyle = "rgba(190,80,255,1)";
      for (const b of enemyBullets) {
        c.beginPath();
        c.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        c.fill();
      }

      drawEnemies(c, enemies);
      drawParticles(c, particles);
      drawPickups(c, pickups);
      drawPlayer(c, player);

      if (droneLevel > 0) {
        const droneX = player.x + Math.cos(droneAngle) * 48;
        const droneY = player.y + Math.sin(droneAngle) * 48;

        c.save();
        c.fillStyle = "rgba(120,180,255,1)";
        c.beginPath();
        c.arc(droneX, droneY, 9, 0, Math.PI * 2);
        c.fill();

        c.globalAlpha = 0.35;
        c.beginPath();
        c.arc(droneX, droneY, 15, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }

      // ✅ damage numbers
      c.save();
      c.textAlign = "center";
      c.textBaseline = "middle";

      for (const t of dmgTexts) {
        const a = Math.max(0, Math.min(1, t.life / t.maxLife)); // fade out

        c.globalAlpha = 0.95 * a;

        const size = t.isBoss ? 22 : 14;
        c.font = `bold ${size}px system-ui`;

        // outline for readability
        c.lineWidth = 4;
        c.strokeStyle = "rgba(0,0,0,0.8)";
        c.strokeText(String(t.value), t.x, t.y);

        // fill
        c.fillStyle = t.isKill ? "rgba(255,255,255,1)" : "rgba(255,220,120,1)";
        c.fillText(String(t.value), t.x, t.y);
      }

      c.restore();

      // ✅ player flash overlay (juice)
      if (playerFlash > 0) {
        const a = Math.min(1, playerFlash / 0.18); // fade out
        c.save();
        c.globalAlpha = 0.35 * a;
        c.fillStyle = "white";
        c.beginPath();
        c.arc(player.x, player.y, player.r + 4, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }

      c.restore();

      if (levelUpFlash > 0) {
        const a = Math.min(1, levelUpFlash / 0.20);
        c.save();
        c.globalAlpha = 0.35 * a;
        c.fillStyle = "white";
        c.fillRect(0, 0, w, h);
        c.restore();
      }

      // HUD
      if (currentPhase !== "menu") {
        c.fillStyle = "rgba(255,255,255,0.9)";
        c.font = "14px system-ui";
        c.fillText("WASD • Hold click • ESC pause • R restart", 12, 22);
        c.fillText(`HP: ${player.hp}/${player.maxHp}`, 12, 42);
        c.fillText(`Score: ${score}`, 12, 62);
        c.fillText(`Level: ${level}`, 12, 82);
        c.fillText(`XP: ${xp}/${xpToNext}`, 12, 102);
        c.fillText(`Multi-shot: ${multiShotLevel}`, 12, 122);
      }

      // Boss HP bar
      const bossForBar = enemies.find((e) => e.kind === "boss");
      if (bossForBar) {
        const barW = Math.min(520, w - 40);
        const barH = 16;
        const x = (w - barW) / 2;
        const y = 14;

        const hp = Math.max(0, bossForBar.hp);
        const pct = Math.max(0, Math.min(1, hp / BOSS_MAX_HP));

        c.save();
        c.font = "14px system-ui";
        c.fillStyle = "rgba(255,255,255,0.9)";
        c.textAlign = "center";
        c.fillText(`BOSS • ${hp}/${BOSS_MAX_HP}`, w / 2, y + 34);

        c.fillStyle = "rgba(255,255,255,0.15)";
        c.fillRect(x, y, barW, barH);

        c.fillStyle = "rgba(255,80,80,0.95)";
        c.fillRect(x, y, barW * pct, barH);

        c.strokeStyle = "rgba(255,255,255,0.35)";
        c.lineWidth = 2;
        c.strokeRect(x, y, barW, barH);

        c.restore();
      }

      // Boss warning banner (fade in/out nicely)
      if (showBossWarning) {
        const tShown = 3 - bossWarningTimer; // time since shown
        const fadeIn = 0.25;
        const fadeOut = 0.5;

        let alpha = 1;
        if (tShown < fadeIn) alpha = tShown / fadeIn;
        else if (bossWarningTimer < fadeOut) alpha = bossWarningTimer / fadeOut;

        alpha = Math.max(0, Math.min(1, alpha));

        c.save();
        c.globalAlpha = alpha;

        c.fillStyle = "rgba(180, 30, 30, 0.9)";
        c.fillRect(0, h / 2 - 40, w, 80);

        c.fillStyle = "white";
        c.font = "bold 32px system-ui";
        c.textAlign = "center";
        c.fillText("⚠ BOSS INCOMING ⚠", w / 2, h / 2 + 10);

        c.restore();
      }

      // Level up overlay
      if (isLevelUp && currentPhase === "playing") {
        c.fillStyle = "rgba(0,0,0,0.75)";
        c.fillRect(0, 0, w, h);

        c.fillStyle = "white";
        c.textAlign = "center";
        c.font = "28px system-ui";
        c.fillText("LEVEL UP!", w / 2, 90);

        c.font = "16px system-ui";
        c.fillText("Press 1, 2, or 3 to choose:", w / 2, 120);

        const startY = 170;
        for (let i = 0; i < choices.length; i++) {
          const u = choices[i];
          const y = startY + i * 90;

          const bg =
            u.rarity === "epic"
              ? "rgba(255,120,255,0.22)"
              : u.rarity === "rare"
              ? "rgba(120,180,255,0.22)"
              : "rgba(255,255,255,0.12)";

          c.fillStyle = bg;
          c.fillRect(w / 2 - 260, y - 30, 520, 70);

          c.fillStyle =
            u.rarity === "epic"
              ? "rgb(255,120,255)"
              : u.rarity === "rare"
              ? "rgb(120,180,255)"
              : "white";
          c.font = "18px system-ui";
          c.fillText(`${i + 1}) ${u.title}`, w / 2, y);

          c.fillStyle = "rgba(255,255,255,0.85)";
          c.font = "14px system-ui";
          c.fillText(u.description, w / 2, y + 24);
        }

        c.textAlign = "start";
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      detach();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // IMPORTANT: args is an object; if you find re-runs, pass stable callbacks from App.
  }, [args]);

  return { 
    requestStart,
  };
}