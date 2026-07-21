// ============================================================
// FILE: js/core/pool.js – DOM-Pool für Floating-Texts
// ============================================================

export default class DOMPool {
    constructor(createFn, initialSize = 20) {
        this.pool = []; // free list (only inactive elements)
        this.active = new Set(); // active elements
        this.createFn = createFn;
        this._destroyed = false;
        this._cleanupInterval = null;

        for (let i = 0; i < initialSize; i++) {
            const el = this.createFn();
            el.style.display = 'none';
            document.body.appendChild(el);
            this.pool.push(el);
        }

        this._cleanupInterval = setInterval(() => this._cleanup(), 60000);
    }

    get() {
        if (this._destroyed) {
            console.warn('[DOMPool] Zugriff auf zerstörten Pool');
            return this.createFn();
        }

        let el = this.pool.pop();
        if (!el) {
            el = this.createFn();
            document.body.appendChild(el);
        }
        el.style.display = '';
        el.style.pointerEvents = 'none';
        this.active.add(el);
        return el;
    }

    release(el) {
        if (this._destroyed || !el) return;
        el.style.display = 'none';
        el.style.transform = '';
        el.style.opacity = '';
        el.style.left = '';
        el.style.top = '';
        el.style.pointerEvents = '';
        el.className = el.dataset.baseClass || '';
        if (this.active.delete(el)) {
            this.pool.push(el);
        }
    }

    _cleanup() {
        if (this._destroyed) return;
        // Bereinige aktive Elemente, die manuell ausgeblendet wurden
        for (const el of this.active) {
            if (el.style.display === 'none') {
                this.active.delete(el);
                this.pool.push(el);
            }
        }
        // Pool verkleinern falls zu groß
        const totalSize = this.pool.length + this.active.size;
        if (totalSize > 50 && this.pool.length > 0) {
            const excess = totalSize - 50;
            const toRemove = this.pool.splice(0, Math.min(excess, this.pool.length));
            for (const el of toRemove) {
                if (el.parentNode) el.parentNode.removeChild(el);
            }
        }
    }

    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;

        if (this._cleanupInterval) {
            clearInterval(this._cleanupInterval);
            this._cleanupInterval = null;
        }

        for (const el of this.pool) {
            if (el.parentNode) el.parentNode.removeChild(el);
        }
        for (const el of this.active) {
            if (el.parentNode) el.parentNode.removeChild(el);
        }
        this.pool = [];
        this.active.clear();
        this.createFn = null;
    }

    getStats() {
        return {
            total: this.pool.length + this.active.size,
            active: this.active.size,
            available: this.pool.length
        };
    }
}