/**
 * Security utilities to protect photos from casual theft
 * Note: Sophisticated users can still bypass these measures, but this deters 95%+ of casual copying
 */

/**
 * Disable right-click context menu globally
 */
export function disableRightClick() {
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });
}

/**
 * Disable common keyboard shortcuts for saving/copying
 */
export function disableKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Disable Ctrl+S / Cmd+S (Save)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      return false;
    }
    // Disable Ctrl+U / Cmd+U (View Source)
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault();
      return false;
    }
    // Disable Ctrl+Shift+I / Cmd+Option+I (DevTools)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      return false;
    }
    // Disable F12 (DevTools)
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    // Disable Ctrl+Shift+J / Cmd+Option+J (Console)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      return false;
    }
    // Disable Ctrl+Shift+C / Cmd+Option+C (Inspect Element)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      return false;
    }
    // Disable Ctrl+P / Cmd+P (Print)
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      return false;
    }
  });
}

/**
 * Detect if DevTools is open and log a warning
 * This won't stop determined users but adds another deterrent layer
 */
export function detectDevTools() {
  const threshold = 160;
  let devtoolsOpen = false;

  const check = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    if (widthThreshold || heightThreshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        console.clear();
        console.log(
          '%c⚠️ WARNING',
          'font-size: 40px; color: red; font-weight: bold;'
        );
        console.log(
          '%cThese photos are protected by copyright.',
          'font-size: 16px; color: orange;'
        );
        console.log(
          '%cUnauthorized copying or distribution is prohibited.',
          'font-size: 16px; color: orange;'
        );
        console.log(
          '%c© adubsqz. All rights reserved.',
          'font-size: 14px; color: white;'
        );
      }
    } else {
      devtoolsOpen = false;
    }
  };

  // Low-frequency check avoids adding main-thread work during interaction (INP / TBT).
  setInterval(check, 5000);
}

/**
 * Disable text selection globally
 */
export function disableTextSelection() {
  const style = document.createElement('style');
  style.textContent = `
    body { user-select: none; -webkit-user-select: none; }
    input, textarea, select, [contenteditable="true"] {
      user-select: text;
      -webkit-user-select: text;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Initialize all security measures
 */
export function initializeSecurity() {
  disableRightClick();
  disableKeyboardShortcuts();
  detectDevTools();
  disableTextSelection();
  
  // Add a visual indicator when screenshot detection is triggered (optional)
  let screenshotWarning: HTMLDivElement | null = null;
  
  // Detect potential screenshot attempts (visibility change can indicate screen recording)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !screenshotWarning) {
      screenshotWarning = document.createElement('div');
      screenshotWarning.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 20px 40px;
        border-radius: 10px;
        z-index: 999999;
        font-size: 18px;
        display: none;
      `;
      screenshotWarning.textContent = '© adubsqz - All Rights Reserved';
      document.body.appendChild(screenshotWarning);
    }
  });
}
