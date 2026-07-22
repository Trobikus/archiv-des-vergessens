// ============================================================
// FILE: js/ui/preact/skilltree/SkillTreeModal.js – Path of Exile Style Skill Tree UI
// ============================================================
import { h, html, useState, useEffect, useRef } from '../setup.js';
import { TALENT_NODES } from '../../../data/talent-nodes.js';

export function SkillTreeModal({ talentService, onClose }) {
  const [allocatedIds, setAllocatedIds] = useState([]);
  const [points, setPoints] = useState(0);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [pan, setPan] = useState({ x: 300, y: 300 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

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

  const handleReset = () => {
    if (confirm('Möchtest du wirklich alle Talentpunkte zurücksetzen?')) {
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

      const strokeColor = isBothAllocated ? '#ffd700' : isOneAllocated ? '#00e5ff' : '#2a3a4e';
      const strokeW = isBothAllocated ? 4 : isOneAllocated ? 2.5 : 1.5;

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
          style=${isBothAllocated ? 'filter: drop-shadow(0 0 6px rgba(255,215,0,0.8));' : ''}
        />
      `);
    }
  }

  return html`
    <div className="modal-backdrop" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(5, 8, 15, 0.85); backdrop-filter: blur(8px); z-index: 9999; display: flex; align-items: center; justify-content: center;" onClick=${onClose}>
      <div className="skilltree-modal-container" style="width: 92vw; height: 88vh; background-color: #0b101d; border-radius: 16px; border: 1px solid rgba(255,215,0,0.3); box-shadow: 0 0 40px rgba(0,0,0,0.9); display: flex; flex-direction: column; overflow: hidden;" onClick=${e => e.stopPropagation()}>
        
        {/* AAA Header */}
        <div style="padding: 16px 24px; background-color: #101728; border-bottom: 1px solid rgba(255,215,0,0.2); display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 1.8rem;">🌌</span>
            <div>
              <h2 style="margin: 0; color: #ffd700; font-size: 1.4rem;">Mneme-Sternenbild (Talentbaum)</h2>
              <span style="color: #8a9bb0; font-size: 0.85rem;">Path of Exile – Verzweigtes Passiv-Netzwerk</span>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="background-color: rgba(0,229,255,0.1); border: 1px solid rgba(0,229,255,0.3); padding: 6px 14px; border-radius: 20px; color: #c0e0f0; font-size: 0.9rem;">
              <span>Freie Talentpunkte:</span>
              <strong style="color: #00e5ff; font-size: 1.2rem; margin-left: 6px;">${points}</strong>
            </div>
            <button style="background-color: rgba(255,85,85,0.15); border: 1px solid #ff5555; color: #ffaaaa; padding: 6px 14px; border-radius: 8px; cursor: pointer;" onClick=${handleReset}>⚡ Zurücksetzen</button>
            <button style="background-color: transparent; border: none; color: #8a9bb0; font-size: 1.5rem; cursor: pointer;" onClick=${onClose}>✕</button>
          </div>
        </div>

        {/* Main Canvas + Sidebar Area */}
        <div style="display: flex; flex: 1; overflow: hidden; position: relative;">
          
          {/* Zoom Controls */}
          <div style="position: absolute; bottom: 16px; left: 16px; z-index: 10; display: flex; gap: 8px; background-color: rgba(16,23,40,0.9); padding: 6px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
            <button onClick=${() => setZoom(z => Math.min(2, z + 0.15))}>➕</button>
            <button onClick=${() => setZoom(z => Math.max(0.5, z - 0.15))}>➖</button>
            <button onClick=${() => { setPan({ x: 300, y: 300 }); setZoom(1); }}>🎯 Zentrieren</button>
          </div>

          {/* Interactive Graph Canvas */}
          <div
            style="flex: 1; position: relative; overflow: hidden; cursor: grab; background-color: #070b14;"
            onMouseDown=${handleMouseDown}
            onMouseMove=${handleMouseMove}
            onMouseUp=${handleMouseUp}
          >
            <div style="transform: translate(${pan.x}px, ${pan.y}px) scale(${zoom}); transform-origin: 0 0; position: absolute; width: 0; height: 0; transition: ${isDragging ? 'none' : 'transform 0.05s ease-out'};">
              
              {/* SVG Connector Lines */}
              <svg style="position: absolute; overflow: visible; left: 0; top: 0; width: 1px; height: 1px;">
                ${lines}
              </svg>

              {/* Skill Nodes */}
              ${Object.values(TALENT_NODES).map(node => {
                const isAllocated = allocatedIds.includes(node.id);
                const isAllocatable = talentService ? talentService.isNodeAllocatable(node.id) : false;
                const canUnallocate = talentService ? talentService.canUnallocateNode(node.id) : false;

                let size = node.type === 'start' ? 56 : node.type === 'keystone' ? 52 : node.type === 'notable' ? 44 : 36;
                let borderColor = isAllocated ? '#ffd700' : isAllocatable ? '#00e5ff' : '#3a4a5e';
                let bgColor = isAllocated ? 'rgba(255,215,0,0.2)' : isAllocatable ? 'rgba(0,229,255,0.15)' : 'rgba(15,22,35,0.85)';
                let boxShadow = isAllocated ? '0 0 15px rgba(255,215,0,0.6)' : isAllocatable ? '0 0 10px rgba(0,229,255,0.4)' : 'none';

                return html`
                  <div
                    key=${node.id}
                    className="skill-node"
                    style="position: absolute; left: ${node.x - size / 2}px; top: ${node.y - size / 2}px; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid ${borderColor}; background-color: ${bgColor}; display: flex; align-items: center; justify-content: center; cursor: ${isAllocatable || canUnallocate ? 'pointer' : 'default'}; box-shadow: ${boxShadow}; z-index: 2; user-select: none; transition: all 0.2s ease;"
                    onMouseEnter=${() => setHoveredNode(node)}
                    onMouseLeave=${() => setHoveredNode(null)}
                    onClick=${() => {
                      if (isAllocatable) handleAllocate(node.id);
                      else if (canUnallocate) handleUnallocate(node.id);
                    }}
                  >
                    <span style="font-size: ${size * 0.45}px;">${node.icon}</span>
                  </div>
                `;
              })}
            </div>
          </div>

          {/* Sidebar: Tooltip & Aggregated Stats */}
          <div style="width: 320px; background-color: #0f1626; border-left: 1px solid rgba(255,215,0,0.2); padding: 20px; display: flex; flex-direction: column; gap: 16px;">
            <h3 style="margin: 0 0 12px 0; color: #ffd700; font-size: 1.1rem;">📊 Aktive Talent-Boni</h3>
            <div style="flex: 1; overflow-y: auto; background-color: rgba(5,8,15,0.5); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
              ${Object.entries(aggregatedStats).filter(([, val]) => val !== 0).map(([key, val]) => html`
                <div key=${key} style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem;">
                  <span style="color: #a0b0c0;">${formatStatName(key)}:</span>
                  <strong style="color: ${val > 0 ? '#40ff80' : '#ff5555'};">
                    ${val > 0 ? `+${val}%` : `${val}%`}
                  </strong>
                </div>
              `)}
            </div>

            {/* Selected / Hovered Node Tooltip Panel */}
            <div style="height: 150px; background-color: rgba(16,23,40,0.8); padding: 14px; border-radius: 8px; border: 1px solid rgba(0,229,255,0.2);">
              ${hoveredNode ? html`
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="font-size: 1.5rem;">${hoveredNode.icon}</span>
                    <div>
                      <h4 style="margin: 0; color: ${hoveredNode.type === 'keystone' ? '#ff5555' : hoveredNode.type === 'notable' ? '#ffd700' : '#ffffff'};">
                        ${hoveredNode.name}
                      </h4>
                      <span style="font-size: 0.75rem; color: #8a9bb0; text-transform: uppercase;">
                        ${hoveredNode.type}
                      </span>
                    </div>
                  </div>
                  <p style="color: #d0e0f0; font-size: 0.85rem; margin: 0 0 10px 0; line-height: 1.4;">
                    ${hoveredNode.description}
                  </p>
                  <div style="font-size: 0.8rem; color: #8a9bb0;">
                    Kosten: <strong style="color: #00e5ff;">${hoveredNode.cost} Punkt(e)</strong>
                  </div>
                </div>
              ` : html`
                <div style="color: #6a7b90; font-size: 0.85rem; text-align: center; padding-top: 20px;">
                  Fahre über einen Knotenpunkt, um Details und Effekte zu sehen.
                </div>
              `}
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

function formatStatName(key) {
  const names = {
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
  };
  return names[key] || key;
}
