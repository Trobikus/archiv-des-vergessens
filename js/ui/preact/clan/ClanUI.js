/**
 * ============================================================
 * FILE: ui/preact/clan/ClanUI.js – Clan-Mitglieder (Preact)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState, useEffect } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function ClanUI({ stateManager, eventBus, services }) {
  const { clanService, resourceService } = services;
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [activeExp, setActiveExp] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const clanMembers = useStateSelector(stateManager, (state) => state.clan.members);
  const resources = useStateSelector(stateManager, (state) => state.resources);
  const expeditionStatus = useStateSelector(stateManager, (state) => state.clan.expeditionStatus || {});

  useEventBus(eventBus, 'clan:membersUpdated', () => {});

  const member = selectedMemberId ? clanMembers.find(m => m.id === selectedMemberId) : null;
  const isOnExp = member ? expeditionStatus[member.id] || false : false;

  useEffect(() => {
    if (!selectedMemberId || !isOnExp) {
      setActiveExp(null);
      return;
    }
    const updateExpInfo = () => {
      const info = clanService.getActiveExpedition(selectedMemberId);
      if (info) {
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
    guardian: 'Wächter'
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
      </tr>
    `;
  });

  return html`
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
        <h3 class="panel-title cinzel text-blue text-highlight">Neue Mitglieder anwerben</h3>
        <div class="recruit-buttons" style="display: flex; flex-direction: column; gap: 12px; margin-top: 1rem;">
          <button id="recruit-collector-btn" class="glass-btn flex-between" onClick=${() => handleRecruit('collector')}>
            <span>Sammler</span>
            <span class="text-gold">(10)</span>
          </button>
          <button id="recruit-weaver-btn" class="glass-btn flex-between" onClick=${() => handleRecruit('weaver')}>
            <span>Weber</span>
            <span class="text-gold">(25)</span>
          </button>
          <button id="recruit-guardian-btn" class="glass-btn flex-between" onClick=${() => handleRecruit('guardian')}>
            <span>Wächter</span>
            <span class="text-gold">(40)</span>
          </button>
        </div>
      </div>

      ${renderExpeditionModal()}
    </div>
  `;
}