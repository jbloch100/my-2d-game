import React, { useMemo, useState } from "react";
import type { MetaUpgradeId, MetaUpgrades } from "../meta/save";
import type { CharactersState, CharacterId } from "../meta/save";
import { upgradeCost, characterCost } from "../meta/save";
import { CHARACTERS } from "../meta/characters";
import { audio } from "../game/audio";

const UPGRADE_LABELS: Record<MetaUpgradeId, { title: string; desc: string }> = {
  hp: { title: "Max HP +1", desc: "Start each run with more health." },
  damage: { title: "Damage +1", desc: "Bullets deal more damage." },
  fireRate: { title: "Fire Rate +8%", desc: "Shoot faster every run." },
  moveSpeed: { title: "Move Speed +6%", desc: "Move faster every run." },
  multiShotStart: { title: "Start with Multi-shot", desc: "Begin with 3-shot." },
};

export function StartMenu({
  onPlay,
  sfxVolume,
  setSfxVolume,
  sfxMuted,
  setSfxMuted,
  highScore,

  // meta
  shards,
  metaUpgrades,
  canBuy,
  onBuy,
  onResetSave,

  // characters
  characters,
  onSelectCharacter,
  canUnlockCharacter,
  onUnlockCharacter,
}: {
  onPlay: () => void;
  sfxVolume: number;
  setSfxVolume: (v: number) => void;
  sfxMuted: boolean;
  setSfxMuted: (m: boolean) => void;
  highScore: { bestScore: number; bestLevel: number; bestTimeSec: number };

  shards: number;
  metaUpgrades: MetaUpgrades;
  canBuy: (id: MetaUpgradeId) => boolean;
  onBuy: (id: MetaUpgradeId) => void;
  onResetSave: () => void;

  characters: CharactersState;
  onSelectCharacter: (id: CharacterId) => void;
  canUnlockCharacter: (id: CharacterId) => boolean;
  onUnlockCharacter: (id: CharacterId) => void;
}) {
  const upgradeIds: MetaUpgradeId[] = useMemo(
    () => ["hp", "damage", "fireRate", "moveSpeed", "multiShotStart"],
    []
  );

  const [toast, setToast] = useState<string | null>(null);

  function handleBuy(id: MetaUpgradeId) {
    audio.play("upgrade_buy");
    onBuy(id);
    setToast("Purchased!");
    window.setTimeout(() => setToast(null), 900);
  }

  function handleUnlock(id: CharacterId) {
    audio.play("upgrade_buy");
    onUnlockCharacter(id);
    setToast("Unlocked!");
    window.setTimeout(() => setToast(null), 900);
  }

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <div 
          style={{ 
            fontSize: 42,
            fontWeight: 800,
            marginBottom: 12,
            letterSpacing: 1,
            textAlign: "center",
            color: "white",
            textShadow:
              "0 0 10px rgba(255,255,255,0.9), 0 0 30px rgba(160,120,255,0.85)",
          }}>
          Arena Survivor
        </div>

        <div style={{ opacity: 0.9, marginBottom: 14 }}>
          Survive waves, level up, and defeat the boss.
        </div>

        <div style={{ marginBottom: 10, fontSize: 14, opacity: 0.9 }}>
          <b>Best Run:</b> {highScore.bestScore} score • L{highScore.bestLevel} •{" "}
          {highScore.bestTimeSec.toFixed(1)}s
        </div>

        <div
          style={{
            marginBottom: 12,
            fontSize: 14,
            opacity: 0.95,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <b>Shards:</b> {shards}
          </div>

          {toast && <div style={{ fontWeight: 700, opacity: 0.95 }}>{toast}</div>}
        </div>

        {/* CHARACTERS */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.18)", paddingTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Characters</div>

          <div style={{ display: "grid", gap: 10 }}>
            {(Object.keys(CHARACTERS) as CharacterId[]).map((id) => {
              const def = CHARACTERS[id];
              const unlocked = characters.unlocked[id];
              const selected = characters.selected === id;
              const cost = characterCost(id);
              const canUnlock = canUnlockCharacter(id);

              return (
                <div
                  key={id}
                  style={{
                    border: selected
                      ? "1px solid rgba(140,180,255,0.75)"
                      : "1px solid rgba(255,255,255,0.18)",
                    background: selected
                      ? "linear-gradient(90deg, rgba(60,120,255,0.28), rgba(120,80,255,0.16))"
                      : "rgba(0,0,0,0.35)",
                    boxShadow: selected ? "0 0 18px rgba(90,130,255,0.35)" : "none",
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {def.name} {selected ? "✓" : ""}
                      </div>
                      <div style={{ opacity: 0.85, fontSize: 13 }}>{def.desc}</div>
                      <div style={{ opacity: 0.9, marginTop: 4, fontSize: 13 }}>
                        HP {def.maxHp} • Speed {def.speed} • Fire {def.fireRate} • Dmg{" "}
                        {def.damage}
                      </div>
                      {!unlocked && (
                        <div style={{ opacity: 0.9, marginTop: 4, fontSize: 13 }}>
                          Cost: {cost} shards
                        </div>
                      )}
                    </div>

                    {unlocked ? (
                      <button
                        style={{
                          ...smallButtonStyle,
                          opacity: selected ? 0.6 : 1,
                          cursor: selected ? "default" : "pointer",
                        }}
                        disabled={selected}
                        onClick={() =>{
                          audio.play("ui_click");
                          onSelectCharacter(id);
                        }}
                      >
                        Select
                      </button>
                    ) : (
                      <button
                        style={{
                          ...smallButtonStyle,
                          opacity: canUnlock ? 1 : 0.55,
                          cursor: canUnlock ? "pointer" : "not-allowed",
                        }}
                        disabled={!canUnlock}
                        onClick={() => handleUnlock(id)}
                      >
                        Unlock
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* META SHOP */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.18)", paddingTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Meta Upgrades</div>

          <div style={{ display: "grid", gap: 10 }}>
            {upgradeIds.map((id) => {
              const lvl = metaUpgrades[id];
              const cost = upgradeCost(id, lvl);
              const disabled = !canBuy(id);

              return (
                <div
                  key={id}
                  style={{
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{UPGRADE_LABELS[id].title}</div>
                      <div style={{ opacity: 0.85, fontSize: 13 }}>
                        {UPGRADE_LABELS[id].desc}
                      </div>
                      <div style={{ opacity: 0.9, marginTop: 4, fontSize: 13 }}>
                        Level: {lvl} {" • "} Cost: {cost}
                      </div>
                    </div>

                    <button
                      style={{
                        ...smallButtonStyle,
                        opacity: disabled ? 0.55 : 1,
                        cursor: disabled ? "not-allowed" : "pointer",
                      }}
                      disabled={disabled}
                      onClick={() => handleBuy(id)}
                    >
                      Buy
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RESET SAVE */}
          <button
            style={{ ...buttonStyle, marginTop: 12, opacity: 0.85 }}
            onClick={() => {
              audio.play("ui_click");
              const ok = window.confirm(
                "Reset all progress? This clears shards, upgrades, characters, and best run."
              );
              if (ok) onResetSave();
            }}
          >
            Reset Save
          </button>
        </div>

        {/* CONTROLS */}
        <div style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.5, marginTop: 12 }}>
          Controls:
          <br />• WASD to move
          <br />• Hold left click to shoot
          <br />• ESC to pause
          <br />• R to restart (in-game)
        </div>

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

        <button 
          style={buttonStyle} 
          onClick={() =>{
            audio.play("ui_click");
            onPlay();
          }}>
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
  background:
    "radial-gradient(circle at top, rgba(70,40,120,0.55), rgba(0,0,0,0.95))",
  backdropFilter: "blur(2px)",
  color: "white",
  padding: 24,
};

const panelStyle: React.CSSProperties = {
  width: 620,
  maxWidth: "90%",
  maxHeight: "92vh",
  overflowY: "auto",
  border: "1px solid rgba(180,140,255,0.35)",
  background: "rgba(10,10,20,0.78)",
  boxShadow: "0 0 35px rgba(120,80,255,0.25)",
  padding: 18,
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  marginTop: 14,
  fontSize: 16,
  cursor: "pointer",
};

const smallButtonStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 14,
};