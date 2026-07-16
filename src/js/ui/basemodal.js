export default class BaseModalUI {
  constructor(overlayId, closeBtnId) {
    this.isOpen = false;
    this.overlay = document.getElementById(overlayId);
    this.closeBtn = document.getElementById(closeBtnId);

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close();
      });
    }
  }

  open() {
    if (!this.overlay) return;
    this.isOpen = true;
    this.overlay.style.display = 'flex';
    this.overlay.classList.remove('hidden'); // Fallback für ältere CSS-Klassen
    this.onOpen();
  }

  close() {
    if (!this.overlay) return;
    this.isOpen = false;
    this.overlay.style.display = 'none';
    this.overlay.classList.add('hidden');
    this.onClose();
  }

  // Lifecycle Hooks für die Kind-Klassen (können überschrieben werden)
  onOpen() {}
  onClose() {}
}