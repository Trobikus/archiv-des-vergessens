/**
 * ============================================================
 * FILE: core/state/middleware/persistence.js – Persistenz-Middleware
 * ============================================================
 * 
 * Speichert den State bei jeder Änderung (debounced).
 * ============================================================
 */

/**
 * Erstellt eine Persistenz-Middleware.
 * @param {Function} saveFunction – Funktion zum Speichern (async)
 * @param {number} [debounceMs=1000] - Debounce-Zeit in Millisekunden
 * @param {string[]} [excludeActions] - Aktionen, die nicht gespeichert werden sollen
 * @returns {Object} – Middleware-Objekt
 */
export function persistenceMiddleware(saveFunction, debounceMs = 1000, excludeActions = ['setSavingStatus', 'state:timeTravel']) {
  let timeoutId = null;
  let pendingSave = false;
  let lastSaveTime = 0;

  return {
    onAfter(state, { name }) {
      // Bestimmte Aktionen ausschließen
      if (excludeActions.includes(name)) return;

      // Nicht zu häufig speichern (mindestens 100ms zwischen Speichervorgängen)
      const now = Date.now();
      if (now - lastSaveTime < 100) return;

      if (timeoutId) {
        clearTimeout(timeoutId);
        pendingSave = true;
      } else {
        pendingSave = true;
      }

      timeoutId = setTimeout(() => {
        if (pendingSave) {
          try {
            saveFunction(state);
            lastSaveTime = Date.now();
          } catch (e) {
            console.error('[StateMiddleware] Persistenz fehlgeschlagen:', e);
          }
          pendingSave = false;
        }
        timeoutId = null;
      }, debounceMs);
    }
  };
}

export default persistenceMiddleware;