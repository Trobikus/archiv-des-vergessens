// ============================================================
// FILE: core/state-middleware.js – Middleware für StateManager
// ============================================================

/**
 * Logging-Middleware: Loggt alle State-Änderungen.
 */
export function loggingMiddleware(logger = console) {
    return {
        before(action, state) {
            logger.debug(`[State] Aktion startet: ${action.name || 'anonymous'}`);
        },
        after(action, state) {
            const keys = Object.keys(state);
            logger.debug(`[State] Aktion abgeschlossen: ${action.name || 'anonymous'}`, { keys });
        },
        error(error, action, state) {
            logger.error(`[State] Fehler in Aktion: ${action.name || 'anonymous'}`, error);
        }
    };
}

/**
 * Persistenz-Middleware: Speichert den State bei jeder Änderung (debounced).
 */
export function persistenceMiddleware(saveFunction, debounceMs = 1000) {
    let timeoutId = null;
    let pendingSave = false;

    return {
        after(action, state) {
            // Nicht bei System-Aktionen speichern
            if (action.name === 'setSavingStatus') return;
            
            if (timeoutId) {
                clearTimeout(timeoutId);
                pendingSave = true;
            } else {
                pendingSave = true;
            }
            
            timeoutId = setTimeout(() => {
                if (pendingSave) {
                    try {
                        saveFunction();
                    } catch (e) {
                        console.error('[StateMiddleware] Save fehlgeschlagen:', e);
                    }
                    pendingSave = false;
                }
                timeoutId = null;
            }, debounceMs);
        }
    };
}

/**
 * Zeitreise-Middleware: Speichert History für Debugging.
 */
export function historyMiddleware(maxEntries = 50) {
    return {
        after(action, state) {
            // Wird bereits im StateManager gehandhabt
        }
    };
}

/**
 * Validierungs-Middleware: Prüft den State auf Integrität.
 */
export function validationMiddleware(validators = []) {
    return {
        after(action, state) {
            for (const validator of validators) {
                try {
                    const result = validator(state);
                    if (result === false) {
                        console.warn('[StateMiddleware] Validierung fehlgeschlagen für Aktion:', action.name);
                    }
                } catch (e) {
                    console.error('[StateMiddleware] Validator-Fehler:', e);
                }
            }
        }
    };
}

/**
 * Performance-Middleware: Misst die Dauer von Aktionen.
 */
export function performanceMiddleware(thresholdMs = 50) {
    return {
        before(action, state) {
            action._startTime = performance.now();
        },
        after(action, state) {
            const duration = performance.now() - (action._startTime || 0);
            if (duration > thresholdMs) {
                console.warn(`[Performance] Aktion ${action.name || 'anonymous'} dauerte ${duration.toFixed(1)}ms`);
            }
        }
    };
}