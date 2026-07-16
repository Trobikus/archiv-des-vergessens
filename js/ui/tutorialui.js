// --- START OF FILE ui/tutorialui.js ---

import { EVENTS } from '../core/events.js';

export default class TutorialUI {
  constructor(context) {
    this.eventBus = context.eventBus;
    this.tutorialManager = context.tutorialManager;

    this.createElements();
    this.bindEvents();
  }

  createElements() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'tutorial-overlay';

    this.overlay.style.display = 'none';
    this.overlay.style.position = 'fixed';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.width = '100vw';
    this.overlay.style.height = '100vh';
    this.overlay.style.zIndex = '99999';
    this.overlay.style.pointerEvents = 'none';

    this.highlight = document.createElement('div');
    this.highlight.className = 'tutorial-highlight';
    this.highlight.style.pointerEvents = 'none';

    this.dialog = document.createElement('div');
    this.dialog.id = 'tutorial-dialog';
    this.dialog.style.pointerEvents = 'auto';

    this.textEl = document.createElement('div');
    this.textEl.style.marginBottom = '1.5rem';
    this.textEl.style.lineHeight = '1.6';

    this.btnEl = document.createElement('button');
    this.btnEl.className = 'tutorial-btn';
    this.btnEl.textContent = 'Weiter';

    this.dialog.appendChild(this.textEl);
    this.dialog.appendChild(this.btnEl);
    this.overlay.appendChild(this.highlight);
    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);
  }

  bindEvents() {
    this.btnEl.addEventListener('click', () => {
      const step = this.tutorialManager.getCurrentStep();
      if (step && (step.action === 'next' || step.action === 'finish')) {
        this.tutorialManager.nextStep();
      }
    });

    this.eventBus.subscribe('tutorial:step', (step) => this.renderStep(step));
    this.eventBus.subscribe('tutorial:end', () => this.hide());

    // ---------- FIX: Korrekte Event-Überprüfung ----------
    this.eventBus.subscribeAll((eventName, data) => {
      this.checkCondition(eventName, data);
    });

    window.addEventListener('resize', () => {
      if (this.tutorialManager.isActive) {
        const step = this.tutorialManager.getCurrentStep();
        if (step) this.renderStep(step);
      }
    });
  }

  checkCondition(eventName, data) {
    if (!this.tutorialManager.isActive) return;
    const step = this.tutorialManager.getCurrentStep();

    if (step && step.action === 'wait_event' && step.eventName === eventName) {
      if (step.condition()) {
        this.tutorialManager.nextStep();
      }
    }
  }

  renderStep(step) {
    if (!step) return;
    this.overlay.style.display = 'block';
    this.textEl.innerHTML = step.text;

    if (step.action === 'wait_event') {
      this.btnEl.style.display = 'none';
    } else {
      this.btnEl.style.display = 'block';
      this.btnEl.textContent = step.action === 'finish' ? 'Verstanden!' : 'Weiter';
    }

    if (step.target) {
      // Timeout auf 350ms erhöht, um die CSS Fade-In Animation (0.3s) der Modals abzuwarten,
      // bevor die Koordinaten berechnet werden.
      setTimeout(() => {
        const targetEl = document.querySelector(step.target);
        if (targetEl) {
          const rect = targetEl.getBoundingClientRect();

          this.highlight.style.display = 'block';
          this.highlight.style.top = (rect.top - 8) + 'px';
          this.highlight.style.left = (rect.left - 8) + 'px';
          this.highlight.style.width = (rect.width + 16) + 'px';
          this.highlight.style.height = (rect.height + 16) + 'px';

          const dialogRect = this.dialog.getBoundingClientRect();
          const dialogWidth = dialogRect.width || 400;
          const dialogHeight = dialogRect.height || 180;

          const spaceAbove = rect.top;
          const spaceBelow = window.innerHeight - rect.bottom;

          let dialogTop, dialogLeft;

          if (spaceBelow >= dialogHeight + 20 || spaceBelow > spaceAbove) {
            dialogTop = rect.bottom + 20;
          } else {
            dialogTop = rect.top - dialogHeight - 20;
          }

          dialogLeft = rect.left + (rect.width / 2) - (dialogWidth / 2);
          dialogLeft = Math.max(10, Math.min(dialogLeft, window.innerWidth - dialogWidth - 10));

          this.dialog.style.transform = 'none';
          this.dialog.style.top = dialogTop + 'px';
          this.dialog.style.left = dialogLeft + 'px';
        }
      }, 350);
    } else {
      this.highlight.style.display = 'none';
      this.dialog.style.top = '50%';
      this.dialog.style.left = '50%';
      this.dialog.style.transform = 'translate(-50%, -50%)';
    }
  }

  hide() {
    this.overlay.style.display = 'none';
  }
}