// src/game/useGameEngine.ts
import { useEffect, useRef } from "react";
import { attachInputListeners, createInput } from "./input";
import { createPlayer, updatePlayer, drawPlayer } from "./player";
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
  spawnBoss,
  updateEnemies,
  type Enemy,
} from "./enemies";
import { pick3RandomUpgrades, type Upgrade } from "./upgrades";
import {
  drawParticles,
  spawnExplosion,
  updateParticles,
  type Particle,
} from "./particles";
import type { Phase, RunSummary } from "../types";
import { createAudio } from "./audio";

type HighScore = { bestScore: number; bestLevel: number; bestTimeSec: number };

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
  setHighScore: (hs: HighScore) => void;
  highScore: HighScore;
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
    const audio = createAudio();
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

    // combat stats
    let fireRate = 10; // bullets/sec
    let bulletSpeed = 650;
    let bulletDamage = 1;
    let shootCooldown = 0;
    let multiShotLevel = 0; // 0=single, 1=3 bullets, 2=5 bullets

    // enemies/difficulty
    let spawnTimer = 0;
    let spawnEvery = 0.9;
    let difficultyTimer = 0;

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

    function resetGame(w: number, h: number) {
      bullets.length = 0;
      enemies.length = 0;
      particles.length = 0;
      enemyBullets.length = 0;

      // boss reset
      bossShootTimer = 0;
      bossTimer = 0;
      bossAlive = false;

      // ✅ reset warning banner too
      showBossWarning = false;
      bossWarningTimer = 0;

      // reset player
      player.x = w / 2;
      player.y = h / 2;
      player.hp = player.maxHp;
      player.invuln = 0;
      player.speed = 260;

      // reset stats
      fireRate = 10;
      bulletSpeed = 650;
      bulletDamage = 1;
      shootCooldown = 0;
      multiShotLevel = 0;

      // reset feel
      score = 0;
      shake = 0;

      // reset spawns
      spawnTimer = 0;
      spawnEvery = 0.9;
      difficultyTimer = 0;

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
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

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
        player.invuln = Math.max(0, player.invuln - dt);

        // boss warning timer counts down
        if (showBossWarning) {
          bossWarningTimer -= dt;
          if (bossWarningTimer <= 0) {
            bossWarningTimer = 0;
            showBossWarning = false;
          }
        }

        updatePlayer(player, input, dt, { w, h });

        // boss spawn
        bossTimer += dt;
        if (!bossAlive && bossTimer >= bossEvery) {
          bossTimer = 0;

          // show warning for 3 seconds
          showBossWarning = true;
          bossWarningTimer = 3;

          // optional: only keep if your audio supports it
          // audio.play("boss_warning", { cooldownMs: 500 });

          enemies.push(spawnBoss({ w, h }));
          bossAlive = true;
          bossShootTimer = 0;

          audio.play("boss_spawn");
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
            if (b) bullets.push(b);
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
              bullets.push(
                spawnBulletByAngle({
                  fromX: player.x,
                  fromY: player.y,
                  angleRad: a,
                  speed: bulletSpeed,
                })
              );
            }
          }

          audio.play("shoot", { cooldownMs: 35, volumeMul: 0.7 });
          shootCooldown = 1 / fireRate;
        }

        updateBullets(bullets, dt, { w, h });

        // spawn normal enemies
        spawnTimer += dt;
        if (spawnTimer >= spawnEvery) {
          spawnTimer = 0;
          enemies.push(spawnEnemy({ w, h }));
        }

        // difficulty ramp
        difficultyTimer += dt;
        if (difficultyTimer >= 6) {
          difficultyTimer = 0;
          spawnEvery = Math.max(0.25, spawnEvery * 0.92);
        }

        updateEnemies(enemies, player, dt);

        // boss shooting
        bossShootTimer += dt;
        const boss = enemies.find((e) => e.kind === "boss");
        if (boss && bossShootTimer >= 1.2) {
          bossShootTimer = 0;
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
        }

        updateBullets(enemyBullets, dt, { w, h });

        // collisions
        handleBulletEnemyCollisions({
          bullets,
          enemies,
          bulletDamage,
          onKill: ({ kind, x, y }) => {
            spawnExplosion(particles, x, y, kind === "boss" ? 45 : 18);
            audio.play("enemy_die", {
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
                }

                // optional: only if you have it
                // audio.play("victory");
                args.setPhase("victory");
                return;
              }

              score += 20;
              xp += 10;
              bossAlive = false;
            } else {
              kills += 1;
              score += 1;
              xp += 1;
            }

            if (xp >= xpToNext) {
              level += 1;
              xp = 0;
              xpToNext = Math.ceil(xpToNext * 1.35);
              isLevelUp = true;
              choices = pick3RandomUpgrades();
              audio.play("level_up");
            }
          },
        });

        updateParticles(particles, dt);

        // player damage from touching enemies
        if (playerIsHit(player, enemies) && player.invuln === 0) {
          player.hp -= 1;
          player.invuln = 1;
          shake = 12;
          audio.play("player_hit", { cooldownMs: 120 });

          if (player.hp <= 0) {
            if (!summarySaved) {
              summarySaved = true;
              audio.play("game_over");
              maybeUpdateHighScore();
              args.setRunSummary({
                timeSurvivedSec: runTime,
                kills,
                bossKills,
                finalScore: score,
                finalLevel: level,
                upgrades: upgradesPicked.slice(),
              });
            }
            args.setPhase("gameover");
          }
        }

        // player damage from enemy bullets
        if (player.invuln === 0) {
          for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const b = enemyBullets[i];
            const dx = b.x - player.x;
            const dy = b.y - player.y;
            const hit =
              dx * dx + dy * dy <= (b.r + player.r) * (b.r + player.r);

            if (hit) {
              enemyBullets.splice(i, 1);
              player.hp -= 1;
              player.invuln = 1;
              shake = 12;
              audio.play("player_hit", { cooldownMs: 120 });

              if (player.hp <= 0) {
                if (!summarySaved) {
                  summarySaved = true;
                  audio.play("game_over");
                  maybeUpdateHighScore();
                  args.setRunSummary({
                    timeSurvivedSec: runTime,
                    kills,
                    bossKills,
                    finalScore: score,
                    finalLevel: level,
                    upgrades: upgradesPicked.slice(),
                  });
                }
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
      drawPlayer(c, player);

      c.restore();

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

          c.fillStyle = "rgba(255,255,255,0.12)";
          c.fillRect(w / 2 - 260, y - 30, 520, 70);

          c.fillStyle = "white";
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

  return { requestStart };
}