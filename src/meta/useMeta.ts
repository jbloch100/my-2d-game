import { useEffect, useState } from "react";
import {
  loadSave,
  writeSave,
  upgradeCost,
  characterCost,
  resetSave,
  type MetaUpgradeId,
  type SaveV1,
  type HighScore,
  type CharacterId,
} from "./save";

export function useMeta() {
  const [save, setSave] = useState<SaveV1>(() => loadSave());

  useEffect(() => {
    writeSave(save);
  }, [save]);

  function addShards(amount: number) {
    setSave((s) => ({ ...s, shards: Math.max(0, s.shards + amount) }));
  }

  function setBest(best: HighScore) {
    setSave((s) => ({ ...s, best }));
  }

  function canBuy(id: MetaUpgradeId) {
    const lvl = save.upgrades[id];
    return save.shards >= upgradeCost(id, lvl);
  }

  function buy(id: MetaUpgradeId) {
    setSave((s) => {
      const lvl = s.upgrades[id];
      const cost = upgradeCost(id, lvl);
      if (s.shards < cost) return s;

      return {
        ...s,
        shards: s.shards - cost,
        upgrades: { ...s.upgrades, [id]: lvl + 1 },
      };
    });
  }

  function reset() {
    resetSave();          // removes localStorage key
    setSave(loadSave());  // reload defaults into state
  }

  function isUnlockedCharacter(id: CharacterId) {
    return save.characters.unlocked[id] === true;
  }

  function selectCharacter(id: CharacterId) {
    if (!isUnlockedCharacter(id)) return;
    setSave((s) => ({ ...s, characters: { ...s.characters, selected: id } }));
  }

  function canUnlockCharacter(id: CharacterId) {
    if (isUnlockedCharacter(id)) return false;
    return save.shards >= characterCost(id);
  }

  function unlockCharacter(id: CharacterId) {
    setSave((s) => {
      if (s.characters.unlocked[id]) return s;
      const cost = characterCost(id);
      if (s.shards < cost) return s;

      return {
        ...s,
        shards: s.shards - cost,
        characters: {
          ...s.characters,
          unlocked: { ...s.characters.unlocked, [id]: true },
        },
      };
    });
  }

  return { 
    save, 
    setSave, 
    addShards, 
    setBest, 
    canBuy, 
    buy, 
    reset, 
    isUnlockedCharacter,
    selectCharacter,
    canUnlockCharacter,
    unlockCharacter, 
  };
}