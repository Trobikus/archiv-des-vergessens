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

  const currentView = useStateSelector(stateManager, (state) => state.system?.currentView || 'menu');

  useEventBus(eventBus, 'tutorial:step', (stepData) => {
    setStep(stepData);
    setIsActive(true);
  });

  useEventBus(eventBus, 'tutorial:end', () => {
    setIsActive(false);
    setStep(null);
  });

  // Positionierung des Dialogs und des Highlights (dynamisch per AnimationFrame-Loop)
  useEffect(() => {
    if (!step || !isActive || (currentView !== 'hub' && currentView !== 'game')) return;

    let animationFrameId;
    let lastTargetRect = { top: 0, left: 0, width: 0, height: 0 };
    let lastWindowSize = { width: 0, height: 0 };
    let lastStep = null;
    let wasTargetVisible = false;

    const updatePosition = () => {
      const dialog = dialogRef.current;
      if (!dialog) {
        animationFrameId = requestAnimationFrame(updatePosition);
        return;
      }

      if (!step.target) {
        if (lastStep !== step) {
          dialog.style.top = '50%';
          dialog.style.left = '50%';
          dialog.style.transform = 'translate(-50%, -50%)';
          dialog.style.position = 'fixed';
          if (highlightRef.current) {
            highlightRef.current.style.display = 'none';
          }
          lastStep = step;
        }
        dialog.style.visibility = 'visible';
        animationFrameId = requestAnimationFrame(updatePosition);
        return;
      }

      // Wenn Target vorhanden ist, positionieren
      dialog.style.position = 'absolute';
      const targetEl = document.querySelector(step.target);
      if (!targetEl) {
        if (highlightRef.current && wasTargetVisible) {
          highlightRef.current.style.display = 'none';
          wasTargetVisible = false;
        }
        animationFrameId = requestAnimationFrame(updatePosition);
        return;
      }

      const rect = targetEl.getBoundingClientRect();
      const currentWindowWidth = window.innerWidth;
      const currentWindowHeight = window.innerHeight;

      // Überprüfen, ob sich Position/Größe oder Fenstergröße geändert haben
      const rectChanged = rect.top !== lastTargetRect.top ||
                          rect.left !== lastTargetRect.left ||
                          rect.width !== lastTargetRect.width ||
                          rect.height !== lastTargetRect.height;
      const windowChanged = currentWindowWidth !== lastWindowSize.width ||
                            currentWindowHeight !== lastWindowSize.height;
      const stepChanged = step !== lastStep || !wasTargetVisible;

      if (!rectChanged && !windowChanged && !stepChanged) {
        animationFrameId = requestAnimationFrame(updatePosition);
        return;
      }

      // Cache aktualisieren
      lastTargetRect = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
      lastWindowSize = { width: currentWindowWidth, height: currentWindowHeight };
      lastStep = step;
      wasTargetVisible = true;

      // Highlight positionieren
      if (highlightRef.current) {
        const highlight = highlightRef.current;
        highlight.style.display = 'block';
        highlight.style.top = (rect.top - 8) + 'px';
        highlight.style.left = (rect.left - 8) + 'px';
        highlight.style.width = (rect.width + 16) + 'px';
        highlight.style.height = (rect.height + 16) + 'px';
      }

      // Dialog positionieren
      if (step.dialogPosition === 'bottom_center') {
        dialog.style.position = 'fixed';
        dialog.style.bottom = '30px';
        dialog.style.left = '50%';
        dialog.style.top = 'auto';
        dialog.style.transform = 'translateX(-50%)';
        dialog.style.visibility = 'visible';
      } else {
        dialog.style.position = 'absolute';
        dialog.style.bottom = 'auto';

        const dialogRect = dialog.getBoundingClientRect();
        const dialogWidth = dialogRect.width || 400;
        const dialogHeight = dialogRect.height || 180;

        const spaceAbove = rect.top;
        const spaceBelow = currentWindowHeight - rect.bottom;

        let dialogTop, dialogLeft;

        if (spaceBelow >= dialogHeight + 20 || spaceBelow > spaceAbove) {
          dialogTop = rect.bottom + 20;
        } else {
          dialogTop = rect.top - dialogHeight - 20;
        }

        dialogLeft = rect.left + (rect.width / 2) - (dialogWidth / 2);
        dialogLeft = Math.max(10, Math.min(dialogLeft, currentWindowWidth - dialogWidth - 10));

        dialog.style.top = dialogTop + 'px';
        dialog.style.left = dialogLeft + 'px';
        dialog.style.transform = 'none';
        dialog.style.visibility = 'visible';
      }

      animationFrameId = requestAnimationFrame(updatePosition);
    };

    updatePosition();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [step, isActive, currentView]);

  // Globaler Click-Blocker im Tutorial
  useEffect(() => {
    if (!isActive || !step || !step.target || (currentView !== 'hub' && currentView !== 'game')) return;

    const handleGlobalClick = (e) => {
      const dialog = dialogRef.current;
      const targetEl = document.querySelector(step.target);

      // Erlaube Klicks im Dialog-Fenster (z.B. "Weiter"-Button)
      if (dialog && dialog.contains(e.target)) {
        return;
      }

      // Erlaube Klicks auf das Ziel-Element oder dessen Kinder
      if (targetEl && (targetEl === e.target || targetEl.contains(e.target))) {
        return;
      }

      // Blockiere alle anderen Klicks
      e.stopPropagation();
      e.preventDefault();

      // Visuelles Feedback: Das Highlight-Feld kurz pulsieren lassen
      if (highlightRef.current) {
        const highlight = highlightRef.current;
        highlight.style.transform = 'scale(1.08)';
        setTimeout(() => {
          highlight.style.transform = 'scale(1)';
        }, 150);
      }
    };

    const events = ['click', 'mousedown', 'mouseup'];
    events.forEach(evt => document.addEventListener(evt, handleGlobalClick, true));

    return () => {
      events.forEach(evt => document.removeEventListener(evt, handleGlobalClick, true));
    };
  }, [step, isActive, currentView]);

  if (!isActive || !step || (currentView !== 'hub' && currentView !== 'game')) return null;

  const handleNext = () => {
    if (step.action === 'finish') {
      tutorialService.finish();
    } else {
      tutorialService.nextStep();
    }
  };

  const isWaiting = step.action === 'wait_event' || step.action === 'click_target';

  return html`
    <!-- Weichgezeichneter Hintergrund für epische Lore (ohne Target) -->
    ${!step.target ? html`
      <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(3, 3, 5, 0.85); backdrop-filter: blur(8px); z-index: 99990; pointer-events: auto;"></div>
    ` : ''}

    <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 99999; pointer-events: none;">
      ${step.target ? html`
        <div ref=${highlightRef} style="position: absolute; pointer-events: none; border: 3px solid var(--color-gold); border-radius: 4px; box-shadow: 0 0 30px var(--color-gold-glow), 0 0 60px rgba(197,160,89,0.15); background: rgba(197,160,89,0.03); display: none; transition: transform 0.15s ease-out;"></div>
      ` : ''}

      <div ref=${dialogRef} style="position: absolute; visibility: hidden; pointer-events: auto; background: rgba(5,5,7,0.95); backdrop-filter: blur(12px); border: 1px solid var(--color-gold); border-radius: var(--border-radius-lg); padding: 1.8rem 2rem; max-width: 440px; width: 90vw; box-shadow: 0 30px 60px rgba(0,0,0,0.95), 0 0 40px var(--color-gold-glow);">
        ${step.title ? html`
          <h3 style="font-family: var(--font-header); color: var(--color-gold); text-align: center; margin-top: 0; margin-bottom: 1rem; letter-spacing: 2px; font-size: 1.3rem; text-transform: uppercase; text-shadow: 0 0 10px var(--color-gold-glow);">${step.title}</h3>
        ` : ''}
        <div style="margin-bottom: 1.5rem; line-height: 1.6; color: var(--color-text-main); font-size: 0.95rem;" dangerouslySetInnerHTML=${{ __html: step.text }}>
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