/**
 * ============================================================
 * FILE: ui/preact/leaderboard/LeaderboardUI.js – Bestenliste
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function LeaderboardUI({ stateManager, eventBus, services }) {
  const { leaderboardService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'global'
  const [globalEntries, setGlobalEntries] = useState([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const stats = useStateSelector(stateManager, () => leaderboardService.getFormattedStats());
  const records = useStateSelector(stateManager, () => leaderboardService.getRecords());

  // Registriere Events
  useEventBus(eventBus, EVENTS.UI_OPEN_LEADERBOARD, (data) => {
    setIsOpen(true);
    const targetTab = data && data.tab ? data.tab : 'personal';
    setActiveTab(targetTab);
    if (targetTab === 'global') {
      fetchGlobal();
    }
  });
  useEventBus(eventBus, 'ui:closeAllModals', () => setIsOpen(false));

  useEventBus(eventBus, 'leaderboard:globalUpdated', (entries) => {
    if (entries === null) {
      setConnectionError(true);
      setGlobalEntries([]);
    } else {
      setConnectionError(false);
      setGlobalEntries(entries);
    }
    setIsLoadingGlobal(false);
  });

  const fetchGlobal = () => {
    setIsLoadingGlobal(true);
    setConnectionError(false);
    leaderboardService.requestGlobalLeaderboard();
  };

  const handleReset = async () => {
    if (await window.gameConfirm('Möchtest du deine persönlichen Rekorde zurücksetzen?')) {
      leaderboardService.reset();
      eventBus.publish('ui:showToast', {
        message: '📊 Bestenliste zurückgesetzt.',
        type: 'info',
        duration: 2000
      });
    }
  };

  if (!isOpen) return null;

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div class="modal-content glass-panel" style="width: 600px; max-width: 95vw;" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${() => setIsOpen(false)}>×</button>
        
        <h2 class="modal-title glow-text cinzel text-center mb-1">🏛️ Das Große Archiv</h2>
        
        <!-- TABS HEADER -->
        <div class="tabs-nav" style="display: flex; gap: 1rem; justify-content: center; margin-bottom: 1.2rem; border-bottom: 1px solid rgba(197,160,89,0.15); padding-bottom: 0.5rem;">
          <button class="tab-btn" 
                  style="background: none; border: none; font-family: 'Cinzel', serif; font-size: 1rem; cursor: pointer; padding: 0.3rem 1.2rem; position: relative; color: ${activeTab === 'personal' ? 'var(--color-gold)' : 'var(--color-text-muted)'}; transition: color 0.2s;" 
                  onClick=${() => setActiveTab('personal')}>
            🏆 Persönlich
            ${activeTab === 'personal' && html`<div style="position: absolute; bottom: -0.6rem; left: 0; right: 0; height: 2px; background: var(--color-gold); box-shadow: 0 0 8px var(--color-gold);"></div>`}
          </button>
          <button class="tab-btn" 
                  style="background: none; border: none; font-family: 'Cinzel', serif; font-size: 1rem; cursor: pointer; padding: 0.3rem 1.2rem; position: relative; color: ${activeTab === 'global' ? 'var(--color-gold)' : 'var(--color-text-muted)'}; transition: color 0.2s;" 
                  onClick=${() => { setActiveTab('global'); fetchGlobal(); }}>
            🌐 Global (Top 100)
            ${activeTab === 'global' && html`<div style="position: absolute; bottom: -0.6rem; left: 0; right: 0; height: 2px; background: var(--color-gold); box-shadow: 0 0 8px var(--color-gold);"></div>`}
          </button>
        </div>

        <div class="modal-scroll-area" style="max-height: 55vh; overflow-y: auto; padding-right: 0.5rem;">
          
          <!-- TAB 1: PERSÖNLICH -->
          ${activeTab === 'personal' && html`
            <div>
              <div class="leaderboard-stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1rem;">
                ${Object.entries(stats).map(([label, value]) => html`
                  <div class="leaderboard-stat" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.9rem; border-left: 2px solid var(--color-gold); background: rgba(0,0,0,0.2);">
                    <span class="text-muted" style="font-size: 0.8rem;">${label}</span>
                    <span class="text-gold text-bold" style="font-size: 1rem;">${value}</span>
                  </div>
                `)}
              </div>

              <div class="leaderboard-meta" style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; padding: 0.8rem; border-top: 1px solid rgba(197,160,89,0.1);">
                <span class="text-muted text-sm" style="font-size: 0.75rem;">Sitzungen: <span class="text-highlight" style="font-weight: bold;">${records.sessionCount}</span></span>
                <span class="text-muted text-sm" style="font-size: 0.75rem;">Zuletzt gespielt: <span class="text-highlight" style="font-weight: bold;">${new Date(records.lastPlayed).toLocaleDateString()}</span></span>
                <span class="text-muted text-sm" style="font-size: 0.75rem;">Gesamtspielzeit: <span class="text-highlight" style="font-weight: bold;">${Math.floor(records.totalPlayTime / 60)} Minuten</span></span>
              </div>

              <button class="glass-btn btn-danger btn-small" style="display: block; margin: 1rem auto 0; padding: 0.3rem 1.2rem; font-size: 0.75rem;" onClick=${handleReset}>
                🗑️ Rekorde zurücksetzen
              </button>
            </div>
          `}

          <!-- TAB 2: GLOBAL -->
          ${activeTab === 'global' && html`
            <div>
              ${isLoadingGlobal && html`
                <div class="text-center" style="padding: 2rem 0; color: var(--color-gold);">
                  <div class="spinner" style="display: inline-block; width: 24px; height: 24px; border: 2px solid rgba(197,160,89,0.3); border-top-color: var(--color-gold); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 0.5rem;"></div>
                  <p class="cinzel" style="font-size: 0.9rem;">Rufe Fragmente aus dem Äther ab...</p>
                </div>
              `}

              ${!isLoadingGlobal && connectionError && html`
                <div class="text-center text-muted" style="padding: 2rem 0;">
                  <p style="font-size: 1.2rem; margin-bottom: 0.3rem;">📡 Äther-Verbindung schwach</p>
                  <p style="font-size: 0.85rem;">Der Multiplayer-Server ist offline oder die Verbindung konnte nicht hergestellt werden.</p>
                  <button class="glass-btn btn-small" style="margin-top: 1rem; padding: 0.3rem 1rem; font-size: 0.75rem;" onClick=${fetchGlobal}>🔄 Erneut versuchen</button>
                </div>
              `}

              ${!isLoadingGlobal && !connectionError && globalEntries.length === 0 && html`
                <div class="text-center text-muted" style="padding: 2rem 0;">
                  <p style="font-size: 1.2rem; margin-bottom: 0.3rem;">🏛️ Die Hallen sind leer</p>
                  <p style="font-size: 0.85rem;">Bisher wurden noch keine Ruhmestaten in den Chroniken verzeichnet. Trage dich als Erster ein!</p>
                  <button class="glass-btn btn-small" style="margin-top: 1rem; padding: 0.3rem 1rem; font-size: 0.75rem;" onClick=${fetchGlobal}>🔄 Aktualisieren</button>
                </div>
              `}

              ${!isLoadingGlobal && globalEntries.length > 0 && html`
                <div class="global-leaderboard-list">
                  <!-- Tabellen-Kopf -->
                  <div style="display: grid; grid-template-columns: 50px 1.8fr 1fr 1fr; padding: 0.3rem 1rem; font-size: 0.75rem; color: var(--color-text-muted); font-family: 'Cinzel', serif; border-bottom: 1px solid rgba(197,160,89,0.1); margin-bottom: 0.5rem;">
                    <span>Rang</span>
                    <span>Chronist</span>
                    <span style="text-align: right;">🏆 Prestige</span>
                    <span style="text-align: right;">⚔️ Bosse (Lvl)</span>
                  </div>

                  <!-- Zeilen -->
                  ${globalEntries.map((entry, index) => {
                    const isSelf = localStorage.getItem('archiv_user_id') === entry.userId;
                    const rankColor = index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'var(--color-text-muted)';
                    
                    return html`
                      <div class="leaderboard-row glass-panel" 
                           style="display: grid; grid-template-columns: 50px 1.8fr 1fr 1fr; align-items: center; padding: 0.6rem 1rem; margin-bottom: 0.4rem; background: ${isSelf ? 'rgba(197,160,89,0.15)' : 'rgba(0,0,0,0.2)'}; border-left: 2px solid ${index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : isSelf ? 'var(--color-gold)' : 'rgba(197,160,89,0.2)'}; box-shadow: ${isSelf ? '0 0 10px rgba(197,160,89,0.1)' : 'none'};">
                        
                        <!-- RANG -->
                        <span class="cinzel" style="font-weight: bold; color: ${rankColor}; font-size: 1rem;">
                          ${index === 0 ? 'Ⅰ' : index === 1 ? 'Ⅱ' : index === 2 ? 'Ⅲ' : index + 1}
                        </span>
                        
                        <!-- CHRONIST (SPIELER) -->
                        <span class="text-highlight" style="font-weight: bold; display: flex; align-items: center; gap: 0.3rem;">
                          ${entry.username}
                          ${isSelf && html`<span style="font-size: 0.7rem; padding: 0.1rem 0.3rem; background: var(--color-gold); color: black; border-radius: 2px; font-weight: bold; font-family: 'Cinzel', serif;">Du</span>`}
                        </span>
                        
                        <!-- PRESTIGE -->
                        <span class="text-gold text-bold" style="text-align: right; font-size: 0.95rem;">
                          P${entry.prestige}
                        </span>
                        
                        <!-- LEVEL & BOSSE -->
                        <span class="text-muted text-sm" style="text-align: right; font-size: 0.8rem;">
                          ${entry.bosses} (${entry.level})
                        </span>
                      </div>
                    `;
                  })}
                </div>
              `}
            </div>
          `}

          <!-- SPIN ANIMATION STYLE -->
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>

        </div>
      </div>
    </div>
  `;
}