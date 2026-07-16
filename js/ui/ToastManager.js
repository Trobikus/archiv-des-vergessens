// --- START OF FILE ui/ToastManager.js ---

export default class ToastManager {
    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 100001;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 360px;
            width: 100%;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);

        // Event-Bus wird von außen injected
        this.eventBus = null;
        this._timeouts = new Map();
    }

    setEventBus(eventBus) {
        this.eventBus = eventBus;
        this.eventBus.subscribe('ui:showToast', (data) => {
            this.show(data.message, data.type || 'info', data.duration || 4000);
        });
    }

    /**
     * Zeigt einen Toast an.
     * @param {string} message – Nachricht
     * @param {string} type – 'info', 'success', 'warning', 'error'
     * @param {number} duration – Anzeigedauer in ms (0 = unendlich)
     * @param {string} action – optionaler Button-Text
     * @param {Function} onAction – Callback bei Button-Klick
     */
    show(message, type = 'info', duration = 4000, action = null, onAction = null) {
        const toast = document.createElement('div');
        toast.className = `toast-item toast-${type}`;
        toast.style.cssText = `
            background: rgba(10, 10, 18, 0.92);
            backdrop-filter: blur(8px);
            border: 1px solid ${this._getBorderColor(type)};
            border-radius: 8px;
            padding: 0.8rem 1.2rem;
            color: var(--color-text-main, #d0d0e0);
            font-family: var(--font-body, sans-serif);
            font-size: 0.9rem;
            pointer-events: auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            animation: slideInToast 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            display: flex;
            align-items: center;
            gap: 0.8rem;
            min-height: 48px;
        `;

        // Icon je nach Typ
        const iconMap = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        const icon = document.createElement('span');
        icon.textContent = iconMap[type] || 'ℹ️';
        icon.style.fontSize = '1.2rem';
        toast.appendChild(icon);

        const textSpan = document.createElement('span');
        textSpan.style.flex = '1';
        textSpan.textContent = message;
        toast.appendChild(textSpan);

        if (action && onAction) {
            const btn = document.createElement('button');
            btn.textContent = action;
            btn.className = 'glass-btn btn-small';
            btn.style.padding = '0.3rem 0.8rem';
            btn.style.fontSize = '0.8rem';
            btn.addEventListener('click', () => {
                onAction();
                this._removeToast(toast);
            });
            toast.appendChild(btn);
        }

        // Schließen-Button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: #666;
            font-size: 1.4rem;
            cursor: pointer;
            padding: 0 0.2rem;
            line-height: 1;
        `;
        closeBtn.addEventListener('click', () => this._removeToast(toast));
        toast.appendChild(closeBtn);

        this.container.appendChild(toast);

        // Automatisches Entfernen
        if (duration > 0) {
            const timeoutId = setTimeout(() => this._removeToast(toast), duration);
            this._timeouts.set(toast, timeoutId);
        }

        // Hover = Pause
        toast.addEventListener('mouseenter', () => {
            const tid = this._timeouts.get(toast);
            if (tid) {
                clearTimeout(tid);
                this._timeouts.delete(toast);
            }
        });
        toast.addEventListener('mouseleave', () => {
            if (duration > 0 && toast.parentNode) {
                const newTid = setTimeout(() => this._removeToast(toast), duration);
                this._timeouts.set(toast, newTid);
            }
        });
    }

    _removeToast(toast) {
        if (!toast.parentNode) return;
        const tid = this._timeouts.get(toast);
        if (tid) {
            clearTimeout(tid);
            this._timeouts.delete(toast);
        }
        toast.style.animation = 'slideOutToast 0.25s ease forwards';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }

    _getBorderColor(type) {
        switch (type) {
            case 'success': return 'rgba(74, 222, 128, 0.4)';
            case 'warning': return 'rgba(251, 191, 36, 0.4)';
            case 'error': return 'rgba(248, 113, 113, 0.4)';
            default: return 'rgba(255,255,255,0.08)';
        }
    }

    // CSS-Animationen (einmalig hinzufügen)
    static injectStyles() {
        if (document.getElementById('toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideInToast {
                from { opacity: 0; transform: translateX(40px); }
                to { opacity: 1; transform: translateX(0); }
            }
            @keyframes slideOutToast {
                from { opacity: 1; transform: translateX(0); }
                to { opacity: 0; transform: translateX(40px); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Statische Initialisierung
ToastManager.injectStyles();