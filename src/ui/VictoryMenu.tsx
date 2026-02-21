import React from "react";
import type { RunSummary } from "../types";

export function VictoryMenu({
  summary,
  runCode,
  copied,
  onCopy,
  onRestart,
  onMenu,
}: {
  summary: RunSummary | null;
  runCode: string;
  copied: boolean;
  onCopy: () => void;
  onRestart: () => void;
  onMenu: () => void;
}) {
  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <div style={{ fontSize: 26, fontWeight: 700 }}>You Win 🎉</div>

        {summary && (
          <div style={{ marginTop: 12, fontSize: 14, opacity: 0.95, lineHeight: 1.55 }}>
            <div>
              <b>Time:</b> {summary.timeSurvivedSec.toFixed(1)}s
            </div>
            <div>
              <b>Score:</b> {summary.finalScore}
            </div>
            <div>
              <b>Final level:</b> {summary.finalLevel}
            </div>
            <div>
              <b>Kills:</b> {summary.kills}
            </div>
            <div>
              <b>Boss kills:</b> {summary.bossKills}
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Shareable run code</div>
              <div style={codeBoxStyle}>{runCode}</div>
              <button style={buttonStyle} onClick={onCopy}>
                {copied ? "Copied!" : "Copy run code"}
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              <b>Upgrades:</b>
              {summary.upgrades.length === 0 ? (
                <div style={{ opacity: 0.8 }}>None</div>
              ) : (
                <ul style={{ margin: "6px 0 0 18px" }}>
                  {summary.upgrades.slice(-8).map((u, i) => (
                    <li key={`${u}-${i}`}>{u}</li>
                  ))}
                </ul>
              )}
              {summary.upgrades.length > 8 && (
                <div style={{ opacity: 0.75 }}>
                  (+{summary.upgrades.length - 8} more)
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ opacity: 0.85, marginTop: 8 }}>
          Press R to play again, or use buttons below.
        </div>

        <button style={buttonStyle} onClick={onRestart}>
          Play Again
        </button>
        <button style={buttonStyle} onClick={onMenu}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  background: "rgba(0,0,0,0.65)",
  color: "white",
  padding: 24,
};

const panelStyle: React.CSSProperties = {
  width: 520,
  maxWidth: "90%",
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(0,0,0,0.6)",
  padding: 18,
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  marginTop: 10,
  fontSize: 16,
  cursor: "pointer",
};

const codeBoxStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.25)",
  padding: "10px 12px",
  background: "rgba(0,0,0,0.35)",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: 12,
  lineHeight: 1.4,
  wordBreak: "break-word",
};