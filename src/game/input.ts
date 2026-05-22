export type InputState = {
  keys: Set<string>;
  mouse: { x: number; y: number; down: boolean };
};

export function createInput(): InputState {
  return {
    keys: new Set(),
    mouse: { x: 0, y: 0, down: false },
  };
}

export function attachInputListeners(
  target: HTMLElement,
  input: InputState
): () => void {
  let moveTouchId: number | null = null;
  let shootTouchId: number | null = null;

  let moveStartX = 0;
  let moveStartY = 0;

  function clearMoveKeys() {
    input.keys.delete("w");
    input.keys.delete("a");
    input.keys.delete("s");
    input.keys.delete("d");
  }

  function onKeyDown(e: KeyboardEvent) {
    input.keys.add(e.key.toLowerCase());
  }

  function onKeyUp(e: KeyboardEvent) {
    input.keys.delete(e.key.toLowerCase());
  }

  function onMouseMove(e: MouseEvent) {
    const rect = target.getBoundingClientRect();
    input.mouse.x = e.clientX - rect.left;
    input.mouse.y = e.clientY - rect.top;
  }

  function onMouseDown() {
    input.mouse.down = true;
  }

  function onMouseUp() {
    input.mouse.down = false;
  }

  function setAimFromTouch(t: Touch) {
    const rect = target.getBoundingClientRect();
    input.mouse.x = t.clientX - rect.left;
    input.mouse.y = t.clientY - rect.top;
  }

  function updateMoveFromTouch(t: Touch) {
    clearMoveKeys();

    const dx = t.clientX - moveStartX;
    const dy = t.clientY - moveStartY;
    const deadZone = 18;

    if (dy < -deadZone) input.keys.add("w");
    if (dy > deadZone) input.keys.add("s");
    if (dx < -deadZone) input.keys.add("a");
    if (dx > deadZone) input.keys.add("d");
  }

  function onTouchStart(e: TouchEvent) {
    e.preventDefault();

    const rect = target.getBoundingClientRect();

    for (const t of Array.from(e.changedTouches)) {
      const x = t.clientX - rect.left;

      // left side = movement
      if (x < rect.width / 2 && moveTouchId === null) {
        moveTouchId = t.identifier;
        moveStartX = t.clientX;
        moveStartY = t.clientY;
      }

      // right side = aim/shoot
      if (x >= rect.width / 2 && shootTouchId === null) {
        shootTouchId = t.identifier;
        input.mouse.down = true;
        setAimFromTouch(t);
      }
    }
  }

  function onTouchMove(e: TouchEvent) {
    e.preventDefault();

    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === moveTouchId) {
        updateMoveFromTouch(t);
      }

      if (t.identifier === shootTouchId) {
        input.mouse.down = true;
        setAimFromTouch(t);
      }
    }
  }

  function onTouchEnd(e: TouchEvent) {
    e.preventDefault();

    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === moveTouchId) {
        moveTouchId = null;
        clearMoveKeys();
      }

      if (t.identifier === shootTouchId) {
        shootTouchId = null;
        input.mouse.down = false;
      }
    }
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  target.addEventListener("mousemove", onMouseMove);
  target.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);

  target.addEventListener("touchstart", onTouchStart, { passive: false });
  target.addEventListener("touchmove", onTouchMove, { passive: false });
  target.addEventListener("touchend", onTouchEnd, { passive: false });
  target.addEventListener("touchcancel", onTouchEnd, { passive: false });

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);

    target.removeEventListener("mousemove", onMouseMove);
    target.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mouseup", onMouseUp);

    target.removeEventListener("touchstart", onTouchStart);
    target.removeEventListener("touchmove", onTouchMove);
    target.removeEventListener("touchend", onTouchEnd);
    target.removeEventListener("touchcancel", onTouchEnd);
  };
}