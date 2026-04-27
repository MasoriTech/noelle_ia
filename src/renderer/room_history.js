import { safeLayout } from "./room_layout_store.js";

export function createRoomHistory({ getLayout, applyLayout, limit = 50, onChange }) {
  let stack = [];
  let index = -1;
  let restoring = false;

  function same(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function notify() {
    onChange?.({ canUndo: index > 0, canRedo: index >= 0 && index < stack.length - 1, index, length: stack.length });
  }

  function reset(layout) {
    stack = [safeLayout(layout)];
    index = 0;
    notify();
  }

  function push(label = "change") {
    if (restoring) return;
    const snapshot = safeLayout(getLayout());
    if (index >= 0 && same(stack[index], snapshot)) return;
    stack = stack.slice(0, index + 1);
    stack.push({ ...snapshot, label });
    if (stack.length > limit) stack.shift();
    index = stack.length - 1;
    notify();
  }

  async function undo() {
    if (index <= 0) {
      notify();
      return false;
    }
    index -= 1;
    restoring = true;
    await applyLayout(stack[index]);
    restoring = false;
    notify();
    return true;
  }

  async function redo() {
    if (index >= stack.length - 1) {
      notify();
      return false;
    }
    index += 1;
    restoring = true;
    await applyLayout(stack[index]);
    restoring = false;
    notify();
    return true;
  }

  function state() {
    return { canUndo: index > 0, canRedo: index >= 0 && index < stack.length - 1, index, length: stack.length };
  }

  return { reset, push, undo, redo, state };
}
