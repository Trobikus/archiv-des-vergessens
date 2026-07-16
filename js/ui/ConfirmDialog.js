// --- START OF FILE ui/ConfirmDialog.js ---

import BaseModalUI from './basemodal.js';

export default class ConfirmDialog extends BaseModalUI {
    constructor() {
        super('confirm-overlay', null);
        this._createElements();
        this._resolve = null;
        this._reject = null;
    }

    _createElements() {
        if (document.getElementById('confirm-overlay')) return;

        this.overlay = document.createElement('div');
        this.overlay.id = 'confirm-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.75);
            backdrop-filter: blur(4px);
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 100000;
            animation: fadeInOverlay 0.25s ease;
        `;

        this.modal = document.createElement('div');
        this.modal.className = 'glass-panel';
        this.modal.style.cssText = `
            max-width: 480px;
            width: 90vw;
            padding: 2rem 2rem 1.8rem;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: var(--border-radius-lg, 12px);
            animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        `;

        this.titleEl = document.createElement('h3');
        this.titleEl.className = 'glow-text cinzel text-center';
        this.titleEl.style.cssText = 'margin-bottom: 0.5rem; font-size: 1.3rem;';

        this.descEl = document.createElement('div');
        this.descEl.className = 'text-muted text-center';
        this.descEl.style.cssText = 'margin-bottom: 1.5rem; line-height: 1.6;';

        this.warningEl = document.createElement('div');
        this.warningEl.className = 'text-danger text-sm text-center';
        this.warningEl.style.cssText = 'margin-bottom: 1rem; display: none;';

        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display: flex; gap: 0.8rem; justify-content: center; flex-wrap: wrap;';

        this.confirmBtn = document.createElement('button');
        this.confirmBtn.className = 'glass-btn primary';
        this.confirmBtn.textContent = 'Bestätigen';
        this.confirmBtn.style.cssText = 'min-width: 100px; padding: 0.7rem 1.5rem;';

        this.cancelBtn = document.createElement('button');
        this.cancelBtn.className = 'glass-btn';
        this.cancelBtn.textContent = 'Abbrechen';
        this.cancelBtn.style.cssText = 'min-width: 100px; padding: 0.7rem 1.5rem;';

        btnContainer.appendChild(this.cancelBtn);
        btnContainer.appendChild(this.confirmBtn);

        this.modal.appendChild(this.titleEl);
        this.modal.appendChild(this.descEl);
        this.modal.appendChild(this.warningEl);
        this.modal.appendChild(btnContainer);
        this.overlay.appendChild(this.modal);
        document.body.appendChild(this.overlay);

        // Events binden
        this.confirmBtn.addEventListener('click', () => this._resolve(true));
        this.cancelBtn.addEventListener('click', () => this._resolve(false));
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this._resolve(false);
        });

        // CSS für Animationen
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOverlay {
                from { opacity: 0; } to { opacity: 1; }
            }
            @keyframes scaleIn {
                from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Zeigt einen Bestätigungsdialog an.
     * @param {string} title – Titel (z.B. "Prestige durchführen?")
     * @param {string} description – Beschreibung der Konsequenzen
     * @param {string} warning – optionale Warnung (rot hervorgehoben)
     * @param {string} confirmText – Text für Bestätigungs-Button (default: "Bestätigen")
     * @param {string} cancelText – Text für Abbrechen-Button (default: "Abbrechen")
     * @returns {Promise<boolean>} – true bei Bestätigung, false bei Abbruch
     */
    async show(title, description, warning = '', confirmText = 'Bestätigen', cancelText = 'Abbrechen') {
        this.titleEl.textContent = title;
        this.descEl.textContent = description;
        if (warning) {
            this.warningEl.textContent = '⚠️ ' + warning;
            this.warningEl.style.display = 'block';
        } else {
            this.warningEl.style.display = 'none';
        }
        this.confirmBtn.textContent = confirmText;
        this.cancelBtn.textContent = cancelText;

        this.open();
        return new Promise((resolve) => {
            this._resolve = resolve;
        }).then((result) => {
            this.close();
            return result;
        });
    }

    onOpen() {
        // Overlay sichtbar machen
    }

    onClose() {
        // Cleanup
    }

    _resolve(value) {
        if (this._resolve) {
            this._resolve(value);
            this._resolve = null;
        }
    }

    // Static-Methode für einfachen Aufruf
    static async ask(title, description, warning = '', confirmText = 'Bestätigen', cancelText = 'Abbrechen') {
        const instance = new ConfirmDialog();
        return instance.show(title, description, warning, confirmText, cancelText);
    }
}