/**
 * ============================================================
 * FILE: core/state/middleware/validation.js – Validierungs-Middleware
 * ============================================================
 * 
 * Prüft den State auf Integrität nach jeder Änderung.
 * ============================================================
 */

/**
 * Erstellt eine Validierungs-Middleware.
 * @param {Array<Function>} validators – Array von Validator-Funktionen
 * @param {boolean} [throwOnError=false] - Ob ein Fehler geworfen werden soll
 * @returns {Object} – Middleware-Objekt
 */
export function validationMiddleware(validators = [], throwOnError = false) {
  return {
    onAfter(state, { name }) {
      for (const validator of validators) {
        try {
          const result = validator(state);
          if (result === false) {
            console.warn(`[StateMiddleware] Validierung fehlgeschlagen für Aktion: ${name}`);
            if (throwOnError) {
              throw new Error(`State-Validierung fehlgeschlagen: ${name}`);
            }
          }
        } catch (e) {
          console.error('[StateMiddleware] Validator-Fehler:', e);
          if (throwOnError) throw e;
        }
      }
    }
  };
}

// ---- STANDARD-VALIDATOREN ----

/**
 * Prüft, ob alle Ressourcen nicht-negativ sind.
 */
export function validateResourcesNonNegative(state) {
  const res = state.resources;
  if (!res) return true;
  
  const check = (key) => {
    const val = Number(res[key] || '0');
    if (val < 0) {
      console.warn(`[Validation] Ressource ${key} ist negativ: ${val}`);
      return false;
    }
    return true;
  };

  return check('particles') && check('relics') && check('artifacts') && check('memoryDust');
}

/**
 * Prüft, ob der Helden-Level im gültigen Bereich liegt.
 */
export function validateHeroLevel(state) {
  const hero = state.hero;
  if (!hero) return true;
  return hero.level >= 1 && hero.level <= 9999;
}

/**
 * Prüft, ob die Stat-Punkte konsistent sind.
 */
export function validateStatPoints(state) {
  const hero = state.hero;
  if (!hero) return true;
  
  const expected = (hero.level - 1) * 3;
  const spent = (hero.spentStats?.attack || 0) + (hero.spentStats?.defense || 0) + 
                (hero.spentStats?.agility || 0) + (hero.spentStats?.stamina || 0);
  const total = (hero.unspentStatPoints || 0) + spent;
  
  if (Math.abs(total - expected) > 5) {
    console.warn(`[Validation] Stat-Punkte inkonsistent: erwartet ${expected}, aktuell ${total}`);
    return false;
  }
  return true;
}

/**
 * Erstellt eine Validierungs-Middleware mit den Standard-Validatoren.
 */
export function createDefaultValidationMiddleware(throwOnError = false) {
  return validationMiddleware(
    [validateResourcesNonNegative, validateHeroLevel, validateStatPoints],
    throwOnError
  );
}

export default validationMiddleware;