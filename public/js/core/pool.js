// =====================================================
// DOMPool – Object Pooling für Performance
// =====================================================
export default class DOMPool {
  constructor(createFn, initialSize = 20) {
    this.pool = [];
    this.createFn = createFn;
    
    // Pool initial füllen
    for (let i = 0; i < initialSize; i++) {
      const el = this.createFn();
      el.style.display = 'none';
      document.body.appendChild(el);
      this.pool.push(el);
    }
  }

  get() {
    // Suche ein freies Element
    let el = this.pool.find(e => e.style.display === 'none');
    if (!el) {
      // Pool erweitern, falls alle belegt sind
      el = this.createFn();
      document.body.appendChild(el);
      this.pool.push(el);
    }
    el.style.display = '';
    return el;
  }

  release(el) {
    el.style.display = 'none';
    // Reset inline styles
    el.style.transform = '';
    el.style.opacity = '';
    el.style.left = '';
    el.style.top = '';
    el.className = el.dataset.baseClass || '';
  }
}