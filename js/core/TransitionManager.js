// --- START OF FILE core/TransitionManager.js ---

export default class TransitionManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.activeTransitions = new Map();
        this.defaultDuration = 300;
        this.easing = 'cubic-bezier(0.4, 0, 0.2, 1)';

        // Event-Bus abonnieren
        this._bindEvents();
    }

    _bindEvents() {
        if (!this.eventBus) return;
        // Navigation-Übergänge
        this.eventBus.subscribe('game:stateChanged', (data) => {
            if (data.newState === 'running' || data.newState === 'paused') {
                // Sanfte Transition
            }
        });
    }

    // ---- FADE ÜBERGÄNGE ----

    fadeIn(element, duration = null, callback = null) {
        const d = duration || this.defaultDuration;
        if (!element) return;

        // Element sichtbar machen
        element.style.display = '';
        element.style.opacity = '0';
        element.style.transition = `opacity ${d}ms ${this.easing}`;

        // Force reflow
        void element.offsetHeight;

        element.style.opacity = '1';

        if (callback) {
            setTimeout(callback, d);
        }

        return d;
    }

    fadeOut(element, duration = null, callback = null) {
        const d = duration || this.defaultDuration;
        if (!element) return;

        element.style.transition = `opacity ${d}ms ${this.easing}`;
        element.style.opacity = '0';

        if (callback) {
            setTimeout(() => {
                element.style.display = 'none';
                callback();
            }, d);
        } else {
            setTimeout(() => {
                element.style.display = 'none';
            }, d);
        }

        return d;
    }

    // ---- SLIDE ÜBERGÄNGE ----

    slideIn(element, direction = 'right', duration = null, callback = null) {
        const d = duration || this.defaultDuration;
        if (!element) return;

        const dirMap = {
            right: { start: 'translateX(30px)', end: 'translateX(0)' },
            left: { start: 'translateX(-30px)', end: 'translateX(0)' },
            up: { start: 'translateY(30px)', end: 'translateY(0)' },
            down: { start: 'translateY(-30px)', end: 'translateY(0)' }
        };

        const dir = dirMap[direction] || dirMap.right;

        element.style.display = '';
        element.style.opacity = '0';
        element.style.transform = dir.start;
        element.style.transition = `all ${d}ms ${this.easing}`;

        void element.offsetHeight;

        element.style.opacity = '1';
        element.style.transform = dir.end;

        if (callback) {
            setTimeout(callback, d);
        }

        return d;
    }

    slideOut(element, direction = 'right', duration = null, callback = null) {
        const d = duration || this.defaultDuration;
        if (!element) return;

        const dirMap = {
            right: { end: 'translateX(30px)' },
            left: { end: 'translateX(-30px)' },
            up: { end: 'translateY(30px)' },
            down: { end: 'translateY(-30px)' }
        };

        const dir = dirMap[direction] || dirMap.right;

        element.style.transition = `all ${d}ms ${this.easing}`;
        element.style.opacity = '0';
        element.style.transform = dir.end;

        if (callback) {
            setTimeout(() => {
                element.style.display = 'none';
                callback();
            }, d);
        } else {
            setTimeout(() => {
                element.style.display = 'none';
            }, d);
        }

        return d;
    }

    // ---- SKALIERUNGS-ÜBERGÄNGE ----

    scaleIn(element, duration = null, callback = null) {
        const d = duration || this.defaultDuration;
        if (!element) return;

        element.style.display = '';
        element.style.opacity = '0';
        element.style.transform = 'scale(0.9)';
        element.style.transition = `all ${d}ms ${this.easing}`;

        void element.offsetHeight;

        element.style.opacity = '1';
        element.style.transform = 'scale(1)';

        if (callback) {
            setTimeout(callback, d);
        }

        return d;
    }

    // ---- SEQUENZIELLE ÜBERGÄNGE ----

    sequence(elements, transitionFn, delay = 100, duration = null, callback = null) {
        if (!elements || elements.length === 0) {
            if (callback) callback();
            return;
        }

        let index = 0;
        const total = elements.length;

        const next = () => {
            if (index >= total) {
                if (callback) callback();
                return;
            }
            const el = elements[index];
            transitionFn(el, duration, () => {
                index++;
                setTimeout(next, delay);
            });
        };

        next();
    }

    // ---- HILFSMETHODEN ----

    // Für Modal-Öffnungen
    openModal(modalElement, overlayElement, callback = null) {
        if (overlayElement) {
            overlayElement.style.display = 'flex';
            overlayElement.style.opacity = '0';
            overlayElement.style.transition = `opacity 250ms ease`;
            void overlayElement.offsetHeight;
            overlayElement.style.opacity = '1';
        }

        if (modalElement) {
            modalElement.style.transform = 'scale(0.95)';
            modalElement.style.opacity = '0';
            modalElement.style.transition = `all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
            void modalElement.offsetHeight;
            modalElement.style.transform = 'scale(1)';
            modalElement.style.opacity = '1';
        }

        if (callback) setTimeout(callback, 300);
    }

    closeModal(modalElement, overlayElement, callback = null) {
        if (modalElement) {
            modalElement.style.transform = 'scale(0.95)';
            modalElement.style.opacity = '0';
        }

        if (overlayElement) {
            overlayElement.style.opacity = '0';
        }

        setTimeout(() => {
            if (overlayElement) overlayElement.style.display = 'none';
            if (modalElement) modalElement.style.display = 'none';
            if (callback) callback();
        }, 300);
    }

    // ---- CSS-KLASSEN-HELPER ----

    addTransitionClass(element, className, duration = null, callback = null) {
        const d = duration || this.defaultDuration;
        if (!element) return;

        element.style.transition = `all ${d}ms ${this.easing}`;
        element.classList.add(className);

        if (callback) {
            setTimeout(callback, d);
        }
    }

    removeTransitionClass(element, className, duration = null, callback = null) {
        const d = duration || this.defaultDuration;
        if (!element) return;

        element.style.transition = `all ${d}ms ${this.easing}`;
        element.classList.remove(className);

        if (callback) {
            setTimeout(callback, d);
        }
    }

    // ---- EVENT-HELPER ----

    // Für Listener, die nach einer Transition entfernt werden
    onceAfterTransition(element, eventName, callback) {
        const handler = (e) => {
            if (e.target === element) {
                element.removeEventListener(eventName, handler);
                callback(e);
            }
        };
        element.addEventListener(eventName, handler);
    }
}