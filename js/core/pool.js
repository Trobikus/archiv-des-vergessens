export default class DOMPool {
  constructor(createFn, initialSize = 20) {
    this.pool = [];
    this.createFn = createFn;
    this._destroyed = false;
    this._cleanupInterval = null;

    // Pool initial füllen
    for (let i = 0; i < initialSize; i++) {
      const el = this.createFn();
      el.style.display = 'none';
      document.body.appendChild(el);
      this.pool.push(el);
    }

    // Regelmäßige Bereinigung von Elementen, die noch im DOM hängen
    this._cleanupInterval = setInterval(() => this._cleanup(), 30000);
  }

  get() {
    if (this._destroyed) {
      console.warn('[DOMPool] Zugriff auf zerstörten Pool');
      return this.createFn();
    }

    let el = this.pool.find(e => e.style.display === 'none');
    if (!el) {
      el = this.createFn();
      document.body.appendChild(el);
      this.pool.push(el);
    }
    el.style.display = '';
    el.style.pointerEvents = 'none';
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
  }

  _cleanup() {
    if (this._destroyed) return;
    // Entferne Elemente, die nicht mehr im Pool sind
    const validElements = new Set(this.pool);
    const allFloatTexts = document.querySelectorAll('.float-text');
    for (const el of allFloatTexts) {
      if (!validElements.has(el) && el.style.display === 'none') {
        el.remove();
      }
    }
  }

  // ---- DESTROY: Vollständige Bereinigung ----
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
    this.pool = [];
    this.createFn = null;

    // Alle verbliebenen Float-Texts entfernen
    const allFloatTexts = document.querySelectorAll('.float-text');
    for (const el of allFloatTexts) {
      el.remove();
    }
  }

  // ---- STATISTIK FÜR DEBUGGING ----
  getStats() {
    return {
      total: this.pool.length,
      active: this.pool.filter(e => e.style.display !== 'none').length,
      available: this.pool.filter(e => e.style.display === 'none').length
    };
  }
}