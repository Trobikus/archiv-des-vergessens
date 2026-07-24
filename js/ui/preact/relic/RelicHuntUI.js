/**
 * ============================================================
 * FILE: ui/preact/relic/RelicHuntUI.js – Relikt-Jagd
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState, useEffect } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function RelicHuntUI({ stateManager, eventBus, services }) {
  const { relicHuntService, resourceService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [cooldownTotal, setCooldownTotal] = useState(5000);

  const resources = useStateSelector(stateManager, (state) => state.resources);
  const hero = useStateSelector(stateManager, (state) => state.hero);

  useEventBus(eventBus, EVENTS.UI_OPEN_RELICHUNT, () => setIsOpen(true));
  useEventBus(eventBus, 'ui:closeAllModals', () => setIsOpen(false));
  useEventBus(eventBus, 'relicHunt:result', (data) => {
    setResult(data.message);
    setTimeout(() => setResult(''), 5000);
  });

  // Cooldown-Status abrufen
  useEffect(() => {
    if (!isOpen) return;
    const status = relicHuntService.getCooldownStatus();
    if (!status.ready) {
      setCooldownRemaining(status.remaining);
      setCooldownTotal(status.total);
    } else {
      setCooldownRemaining(0);
    }
  }, [isOpen, relicHuntService]);

  // Cooldown-Timer
  useEffect(() => {
    if (!isOpen || cooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 100) {
          clearInterval(interval);
          return 0;
        }
        return prev - 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isOpen, cooldownRemaining]);

  if (!isOpen) return null;

  const handleHunt = () => {
    const result = relicHuntService.performHunt();
    if (!result.success && result.message !== 'Warte noch...') {
      setResult(`❌ ${result.message}`);
      setTimeout(() => setResult(''), 3000);
    }
    // Cooldown aktualisieren
    const status = relicHuntService.getCooldownStatus();
    if (!status.ready) {
      setCooldownRemaining(status.remaining);
      setCooldownTotal(status.total);
    }
  };

  const chance = relicHuntService.getSuccessChance();
  const particles = BigInt(resources.particles || '0');
  const canAfford = particles >= BigInt(25);

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="modal-content-small glass-panel" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>
        <h2 class="glow-text text-highlight cinzel text-center">RELIKT-JAGD</h2>
        <p class="text-muted text-center mb-1" style="text-align: center; color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 1rem;">Suche nach verlorenen Erinnerungen</p>

        <div class="relic-status-area" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; margin-bottom: 1.2rem;">
          <div class="relic-status-item" style="text-align: center; padding: 0.6rem 0.8rem; border-left: 2px solid var(--color-gold); background: rgba(0,0,0,0.2);">
            <span class="text-muted" style="display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px;">Kosten</span>
            <span class="text-gold text-bold" style="font-size: 1.1rem;">25 Partikel</span>
          </div>
          <div class="relic-status-item" style="text-align: center; padding: 0.6rem 0.8rem; border-left: 2px solid var(--color-gold); background: rgba(0,0,0,0.2);">
            <span class="text-muted" style="display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px;">Erfolgschance</span>
            <span class="text-highlight" style="font-size: 1.1rem;">${Math.round(chance * 100)}%</span>
          </div>
          <div class="relic-status-item" style="text-align: center; padding: 0.6rem 0.8rem; border-left: 2px solid var(--color-gold); background: rgba(0,0,0,0.2);">
            <span class="text-muted" style="display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px;">Kampfkraft</span>
            <span class="text-highlight" style="font-size: 1.1rem;">${hero.level + (hero.clickPowerLevel || 0) * 2}</span>
          </div>
          <div class="relic-status-item" style="text-align: center; padding: 0.6rem 0.8rem; border-left: 2px solid var(--color-gold); background: rgba(0,0,0,0.2);">
            <span class="text-muted" style="display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px;">Status</span>
            <span class="text-muted" style="font-size: 1.1rem;">${cooldownRemaining > 0 ? '⏳ Warte...' : '✅ Bereit'}</span>
          </div>
        </div>

        ${cooldownRemaining > 0 ? html`
          <div class="relic-cooldown-panel glass-inner-panel" style="padding: 0.8rem 1.2rem; margin-bottom: 1rem; border-left: 3px solid var(--color-gold);">
            <div class="relic-cooldown-text" style="text-align: center; color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 0.3rem;">
              ⏳ Wartezeit: ${Math.ceil(cooldownRemaining / 1000)}s
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${Math.min(100, (1 - cooldownRemaining / cooldownTotal) * 100)}%;"></div>
            </div>
          </div>
        ` : ''}

        <button class="glass-btn primary w-100 epic-pulse" style="width: 100%; padding: 1rem; font-size: 1.1rem; letter-spacing: 2px; margin-top: 0.5rem;" onClick=${handleHunt} disabled=${!canAfford || cooldownRemaining > 0}>
          ${cooldownRemaining > 0 ? '⏳ WARTEN...' : '🔮 SUCHE STARTEN'}
        </button>

        ${result ? html`
          <div class="text-center mt-2 text-bold" style="text-align: center; margin-top: 1rem; font-weight: bold;">
            ${result.includes('Erfolg') ? html`<span class="text-success">${result}</span>` : html`<span class="text-warning">${result}</span>`}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}