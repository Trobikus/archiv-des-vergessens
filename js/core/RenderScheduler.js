// ============================================================
// FILE: core/RenderScheduler.js – Rendering Scheduler
// ============================================================

/**
 * Zentraler Render-Scheduler für alle UI-Komponenten.
 * Verhindert übermäßige Rendering-Zyklen durch Debouncing.
 */
export class RenderScheduler {
    constructor() {
        this._renderQueue = new Map();
        this._renderScheduled = false;
        this._animationFrameId = null;
        this._destroyed = false;
    }

    /**
     * Registriert eine Render-Funktion für eine Komponente.
     * @param {string} id – Eindeutige ID der Komponente
     * @param {Function} renderFn – Die Render-Funktion
     * @param {number} priority – Priorität (höher = früher)
     */
    register(id, renderFn, priority = 0) {
        if (this._destroyed) return;
        this._renderQueue.set(id, { renderFn, priority, dirty: true });
        this._schedule();
    }

    /**
     * Markiert eine Komponente als "dirty" (muss neu gerendert werden).
     */
    markDirty(id) {
        if (this._destroyed) return;
        const entry = this._renderQueue.get(id);
        if (entry) {
            entry.dirty = true;
            this._schedule();
        }
    }

    /**
     * Entfernt eine Komponente aus dem Scheduler.
     */
    unregister(id) {
        this._renderQueue.delete(id);
    }

    /**
     * Führt alle anstehenden Render-Operationen aus.
     */
    flush() {
        if (this._destroyed) return;
        if (this._animationFrameId) {
            cancelAnimationFrame(this._animationFrameId);
            this._animationFrameId = null;
        }
        this._renderScheduled = false;
        this._executeRenders();
    }

    _schedule() {
        if (this._destroyed || this._renderScheduled) return;
        this._renderScheduled = true;
        this._animationFrameId = requestAnimationFrame(() => {
            this._animationFrameId = null;
            this._renderScheduled = false;
            this._executeRenders();
        });
    }

    _executeRenders() {
        // Sortiere nach Priorität (höhere zuerst)
        const entries = Array.from(this._renderQueue.entries())
            .filter(([, entry]) => entry.dirty)
            .sort((a, b) => b[1].priority - a[1].priority);

        for (const [id, entry] of entries) {
            try {
                entry.renderFn();
                entry.dirty = false;
            } catch (error) {
                console.error(`[RenderScheduler] Fehler in Komponente ${id}:`, error);
                entry.dirty = false; // Verhindert Endlosschleife
            }
        }
    }

    /**
     * Gibt Statistiken zurück.
     */
    getStats() {
        const total = this._renderQueue.size;
        const dirty = Array.from(this._renderQueue.values()).filter(e => e.dirty).length;
        return { total, dirty, scheduled: this._renderScheduled };
    }

    destroy() {
        this._destroyed = true;
        if (this._animationFrameId) {
            cancelAnimationFrame(this._animationFrameId);
            this._animationFrameId = null;
        }
        this._renderQueue.clear();
        this._renderScheduled = false;
    }
}

// Singleton für die gesamte Anwendung
export const renderScheduler = new RenderScheduler();