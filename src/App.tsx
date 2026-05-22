import { useEffect, useRef, useState } from "react";
import { StartMenu } from "./ui/StartMenu";
import { PauseMenu } from "./ui/PauseMenu";
import { GameOverMenu } from "./ui/GameOverMenu";
import { VictoryMenu } from "./ui/VictoryMenu";
import { useGameEngine } from "./game/useGameEngine";
import type { Phase, RunSummary } from "./types";
import { useMeta } from "./meta/useMeta";
import { audio } from "./game/audio";
import { music } from "./game/music";

function summarizeUpgrades(upgrades: string[]) {
  if (upgrades.length === 0) return "No upgrades";

  const counts = new Map<string, number>();
  for (const u of upgrades) counts.set(u, (counts.get(u) ?? 0) + 1);

  const sorted = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );

  return sorted
    .map(([name, n]) => (n === 1 ? name : `${name} x${n}`))
    .join(", ");
}

function buildRunCode(s: RunSummary) {
  const time = `${s.timeSurvivedSec.toFixed(1)}s`;
  const up = summarizeUpgrades(s.upgrades);
  return `L${s.finalLevel}-K${s.kills}-B${s.bossKills}-S${s.finalScore}-T${time} | ${up}`;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const meta = useMeta();
  const bossMusicRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("menu");
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [copied, setCopied] = useState(false);

  const [sfxVolume, setSfxVolume] = useState(() => {
    const v = localStorage.getItem("sfxVolume");
    return v ? Number(v) : 0.6;
  });

  const [sfxMuted, setSfxMuted] = useState(() => {
    return localStorage.getItem("sfxMuted") === "1";
  });

  useEffect(() => {
    audio.preload();
  }, []);

  useEffect(() => {
    music.preload();
  }, []);

  useEffect(() => {
    localStorage.setItem("sfxVolume", String(sfxVolume));
  }, [sfxVolume]);

  useEffect(() => {
    localStorage.setItem("sfxMuted", sfxMuted ? "1" : "0");
  }, [sfxMuted]);

  useEffect(() => {
    audio.setVolume(sfxVolume);
  }, [sfxVolume]);

  useEffect(() => {
    audio.setMuted(sfxMuted);
  }, [sfxMuted]);

  useEffect(() => {
    music.setMuted(sfxMuted);
    music.setVolume(sfxVolume * 0.7);
  }, [sfxVolume, sfxMuted]);

 
  // Keep a ref of phase for the engine loop
  const phaseRef = useRef<Phase>(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (phase === "menu") {
      bossMusicRef.current = false;
      music.menu();
    } else if (phase === "playing" || phase === "paused") {
      if (bossMusicRef.current) music.boss();
      else music.gameplay();
    } else if (phase === "victory") {
      bossMusicRef.current = false;
      music.victory();
    } else if (phase === "gameover") {
      bossMusicRef.current = false;
      music.menu();
    }
  }, [phase]);

  const { requestStart } = useGameEngine({
    canvasRef,
    phaseRef,
    setPhase,
    setRunSummary,
    setCopied,
    sfxVolume,
    sfxMuted,

    // high score lives in meta save now
    highScore: meta.save.best,
    setHighScore: meta.setBest,

    // meta progression
    metaUpgrades: meta.save.upgrades,
    addShards: meta.addShards,

    selectedCharacter: meta.save.characters.selected,


    onBossMusic: (active) => {
      bossMusicRef.current = active;
      if (phaseRef.current !== "playing") return;
      if (active) music.boss();
      else music.gameplay();
    },
  });

  const runCode = runSummary ? buildRunCode(runSummary) : "";

  function handleResetSave() {
    meta.reset();
    setRunSummary(null);
    setCopied(false);
    setPhase("menu");
  }

  async function copyRunCode() {
    if (!runSummary) return;

    try {
      await navigator.clipboard.writeText(buildRunCode(runSummary));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      alert("Copy failed. You can manually select and copy the code.");
    }
  }

  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center" }}>
      <div
        style={{
          width: "min(96vw, 900px)",
          height: "min(70vh, 550px)",
          border: "1px solid #333",
          position: "relative",
        }}
      >
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />

        {phase === "menu" && (
          <StartMenu
            onPlay={() => {
              setCopied(false);
              requestStart();
              music.gameplay(); // start music ON click (safe)
                            
              setPhase("playing");
            }}
            sfxVolume={sfxVolume}
            setSfxVolume={setSfxVolume}
            sfxMuted={sfxMuted}
            setSfxMuted={setSfxMuted}
            highScore={meta.save.best}

            // shop props
            shards={meta.save.shards}
            metaUpgrades={meta.save.upgrades}
            canBuy={meta.canBuy}
            onBuy={meta.buy}
            onResetSave={handleResetSave}

            characters={meta.save.characters}
            onSelectCharacter={meta.selectCharacter}
            canUnlockCharacter={meta.canUnlockCharacter}
            onUnlockCharacter={meta.unlockCharacter}
          />
        )}

        {phase === "paused" && (
          <PauseMenu
            onResume={() => setPhase("playing")}
            onRestart={() => {
              setCopied(false);
              requestStart();
              setPhase("playing");
            }}
            onQuit={() => {
              setCopied(false);
              setPhase("menu");
            }}
            sfxVolume={sfxVolume}
            setSfxVolume={setSfxVolume}
            sfxMuted={sfxMuted}
            setSfxMuted={setSfxMuted}
          />
        )}

        {phase === "gameover" && (
          <GameOverMenu
            summary={runSummary}
            runCode={runCode}
            copied={copied}
            onCopy={copyRunCode}
            onRestart={() => {
              setCopied(false);
              requestStart();
              setPhase("playing");
            }}
            onMenu={() => {
              setCopied(false);
              setPhase("menu");
            }}
          />
        )}

        {phase === "victory" && (
          <VictoryMenu
            summary={runSummary}
            runCode={runCode}
            copied={copied}
            onCopy={copyRunCode}
            onRestart={() => {
              setCopied(false);
              requestStart();
              setPhase("playing");
            }}
            onMenu={() => {
              setCopied(false);
              setPhase("menu");
            }}
          />
        )}
      </div>
    </div>
  );
}