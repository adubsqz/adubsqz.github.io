import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  disableRightClick,
  disableKeyboardShortcuts,
  detectDevTools,
  initializeSecurity,
} from './security';

describe('security utilities', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
    document.body.style.userSelect = '';
  });

  it('blocks context menu', () => {
    disableRightClick();
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    expect(document.dispatchEvent(ev)).toBe(false);
  });

  it('blocks save, view-source, print, and inspect shortcuts', () => {
    disableKeyboardShortcuts();
    const keys = [
      { ctrlKey: true, key: 's' },
      { metaKey: true, key: 'u' },
      { ctrlKey: true, shiftKey: true, key: 'I' },
      { key: 'F12' },
      { ctrlKey: true, shiftKey: true, key: 'J' },
      { metaKey: true, shiftKey: true, key: 'C' },
      { ctrlKey: true, key: 'p' },
    ];
    for (const extra of keys) {
      const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...extra });
      expect(document.dispatchEvent(ev)).toBe(false);
    }
  });

  it('warns when the window chrome looks like DevTools', () => {
    vi.useFakeTimers();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const clear = vi.spyOn(console, 'clear').mockImplementation(() => {});
    Object.defineProperty(window, 'outerWidth', { configurable: true, value: 1200 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    detectDevTools();
    vi.advanceTimersByTime(5000);
    expect(clear).toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
    Object.defineProperty(window, 'outerWidth', { configurable: true, value: 800 });
    vi.advanceTimersByTime(5000);
  });

  it('disables text selection and wires screenshot visibility handling', () => {
    initializeSecurity();
    const css = [...document.querySelectorAll('style')].map((node) => node.textContent ?? '').join('\n');
    expect(css).toMatch(/body\s*\{\s*user-select:\s*none/);
    expect(css).toMatch(/input,\s*textarea[\s\S]*user-select:\s*text/);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(document.body.textContent).toContain('adubsqz');
  });
});
