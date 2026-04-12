import type { CharacterDef } from "../meta/characters";

export type AbilityRuntime = {
  // dash
  dashCd: number;
  dashTime: number;
  dashVX: number;
  dashVY: number;

  // tank guard
  guardCd: number;
  guardReady: boolean;

  // soldier xp
  xpMul: number;
};

export function createAbilityRuntime(ch: CharacterDef): AbilityRuntime {
  let xpMul = 1;
  if (ch.ability.kind === "xpBoost") xpMul = ch.ability.xpMul;

  return {
    dashCd: 0,
    dashTime: 0,
    dashVX: 0,
    dashVY: 0,
    guardCd: 0,
    guardReady: ch.ability.kind === "guard" ? true : false, // ready at start feels good
    xpMul,
  };
}