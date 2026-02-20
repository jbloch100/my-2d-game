import React from "react";

export function StartMenu({
  onPlay,
}: {
  onPlay: () => void;
}) {
  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          Arena Survivor
        </div>
        <div style={{ opacity: 0.9, marginBottom: 14 }}>
          Survive waves, level up, and defeat the boss.
        </div>

        <div style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.5 }}>
          Controls:
          <br />• WASD to move
          <br />• Hold left click to shoot
          <br />• ESC to pause
          <br />• R to restart (in-game)
        </div>

        <button style={buttonStyle} onClick={onPlay}>
          Play
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
