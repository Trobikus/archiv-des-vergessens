// ============================================================
// FILE: core/DeltaSaver.js – Inkrementelles Speichern
// ============================================================

import { Sanitizer } from './security.js';

/**
 * DeltaSaver – speichert nur geänderte Daten.
 * Reduziert die Serialisierungs- und Speicherlast erheblich.
 */
export class DeltaSaver {
    constructor() {
        this._lastState = null;
        this._currentState = null;
        this._dirtyManagers = new Set();
        this._saveCallback = null;
        this._debounceTimer = null;
        this._debounceMs = 500;
        this._isSaving = false;
    }

    /**
     * Setzt die Save-Funktion.
     */
    setSaveCallback(callback) {
        this._saveCallback = callback;
    }

    /**
     * Setzt das Debounce-Intervall.
     */
    setDebounce(ms) {
        this._debounceMs = Math.max(100, ms);
    }

    /**
     * Markiert einen Manager als "dirty" (muss gespeichert werden).
     */
    markDirty(managerKey) {
        this._dirtyManagers.add(managerKey);
        this._schedule();
    }

    /**
     * Aktualisiert den aktuellen State (wird bei jedem Tick aufgerufen).
     */
    updateState(state) {
        this._currentState = state;
    }

    _schedule() {
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
        }
        this._debounceTimer = setTimeout(() => {
            this._debounceTimer = null;
            this._save();
        }, this._debounceMs);
    }

    async _save() {
        if (this._isSaving || !this._saveCallback || this._dirtyManagers.size === 0) return;
        this._isSaving = true;

        try {
            // Nur die dirty Manager serialisieren
            const delta = {};
            for (const key of this._dirtyManagers) {
                // Hier müsste der Manager seinen aktuellen State liefern
                // (wird über die Manager-Instanzen gelöst)
                delta[key] = true; // Platzhalter
            }

            // Save-Callback aufrufen
            await this._saveCallback(delta);

            // Dirty-Liste leeren
            this._dirtyManagers.clear();

        } catch (error) {
            console.error('[DeltaSaver] Speichern fehlgeschlagen:', error);
        } finally {
            this._isSaving = false;
        }
    }

    /**
     * Sofortiges Speichern (erzwingt Flush).
     */
    async saveNow() {
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = null;
        }
        await this._save();
    }

    destroy() {
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = null;
        }
        this._dirtyManagers.clear();
        this._saveCallback = null;
        this._isSaving = false;
    }
}