/**
 * ============================================================
 * FILE: ui/preact/clan/ClanUI.js – Clan-Mitglieder (Preact)
 * ============================================================
 */

import { h, html, useStateSelector, useEventBus, useState } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function ClanUI({ stateManager, eventBus, services }) {
  const { clanService, resourceService } = services;
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  const clanMembers = useStateSelector(stateManager, (state) => state.clan.members);
  const resources = useStateSelector(stateManager, (state) => state.resources);
  const expeditionStatus = useStateSelector(stateManager, (state) => state.clan.expeditionStatus || {});

  useEventBus(eventBus, 'clan:membersUpdated', () => {});
  useEventBus(eventBus, 'clan:memberLevelUp', (data) => {
    eventBus.publish('ui:showToast', {
      message: `🎉 ${clanMembers.find(m => m.id === data.memberId)?.name} erreicht Stufe ${data.newLevel}!`,
      type: 'success',
      duration: 2000
    });
  });

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
    // Expedition-Modal öffnen (wird separat behandelt)
    eventBus.publish('ui:openExpedition', { memberId });
  };

  const roleLabels = {
    collector: 'Sammler',
    weaver: 'Weber',
    guardian: 'Wächter'
  };

  return html`
    <div class="clan-ui-container">
      <div class="glass-panel" style="padding: 1.5rem;">
        <h3 class="panel-title cinzel text-gold">Mitglieder des Bundes</h3>
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
              ${clanMembers.map(member => {
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
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div class="glass-panel" style="padding: 1.5rem; margin-top: 1.5rem;">
        <h3 class="panel-title cinzel text-blue text-highlight">Neue Mitglieder anwerben</h3>
        <div class="recruit-buttons" style="display: flex; flex-direction: column; gap: 12px; margin-top: 1rem;">
          <button class="glass-btn flex-between" onClick=${() => handleRecruit('collector')}>
            <span>Sammler</span>
            <span class="text-gold">(10)</span>
          </button>
          <button class="glass-btn flex-between" onClick=${() => handleRecruit('weaver')}>
            <span>Weber</span>
            <span class="text-gold">(25)</span>
          </button>
          <button class="glass-btn flex-between" onClick=${() => handleRecruit('guardian')}>
            <span>Wächter</span>
            <span class="text-gold">(40)</span>
          </button>
        </div>
      </div>
    </div>
  `;
}