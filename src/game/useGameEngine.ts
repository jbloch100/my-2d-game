import { useEffect, useRef } from "react";
import { attachInputListeners, createInput } from "./input";
import { createPlayer, updatePlayer, drawPlayer } from "./player";
import { spawnBullet, spawnBulletByAngle, updateBullets, type Bullet } from "./bullets";
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
import { drawParticles, spawnExplosion, updateParticles, type Particle } from "./particles";
import type { Phase } from "../types";
import type { RunSummary } from "../types";

export function useGameEngine(args: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  phaseRef: React.RefObject<Phase>;
  setPhase: (p: Phase) => void;
  setRunSummary: (s: RunSummary | null) => void;
  setCopied: (v: boolean) => void;
}) {
  const rafRef = useRef<number | null>(null);
  const startRequestedRef = useRef(false);

  function requestStart() {
    startRequestedRef.current = true;
  }

  useEffect(() => {
    const canvasEl = args.canvasRef.current;
    if (!canvasEl) return;

    const canvas = canvasEl; // ✅ non-null alias for closures

    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    const c = ctx;


    const dpr = window.devicePixelRatio || 1;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    const input = createInput();
    const detach = attachInputListeners(canvas, input);

    // ---- put your entire engine state here (same as App.tsx) ----
    const player = createPlayer();
    const bullets: Bullet[] = [];
    const enemies: Enemy[] = [];
    const particles: Particle[] = [];
    const enemyBullets: Bullet[] = [];

    let fireRate = 10, bulletSpeed = 650, bulletDamage = 1, shootCooldown = 0, multiShotLevel = 0;
    let spawnTimer = 0, spawnEvery = 0.9, difficultyTimer = 0;
    let bossTimer = 0, bossAlive = false, bossShootTimer = 0;
    const bossEvery = 30;

    let score = 0, shake = 0;

    let runTime = 0, kills = 0, bossKills = 0;
    let upgradesPicked: string[] = [];
    let summarySaved = false;

    let wasRDown = false;
    let wasEscDown = false;

    let level = 1, xp = 0, xpToNext = 5;
    let isLevelUp = false;
    let choices: Upgrade[] = [];

    function applyUpgrade(u: Upgrade) {
      upgradesPicked.push(u.title);
      switch (u.id) {
        case "fireRateUp": fireRate *= 1.2; break;
        case "damageUp": bulletDamage += 1; break;
        case "moveSpeedUp": player.speed *= 1.12; break;
        case "bulletSpeedUp": bulletSpeed *= 1.15; break;
        case "maxHpUp":
          player.maxHp += 1;
          player.hp = Math.min(player.maxHp, player.hp + 1);
          break;
        case "multiShot":
          multiShotLevel = Math.min(2, multiShotLevel + 1);
          break;
      }
    }

    function resetGame(w: number, h: number) {
      bullets.length = 0;
      enemies.length = 0;
      particles.length = 0;
      enemyBullets.length = 0;

      bossShootTimer = 0;
      multiShotLevel = 0;
      bossTimer = 0;
      bossAlive = false;

      player.x = w / 2;
      player.y = h / 2;
      player.hp = player.maxHp;
      player.invuln = 0;
      player.speed = 260;

      fireRate = 10;
      bulletSpeed = 650;
      bulletDamage = 1;
      shootCooldown = 0;

      score = 0;
      shake = 0;

      spawnTimer = 0;
      spawnEvery = 0.9;
      difficultyTimer = 0;

      level = 1;
      xp = 0;
      xpToNext = 5;
      isLevelUp = false;
      choices = [];

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

      if (startRequestedRef.current) {
        resetGame(w, h);
        startRequestedRef.current = false;
      }

      const currentPhase = args.phaseRef.current;

      // ESC toggle pause
      const escDown = input.keys.has("Escape");
      const escJustPressed = escDown && !wasEscDown;
      wasEscDown = escDown;

      if (escJustPressed) {
        if (currentPhase === "playing" && !isLevelUp) args.setPhase("paused");
        else if (currentPhase === "paused") args.setPhase("playing");
      }

      // R restart (in-game)
      const rDown = input.keys.has("r");
      const rJustPressed = rDown && !wasRDown;
      wasRDown = rDown;

      if (rJustPressed && currentPhase !== "menu") {
        startRequestedRef.current = true;
        args.setPhase("playing");
      }

      // level-up pick
      if (isLevelUp && currentPhase === "playing") {
        const k = input.keys;
        const pick = k.has("1") ? 0 : k.has("2") ? 1 : k.has("3") ? 2 : -1;
        if (pick !== -1) {
          applyUpgrade(choices[pick]);
          isLevelUp = false;
          choices = [];
        }
      }

      // UPDATE
      if (currentPhase === "playing" && !isLevelUp) {
        runTime += dt;
        player.invuln = Math.max(0, player.invuln - dt);

        updatePlayer(player, input, dt, { w, h });

        bossTimer += dt;
        if (!bossAlive && bossTimer >= bossEvery) {
          bossTimer = 0;
          enemies.push(spawnBoss({ w, h }));
          bossAlive = true;
          bossShootTimer = 0;
        }

        shootCooldown = Math.max(0, shootCooldown - dt);
        if (input.mouse.down && shootCooldown === 0) {
          const baseAngle = Math.atan2(input.mouse.y - player.y, input.mouse.x - player.x);

          if (multiShotLevel === 0) {
            const b = spawnBullet({ fromX: player.x, fromY: player.y, toX: input.mouse.x, toY: input.mouse.y, speed: bulletSpeed });
            if (b) bullets.push(b);
          } else {
            const spread = multiShotLevel === 1 ? 0.18 : 0.28;
            const angles = multiShotLevel === 1
              ? [baseAngle - spread, baseAngle, baseAngle + spread]
              : [baseAngle - 2 * spread, baseAngle - spread, baseAngle, baseAngle + spread, baseAngle + 2 * spread];

            for (const a of angles) bullets.push(spawnBulletByAngle({ fromX: player.x, fromY: player.y, angleRad: a, speed: bulletSpeed }));
          }

          shootCooldown = 1 / fireRate;
        }

        updateBullets(bullets, dt, { w, h });

        spawnTimer += dt;
        if (spawnTimer >= spawnEvery) {
          spawnTimer = 0;
          enemies.push(spawnEnemy({ w, h }));
        }

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
          const b = spawnBullet({ fromX: boss.x, fromY: boss.y, toX: player.x, toY: player.y, speed: 380 });
          if (b) { b.r = 7; b.life = 2.5; enemyBullets.push(b); }
        }

        updateBullets(enemyBullets, dt, { w, h });

        handleBulletEnemyCollisions({
          bullets,
          enemies,
          bulletDamage,
          onKill: ({ kind, x, y }) => {
            spawnExplosion(particles, x, y, kind === "boss" ? 45 : 18);

            if (kind === "boss") {
              bossKills += 1;
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
            }
          },
        });

        updateParticles(particles, dt);

        // damage from touching enemies
        if (playerIsHit(player, enemies) && player.invuln === 0) {
          player.hp -= 1;
          player.invuln = 1;
          shake = 12;

          if (player.hp <= 0) {
            if (!summarySaved) {
              summarySaved = true;
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

        // damage from enemy bullets
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

              if (player.hp <= 0) {
                if (!summarySaved) {
                  summarySaved = true;
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

      // DRAW (keep it like you have it, just inside the hook)
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

      // HUD (same as you had)
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

      // Level up overlay (unchanged)
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
  }, [args]);

  return { requestStart };
}
