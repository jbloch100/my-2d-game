import React from "react";

export function PauseMenu({
  onResume,
  onRestart,
  onQuit,
}: {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}) {
  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <div style={{ fontSize: 26, fontWeight: 700 }}>Paused</div>
        <div style={{ opacity: 0.85, marginTop: 8 }}>Press ESC to resume.</div>

        <button style={buttonStyle} onClick={onResume}>Resume</button>
        <button style={buttonStyle} onClick={onRestart}>Restart Run</button>
        <button style={buttonStyle} onClick={onQuit}>Quit to Menu</button>
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
