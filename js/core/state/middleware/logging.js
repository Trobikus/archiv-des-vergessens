/**
 * ============================================================
 * FILE: core/state/middleware/logging.js – Logging-Middleware
 * ============================================================
 * 
 * Loggt alle State-Änderungen für Debugging.
 * ============================================================
 */

/**
 * Erstellt eine Logging-Middleware.
 * @param {Object} logger – Logger-Instanz (oder console)
 * @param {string} [level='debug'] - Log-Level
 * @returns {Object} – Middleware-Objekt
 */
export function loggingMiddleware(logger = console, level = 'debug') {
  return {
    onBefore(state, { name }) {
      if (level === 'debug' || level === 'trace') {
        logger.debug(`[State] Aktion startet: ${name}`);
      }
    },
    onAfter(state, { name, duration }) {
      if (level === 'debug' || level === 'trace') {
        const keys = Object.keys(state);
        logger.debug(`[State] Aktion abgeschlossen: ${name} (${duration?.toFixed(1) || '?'}ms)`, { keys });
      }
    },
    onError(error, state, { name }) {
      logger.error(`[State] Fehler in Aktion: ${name}`, error.message);
      if (level === 'trace') {
        logger.error(error.stack);
      }
    }
  };
}

export default loggingMiddleware;