import React from "react";

export function PauseMenu({
  onResume,
  onRestart,
  onQuit,
  sfxVolume,
  setSfxVolume,
  sfxMuted,
  setSfxMuted,
}: {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  sfxVolume: number;
  setSfxVolume: (v: number) => void;
  sfxMuted: boolean;
  setSfxMuted: (m: boolean) => void;
}) {
  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <div style={{ fontSize: 26, fontWeight: 700 }}>Paused</div>
        <div style={{ opacity: 0.85, marginTop: 8 }}>Press ESC to resume.</div>

        {/* SOUND SETTINGS */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Sound</div>

          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={sfxMuted}
              onChange={(e) => setSfxMuted(e.target.checked)}
            />
            Mute
          </label>

          <div style={{ marginTop: 8, opacity: 0.9 }}>
            Volume: {Math.round(sfxVolume * 100)}%
          </div>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={sfxVolume}
            onChange={(e) => setSfxVolume(Number(e.target.value))}
            style={{ width: "100%" }}
            disabled={sfxMuted}
          />
        </div>

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