// --- START OF FILE ui/LoadingUI.js ---

import BaseModalUI from './basemodal.js';

export default class LoadingUI extends BaseModalUI {
    constructor() {
        // Kein Overlay, sondern ein eigenes Fixed-Element
        super('loading-overlay', null);
        this._createElements();
        this.progress = 0;
        this.text = '';
        this.visible = false;
    }

    _createElements() {
        // Prüfen, ob bereits ein Loading-Overlay existiert
        if (document.getElementById('loading-overlay')) return;

        this.overlay = document.createElement('div');
        this.overlay.id = 'loading-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.92);
            backdrop-filter: blur(8px);
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            transition: opacity 0.4s ease;
        `;

        // Glühendes Symbol
        this.icon = document.createElement('div');
        this.icon.textContent = '🏛️';
        this.icon.style.cssText = `
            font-size: 4rem;
            margin-bottom: 1rem;
            animation: pulse-glow 1.2s ease-in-out infinite alternate;
        `;

        // Fortschrittsbalken-Container
        const barContainer = document.createElement('div');
        barContainer.style.cssText = `
            width: 300px;
            max-width: 70vw;
            height: 8px;
            background: rgba(255,255,255,0.08);
            border-radius: 4px;
            overflow: hidden;
            margin: 0.5rem 0;
        `;

        this.bar = document.createElement('div');
        this.bar.style.cssText = `
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #c5a059, #f5d98a);
            border-radius: 4px;
            transition: width 0.2s ease;
        `;
        barContainer.appendChild(this.bar);

        this.textEl = document.createElement('div');
        this.textEl.style.cssText = `
            color: #a0a0b0;
            font-family: var(--font-body, sans-serif);
            font-size: 0.9rem;
            margin-top: 0.5rem;
            min-height: 1.5rem;
            text-align: center;
        `;

        // Status-Animation (Punkte)
        this.statusDots = document.createElement('span');
        this.statusDots.textContent = '...';
        this.statusDots.style.cssText = `
            display: inline-block;
            min-width: 2rem;
            letter-spacing: 2px;
        `;

        this.overlay.appendChild(this.icon);
        this.overlay.appendChild(barContainer);
        this.overlay.appendChild(this.textEl);
        document.body.appendChild(this.overlay);

        // CSS-Animation für Glow
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse-glow {
                0% { filter: drop-shadow(0 0 5px rgba(197,160,89,0.3)); transform: scale(1); }
                100% { filter: drop-shadow(0 0 30px rgba(197,160,89,0.8)); transform: scale(1.05); }
            }
        `;
        document.head.appendChild(style);

        // Schließen-Button (für Notfälle)
        this.closeBtn = document.createElement('button');
        this.closeBtn.textContent = '✕';
        this.closeBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 30px;
            background: none;
            border: none;
            color: #666;
            font-size: 1.8rem;
            cursor: pointer;
            opacity: 0.3;
            transition: opacity 0.2s;
        `;
        this.closeBtn.addEventListener('mouseenter', () => this.closeBtn.style.opacity = '1');
        this.closeBtn.addEventListener('mouseleave', () => this.closeBtn.style.opacity = '0.3');
        this.closeBtn.addEventListener('click', () => this.hide());
        this.overlay.appendChild(this.closeBtn);
    }

    show(text = 'Lade Archiv...', progress = 0) {
        this.visible = true;
        this.progress = Math.min(100, Math.max(0, progress));
        this.text = text;
        this.overlay.style.display = 'flex';
        this.overlay.style.opacity = '1';
        this._updateUI();
        // Animation starten
        this._dotInterval = setInterval(() => {
            if (!this.visible) return;
            const dots = this.statusDots.textContent;
            this.statusDots.textContent = dots.length >= 3 ? '.' : dots + '.';
        }, 400);
    }

    setProgress(progress, text = null) {
        this.progress = Math.min(100, Math.max(0, progress));
        if (text) this.text = text;
        this._updateUI();
    }

    _updateUI() {
        this.bar.style.width = this.progress + '%';
        this.textEl.innerHTML = `${this.text} <span style="color: #c5a059;">${Math.round(this.progress)}%</span>`;
    }

    hide() {
        this.visible = false;
        if (this._dotInterval) {
            clearInterval(this._dotInterval);
            this._dotInterval = null;
        }
        this.overlay.style.opacity = '0';
        setTimeout(() => {
            this.overlay.style.display = 'none';
        }, 400);
    }

    // Für Offline-Catchup: spezielle Anzeige
    showOfflineCatchup(timeStr) {
        this.show('Erinnerungen kehren zurück...', 0);
        this.textEl.innerHTML = `⏳ Offline-Zeit: <span style="color: #c5a059;">${timeStr}</span><br>4× Geschwindigkeit aktiv`;
        // Fortschritt läuft automatisch über setProgress
    }
}