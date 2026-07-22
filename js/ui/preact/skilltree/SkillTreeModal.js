// ============================================================
// FILE: js/ui/preact/skilltree/SkillTreeModal.js – Path of Exile Style Skill Tree UI (AAA)
// ============================================================
import { h, html, useState, useEffect, useRef } from '../setup.js';
import { TALENT_NODES } from '../../../data/talent-nodes.js';

export function SkillTreeModal({ talentService, eventBus, services, onClose }) {
  const [allocatedIds, setAllocatedIds] = useState([]);
  const [points, setPoints] = useState(0);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [pan, setPan] = useState({ x: 320, y: 320 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const i18nService = services?.i18nService;
  const [lang, setLang] = useState(i18nService ? i18nService.getLanguage() : 'de');

  useEffect(() => {
    if (eventBus) {
      const unsub = eventBus.subscribe('i18n:languageChanged', (data) => {
        setLang(data.language);
      });
      return unsub;
    }
  }, [eventBus]);

  const refreshState = () => {
    if (talentService) {
      setAllocatedIds(talentService.getAllocatedNodeIds());
      setPoints(talentService.getAvailablePoints());
    }
  };

  useEffect(() => {
    refreshState();
  }, [talentService]);

  const handleMouseDown = (e) => {
    if (e.target.closest('.skill-node')) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleAllocate = (nodeId) => {
    if (talentService.allocateNode(nodeId)) {
      refreshState();
    }
  };

  const handleUnallocate = (nodeId) => {
    if (talentService.unallocateNode(nodeId)) {
      refreshState();
    }
  };

  const handleReset = async () => {
    const confirmMsg = lang === 'de'
      ? 'Möchtest du wirklich alle Talentpunkte zurücksetzen?'
      : 'Do you really want to reset all talent points?';
    if (window.gameConfirm) {
      if (await window.gameConfirm(confirmMsg, lang === 'de' ? 'TALENTPUNKTE ZURÜCKSETZEN' : 'RESET TALENT POINTS')) {
        talentService.resetTalents();
        refreshState();
      }
    } else if (confirm(confirmMsg)) {
      talentService.resetTalents();
      refreshState();
    }
  };

  const aggregatedStats = talentService ? talentService.getAggregatedStats() : {};

  // Build connection lines between nodes
  const lines = [];
  const processedPairs = new Set();

  for (const node of Object.values(TALENT_NODES)) {
    for (const connId of node.connections) {
      const targetNode = TALENT_NODES[connId];
      if (!targetNode) continue;

      const pairKey = [node.id, connId].sort().join('--');
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const isBothAllocated = allocatedIds.includes(node.id) && allocatedIds.includes(connId);
      const isOneAllocated = allocatedIds.includes(node.id) || allocatedIds.includes(connId);

      const strokeColor = isBothAllocated ? 'var(--color-gold)' : isOneAllocated ? 'var(--color-blue-hover)' : 'rgba(110, 110, 122, 0.3)';
      const strokeW = isBothAllocated ? 3.5 : isOneAllocated ? 2 : 1.2;

      lines.push(html`
        <line
          key=${pairKey}
          x1=${node.x}
          y1=${node.y}
          x2=${targetNode.x}
          y2=${targetNode.y}
          stroke=${strokeColor}
          stroke-width=${strokeW}
          stroke-dasharray=${!isOneAllocated ? '4 4' : 'none'}
          style=${isBothAllocated ? 'filter: drop-shadow(0 0 8px var(--color-gold-glow));' : ''}
        />
      `);
    }
  }

  const translatedHovered = hoveredNode ? translateTalentNode(hoveredNode, lang) : null;

  return html`
    <div className="modal-backdrop" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(5, 5, 7, 0.88); backdrop-filter: blur(12px); z-index: 9999; display: flex; align-items: center; justify-content: center;" onClick=${onClose}>
      <div className="glass-panel" style="width: 92vw; height: 88vh; background: var(--color-surface); border: var(--border-highlight); box-shadow: 0 0 50px rgba(0,0,0,0.95), inset 0 0 20px rgba(197, 160, 89, 0.08); display: flex; flex-direction: column; overflow: hidden; border-radius: var(--border-radius-lg);" onClick=${e => e.stopPropagation()}>
        
        <!-- Header -->
        <div style="padding: 1.2rem 1.8rem; background: rgba(18, 18, 26, 0.9); border-bottom: var(--border-glass); display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <span style="font-size: 2rem; filter: drop-shadow(0 0 10px var(--color-gold-glow));">🌌</span>
            <div>
              <h2 className="options-header cinzel text-gold" style="margin: 0; font-size: 1.4rem; letter-spacing: 1px;">
                ${lang === 'de' ? 'Mneme-Sternenbild (Talentbaum)' : 'Mneme Constellation (Skill Tree)'}
              </h2>
              <span className="text-muted" style="font-size: 0.82rem; font-family: var(--font-body);">
                ${lang === 'de' ? 'Path of Exile – Passives Sternen-Netzwerk' : 'Path of Exile Style Passive Star Network'}
              </span>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 1.2rem;">
            <div style="background: rgba(197, 160, 89, 0.08); border: var(--border-highlight); padding: 0.5rem 1.2rem; border-radius: 20px; font-family: var(--font-header);">
              <span className="text-muted" style="font-size: 0.85rem;">${lang === 'de' ? 'Freie Punkte:' : 'Available Points:'}</span>
              <strong className="text-gold" style="font-size: 1.25rem; margin-left: 0.5rem; text-shadow: 0 0 10px var(--color-gold-glow);">${points}</strong>
            </div>
            <button className="glass-btn secondary cinzel" style="padding: 0.45rem 1rem; font-size: 0.8rem; border-color: rgba(139, 28, 28, 0.5); color: #ff8888;" onClick=${handleReset}>
              ⚡ ${lang === 'de' ? 'Zurücksetzen' : 'Reset All'}
            </button>
            <button className="glass-btn secondary" style="padding: 0.45rem 0.8rem; font-size: 1.1rem; color: var(--color-text-muted);" onClick=${onClose}>✕</button>
          </div>
        </div>

        <!-- Canvas and Sidebar -->
        <div style="display: flex; flex: 1; overflow: hidden; position: relative;">
          
          <!-- Zoom Controls -->
          <div style="position: absolute; bottom: 1.2rem; left: 1.2rem; z-index: 10; display: flex; gap: 0.5rem; background: rgba(10, 10, 14, 0.85); backdrop-filter: blur(8px); padding: 0.4rem; border-radius: var(--border-radius-lg); border: var(--border-glass);">
            <button className="glass-btn secondary" style="padding: 0.3rem 0.7rem; font-size: 0.9rem;" onClick=${() => setZoom(z => Math.min(2, z + 0.15))}>➕</button>
            <button className="glass-btn secondary" style="padding: 0.3rem 0.7rem; font-size: 0.9rem;" onClick=${() => setZoom(z => Math.max(0.5, z - 0.15))}>➖</button>
            <button className="glass-btn secondary cinzel" style="padding: 0.3rem 0.8rem; font-size: 0.75rem;" onClick=${() => { setPan({ x: 320, y: 320 }); setZoom(1); }}>
              🎯 ${lang === 'de' ? 'Zentrieren' : 'Center'}
            </button>
          </div>

          <!-- Canvas -->
          <div
            style="flex: 1; position: relative; overflow: hidden; cursor: ${isDragging ? 'grabbing' : 'grab'}; background: var(--color-bg);"
            onMouseDown=${handleMouseDown}
            onMouseMove=${handleMouseMove}
            onMouseUp=${handleMouseUp}
          >
            <div style="transform: translate(${pan.x}px, ${pan.y}px) scale(${zoom}); transform-origin: 0 0; position: absolute; width: 0; height: 0; transition: ${isDragging ? 'none' : 'transform 0.05s ease-out'};">
              
              <!-- SVG Lines -->
              <svg style="position: absolute; overflow: visible; left: 0; top: 0; width: 1px; height: 1px;">
                ${lines}
              </svg>

              <!-- Skill Nodes -->
              ${Object.values(TALENT_NODES).map(node => {
                const isAllocated = allocatedIds.includes(node.id);
                const isAllocatable = talentService ? talentService.isNodeAllocatable(node.id) : false;
                const canUnallocate = talentService ? talentService.canUnallocateNode(node.id) : false;

                let size = node.type === 'start' ? 58 : node.type === 'keystone' ? 54 : node.type === 'notable' ? 46 : 38;
                let borderColor = isAllocated ? 'var(--color-gold)' : isAllocatable ? 'var(--color-blue-hover)' : 'rgba(110, 110, 122, 0.35)';
                let bgColor = isAllocated ? 'rgba(197, 160, 89, 0.25)' : isAllocatable ? 'rgba(74, 139, 153, 0.2)' : 'rgba(18, 18, 26, 0.9)';
                let boxShadow = isAllocated ? '0 0 20px var(--color-gold-glow), inset 0 0 10px rgba(235, 213, 118, 0.3)' : isAllocatable ? '0 0 12px rgba(111, 181, 199, 0.4)' : 'none';

                return html`
                  <div
                    key=${node.id}
                    className="skill-node"
                    style="position: absolute; left: ${node.x - size / 2}px; top: ${node.y - size / 2}px; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid ${borderColor}; background: ${bgColor}; display: flex; align-items: center; justify-content: center; cursor: ${isAllocatable || canUnallocate ? 'pointer' : 'default'}; box-shadow: ${boxShadow}; z-index: 2; user-select: none; transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);"
                    onMouseEnter=${() => setHoveredNode(node)}
                    onMouseLeave=${() => setHoveredNode(null)}
                    onClick=${() => {
                      if (isAllocatable) handleAllocate(node.id);
                      else if (canUnallocate) handleUnallocate(node.id);
                    }}
                  >
                    <span style="font-size: ${size * 0.44}px; filter: ${isAllocated ? 'drop-shadow(0 0 5px var(--color-gold-glow))' : 'none'};">${node.icon}</span>
                  </div>
                `;
              })}
            </div>
          </div>

          <!-- Sidebar -->
          <div style="width: 340px; background: rgba(10, 10, 14, 0.95); border-left: var(--border-glass); padding: 1.4rem; display: flex; flex-direction: column; gap: 1.2rem;">
            <h3 className="cinzel text-gold" style="margin: 0; font-size: 1.1rem; letter-spacing: 0.5px; border-bottom: 2px solid var(--color-gold); padding-bottom: 0.4rem;">
              📊 ${lang === 'de' ? 'Aktive Talent-Boni' : 'Active Talent Bonuses'}
            </h3>
            
            <div style="flex: 1; overflow-y: auto; background: var(--color-panel-inner); padding: 0.8rem; border-radius: var(--border-radius-lg); border: var(--border-glass);">
              ${Object.entries(aggregatedStats).filter(([, val]) => val !== 0).map(([key, val]) => html`
                <div key=${key} style="display: flex; justify-content: space-between; padding: 0.45rem 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 0.85rem;">
                  <span className="text-muted">${formatStatName(key, lang)}:</span>
                  <strong style="color: ${val > 0 ? '#40ff80' : 'var(--color-danger)'}; font-family: var(--font-header);">
                    ${val > 0 ? `+${val}%` : `${val}%`}
                  </strong>
                </div>
              `)}
              ${Object.values(aggregatedStats).every(v => v === 0) ? html`
                <div className="text-muted" style="text-align: center; padding: 1.5rem 0; font-style: italic; font-size: 0.85rem;">
                  ${lang === 'de' ? 'Noch keine Passiv-Knoten freigeschaltet.' : 'No passive nodes allocated yet.'}
                </div>
              ` : ''}
            </div>

            <!-- Tooltip Panel -->
            <div style="min-height: 160px; background: var(--color-panel-inner); padding: 1rem; border-radius: var(--border-radius-lg); border: var(--border-highlight); box-shadow: inset 0 0 15px rgba(0,0,0,0.5);">
              ${hoveredNode && translatedHovered ? html`
                <div>
                  <div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.6rem;">
                    <span style="font-size: 1.6rem; filter: drop-shadow(0 0 8px var(--color-gold-glow));">${hoveredNode.icon}</span>
                    <div>
                      <h4 className="cinzel" style="margin: 0; color: ${hoveredNode.type === 'keystone' ? '#ff6666' : hoveredNode.type === 'notable' ? 'var(--color-gold)' : 'var(--color-text-main)'}; font-size: 1rem;">
                        ${translatedHovered.name}
                      </h4>
                      <span className="text-muted" style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${hoveredNode.type}
                      </span>
                    </div>
                  </div>
                  <p style="color: var(--color-text-main); font-size: 0.85rem; margin: 0 0 0.8rem 0; line-height: 1.45;">
                    ${translatedHovered.description}
                  </p>
                  <div className="text-muted" style="font-size: 0.8rem;">
                    ${lang === 'de' ? `Kosten: ` : `Cost: `}<strong className="text-gold" style="font-family: var(--font-header);">${hoveredNode.cost} ${lang === 'de' ? 'Punkt(e)' : 'Point(s)'}</strong>
                  </div>
                </div>
              ` : html`
                <div className="text-muted" style="text-align: center; padding-top: 1.8rem; font-size: 0.85rem; font-style: italic;">
                  ${lang === 'de' ? 'Fahre über einen Sternenknoten, um Details & Effekte zu sehen.' : 'Hover over a star node to view details & effects.'}
                </div>
              `}
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

function formatStatName(key, lang = 'de') {
  const names = {
    de: {
      damagePercent: 'Physikalischer Schaden',
      critChancePercent: 'Kritische Trefferchance',
      critMultiplierPercent: 'Krit-Schaden Multiplikator',
      mnemeGainPercent: 'Mneme-Ertrag',
      attackSpeedPercent: 'Angriffsgeschwindigkeit',
      maxHpPercent: 'Maximale Gesundheit',
      defensePercent: 'Rüstung / Verteidigung',
      cooldownReductionPercent: 'Abklingzeit-Reduktion',
      xpGainPercent: 'Erfahrungs-Bonus',
      hpRegenPercent: 'Lebensregeneration'
    },
    en: {
      damagePercent: 'Physical Damage',
      critChancePercent: 'Critical Strike Chance',
      critMultiplierPercent: 'Crit Damage Multiplier',
      mnemeGainPercent: 'Mneme Yield',
      attackSpeedPercent: 'Attack Speed',
      maxHpPercent: 'Maximum Health',
      defensePercent: 'Armor / Defense',
      cooldownReductionPercent: 'Cooldown Reduction',
      xpGainPercent: 'Experience Bonus',
      hpRegenPercent: 'Health Regeneration'
    }
  };
  return names[lang]?.[key] || names['de']?.[key] || key;
}

function translateTalentNode(node, lang = 'de') {
  if (lang !== 'en') return { name: node.name, description: node.description };
  const dict = {
    'start_0': { name: 'Origin of Mneme', description: 'Nexus of consciousness. Connects all paths of power.' },
    'str_1': { name: 'Power Impulse I', description: '+4% Physical Damage.' },
    'str_2': { name: 'Power Impulse II', description: '+6% Physical Damage.' },
    'str_notable_1': { name: 'Fate Blade', description: '+12% Physical Damage and +5% Critical Strike Chance.' },
    'str_crit_1': { name: 'Precise Cut', description: '+15% Critical Damage Multiplier.' },
    'str_3': { name: 'Art of War', description: '+8% Damage and +5% Attack Speed.' },
    'keystone_berserk': { name: 'Bloody Wrath', description: 'KEYSTONE: +30% Damage & +25% Crit Damage, but -10% Armor.' },
    'mneme_1': { name: 'Mnemic Flow I', description: '+8% Mneme Yield.' },
    'mneme_2': { name: 'Mnemic Flow II', description: '+12% Mneme Yield.' },
    'mneme_notable_1': { name: 'Mnemic Surge', description: '+25% Mneme Yield and +10% Experience Bonus.' },
    'mneme_cd_1': { name: 'Presence of Mind', description: '+5% Cooldown Reduction.' },
    'mneme_3': { name: 'Cognitive Awakening', description: '+15% Mneme Yield and +5% Damage.' },
    'keystone_mindstorm': { name: 'Mindstorm', description: 'KEYSTONE: +50% Mneme Yield & +10% Cooldown Reduction, but -15% Max HP.' },
    'dex_1': { name: 'Reflexes I', description: '+4% Attack Speed.' },
    'dex_2': { name: 'Reflexes II', description: '+6% Attack Speed.' },
    'dex_notable_1': { name: 'Deadly Elegance', description: '+10% Attack Speed and +8% Critical Strike Chance.' },
    'dex_crit_1': { name: 'Shadow Focus', description: '+5% Critical Strike Chance and +10% Crit Damage.' },
    'dex_3': { name: 'Master of Blades', description: '+8% Attack Speed and +6% Damage.' },
    'keystone_shadow': { name: 'Shadow Walk', description: 'KEYSTONE: +15% Crit Chance & +15% Speed, but -10% Base Damage.' },
    'def_1': { name: 'Hardening I', description: '+5% Maximum Health.' },
    'def_2': { name: 'Hardening II', description: '+8% Maximum Health.' },
    'def_notable_1': { name: 'Brazen Fortress', description: '+15% Maximum Health and +15% Armor.' },
    'def_armor_1': { name: 'Mnemic Plating', description: '+10% Armor and +1% Health Regeneration.' },
    'def_3': { name: 'Unshakable Will', description: '+10% Maximum Health and +10% Armor.' },
    'keystone_titan': { name: 'Titanic Aura', description: 'KEYSTONE: +40% Max HP & +30% Armor, but -15% Attack Speed.' }
  };
  return dict[node.id] || { name: node.name, description: node.description };
}
