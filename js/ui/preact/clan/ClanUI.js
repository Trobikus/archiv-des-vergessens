/**
 * ============================================================
 * FILE: ui/preact/clan/ClanUI.js – Clan-Mitglieder & Clan-Raids (Preact)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState, useEffect } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function ClanUI({ stateManager, eventBus, services }) {
  const { clanService, resourceService } = services;
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [activeExp, setActiveExp] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeSubTab, setActiveSubTab] = useState('bund'); // 'bund' oder 'raid'
  const [raidSelection, setRaidSelection] = useState([]); // Liste von ausgewählten Mitglieds-IDs für den Raid

  const clanMembers = useStateSelector(stateManager, (state) => state.clan.members);
  const resources = useStateSelector(stateManager, (state) => state.resources);
  const expeditionStatus = useStateSelector(stateManager, (state) => state.clan.expeditionStatus || {});
  const raidState = useStateSelector(stateManager, (state) => state.clan.raid || { active: false, members: [], durationSeconds: 0, maxDuration: 300, rewardClaimed: false });

  useEventBus(eventBus, 'clan:membersUpdated', () => {});
  useEventBus(eventBus, 'clan:raidStarted', () => { setRaidSelection([]); });
  useEventBus(eventBus, 'clan:raidComplete', () => {});
  useEventBus(eventBus, 'clan:raidClaimed', () => {});

  const member = selectedMemberId ? clanMembers.find(m => m.id === selectedMemberId) : null;
  const isOnExp = member ? expeditionStatus[member.id] || false : false;

  // Einzel-Expeditionen Interval
  useEffect(() => {
    if (!selectedMemberId || !isOnExp) {
      setActiveExp(null);
      return;
    }
    const updateExpInfo = () => {
      const info = clanService.getActiveExpedition(selectedMemberId);
      if (info && !info.isRaid) {
        setActiveExp({
          remainingTime: info.remainingTime,
          duration: info.duration,
          successChance: info.successChance
        });
      } else {
        setActiveExp(null);
      }
    };
    updateExpInfo();
    const interval = setInterval(updateExpInfo, 250);
    return () => clearInterval(interval);
  }, [selectedMemberId, isOnExp, clanService]);

  const handleRecruit = (role) => {
    const cost = role === 'collector' ? 10 : role === 'weaver' ? 25 : 40;
    if (resources.particles < cost) {
      eventBus.publish('ui:showToast', {
        message: `❌ Nicht genug Partikel (${cost} benötigt)`,
        type: 'warning',
        duration: 2000
      });
      return;
    }
    clanService.recruitMember(role);
  };

  const handleMemberClick = (memberId) => {
    // Wenn das Mitglied auf normaler Expedition ist, Einzelmodal öffnen
    const info = clanService.getActiveExpedition(memberId);
    if (info && info.isRaid) {
      eventBus.publish('ui:showToast', {
        message: '🛡️ Dieses Mitglied kämpft gerade im heroischen Clan-Raid!',
        type: 'warning',
        duration: 2500
      });
      return;
    }
    setSelectedMemberId(memberId);
  };

  const getSuccessChance = (m) => {
    if (!m) return 0;
    let base = 0.5;
    let levelBonus = (m.level - 1) * 0.05;
    let roleBonus = 0;
    if (m.role === 'collector') roleBonus = 0.1;
    else if (m.role === 'guardian') roleBonus = 0.2;
    return Math.min(0.95, Math.max(0.05, base + levelBonus + roleBonus));
  };

  const handleStartExpedition = () => {
    if (!member) return;
    clanService.startExpedition(member.id, 20);
  };

  const roleLabels = {
    collector: 'Sammler',
    weaver: 'Weber',
    guardian: 'Wächter',
    archivist: 'Archivar (Episch)',
    elder: 'Ältester (Legendär)'
  };

  const handleDismissMember = (e, memberId) => {
    e.stopPropagation();
    clanService.dismissMember(memberId);
  };

  const renderExpeditionModal = () => {
    if (!selectedMemberId || !member) return null;
    
    const successChance = getSuccessChance(member);
    const progress = activeExp ? Math.min(100, (1 - activeExp.remainingTime / (activeExp.duration * 1000)) * 100) : 0;
    const remainingSeconds = activeExp ? Math.ceil(activeExp.remainingTime / 1000) : 0;

    return html`
      <div class="modal-overlay" style="display: flex;" onClick=${() => { setSelectedMemberId(null); }}>
        <div class="modal-content-small glass-panel" onClick=${(e) => e.stopPropagation()}>
          <button class="modal-close" onClick=${() => { setSelectedMemberId(null); }}>×</button>
          <h2 class="glow-text cinzel text-center mb-1">Expedition</h2>
          
          <div class="glass-inner-panel mb-1" style="padding: 1rem; margin-bottom: 1rem;">
            <div class="flex-between mb-1" style="margin-bottom: 0.5rem;">
              <span class="text-muted">Name:</span>
              <span class="text-highlight text-bold">${member.name}</span>
            </div>
            <div class="flex-between mb-1" style="margin-bottom: 0.5rem;">
              <span class="text-muted">Beruf:</span>
              <span>${roleLabels[member.role] || member.role}</span>
            </div>
            <div class="flex-between mb-1" style="margin-bottom: 0.5rem;">
              <span class="text-muted">Stufe:</span>
              <span>${member.level}</span>
            </div>
            <div class="flex-between mb-1" style="margin-bottom: 0.5rem;">
              <span class="text-muted">Erfolgschance:</span>
              <span class="text-gold text-bold">${Math.round(successChance * 100)}%</span>
            </div>
            <div class="flex-between">
              <span class="text-muted">Dauer:</span>
              <span>20s</span>
            </div>
          </div>

          ${isOnExp ? html`
            <div class="expedition-progress-area mb-2" style="margin-bottom: 1rem;">
              <div class="flex-between mb-1" style="margin-bottom: 0.5rem;">
                <span class="text-muted">Status:</span>
                <span class="text-highlight text-bold">Auf Expedition (Noch ${remainingSeconds}s)</span>
              </div>
              <div class="progress-bar-container" style="height: 16px; position: relative;">
                <div class="progress-bar-fill" style="transform: scaleX(${progress / 100}); transform-origin: left; width: 100%; height: 100%;"></div>
                <div class="progress-text">${Math.floor(progress)}%</div>
              </div>
            </div>
            <button class="glass-btn w-100" style="width: 100%; padding: 0.8rem;" disabled>
              ⏳ BEREITS UNTERWEGS
            </button>
          ` : html`
            <button class="glass-btn primary w-100 epic-pulse" style="width: 100%; padding: 0.8rem; letter-spacing: 1px;" onClick=${handleStartExpedition}>
              🚀 EXPEDITION STARTEN
            </button>
          `}
        </div>
      </div>
    `;
  };

  const itemsPerPage = 20;
  const totalMembers = clanMembers.length;
  const totalPages = Math.max(1, Math.ceil(totalMembers / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedMembers = clanMembers.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return html`
      <div class="pagination-controls" style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 1rem; font-size: 0.85rem;">
        <button class="glass-btn" style="padding: 4px 12px; min-width: auto; height: auto; line-height: 1;" onClick=${() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled=${activePage === 1}>
          ◀ Zurück
        </button>
        <span class="text-muted cinzel">${activePage} / ${totalPages}</span>
        <button class="glass-btn" style="padding: 4px 12px; min-width: auto; height: auto; line-height: 1;" onClick=${() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled=${activePage === totalPages}>
          Weiter ▶
        </button>
      </div>
    `;
  };
  const idleMembers = clanMembers.filter(m => !expeditionStatus[m.id]);

  const handleMultipleExpeditions = () => {
    const idleIds = idleMembers.map(m => m.id);
    if (idleIds.length === 0) return;
    
    const count = clanService.startMultipleExpeditions(idleIds, 20);
    if (count > 0) {
      eventBus.publish('ui:showToast', {
        message: `🚀 ${count} Mitglieder auf Expedition entsandt!`,
        type: 'success',
        duration: 2500
      });
    }
  };

  const multipleExpeditionsBtn = idleMembers.length > 1 ? html`
    <button class="glass-btn primary btn-small epic-pulse" style="padding: 4px 10px; font-size: 0.75rem;" onClick=${handleMultipleExpeditions}>
      🚀 Alle Bereiten entsenden (${idleMembers.length})
    </button>
  ` : null;

  const memberRows = paginatedMembers.map(member => {
    const isOnExp = expeditionStatus[member.id] || false;
    const progress = Math.min(100, member.progress || 0);
    return html`
      <tr style="cursor: pointer; opacity: ${isOnExp ? '0.6' : '1'};" onClick=${() => handleMemberClick(member.id)}>
        <td class="member-name">${member.name}</td>
        <td class="member-role">${roleLabels[member.role] || member.role}</td>
        <td class="member-level">${member.level}</td>
        <td>
          <div class="progress-bar-container" style="height: 14px;">
            <div class="progress-bar-fill" style="transform: scaleX(${progress / 100}); transform-origin: left;"></div>
            <div class="progress-text">${Math.floor(progress)}%</div>
          </div>
        </td>
        <td style="text-align: right; width: 40px;">
          <button class="glass-btn" style="padding: 2px 6px; min-width: auto; border-color: rgba(248, 113, 113, 0.4); color: #f87171;" 
                  onClick=${(e) => handleDismissMember(e, member.id)}
                  title="Mitglied entlassen (50% Kosten zurück)"
                  disabled=${isOnExp}>
            ❌
          </button>
        </td>
      </tr>
    `;
  });

  // Raid-Auswahl umschalten
  const toggleRaidSelection = (memberId) => {
    if (raidSelection.includes(memberId)) {
      setRaidSelection(prev => prev.filter(id => id !== memberId));
    } else {
      if (raidSelection.length >= 5) {
        eventBus.publish('ui:showToast', {
          message: '⚠️ Maximal 5 Mitglieder können an einem Raid teilnehmen.',
          type: 'warning',
          duration: 2500
        });
        return;
      }
      setRaidSelection(prev => [...prev, memberId]);
    }
  };

  const handleStartRaid = () => {
    const res = clanService.startClanRaid(raidSelection);
    if (res.success) {
      setRaidSelection([]);
    }
  };

  const handleClaimRaidReward = () => {
    clanService.claimRaidReward();
  };

  return html`
    <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%;">
      <!-- Sub-Navigation für Tabs -->
      <div class="tab-container" style="display: flex; gap: 6px; border-bottom: 2px solid rgba(197, 160, 89, 0.15); padding-bottom: 1px;">
        <button class="inv-tab-btn ${activeSubTab === 'bund' ? 'active' : ''}" style="font-family: var(--font-header); letter-spacing: 0.5px; padding: 0.4rem 1rem;" onClick=${() => setActiveSubTab('bund')}>
          👥 Bund-Verwaltung
        </button>
        <button class="inv-tab-btn ${activeSubTab === 'raid' ? 'active' : ''}" style="font-family: var(--font-header); letter-spacing: 0.5px; padding: 0.4rem 1rem;" onClick=${() => setActiveSubTab('raid')}>
          ⚔️ heroische Clan-Raids
        </button>
      </div>

      ${activeSubTab === 'bund' ? html`
        <div class="clan-ui-container panels-grid">
          <div class="glass-panel" style="padding: 1.5rem;">
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(197,160,89,0.15); padding-bottom: 0.5rem; margin-bottom: 1rem;">
              <h3 class="panel-title cinzel text-gold" style="margin: 0; border: none; padding: 0;">Mitglieder des Bundes</h3>
              ${multipleExpeditionsBtn}
            </div>
            <div class="table-container" style="max-height: 280px; overflow-y: auto; margin-top: 1rem;">
              <table id="clan-members-table" style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Beruf</th>
                    <th>Stufe</th>
                    <th style="width: 30%;">Fortschritt</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${memberRows}
                </tbody>
              </table>
            </div>
            ${renderPagination()}
          </div>

          <div id="clan-recruit-panel" class="glass-panel" style="padding: 1.5rem;">
            <h3 class="panel-title cinzel text-blue text-highlight" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem; margin-bottom: 1rem;">Neue Mitglieder anwerben</h3>
            <div class="recruit-buttons" style="display: flex; flex-direction: column; gap: 12px; max-height: 350px; overflow-y: auto; padding-right: 10px;">
              <button id="recruit-collector-btn" class="glass-btn flex-between" onClick=${() => handleRecruit('collector')}>
                <span>Sammler (Sammelt passive Partikel)</span>
                <span class="text-gold">🪙 10</span>
              </button>
              <button id="recruit-weaver-btn" class="glass-btn flex-between" onClick=${() => handleRecruit('weaver')}>
                <span>Weber (Sammelt Relikte & Partikel)</span>
                <span class="text-gold">🪙 25</span>
              </button>
              <button id="recruit-guardian-btn" class="glass-btn flex-between" onClick=${() => handleRecruit('guardian')}>
                <span>Wächter (Findet seltene Artefakte)</span>
                <span class="text-gold">🪙 40</span>
              </button>
              
              <div style="border-top: 1px dashed rgba(197, 160, 89, 0.2); margin: 5px 0;"></div>
              
              <button id="recruit-archivist-btn" class="glass-btn flex-between" style="border-color: #a855f7; box-shadow: inset 0 0 10px rgba(168, 85, 247, 0.1);" onClick=${() => handleRecruit('archivist')}>
                <span>Archivar (Episch: Sehr hohe Effizienz)</span>
                <span class="text-gold">🪙 200</span>
              </button>
              <button id="recruit-elder-btn" class="glass-btn flex-between" style="border-color: #eab308; box-shadow: inset 0 0 10px rgba(234, 179, 8, 0.1);" onClick=${() => handleRecruit('elder')}>
                <span style="text-shadow: 0 0 5px rgba(234,179,8,0.5);">Ältester (Legendär: Elite-Raidleiter)</span>
                <span class="text-gold">🪙 500</span>
              </button>
            </div>
          </div>

          ${renderExpeditionModal()}
        </div>
      ` : html`
        <div class="clan-raid-container glass-panel" style="padding: 1.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
          <!-- Raid Status / Auswahlliste -->
          <div class="glass-inner-panel" style="padding: 1.2rem; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <h3 class="panel-title cinzel text-gold text-center" style="font-size: 1.15rem; border-bottom: 1px solid rgba(197,160,89,0.15); padding-bottom: 0.5rem; margin-bottom: 1rem;">
                ⚔️ Expeditionen in die Katakomben
              </h3>
              
              ${raidState.active ? (() => {
                const progress = raidState.durationSeconds > 0 
                  ? Math.min(100, (1 - raidState.durationSeconds / raidState.maxDuration) * 100) 
                  : 100;
                const minutes = Math.floor(raidState.durationSeconds / 60);
                const seconds = raidState.durationSeconds % 60;
                const timeString = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

                return html`
                  <div style="text-align: center; padding: 1.5rem 0;">
                    <div style="font-size: 2.5rem; animation: pulse 2s infinite;">⚔️</div>
                    <div class="text-highlight text-lg text-bold" style="margin-top: 0.5rem; font-family: var(--font-header);">
                      ${raidState.durationSeconds > 0 ? `Clan-Raid läuft... (${timeString})` : 'Raid erfolgreich abgeschlossen!'}
                    </div>
                    
                    <div class="progress-bar-container" style="height: 18px; margin: 1.2rem 0; background: rgba(0,0,0,0.5);">
                      <div class="progress-bar-fill" style="transform: scaleX(${progress / 100}); transform-origin: left; background: var(--color-blue); width: 100%; height: 100%;"></div>
                      <div class="progress-text">${Math.floor(progress)}%</div>
                    </div>

                    <div class="text-muted" style="font-size: 0.8rem; margin-bottom: 1rem;">
                      Teilnehmende Kämpfer:
                    </div>
                    <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                      ${raidState.members.map(mId => {
                        const m = clanMembers.find(member => member.id === mId);
                        return html`
                          <span style="font-size: 0.7rem; background: rgba(197,160,89,0.1); border: 1px solid var(--color-gold); padding: 0.2rem 0.5rem; border-radius: 3px; color: #fff;">
                            👤 ${m ? m.name : 'Kämpfer'}
                          </span>
                        `;
                      })}
                    </div>

                    ${raidState.durationSeconds === 0 && !raidState.rewardClaimed ? html`
                      <button class="glass-btn primary w-100 epic-pulse" style="margin-top: 1.5rem; padding: 0.8rem; font-size: 0.95rem; font-family: var(--font-header);" onClick=${handleClaimRaidReward}>
                        🎁 Beute einfordern!
                      </button>
                    ` : html`
                      <button class="glass-btn w-100" style="margin-top: 1.5rem; padding: 0.8rem;" disabled>
                        ⏳ RAID IN ARBEIT...
                      </button>
                    `}
                  </div>
                `;
              })() : html`
                <div>
                  <p class="text-muted text-sm" style="line-height: 1.4; color: #ccc;">
                    Entsende bis zu 5 unbeschäftigte Clan-Mitglieder auf eine hocheffiziente, heroische Expedition tief in die versiegelten Katakomben des Archivs.
                  </p>
                  <p class="text-muted text-sm" style="line-height: 1.4; color: #ccc; margin-top: 0.5rem;">
                    Erfolgreiche Raids belohnen dich garantiert mit wertvollen <span class="text-gold text-bold">Katalysatoren</span> zur Sockelung deiner Ausrüstung und bieten eine Chance auf <span class="text-highlight text-bold">legendäre Schätze</span>!
                  </p>

                  <div class="glass-inner-panel text-center" style="padding: 1rem; margin-top: 1.5rem; background: rgba(197, 160, 89, 0.03); border: 1px dashed rgba(197,160,89,0.25);">
                    <div class="text-gold text-bold cinzel" style="font-size: 0.85rem;">Vorbereitung zur Expedition:</div>
                    <div class="text-sm mt-1" style="font-size: 0.8rem; color: #eee; margin-top: 4px;">
                      Ausgewählte Kämpfer: <span class="text-highlight text-bold" style="font-size: 0.95rem; color: var(--color-gold);">${raidSelection.length} / 5</span>
                    </div>
                  </div>

                  <button class="glass-btn primary w-100 ${raidSelection.length > 0 ? 'epic-pulse' : ''}" 
                          style="margin-top: 1.5rem; padding: 0.8rem; font-size: 0.9rem; font-family: var(--font-header);"
                          disabled=${raidSelection.length === 0}
                          onClick=${handleStartRaid}>
                    ⚔️ EXPEDITION STARTEN
                  </button>
                </div>
              `}
            </div>
            
            <div class="text-muted text-xs text-center" style="font-style: italic; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.5rem; margin-top: 1rem;">
              Dauer eines Raids: 5 Minuten. Alle teilnehmenden Mitglieder erhalten massive Stufen-EP.
            </div>
          </div>

          <!-- Mitglieder-Auswahlliste -->
          <div class="glass-inner-panel" style="padding: 1.2rem; display: flex; flex-direction: column;">
            <h3 class="panel-title cinzel text-gold text-center" style="font-size: 1.15rem; border-bottom: 1px solid rgba(197,160,89,0.15); padding-bottom: 0.5rem; margin-bottom: 1rem;">
              👤 Bereitstehende Kämpfer
            </h3>
            
            <div class="modal-scroll-area" style="flex: 1; overflow-y: auto; max-height: 280px; padding-right: 0.2rem;">
              ${idleMembers.length === 0 ? html`
                <div class="text-muted text-center text-italic" style="padding: 2.5rem;">
                  Keine unbeschäftigten Clan-Mitglieder bereit. Warte bis normale Expeditionen abgeschlossen sind.
                </div>
              ` : idleMembers.map(m => {
                const isSelected = raidSelection.includes(m.id);
                return html`
                  <div class="glass-inner-panel" 
                       style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.8rem; margin-bottom: 0.4rem; cursor: ${raidState.active ? 'not-allowed' : 'pointer'}; background: ${isSelected ? 'rgba(197, 160, 89, 0.08)' : 'rgba(255,255,255,0.01)'}; border: 1px solid ${isSelected ? 'var(--color-gold)' : 'rgba(255,255,255,0.05)'}; transition: all 0.2s ease; opacity: ${raidState.active ? 0.65 : 1};"
                       onClick=${() => { if (!raidState.active) toggleRaidSelection(m.id); }}>
                    <div>
                      <div class="text-bold text-sm" style="font-size: 0.85rem; color: ${isSelected ? 'var(--color-gold)' : '#fff'};">${m.name}</div>
                      <div class="text-muted" style="font-size: 0.72rem; margin-top: 1px;">Stufe ${m.level} • ${roleLabels[m.role] || m.role}</div>
                    </div>
                    <div>
                      ${raidState.active ? '' : html`
                        <input type="checkbox" 
                               checked=${isSelected} 
                               style="width: 16px; height: 16px; accent-color: var(--color-gold); cursor: pointer;"
                               onClick=${(e) => { e.stopPropagation(); toggleRaidSelection(m.id); }} />
                      `}
                    </div>
                  </div>
                `;
              })}
            </div>
          </div>
        </div>
      `}
    </div>
  `;
}