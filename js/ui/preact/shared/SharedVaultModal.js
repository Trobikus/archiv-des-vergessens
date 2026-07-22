import { h, html, useState, useEffect, useCallback } from '../setup.js';

export function SharedVaultModal({ isOpen, onClose, eventBus, services }) {
  const { accountVaultService, resourceService, i18nService } = services || {};

  const t = (key, fallback = key) => i18nService ? i18nService.t(key, fallback) : fallback;

  const [vault, setVault] = useState(accountVaultService ? accountVaultService.getVaultResources() : {});
  const [classBonus, setClassBonus] = useState('');

  const refreshVault = useCallback(() => {
    if (accountVaultService) {
      setVault(accountVaultService.getVaultResources());
    }
    if (resourceService) {
      const spec = resourceService.getClassSpecialization();
      switch (spec) {
        case 'WARRIOR': setClassBonus('🛡️ Krieger des Lichts: +50% Partikel & Erzausbeute'); break;
        case 'MAGE': setClassBonus('🔮 Erzmagier: +50% Essenzen & Gedächtsnisstaub'); break;
        case 'ROGUE': setClassBonus('🗡️ Schattenläufer: +50% Katalysatoren & Artefakte'); break;
        case 'HUNTER': setClassBonus('🏹 Hüter des Archivs: +50% Relikte & Naturharz'); break;
        default: setClassBonus('⚖️ Ausgewogene Sammelquote'); break;
      }
    }
  }, [accountVaultService, resourceService]);

  useEffect(() => {
    if (isOpen) {
      refreshVault();
    }
  }, [isOpen, refreshVault]);

  useEffect(() => {
    if (eventBus) {
      const subId = eventBus.subscribe('vault:updated', () => {
        refreshVault();
      });
      return () => eventBus.unsubscribe(subId);
    }
  }, [eventBus, refreshVault]);

  if (!isOpen) return null;

  return html`
    <div class="modal-overlay active fade-in" style="z-index: 10000; display: flex; align-items: center; justify-content: center; background: rgba(5, 5, 14, 0.88); backdrop-filter: blur(12px);" onClick=${onClose}>
      <div class="modal-card dialog-window glass-panel" style="width: 100%; max-width: 560px; padding: 32px; border: 1px solid rgba(197, 160, 89, 0.5); border-radius: 18px; background: linear-gradient(145deg, rgba(20, 18, 38, 0.98), rgba(12, 10, 24, 0.98)); color: #f8fafc; box-shadow: 0 25px 70px rgba(0,0,0,0.9), 0 0 30px rgba(197, 160, 89, 0.15); position: relative; overflow: hidden;" onClick=${(e) => e.stopPropagation()}>
        
        <!-- Ambient Glow Effect -->
        <div style="position: absolute; top: -50px; left: -50px; width: 150px; height: 150px; background: radial-gradient(circle, rgba(197, 160, 89, 0.2), transparent 70%); pointer-events: none;"></div>

        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; border-bottom: 1px solid rgba(197, 160, 89, 0.3); padding-bottom: 14px;">
          <div>
            <h2 class="cinzel" style="font-size: 1.45rem; font-weight: 700; color: #c5a059; margin: 0; display: flex; align-items: center; gap: 10px; letter-spacing: 1px; text-shadow: 0 0 10px rgba(197, 160, 89, 0.3);">
              🏦 GEMEINSAMES ACCOUNT-LAGER
            </h2>
            <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">Tresor aller 5 Charakter-Slots</div>
          </div>
          <button style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: #94a3b8; font-size: 1.2rem; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;" onClick=${onClose}>✕</button>
        </div>

        <!-- Class Specialization Banner -->
        <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(109, 40, 217, 0.1)); border: 1px solid rgba(167, 139, 250, 0.4); padding: 12px 16px; border-radius: 12px; font-size: 0.88rem; color: #e9d5ff; margin-bottom: 22px; display: flex; align-items: center; gap: 10px; box-shadow: inset 0 0 15px rgba(124, 58, 237, 0.1);">
          <span style="font-size: 1.3rem;">⚡</span>
          <div>
            <strong style="color: #fef08a; display: block; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Spezialisierungs-Bonus</strong>
            <span>${classBonus}</span>
          </div>
        </div>

        <!-- Resource Vault Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px;">
          <div style="background: rgba(10, 10, 20, 0.6); padding: 14px 18px; border-radius: 12px; border: 1px solid rgba(197, 160, 89, 0.25); transition: transform 0.2s;" class="resource-card">
            <div style="font-size: 0.8rem; color: #cbd5e1; display: flex; align-items: center; gap: 6px;">
              <span>✨</span> Seelenpartikel
            </div>
            <div style="font-size: 1.35rem; font-weight: 700; color: #fef08a; margin-top: 4px; text-shadow: 0 0 8px rgba(254, 240, 138, 0.3);">
              ${vault.particles || '0'}
            </div>
          </div>

          <div style="background: rgba(10, 10, 20, 0.6); padding: 14px 18px; border-radius: 12px; border: 1px solid rgba(167, 139, 250, 0.25); transition: transform 0.2s;" class="resource-card">
            <div style="font-size: 0.8rem; color: #cbd5e1; display: flex; align-items: center; gap: 6px;">
              <span>🗿</span> Uralte Relikte
            </div>
            <div style="font-size: 1.35rem; font-weight: 700; color: #c084fc; margin-top: 4px; text-shadow: 0 0 8px rgba(192, 132, 252, 0.3);">
              ${vault.relics || '0'}
            </div>
          </div>

          <div style="background: rgba(10, 10, 20, 0.6); padding: 14px 18px; border-radius: 12px; border: 1px solid rgba(244, 63, 94, 0.25); transition: transform 0.2s;" class="resource-card">
            <div style="font-size: 0.8rem; color: #cbd5e1; display: flex; align-items: center; gap: 6px;">
              <span>🔮</span> Artefakt-Scherben
            </div>
            <div style="font-size: 1.35rem; font-weight: 700; color: #fb7185; margin-top: 4px; text-shadow: 0 0 8px rgba(251, 113, 133, 0.3);">
              ${vault.artifacts || '0'}
            </div>
          </div>

          <div style="background: rgba(10, 10, 20, 0.6); padding: 14px 18px; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.25); transition: transform 0.2s;" class="resource-card">
            <div style="font-size: 0.8rem; color: #cbd5e1; display: flex; align-items: center; gap: 6px;">
              <span>🧪</span> Arkan-Essenzen
            </div>
            <div style="font-size: 1.35rem; font-weight: 700; color: #38bdf8; margin-top: 4px; text-shadow: 0 0 8px rgba(56, 189, 248, 0.3);">
              ${vault.essence || '0'}
            </div>
          </div>
        </div>

        <p style="font-size: 0.82rem; color: #94a3b8; text-align: center; margin: 0 0 20px 0; line-height: 1.5;">
          Alle gesammelten Rohstoffe fließen automatisch in dieses Konto-Lager und stehen all deinen 5 Charakteren zur Verfügung.
        </p>

        <button onClick=${onClose} class="cinzel" style="width: 100%; padding: 13px; border-radius: 10px; border: 1px solid rgba(197, 160, 89, 0.6); background: linear-gradient(135deg, #c5a059, #8c6a2d); color: #0f172a; font-weight: 800; font-size: 1rem; cursor: pointer; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(197, 160, 89, 0.3); transition: all 0.2s;">
          SCHLIESSEN
        </button>

      </div>
    </div>
  `;
}

export default SharedVaultModal;
