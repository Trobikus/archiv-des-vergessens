// ============================================================
// FILE: core/worker-manager.js – Verwaltung des Web Workers
// ============================================================

/**
 * Manager für den Security-Web-Worker.
 * Bietet eine Promise-basierte API für asynchrone, rechenintensive Aufgaben.
 */
export class WorkerManager {
    constructor() {
        this.worker = null;
        this.ready = false;
        this.pending = new Map();
        this.messageId = 0;
        this.readyPromise = null;
        this._init();
    }

    _init() {
        try {
            this.worker = new Worker(new URL('../workers/security-worker.js', import.meta.url), {
                type: 'module'
            });

            this.readyPromise = new Promise((resolve) => {
                this.worker.addEventListener('message', (event) => {
                    if (event.data.type === 'ready') {
                        this.ready = true;
                        resolve();
                        return;
                    }
                    this._handleMessage(event.data);
                });
            });

            this.worker.addEventListener('error', (error) => {
                console.error('[WorkerManager] Worker-Fehler:', error);
                this.ready = false;
                // Fehler an alle pending Promises weiterleiten
                for (const [, { reject }] of this.pending) {
                    reject(new Error(`Worker-Fehler: ${error.message}`));
                }
                this.pending.clear();
            });

        } catch (error) {
            console.warn('[WorkerManager] Worker konnte nicht initialisiert werden – Fallback-Modus aktiv:', error);
            this.ready = false;
            this.readyPromise = Promise.resolve();
            this._fallbackMode = true;
        }
    }

    _handleMessage(data) {
        const { id, success, result, error } = data;
        const pending = this.pending.get(id);
        if (!pending) return;

        if (success) {
            pending.resolve(result);
        } else {
            pending.reject(new Error(error?.message || 'Unbekannter Worker-Fehler'));
        }
        this.pending.delete(id);
    }

    /**
     * Führt eine Aufgabe im Worker aus (oder im Fallback-Modus synchron).
     * @param {string} type – Befehlstyp (z.B. 'integrity:check')
     * @param {*} payload – Daten für die Operation
     * @returns {Promise<*>}
     */
    async execute(type, payload) {
        // Warten auf Worker-Bereitschaft
        await this.readyPromise;

        // Fallback-Modus: synchron im Hauptthread ausführen
        if (this._fallbackMode || !this.ready) {
            return this._executeFallback(type, payload);
        }

        const id = ++this.messageId;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            try {
                this.worker.postMessage({ type, id, payload });
            } catch (error) {
                this.pending.delete(id);
                reject(error);
            }
        });
    }

    /**
     * Führt mehrere Operationen in einem Batch aus.
     */
    async batch(operations) {
        return this.execute('batch', { operations });
    }

    /**
     * Fallback-Implementierung für den Fall, dass der Worker nicht verfügbar ist.
     */
    _executeFallback(type, payload) {
        // Importiere die benötigten Module dynamisch (um Zirkelabhängigkeiten zu vermeiden)
        return import('./security.js').then(({ IntegrityChecker, Checksum }) => {
            switch (type) {
                case 'integrity:check':
                    return IntegrityChecker.checkAll(payload);
                case 'integrity:repair':
                    return IntegrityChecker.repair(payload);
                case 'checksum:calculate':
                    return Checksum.calculate(payload);
                case 'serialize':
                    return JSON.stringify(payload);
                case 'deserialize':
                    return JSON.parse(payload);
                default:
                    throw new Error(`Unbekannte Operation: ${type}`);
            }
        });
    }

    /**
     * Terminiert den Worker.
     */
    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.ready = false;
        }
        this.pending.clear();
    }

    /**
     * Prüft, ob der Worker verfügbar ist.
     */
    isAvailable() {
        return this.ready && !this._fallbackMode;
    }
}