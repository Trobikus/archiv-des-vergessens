export default class BaseModalUI {
  constructor(overlayId, closeBtnId) {
    this.isOpen = false;
    this.isDestroyed = false;
    this.overlay = document.getElementById(overlayId);
    this.closeBtn = document.getElementById(closeBtnId);

    // Bindung zur einmaligen Listener-Zuweisung
    this._boundClose = this.close.bind(this);
    this._boundOverlayClick = this._onOverlayClick.bind(this);

    // Event-Listener für späteres Cleanup speichern
    this._eventListeners = [];

    this.initEventListeners();
  }

  initEventListeners() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', this._boundClose);
      this._eventListeners.push({ element: this.closeBtn, event: 'click', handler: this._boundClose });
    }
    if (this.overlay) {
      this.overlay.addEventListener('click', this._boundOverlayClick);
      this._eventListeners.push({ element: this.overlay, event: 'click', handler: this._boundOverlayClick });
    }
  }

  _onOverlayClick(e) {
    if (e.target === this.overlay) {
      this.close();
    }
  }

  open() {
    if (this.isDestroyed || !this.overlay) return;
    this.isOpen = true;
    this.overlay.style.display = 'flex';
    this.overlay.classList.remove('hidden');
    this.onOpen();
  }

  close() {
    if (this.isDestroyed || !this.overlay) return;
    this.isOpen = false;
    this.overlay.style.display = 'none';
    this.overlay.classList.add('hidden');
    this.onClose();
  }

  onOpen() { }
  onClose() { }

  // ---- DESTROY: Vollständige Bereinigung aller Listener ----
  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.isOpen = false;

    // Alle Event-Listener entfernen
    for (const entry of this._eventListeners) {
      entry.element.removeEventListener(entry.event, entry.handler);
    }
    this._eventListeners = [];

    // Referenzen freigeben
    this.overlay = null;
    this.closeBtn = null;
    this._boundClose = null;
    this._boundOverlayClick = null;
  }

  // ---- Sicherer close mit Destroy-Fallback ----
  safeClose() {
    if (this.isDestroyed) return;
    this.close();
  }
}