// --- START OF FILE ui/animations.js ---

import TransitionManager from '../core/TransitionManager.js';

export default class UIAnimations {
    constructor(context) {
        this.context = context;
        this.eventBus = context.eventBus;
        this.transition = new TransitionManager(this.eventBus);
        this.animations = new Map();

        // Canvas für VFX (in particles.js integriert)
        this.fxCanvas = document.getElementById('fx-canvas');
        this.fxCtx = this.fxCanvas ? this.fxCanvas.getContext('2d') : null;

        // DOM-Animationen
        this._bindEvents();
    }

    _bindEvents() {
        if (!this.eventBus) return;

        // Bei Ressourcen-Updates: kleine Aufblitz-Animation
        this.eventBus.subscribe('resources:updated', (data) => {
            // Die ClanUI macht bereits ein Pulsen
        });

        // Bei Erfolgen: Confetti-Effekt
        this.eventBus.subscribe('achievement:unlocked', () => {
            this.confettiEffect();
        });

        // Bei Boss-Siegen: Explosion-Effekt
        this.eventBus.subscribe('story:battleResult', (data) => {
            if (data.victory) this.bossVictoryEffect();
        });
    }

    // ---- DOM-ANIMATIONEN ----

    // Sanftes Einblenden eines Elements
    fadeInElement(element, duration = 300) {
        return this.transition.fadeIn(element, duration);
    }

    // Sanftes Ausblenden
    fadeOutElement(element, duration = 300) {
        return this.transition.fadeOut(element, duration);
    }

    // Vom Hub zum Spiel oder zurück
    transitionView(fromEl, toEl, direction = 'right', duration = 300) {
        return new Promise((resolve) => {
            this.transition.slideOut(fromEl, direction, duration, () => {
                toEl.style.display = 'flex';
                this.transition.slideIn(toEl, direction, duration, () => {
                    resolve();
                });
            });
        });
    }

    // Puls-Effekt für Buttons
    pulseButton(button, intensity = 1, duration = 300) {
        if (!button) return;
        const originalScale = button.style.transform || 'scale(1)';
        const scale = 1 + (0.05 * intensity);
        button.style.transition = `transform ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
        button.style.transform = `scale(${scale})`;
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, duration);
    }

    // Shake-Effekt
    shakeElement(element, intensity = 5, duration = 300) {
        if (!element) return;
        const originalX = 0;
        const shake = (iter, total) => {
            if (iter > total) {
                element.style.transform = 'translateX(0)';
                return;
            }
            const offset = (Math.random() - 0.5) * intensity * 2 * (1 - iter / total);
            element.style.transform = `translateX(${offset}px)`;
            setTimeout(() => shake(iter + 1, total), duration / total);
        };
        shake(0, 8);
    }

    // ---- CANVAS-ANIMATIONEN ----

    // Confetti-Effekt bei Erfolgen
    confettiEffect(count = 60) {
        if (!this.fxCtx || !this.fxCanvas) return;

        const w = this.fxCanvas.width;
        const h = this.fxCanvas.height;
        const particles = [];
        const colors = ['#d4af37', '#6e9fcb', '#4ade80', '#f87171', '#c4b5fd', '#fbbf24'];

        for (let i = 0; i < count; i++) {
            particles.push({
                x: w / 2 + (Math.random() - 0.5) * 100,
                y: h / 2 - 50,
                vx: (Math.random() - 0.5) * 12,
                vy: -Math.random() * 10 - 4,
                size: 4 + Math.random() * 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1,
                decay: 0.005 + Math.random() * 0.01,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 0.2
            });
        }

        const animate = () => {
            let alive = false;
            this.fxCtx.clearRect(0, 0, w, h);
            this.fxCtx.globalCompositeOperation = 'lighter';

            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.15;
                p.vx *= 0.99;
                p.life -= p.decay;
                p.rotation += p.rotSpeed;

                if (p.life > 0) {
                    alive = true;
                    this.fxCtx.save();
                    this.fxCtx.globalAlpha = p.life;
                    this.fxCtx.translate(p.x, p.y);
                    this.fxCtx.rotate(p.rotation);
                    this.fxCtx.fillStyle = p.color;
                    this.fxCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
                    this.fxCtx.restore();
                }
            }

            this.fxCtx.globalCompositeOperation = 'source-over';

            if (alive) {
                requestAnimationFrame(animate);
            } else {
                this.fxCtx.clearRect(0, 0, w, h);
            }
        };

        animate();
    }

    // Boss-Sieg-Effekt (Explosion + Goldener Regen)
    bossVictoryEffect() {
        this.confettiEffect(100);
        // Zusätzlich goldener Blitz (wird bereits in storyui.js gemacht)
    }

    // Ressourcen-Partikel beim Sammeln (wird bereits in particles.js gemacht)
    // Aber wir können einen zusätzlichen Glow-Effekt hinzufügen

    // Level-Up-Effekt
    levelUpEffect(element) {
        if (!element) return;
        element.style.transition = 'all 0.5s ease';
        element.style.textShadow = '0 0 30px #d4af37, 0 0 60px #d4af37';
        element.style.color = '#d4af37';
        setTimeout(() => {
            element.style.textShadow = '';
            element.style.color = '';
        }, 600);
    }

    // ---- MODAL-ÜBERGÄNGE ----

    openModal(modalElement, overlayElement) {
        return this.transition.openModal(modalElement, overlayElement);
    }

    closeModal(modalElement, overlayElement) {
        return this.transition.closeModal(modalElement, overlayElement);
    }
}