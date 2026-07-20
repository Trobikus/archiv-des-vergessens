/**
 * ============================================================
 * FILE: core/state/middleware/performance.js – Performance-Middleware
 * ============================================================
 * 
 * Misst die Dauer von State-Änderungen und warnt bei langen Aktionen.
 * ============================================================
 */

/**
 * Erstellt eine Performance-Middleware.
 * @param {number} [thresholdMs=50] - Schwellwert in Millisekunden
 * @returns {Object} – Middleware-Objekt
 */
export function performanceMiddleware(thresholdMs = 50) {
  let startTime = 0;

  return {
    onBefore(state, { name }) {
      startTime = performance.now();
    },
    onAfter(state, { name }) {
      const duration = performance.now() - startTime;
      if (duration > thresholdMs) {
        console.warn(
          `[Performance] Aktion "${name}" dauerte ${duration.toFixed(1)}ms (Threshold: ${thresholdMs}ms)`
        );
      }
    }
  };
}

export default performanceMiddleware;