// ============================================================
// FILE: js/core/TransitionManager.js – UI-Übergänge
// ============================================================

export default class TransitionManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.activeTransitions = new Map();
        this.defaultDuration = 300;
        this.easing = 'cubic-bezier(0.4, 0, 0.2, 1)';

        this._bindEvents();
    }

    _bindEvents() {
        if (!this.eventBus) return;
        this.eventBus.subscribe('game:stateChanged', () => { /* optional */ });
    }

    fadeIn(element, duration = null, callback = null) {
        const d = duration || this.defaultDuration;
        if (!element) return;
        element.style.display = '';
        element.style.opacity = '0';
        element.style.transition = `opacity ${d}ms ${this.easing}`;
        void element.offsetHeight;
        element.style.opacity = '1';
        if (callback) setTimeout(callback, d);
        return d;
    }

    fadeOut(element, duration = null, callback = null) {
        const d = duration || this.defaultDuration;
        if (!element) return;
        element.style.transition = `opacity ${d}ms ${this.easing}`;
        element.style.opacity = '0';
        if (callback) {
            setTimeout(() => { element.style.display = 'none'; callback(); }, d);
        } else {
            setTimeout(() => { element.style.display = 'none'; }, d);
        }
        return d;
    }

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
        if (callback) setTimeout(callback, d);
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
            setTimeout(() => { element.style.display = 'none'; callback(); }, d);
        } else {
            setTimeout(() => { element.style.display = 'none'; }, d);
        }
        return d;
    }

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
        if (callback) setTimeout(callback, d);
        return d;
    }

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
}