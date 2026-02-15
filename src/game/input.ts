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

export function attachInputListeners(target: HTMLElement, input: InputState): () => void {
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

	window.addEventListener("keydown", onKeyDown);
	window.addEventListener("keyup", onKeyUp);

	target.addEventListener("mousemove", onMouseMove);
	target.addEventListener("mousedown", onMouseDown);
	window.addEventListener("mouseup", onMouseUp);

	return () => {
		window.removeEventListener("keydown", onKeyDown);
		window.removeEventListener("keyup", onKeyUp);

		target.removeEventListener("mousemove", onMouseMove);
		target.removeEventListener("mousedown", onMouseDown);
		window.removeEventListener("mouseup", onMouseUp);
	};
}