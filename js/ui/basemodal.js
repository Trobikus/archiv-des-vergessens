export default class BaseModalUI {
  constructor(overlayId, closeBtnId) {
    this.isOpen = false;
    this.overlay = document.getElementById(overlayId);
    this.closeBtn = document.getElementById(closeBtnId);

    // Bindung zur einmaligen Listener-Zuweisung
    this._boundClose = this.close.bind(this);
    this._boundOverlayClick = this._onOverlayClick.bind(this);

    this.initEventListeners();
  }

  initEventListeners() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', this._boundClose);
    }
    if (this.overlay) {
      this.overlay.addEventListener('click', this._boundOverlayClick);
    }
  }

  _onOverlayClick(e) {
    if (e.target === this.overlay) {
      this.close();
    }
  }

  open() {
    if (!this.overlay) return;
    this.isOpen = true;
    this.overlay.style.display = 'flex';
    this.overlay.classList.remove('hidden');
    this.onOpen();
  }

  close() {
    if (!this.overlay) return;
    this.isOpen = false;
    this.overlay.style.display = 'none';
    this.overlay.classList.add('hidden');
    this.onClose();
  }

  onOpen() { }
  onClose() { }

  // Ermöglicht das permanente Zerstören bei vollständigem App-Teardown
  destroy() {
    if (this.closeBtn) {
      this.closeBtn.removeEventListener('click', this._boundClose);
    }
    if (this.overlay) {
      this.overlay.removeEventListener('click', this._boundOverlayClick);
    }
  }
}