import { useEffect, useRef } from "react";
import { attachInputListeners, createInput } from "./game/input";
import { createPlayer, drawPlayer, updatePlayer } from "./game/player";
import { drawBullets, spawnBullet, updateBullets, type Bullet } from "./game/bullets";
import {
  drawEnemies,
  handleBulletEnemyCollisions,
  playerIsHit,
  spawnEnemy,
  updateEnemies,
  type Enemy,
} from "./game/enemies";

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

    // shooting
    let shootCooldown = 0;
    const fireRate = 10;
    const bulletSpeed = 650;

    // enemies / difficulty
    let spawnTimer = 0;
    let spawnEvery = 0.9; // seconds between spawns (will slowly get faster)
    let difficultyTimer = 0;

    // game state
    let score = 0;
    let gameOver = false;
    let wasRDown = false;

    let last = performance.now();

    function resetGame(w: number, h: number) {
      bullets.length = 0;
      enemies.length = 0;

      player.hp = player.maxHp;
      player.invuln = 0;
      player.x = w / 2;
      player.y = h / 2;

      score = 0;
      gameOver = false;
      spawnTimer = 0;
      spawnEvery = 0.9;
      difficultyTimer = 0;
      shootCooldown = 0;
    }

    function loop(now: number) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      // restart on R
      const isRDown = input.keys.has("r");
      const rJustPressed = isRDown && !wasRDown;

      if(rJustPressed){
        resetGame(w, h);
      }

      wasRDown = isRDown;

      if (!gameOver) {
        // update player
        updatePlayer(player, input, dt, { w, h });

        // shoot
        shootCooldown = Math.max(0, shootCooldown - dt);
        if (input.mouse.down && shootCooldown === 0) {
          const b = spawnBullet({
          fromX: player.x,
          fromY: player.y,
          toX: input.mouse.x,
          toY: input.mouse.y,
          speed: bulletSpeed,
          });
          if (b) bullets.push(b);
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

        // move enemies
        updateEnemies(enemies, player, dt);

        // collisions
        handleBulletEnemyCollisions({
          bullets,
          enemies,
          bulletDamage: 1,
          onKill: () => {
          score += 1;
          },
        });

        if (playerIsHit(player, enemies) && player.invuln === 0) {
          player.hp -= 1;
          player.invuln = 1; // 1 second invulnerability

          if (player.hp <= 0) {
            gameOver = true;
          }
        }

        player.invuln = Math.max(0, player.invuln - dt);
      }

      // draw
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
      ctx.fillText(`Score: ${score}`, 12, 42);
      ctx.fillText(`Enemies: ${enemies.length}`, 12, 62);
      ctx.fillText(`HP: ${player.hp}/${player.maxHp}`, 12, 82);

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