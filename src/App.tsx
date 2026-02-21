import { useEffect, useRef, useState } from "react";
import { StartMenu } from "./ui/StartMenu";
import { PauseMenu } from "./ui/PauseMenu";
import { GameOverMenu } from "./ui/GameOverMenu";
import { VictoryMenu } from "./ui/VictoryMenu";
import { useGameEngine } from "./game/useGameEngine";
import type { Phase, RunSummary } from "./types";


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


  const [highScore, setHighScore] = useState(() => {
    const raw = localStorage.getItem("highScore");
    if (!raw) return { bestScore: 0, bestLevel: 0, bestTimeSec: 0 };

    try {
      const parsed = JSON.parse(raw) as { bestScore?: number; bestLevel?: number; bestTimeSec?: number };
      return {
        bestScore: parsed.bestScore ?? 0,
        bestLevel: parsed.bestLevel ?? 0,
        bestTimeSec: parsed.bestTimeSec ?? 0,
      };
    } catch {
      return { bestScore: 0, bestLevel: 0, bestTimeSec: 0 };
    }
  });

  useEffect(() => {
    localStorage.setItem("highScore", JSON.stringify(highScore));
  }, [highScore]);

  useEffect(() => {
    localStorage.setItem("sfxVolume", String(sfxVolume));
  }, [sfxVolume]);

  useEffect(() => {
    localStorage.setItem("sfxMuted", sfxMuted ? "1" : "0");
  }, [sfxMuted]);

  // Keep a ref of phase for the engine loop
  const phaseRef = useRef<Phase>(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const { requestStart } = useGameEngine({
    canvasRef,
    phaseRef,
    setPhase,
    setRunSummary,
    setCopied,
    sfxVolume,
    sfxMuted,
    highScore,
    setHighScore,
  });

  const runCode = runSummary ? buildRunCode(runSummary) : "";

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
          width: 900,
          height: 550,
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
              setPhase("playing");
            }}
            sfxVolume={sfxVolume}
            setSfxVolume={setSfxVolume}
            sfxMuted={sfxMuted}
            setSfxMuted={setSfxMuted}
            highScore={highScore}
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
