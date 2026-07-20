/**
 * ============================================================
 * FILE: ui/dom/floating-text.js – Floating-Text-System (DOM-Pool)
 * ============================================================
 *
 * PERFORMANCE (v2.0):
 * - Ein einziger zentraler RAF-Loop statt N paralleler Loops.
 *   Bei Klick-Spam (20+ gleichzeitige Texte) läuft weiterhin
 *   nur genau 1 requestAnimationFrame-Callback pro Frame.
 * - Loop stoppt automatisch wenn keine Animationen aktiv sind
 *   (kein Idle-RAF-Overhead).
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

  // Aktive Animationen: { el, startTime, duration }
  const activeAnimations = [];
  let rafId = null;

  // ---- Zentraler Batch-Loop ----
  function batchLoop(time) {
    // Alle Animationen dieses Frames updaten
    for (let i = activeAnimations.length - 1; i >= 0; i--) {
      const anim = activeAnimations[i];
      const progress = (time - anim.startTime) / anim.duration;

      if (progress >= 1) {
        // Animation fertig → Element zurück in Pool, aus Liste entfernen
        pool.release(anim.el);
        activeAnimations.splice(i, 1);
        continue;
      }

      const eased = 1 - Math.pow(1 - progress, 3);
      anim.el.style.opacity = 1 - eased;
      anim.el.style.transform = `translateY(-${eased * 80}px) scale(${0.8 + eased * 0.3})`;
    }

    // Weiterlaufen solange noch Animationen aktiv, sonst pausieren
    if (activeAnimations.length > 0) {
      rafId = requestAnimationFrame(batchLoop);
    } else {
      rafId = null;
    }
  }

  function spawn(text, x, y) {
    if (!settingsManager.get('floatingText')) return;

    const el = pool.get();
    el.textContent = text;
    el.style.left      = (x || window.innerWidth  / 2) + 'px';
    el.style.top       = (y || window.innerHeight / 2) + 'px';
    el.style.opacity   = '1';
    el.style.transform = 'translateY(0) scale(0.8)';

    activeAnimations.push({ el, startTime: performance.now(), duration: 1200 });

    // Loop starten falls nicht bereits aktiv
    if (rafId === null) {
      rafId = requestAnimationFrame(batchLoop);
    }
  }

  return {
    spawn,
    destroy: () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      pool.destroy();
    }
  };
}