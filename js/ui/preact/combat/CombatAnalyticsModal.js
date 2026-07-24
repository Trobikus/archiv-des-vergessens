// ============================================================
// FILE: js/ui/preact/combat/CombatAnalyticsModal.js – Combat Stats Report Modal
// ============================================================
import { h, html, useState, useEffect } from '../setup.js';

export function CombatAnalyticsModal({ analyticsService, eventBus, services, onClose }) {
  const i18nService = services?.i18nService;
  const [lang, setLang] = useState(i18nService ? i18nService.getLanguage() : 'de');
  const [liveStats, setLiveStats] = useState(() => analyticsService ? analyticsService.getStats() : {
    dps: 0,
    totalDamage: 0,
    maxHit: 0,
    avgHit: 0,
    totalHits: 0,
    critHits: 0,
    critRatePercent: 0,
    totalHeal: 0,
    totalMneme: 0,
    durationSeconds: 0
  });

  useEffect(() => {
    if (!eventBus) return;

    const langSub = eventBus.subscribe('i18n:languageChanged', (data) => {
      if (data?.language) setLang(data.language);
    });

    const refreshStats = () => {
      if (analyticsService) {
        setLiveStats(analyticsService.getStats());
      }
    };

    const combatSub = eventBus.subscribe('combat:floating-text', refreshStats);
    const tickSub = eventBus.subscribe('combat:tick', refreshStats);

    const interval = setInterval(refreshStats, 500);

    return () => {
      eventBus.unsubscribe(langSub);
      eventBus.unsubscribe(combatSub);
      eventBus.unsubscribe(tickSub);
      clearInterval(interval);
    };
  }, [eventBus, analyticsService]);

  const stats = liveStats;


  return html`
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(5,8,15,0.85); backdrop-filter: blur(8px); z-index: 9999; display: flex; align-items: center; justify-content: center;" onClick=${onClose}>
      <div style="width: 540px; background-color: #0b101d; border-radius: 16px; border: 1px solid rgba(255,215,0,0.3); box-shadow: 0 0 40px rgba(0,0,0,0.9); overflow: hidden;" onClick=${e => e.stopPropagation()}>
        
        <!-- Header -->
        <div style="padding: 16px 24px; background-color: #101728; border-bottom: 1px solid rgba(255,215,0,0.2); display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.6rem;">⚔️</span>
            <div>
              <h2 style="margin: 0; color: #ffd700; font-size: 1.3rem;">
                ${lang === 'de' ? 'Kampf-Analyse & DPS-Meter' : 'Combat Analytics & DPS Meter'}
              </h2>
              <span style="color: #8a9bb0; font-size: 0.85rem;">
                ${lang === 'de' ? 'Echtzeit-Statistiken der aktuellen Begegnung' : 'Real-time statistics for current encounter'}
              </span>
            </div>
          </div>
          <button style="background-color: transparent; border: none; color: #8a9bb0; font-size: 1.4rem; cursor: pointer;" onClick=${onClose}>✕</button>
        </div>

        <!-- Content -->
        <div style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
          
          <!-- Main DPS Card -->
          <div style="background-color: rgba(0,229,255,0.05); border: 1px solid rgba(0,229,255,0.2); border-radius: 12px; padding: 20px; text-align: center; display: flex; flex-direction: column; align-items: center;">
            <span style="color: #8a9bb0; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px;">
              ${lang === 'de' ? 'Aktueller DPS' : 'Current DPS'}
            </span>
            <strong style="color: #00e5ff; font-size: 2.8rem; text-shadow: 0 0 15px rgba(0,229,255,0.5); margin: 4px 0;">
              ${stats.dps}
            </strong>
            <span style="color: #a0b0c0; font-size: 0.85rem;">
              ${lang === 'de' ? `Kampfdauer: ${stats.durationSeconds}s` : `Duration: ${stats.durationSeconds}s`}
            </span>
          </div>

          <!-- Stats Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="background-color: #0f1626; border: 1px solid rgba(255,255,255,0.08); padding: 14px; border-radius: 10px; display: flex; flex-direction: column; gap: 4px;">
              <span style="color: #8a9bb0; font-size: 0.8rem; text-transform: uppercase;">
                ${lang === 'de' ? 'Gesamtschaden' : 'Total Damage'}
              </span>
              <strong style="color: #ffffff; font-size: 1.2rem;">${stats.totalDamage}</strong>
            </div>

            <div style="background-color: #0f1626; border: 1px solid rgba(255,255,255,0.08); padding: 14px; border-radius: 10px; display: flex; flex-direction: column; gap: 4px;">
              <span style="color: #8a9bb0; font-size: 0.8rem; text-transform: uppercase;">
                ${lang === 'de' ? 'Höchster Treffer' : 'Max Hit'}
              </span>
              <strong style="color: #ffaa00; font-size: 1.2rem;">${stats.maxHit}</strong>
            </div>

            <div style="background-color: #0f1626; border: 1px solid rgba(255,255,255,0.08); padding: 14px; border-radius: 10px; display: flex; flex-direction: column; gap: 4px;">
              <span style="color: #8a9bb0; font-size: 0.8rem; text-transform: uppercase;">
                ${lang === 'de' ? 'Durchschnitt / Treffer' : 'Avg Hit'}
              </span>
              <strong style="color: #ffffff; font-size: 1.2rem;">${stats.avgHit}</strong>
            </div>

            <div style="background-color: #0f1626; border: 1px solid rgba(255,255,255,0.08); padding: 14px; border-radius: 10px; display: flex; flex-direction: column; gap: 4px;">
              <span style="color: #8a9bb0; font-size: 0.8rem; text-transform: uppercase;">
                ${lang === 'de' ? 'Kritische Trefferquote' : 'Crit Rate'}
              </span>
              <strong style="color: #ff5555; font-size: 1.2rem;">
                ${stats.critRatePercent}% (${stats.critHits}/${stats.totalHits})
              </strong>
            </div>

            <div style="background-color: #0f1626; border: 1px solid rgba(255,255,255,0.08); padding: 14px; border-radius: 10px; display: flex; flex-direction: column; gap: 4px;">
              <span style="color: #8a9bb0; font-size: 0.8rem; text-transform: uppercase;">
                ${lang === 'de' ? 'Verursachte Heilung' : 'Total Healing'}
              </span>
              <strong style="color: #40ff80; font-size: 1.2rem;">${stats.totalHeal}</strong>
            </div>

            <div style="background-color: #0f1626; border: 1px solid rgba(255,255,255,0.08); padding: 14px; border-radius: 10px; display: flex; flex-direction: column; gap: 4px;">
              <span style="color: #8a9bb0; font-size: 0.8rem; text-transform: uppercase;">
                ${lang === 'de' ? 'Geerntetes Mneme' : 'Mneme Harvested'}
              </span>
              <strong style="color: #aa00ff; font-size: 1.2rem;">${stats.totalMneme} ✨</strong>
            </div>
          </div>

          <!-- Action Footer -->
          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <button
              style="background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #c0d0e0; padding: 10px 18px; border-radius: 8px; cursor: pointer;"
              onClick=${() => {
                if (analyticsService) analyticsService.reset();
              }}
            >
              🔄 ${lang === 'de' ? 'Statistiken Zurücksetzen' : 'Reset Stats'}
            </button>
            <button style="background-color: #ffd700; border: none; color: #000000; font-weight: bold; padding: 10px 24px; border-radius: 8px; cursor: pointer;" onClick=${onClose}>
              ${lang === 'de' ? 'Schließen' : 'Close'}
            </button>
          </div>

        </div>
      </div>
    </div>
  `;
}
