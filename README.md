# Arena Survivor (React + TypeScript + Vite)

A fast, top-down 2D arena shooter built with **React + TypeScript** and rendered on an **HTML Canvas**.  
Survive escalating waves, level up with upgrades, and defeat the boss.

## Live Demo
- (Add your Vercel link here after deploy)

## Controls
- **WASD** — Move  
- **Left Click (hold)** — Shoot  
- **ESC** — Pause / Resume  
- **R** — Restart run (in-game)

## Features
- Real-time game loop with `requestAnimationFrame`
- Player movement + shooting with **multi-shot upgrade**
- Enemy spawning + difficulty scaling over time
- **Boss enemy** with ranged attacks (boss projectiles)
- XP + Leveling system with **3 upgrade choices**
- Particle explosions + screen shake (game feel polish)
- Start menu, pause menu, game over menu (React overlays)
- Run summary (time survived, kills, boss kills, final level/score)
- **Shareable run code** + copy-to-clipboard

## Tech Stack
- **React** (UI + menus)
- **TypeScript** (typed game state and systems)
- **Vite** (dev + build)
- **Canvas 2D** (rendering)

## Architecture (Frontend Engineering Focus)
This project separates responsibilities cleanly:

- **UI Layer (React components)**  
  Menus and overlays live in `src/ui/*` and receive typed props.

- **Game Engine (custom hook)**  
  `src/game/useGameEngine.ts` owns the main loop, physics-ish updates, collision checks, and drawing.  
  React state only controls the *phase* (`menu | playing | paused | gameover`) and receives the final run summary.

- **Game Modules**
  - `src/game/player.ts` — player model + update/draw
  - `src/game/enemies.ts` — enemy/boss logic + collisions
  - `src/game/bullets.ts` — bullets update/spawn helpers
  - `src/game/particles.ts` — explosions/particles
  - `src/game/upgrades.ts` — upgrade definitions + random selection
  - `src/game/input.ts` — keyboard/mouse input handling

## Why I Built This
I wanted a project that demonstrates real frontend skills:
- state modeling and separation of concerns
- performant rendering (Canvas loop outside React re-renders)
- typed architecture (TypeScript everywhere)
- clean UI structure (components + props)
- deploying a complete product

## Future Improvements
- Boss HP bar + boss phases (50% HP behavior change)
- Sound effects + volume settings
- Mobile controls / responsive layout
- More enemy types + weapon upgrades
- Persist best runs (localStorage)

## Running Locally
```bash
npm install
npm run dev
