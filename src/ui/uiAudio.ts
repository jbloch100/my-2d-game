export type UiSfxId = "ui_click" | "upgrade_buy";

const FILES: Record<UiSfxId, string> = {
  ui_click: "/sfx/ui_click.ogg",
  upgrade_buy: "/sfx/upgrade_buy.ogg",
};

let volume = 0.6;
let muted = false;

export function setUiSfxVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
}

export function setUiSfxMuted(m: boolean) {
  muted = m;
}

export function playUiSfx(id: UiSfxId) {
  if (muted) return;
  const a = new Audio(FILES[id]);
  a.volume = volume;
  void a.play().catch(() => {});
}