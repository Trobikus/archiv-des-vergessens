/**
 * ============================================================
 * FILE: ui/dom/floating-text.js – Floating-Text-System (DOM-Pool)
 * ============================================================
 */

import DOMPool from '../../core/pool.js';

export function initFloatingText(eventBus, settingsManager) {
  const pool = new DOMPool(
    () => {
      const el = document.createElement('div');
      el.className = 'float-text';
      el.style.position = 'fixed';
      el.style.pointerEvents = 'none';
      el.style.zIndex = '9999';
      el.style.fontFamily = 'var(--font-header)';
      el.style.fontWeight = 'bold';
      el.style.color = '#c5a059';
      el.style.textShadow = '0 0 20px rgba(197, 160, 89, 0.4), 0 2px 10px rgba(0,0,0,0.9)';
      return el;
    },
    20
  );

  let activeAnimations = [];

  function spawn(text, x, y) {
    if (!settingsManager.get('floatingText')) return;

    const el = pool.get();
    el.textContent = text;
    el.style.left = (x || window.innerWidth / 2) + 'px';
    el.style.top = (y || window.innerHeight / 2) + 'px';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0) scale(0.8)';

    // Animation über requestAnimationFrame
    const startTime = performance.now();
    const duration = 1200;

    function animate(time) {
      const progress = (time - startTime) / duration;
      if (progress >= 1) {
        pool.release(el);
        return;
      }
      const eased = 1 - Math.pow(1 - progress, 3);
      el.style.opacity = 1 - eased;
      el.style.transform = `translateY(-${eased * 80}px) scale(${0.8 + eased * 0.3})`;
      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }

  return {
    spawn,
    destroy: () => {
      pool.destroy();
    }
  };
}