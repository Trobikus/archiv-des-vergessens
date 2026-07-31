/**
 * ============================================================
 * FILE: js/_tests_/UseModalLogic.test.js – canOpen/open Gate (ohne DOM)
 * ============================================================
 */

import { describe, test, expect, vi } from 'vitest';

/**
 * Spiegelt die Gate-Logik aus useModal.open (ohne Preact-Hooks).
 */
function tryOpen(data, { canOpen, onOpen, setOpen }) {
  if (canOpen && canOpen(data) === false) return false;
  setOpen(true);
  if (onOpen) onOpen(data);
  return true;
}

describe('useModal open gate', () => {
  test('opens and calls onOpen when canOpen allows', () => {
    const setOpen = vi.fn();
    const onOpen = vi.fn();
    const ok = tryOpen({ tab: 'global' }, {
      canOpen: () => true,
      onOpen,
      setOpen
    });
    expect(ok).toBe(true);
    expect(setOpen).toHaveBeenCalledWith(true);
    expect(onOpen).toHaveBeenCalledWith({ tab: 'global' });
  });

  test('skips open when canOpen returns false', () => {
    const setOpen = vi.fn();
    const onOpen = vi.fn();
    const ok = tryOpen({}, {
      canOpen: () => false,
      onOpen,
      setOpen
    });
    expect(ok).toBe(false);
    expect(setOpen).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('opens without canOpen', () => {
    const setOpen = vi.fn();
    expect(tryOpen(undefined, { setOpen })).toBe(true);
    expect(setOpen).toHaveBeenCalledWith(true);
  });
});
