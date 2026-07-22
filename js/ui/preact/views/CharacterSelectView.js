import { h, html, useState, useEffect, useCallback } from '../setup.js';
import { AccountBadge } from '../account/AccountBadge.js';

export function CharacterSelectView({ eventBus, services }) {
  const { saveManager, authService, i18nService } = services || {};

  const t = (key, fallback = key) => i18nService ? i18nService.t(key, fallback) : fallback;

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [targetSlotId, setTargetSlotId] = useState(null);
  const [charName, setCharName] = useState('');
  const [selectedClass, setSelectedClass] = useState({ avatar: '🛡️', title: 'Krieger des Lichts' });

  const CLASSES = [
    { avatar: '🛡️', title: 'Krieger des Lichts', desc: 'Stark im Nahkampf, hoher Schutz' },
    { avatar: '🔮', title: 'Erzmagier', desc: 'Meister der alten Runenmagie' },
    { avatar: '🗡️', title: 'Schattenläufer', desc: 'Tödliche Präzision aus dem Hinterhalt' },
    { avatar: '🏹', title: 'Hüter des Archivs', desc: 'Gleichgewicht von Bogen und Geist' }
  ];

  const loadSlots = useCallback(async () => {
    if (!saveManager) return;
    setLoading(true);
    try {
      const u = authService ? authService.getCurrentUser() : null;
      const userId = u && !u.isGuest ? (u.id || u.username) : null;
      const list = await saveManager.listSlots(userId);
      setSlots(list);
    } catch (e) {
      console.error('[CharacterSelect] Fehler beim Laden der Slots:', e);
    } finally {
      setLoading(false);
    }
  }, [saveManager, authService]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const handlePlaySlot = useCallback((slotId) => {
    if (eventBus) {
      eventBus.publish('character:select', { slotId });
    }
  }, [eventBus]);

  const handleOpenCreate = useCallback((slotId) => {
    setTargetSlotId(slotId);
    setCharName('');
    setSelectedClass(CLASSES[0]);
    setShowCreateModal(true);
  }, []);

  const handleConfirmCreate = useCallback((e) => {
    e.preventDefault();
    if (!charName.trim() || !targetSlotId) return;

    if (eventBus) {
      eventBus.publish('character:create', {
        slotId: targetSlotId,
        name: charName.trim(),
        avatar: selectedClass.avatar,
        title: selectedClass.title
      });
    }
    setShowCreateModal(false);
  }, [charName, targetSlotId, selectedClass, eventBus]);

  const handleDeleteSlot = useCallback((slotId, name) => {
    if (eventBus) {
      eventBus.publish('ui:openConfirm', {
        title: 'CHARAKTER LÖSCHEN',
        message: `Möchtest du den Charakter "${name || 'Hüter'}" (Slot ${slotId}) wirklich unwiderruflich löschen?`,
        isAlert: false,
        onConfirm: async () => {
          if (saveManager) {
            await saveManager.deleteSlot(slotId);
            await loadSlots();
          }
        }
      });
    }
  }, [eventBus, saveManager, loadSlots]);

  const handleBackToLogin = useCallback(() => {
    if (eventBus) {
      eventBus.publish('auth:showLogin');
    }
  }, [eventBus]);

  return html`
    <section id="character-select-container" class="center-layout fade-in" role="main" aria-label="Charakterauswahl" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; position: relative; width: 100%; padding: 20px; box-sizing: border-border;">
      
      <!-- Top Bar Navigation -->
      <div style="position: absolute; top: 24px; right: 24px; display: flex; justify-content: flex-end; align-items: center; z-index: 100;">
        <${AccountBadge} eventBus=${eventBus} services=${services} onClick=${handleBackToLogin} />
      </div>

      <!-- Title Header -->
      <div style="text-align: center; margin-bottom: 28px; margin-top: 40px;">
        <h1 class="glow-text" style="font-size: clamp(2rem, 4vw, 3rem); text-transform: uppercase; margin-bottom: 6px; background: linear-gradient(to bottom, #ffffff, #c5a059); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
          CHARAKTERAUSWAHL
        </h1>
        <p class="subtitle" style="font-size: 0.9rem; letter-spacing: 3px; color: #a78bfa; margin: 0; text-transform: uppercase;">
          Wähle deinen Hüter des Archivs (Max. 5 Charaktere)
        </p>
      </div>

      <!-- Character Slots Grid -->
      <div style="display: flex; flex-direction: column; gap: 14px; width: 100%; max-width: 600px;">
        ${loading ? html`
          <div style="text-align: center; color: #c5a059; padding: 40px; font-size: 1.1rem;">Lade Helden-Profile...</div>
        ` : slots.map((slot) => html`
          <div class="glass-panel" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-radius: 12px; border: 1px solid ${slot.hasSave ? 'rgba(167, 139, 250, 0.4)' : 'rgba(255, 255, 255, 0.1)'}; background: ${slot.hasSave ? 'rgba(18, 18, 36, 0.85)' : 'rgba(10, 10, 20, 0.5)'}; transition: all 0.2s ease;">
            
            ${slot.hasSave ? html`
              <!-- POPULATED SLOT -->
              <div style="display: flex; align-items: center; gap: 16px;">
                <div style="font-size: 2.2rem; background: rgba(167, 139, 250, 0.15); width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(167, 139, 250, 0.4);">
                  ${slot.avatar}
                </div>
                <div>
                  <div style="font-size: 1.15rem; font-weight: 700; color: #f8fafc;">
                    ${slot.name} <span style="font-size: 0.8rem; color: #c5a059; margin-left: 6px;">Stufe ${slot.level}</span>
                  </div>
                  <div style="font-size: 0.82rem; color: #a78bfa;">${slot.classTitle}</div>
                  <div style="font-size: 0.72rem; color: #64748b; margin-top: 2px;">
                    Zuletzt gespielt: ${new Date(slot.timestamp).toLocaleDateString()} ${new Date(slot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div style="display: flex; gap: 10px; align-items: center;">
                <button onClick=${() => handlePlaySlot(slot.slotId)} style="padding: 10px 18px; border-radius: 8px; border: none; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; font-weight: 700; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);">
                  ⚔️ SPIELEN
                </button>
                <button onClick=${() => handleDeleteSlot(slot.slotId, slot.name)} style="padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.1); color: #fca5a5; cursor: pointer; font-size: 0.85rem;" title="Charakter löschen">
                  🗑️
                </button>
              </div>
            ` : html`
              <!-- EMPTY SLOT -->
              <div style="display: flex; align-items: center; gap: 16px; color: #64748b;">
                <div style="font-size: 1.5rem; background: rgba(255,255,255,0.03); width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px dashed rgba(255, 255, 255, 0.15);">
                  ➕
                </div>
                <div>
                  <div style="font-size: 1rem; font-weight: 600; color: #94a3b8;">Slot ${slot.slotId} – Freier Slot</div>
                  <div style="font-size: 0.78rem; color: #64748b;">Bereit für einen neuen Helden</div>
                </div>
              </div>

              <button onClick=${() => handleOpenCreate(slot.slotId)} style="padding: 9px 16px; border-radius: 8px; border: 1px solid rgba(197, 160, 89, 0.4); background: rgba(197, 160, 89, 0.1); color: #fef08a; font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: all 0.2s;">
                ✨ ERSTELLEN
              </button>
            `}
          </div>
        `)}
      </div>

      <!-- Bottom Back Button -->
      <div style="margin-top: 24px;">
        <button onClick=${handleBackToLogin} style="background: rgba(18, 18, 32, 0.85); border: 1px solid rgba(197, 160, 89, 0.4); color: #f1f5f9; padding: 12px 28px; border-radius: 24px; cursor: pointer; font-size: 0.95rem; font-weight: 700; box-shadow: 0 4px 15px rgba(0,0,0,0.5); transition: all 0.2s ease;">
          « ZURÜCK ZUM LOGIN
        </button>
      </div>

      <!-- CREATE CHARACTER MODAL -->
      ${showCreateModal && html`
        <div class="modal-overlay active" style="z-index: 12000; display: flex; align-items: center; justify-content: center; background: rgba(5, 5, 12, 0.88); backdrop-filter: blur(10px);" onClick=${() => setShowCreateModal(false)}>
          <div class="modal-card dialog-window glass-panel" style="width: 100%; max-width: 480px; padding: 28px; border: 1px solid rgba(197, 160, 89, 0.4); border-radius: 16px; background: rgba(18, 18, 32, 0.98); color: #e2e8f0; box-shadow: 0 20px 50px rgba(0,0,0,0.85);" onClick=${(e) => e.stopPropagation()}>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
              <h2 style="font-size: 1.3rem; font-weight: 700; color: #c5a059; margin: 0;">
                ✨ NEUEN CHARAKTER ERSTELLEN (Slot ${targetSlotId})
              </h2>
              <button style="background: transparent; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer;" onClick=${() => setShowCreateModal(false)}>✕</button>
            </div>

            <form onSubmit=${handleConfirmCreate} style="display: flex; flex-direction: column; gap: 18px;">
              <div>
                <label style="display: block; font-size: 0.85rem; color: #94a3b8; margin-bottom: 6px;">Name des Helden</label>
                <input type="text" required minlength="2" maxlength="20" value=${charName} onInput=${(e) => setCharName(e.target.value)} style="width: 100%; padding: 11px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.4); color: white; font-size: 0.95rem; outline: none; box-sizing: border-border;" placeholder="z. B. MnemeHüter" />
              </div>

              <div>
                <label style="display: block; font-size: 0.85rem; color: #94a3b8; margin-bottom: 8px;">Klasse & Spezialisierung</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  ${CLASSES.map((cls) => html`
                    <div 
                      onClick=${() => setSelectedClass(cls)}
                      style=${`padding: 12px; border-radius: 10px; border: 1px solid ${selectedClass.title === cls.title ? '#c5a059' : 'rgba(255,255,255,0.1)'}; background: ${selectedClass.title === cls.title ? 'rgba(197, 160, 89, 0.15)' : 'rgba(0,0,0,0.2)'}; cursor: pointer; transition: all 0.2s; text-align: center;`}
                    >
                      <div style="font-size: 1.8rem; margin-bottom: 4px;">${cls.avatar}</div>
                      <div style="font-size: 0.85rem; font-weight: 700; color: #f8fafc;">${cls.title}</div>
                      <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 2px;">${cls.desc}</div>
                    </div>
                  `)}
                </div>
              </div>

              <button type="submit" style="margin-top: 8px; width: 100%; padding: 13px; border-radius: 8px; border: none; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; font-size: 1rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 16px rgba(124, 58, 237, 0.45);">
                🛡️ HELD ERSCHAFFEN & SPIELEN
              </button>
            </form>

          </div>
        </div>
      `}

    </section>
  `;
}

export default CharacterSelectView;
