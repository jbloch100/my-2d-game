import { useEffect, useRef } from "react";
import { attachInputListeners, createInput } from "./game/input";
import { createPlayer, drawPlayer, updatePlayer } from "./game/player";
import { drawBullets, spawnBullet, spawnBulletByAngle, updateBullets, type Bullet } from "./game/bullets";
import {
  drawEnemies,
  handleBulletEnemyCollisions,
  playerIsHit,
  spawnEnemy,
  spawnBoss,
  updateEnemies,
  type Enemy,
} from "./game/enemies";
import { pick3RandomUpgrades, type Upgrade } from "./game/upgrades";

export default function App() {
const canvasRef = useRef<HTMLCanvasElement | null>(null);
const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    const input = createInput();
    const detach = attachInputListeners(canvas, input);

    const player = createPlayer();

    const bullets: Bullet[] = [];
    const enemies: Enemy[] = [];

    // --- combat stats (upgrades modify these) ---
    let fireRate = 10; // bullets/sec
    let bulletSpeed = 650;
    let bulletDamage = 1;
    let shootCooldown = 0;
    let multiShotLevel = 0; // 0=single, 1=3 bullets, 2=5 bullets

    // --- enemies/difficulty ---
    let spawnTimer = 0;
    let spawnEvery = 0.9;
    let difficultyTimer = 0;

    let bossTimer = 0;
    const bossEvery = 30; // seconds
    let bossAlive = false;

    // --- game state ---
    let score = 0;
    let gameOver = false;

    // --- restart edge trigger (pressed once) ---
    let wasRDown = false;

    // --- XP / level up system ---
    let level = 1;
    let xp = 0;
    let xpToNext = 5;

    let isLevelUp = false;
    let choices: Upgrade[] = [];

    function applyUpgrade(u: Upgrade) {
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

    function resetGame(w: number, h: number) {
      bullets.length = 0;
      enemies.length = 0;
      multiShotLevel = 0;
      bossTimer = 0;
      bossAlive = false;

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

      // reset game
      score = 0;
      gameOver = false;

      spawnTimer = 0;
      spawnEvery = 0.9;
      difficultyTimer = 0;

      // reset XP/level
      level = 1;
      xp = 0;
      xpToNext = 5;
      isLevelUp = false;
      choices = [];
    }

    let last = performance.now();

    function loop(now: number) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      // --- restart on R (pressed once) ---
      const isRDown = input.keys.has("r");
      const rJustPressed = isRDown && !wasRDown;
      if (rJustPressed) resetGame(w, h);
      wasRDown = isRDown;

      // --- if leveling up, let player choose 1/2/3 ---
      if (isLevelUp) {
        const k = input.keys;
        const pick = k.has("1") ? 0 : k.has("2") ? 1 : k.has("3") ? 2 : -1;

        if (pick !== -1) {
          applyUpgrade(choices[pick]);
          isLevelUp = false;
          choices = [];
        }
      }

      // --- update only if NOT game over and NOT in level up menu ---
      if (!gameOver && !isLevelUp) {
        // player invuln countdown
        player.invuln = Math.max(0, player.invuln - dt);

        // movement
        updatePlayer(player, input, dt, { w, h });

        bossTimer += dt;
        if (!bossAlive && bossTimer >= bossEvery) {
          bossTimer = 0;
          enemies.push(spawnBoss({ w, h }));
          bossAlive = true;
        }

        // shooting
        shootCooldown = Math.max(0, shootCooldown - dt);

        if (input.mouse.down && shootCooldown === 0) {
          const baseAngle = Math.atan2(input.mouse.y - player.y, input.mouse.x - player.x);

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
            // spread in radians
            const spread = multiShotLevel === 1 ? 0.18 : 0.28; // ~10° or ~16°
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

          shootCooldown = 1 / fireRate;
        }

        updateBullets(bullets, dt, { w, h });

        // spawn enemies
        spawnTimer += dt;
        if (spawnTimer >= spawnEvery) {
          spawnTimer = 0;
          enemies.push(spawnEnemy({ w, h }));
        }

        // difficulty ramps over time
        difficultyTimer += dt;
        if (difficultyTimer >= 6) {
          difficultyTimer = 0;
          spawnEvery = Math.max(0.25, spawnEvery * 0.92);
        }

        // enemy movement
        updateEnemies(enemies, player, dt);

        // bullet-enemy collisions
        handleBulletEnemyCollisions({
          bullets,
          enemies,
          bulletDamage,
          onKill: (kind) => {
            if(kind === "boss"){
              score += 2;
              xp += 10;
              bossAlive = false;
            } else {
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

        // player damage
        if (playerIsHit(player, enemies) && player.invuln === 0) {
          player.hp -= 1;
          player.invuln = 1;

          if (player.hp <= 0) gameOver = true;
        }
      }

      // --- draw ---
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, w, h);

      // aim line
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(input.mouse.x, input.mouse.y);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();

      drawBullets(ctx, bullets);
      drawEnemies(ctx, enemies);
      drawPlayer(ctx, player);

      // HUD
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "14px system-ui";
      ctx.fillText("WASD move • Hold click shoot • R restart", 12, 22);
      ctx.fillText(`HP: ${player.hp}/${player.maxHp}`, 12, 42);
      ctx.fillText(`Score: ${score}`, 12, 62);
      ctx.fillText(`Level: ${level}`, 12, 82);
      ctx.fillText(`XP: ${xp}/${xpToNext}`, 12, 102);
      ctx.fillText(`Multi-shot: ${multiShotLevel}`, 12, 122);

      if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = "white";
        ctx.font = "40px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", w / 2, h / 2 - 10);

        ctx.font = "18px system-ui";
        ctx.fillText(`Score: ${score}`, w / 2, h / 2 + 24);
        ctx.fillText("Press R to restart", w / 2, h / 2 + 52);
        ctx.textAlign = "start";
      }

      if (isLevelUp) {
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "28px system-ui";
        ctx.fillText("LEVEL UP!", w / 2, 90);

        ctx.font = "16px system-ui";
        ctx.fillText("Press 1, 2, or 3 to choose:", w / 2, 120);

        const startY = 170;
        for (let i = 0; i < choices.length; i++) {
          const u = choices[i];
          const y = startY + i * 90;

          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.fillRect(w / 2 - 260, y - 30, 520, 70);

          ctx.fillStyle = "white";
          ctx.font = "18px system-ui";
          ctx.fillText(`${i + 1}) ${u.title}`, w / 2, y);

          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.font = "14px system-ui";
          ctx.fillText(u.description, w / 2, y + 24);
        }

        ctx.textAlign = "start";
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      detach();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: 900, height: 550, border: "1px solid #333" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}