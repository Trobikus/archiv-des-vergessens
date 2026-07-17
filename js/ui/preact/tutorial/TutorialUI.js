/**
 * ============================================================
 * FILE: ui/preact/tutorial/TutorialUI.js – Tutorial-Overlay
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState, useEffect, useRef } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function TutorialUI({ stateManager, eventBus, services }) {
  const { tutorialService, resourceService } = services;
  const [isActive, setIsActive] = useState(false);
  const [step, setStep] = useState(null);
  const highlightRef = useRef(null);
  const dialogRef = useRef(null);

  useEventBus(eventBus, 'tutorial:step', (stepData) => {
    setStep(stepData);
    setIsActive(true);
  });

  useEventBus(eventBus, 'tutorial:end', () => {
    setIsActive(false);
    setStep(null);
  });

  // Positionierung des Dialogs bei Ziel-Element
  useEffect(() => {
    if (!step || !step.target || !highlightRef.current || !dialogRef.current) return;

    const targetEl = document.querySelector(step.target);
    if (!targetEl) return;

    const rect = targetEl.getBoundingClientRect();
    const highlight = highlightRef.current;
    highlight.style.display = 'block';
    highlight.style.top = (rect.top - 8) + 'px';
    highlight.style.left = (rect.left - 8) + 'px';
    highlight.style.width = (rect.width + 16) + 'px';
    highlight.style.height = (rect.height + 16) + 'px';

    const dialog = dialogRef.current;
    const dialogRect = dialog.getBoundingClientRect();
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

    dialog.style.top = dialogTop + 'px';
    dialog.style.left = dialogLeft + 'px';
    dialog.style.transform = 'none';

  }, [step]);

  if (!isActive || !step) return null;

  const handleNext = () => {
    if (step.action === 'finish') {
      tutorialService.finish();
    } else {
      tutorialService.nextStep();
    }
  };

  const isWaiting = step.action === 'wait_event';

  return html`
    <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 99999; pointer-events: none;">
      ${step.target ? html`
        <div ref=${highlightRef} style="position: absolute; pointer-events: none; border: 3px solid var(--color-gold); border-radius: 4px; box-shadow: 0 0 30px var(--color-gold-glow), 0 0 60px rgba(197,160,89,0.15); background: rgba(197,160,89,0.03); display: none;"></div>
      ` : ''}

      <div ref=${dialogRef} style="position: absolute; pointer-events: auto; background: rgba(5,5,7,0.95); backdrop-filter: blur(12px); border: 1px solid var(--color-gold); border-radius: var(--border-radius-lg); padding: 1.8rem 2rem; max-width: 440px; width: 90vw; box-shadow: 0 30px 60px rgba(0,0,0,0.95), 0 0 40px var(--color-gold-glow);">
        <div style="margin-bottom: 1.5rem; line-height: 1.6; color: var(--color-text-main); font-size: 0.95rem;">
          ${step.text}
        </div>
        ${!isWaiting ? html`
          <button class="glass-btn primary" style="width: 100%; padding: 0.8rem; font-size: 1rem; letter-spacing: 1px; font-family: var(--font-header);" onClick=${handleNext}>
            ${step.action === 'finish' ? '✅ Verstanden!' : '➡️ Weiter'}
          </button>
        ` : html`
          <div style="text-align: center; color: var(--color-text-muted); font-size: 0.8rem; font-style: italic;">
            ⏳ Warte auf Aktion...
          </div>
        `}
      </div>
    </div>
  `;
}