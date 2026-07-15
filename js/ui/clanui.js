import { ROLES } from '../models/clanmember.js';
import { EVENTS } from '../core/events.js';
import { formatNumber } from '../utils/format.js'; // NEU

export default class ClanUI {
  constructor(context) {
    this.eventBus = context.eventBus;
    this.clanManager = context.clanManager;
    this.expeditionManager = context.expeditionManager;
    this.settingsManager = context.settingsManager;

    this.membersTbody = document.getElementById('members-tbody');
    this.particleDisplay = document.getElementById('particle-display');
    this.relicDisplay = document.getElementById('relic-display');
    this.artifactDisplay = document.getElementById('artifact-display');
    this.resourceBar = document.getElementById('resource-bar');

    this._prevResources = { particles: 0, relics: 0, artifacts: 0 };
    this._rewardGiven100 = false;
    this._rewardGiven50 = false;

    this._rowCache = new Map();

    this.eventBus.subscribe(EVENTS.CLAN_MEMBERS_UPDATED, this._onMembersUpdated.bind(this));
    this.eventBus.subscribe(EVENTS.RESOURCES_UPDATED, this._updateResources.bind(this));
    this.eventBus.subscribe(EVENTS.GAME_RENDER_TICK, this._onRenderTick.bind(this));
  }

  _onMembersUpdated(data) {
    const members = data.members;

    for (const [id, rowObj] of this._rowCache.entries()) {
      if (!members.find(m => m.id === id)) {
        rowObj.tr.remove();
        this._rowCache.delete(id);
      }
    }

    members.forEach(member => {
      let rowObj = this._rowCache.get(member.id);

      if (!rowObj) {
        const tr = document.createElement('tr');
        tr.addEventListener('click', () => this.eventBus.publish(EVENTS.UI_MEMBER_CLICKED, { memberId: member.id }));

        const tdName = document.createElement('td'); tdName.className = 'member-name';
        const tdRole = document.createElement('td'); tdRole.className = 'member-role';
        const tdLevel = document.createElement('td'); tdLevel.className = 'member-level';

        const tdProgress = document.createElement('td');
        const progContainer = document.createElement('div'); progContainer.className = 'progress-bar-container';
        const progFill = document.createElement('div'); progFill.className = 'progress-bar-fill';
        const progText = document.createElement('div'); progText.className = 'progress-text';

        progContainer.appendChild(progFill);
        progContainer.appendChild(progText);
        tdProgress.appendChild(progContainer);

        tr.append(tdName, tdRole, tdLevel, tdProgress);
        this.membersTbody.appendChild(tr);

        rowObj = { tr, tdName, tdRole, tdLevel, progFill, progText };
        this._rowCache.set(member.id, rowObj);
      }

      rowObj.tdName.textContent = member.name;
      rowObj.tdRole.textContent = this._roleName(member.role);
      rowObj.tdLevel.textContent = member.level;
    });
  }

  _onRenderTick() {
    this.clanManager.members.forEach(member => {
      const rowObj = this._rowCache.get(member.id);
      if (!rowObj) return;

      const visualProgress = Math.min(100, Math.max(0, member.progress));
      rowObj.progFill.style.transform = `scaleX(${visualProgress / 100})`;
      rowObj.progFill.style.transformOrigin = 'left';
      rowObj.progText.textContent = `${Math.floor(visualProgress)}%`;

      const isOnExp = this.expeditionManager.isOnExpedition(member.id);
      rowObj.tr.style.opacity = isOnExp ? '0.6' : '1';
      rowObj.tr.style.backgroundColor = isOnExp ? '#1a1a28' : '';
    });
  }

  _updateResources(data) {
    const { particles, relics, artifacts } = data;
    const prev = this._prevResources;

    // NEU: Werte werden nun formatiert (z.B. 1.000.000) dargestellt
    if (particles !== prev.particles) this.particleDisplay.textContent = formatNumber(particles);
    if (relics !== prev.relics) this.relicDisplay.textContent = formatNumber(relics);
    if (artifacts !== prev.artifacts) this.artifactDisplay.textContent = formatNumber(artifacts);

    const showFloat = this.settingsManager.get('floatingText');
    if (particles > prev.particles && showFloat) {
      this.eventBus.publish(EVENTS.CMD_SPAWN_FLOAT_TEXT, { 
        text: '+' + formatNumber(particles - prev.particles), 
        targetId: 'res-particle' 
      });
      this._pulseResourceBar();
    }

    if (particles >= 100 && !this._rewardGiven100) {
      this._rewardGiven100 = true;
      this.eventBus.publish(EVENTS.CMD_HERO_ADD_BASE_STAT, { stat: 'attack', amount: 5 });
      this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: '100 Partikel gesammelt! Dein Held erhält +5 Angriff!', type: 'event' });
    }
    if (relics >= 50 && !this._rewardGiven50) {
      this._rewardGiven50 = true;
      this.eventBus.publish(EVENTS.CMD_HERO_ADD_BASE_STAT, { stat: 'defense', amount: 3 });
      this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: '50 Relikte gesammelt! Dein Held erhält +3 Verteidigung!', type: 'event' });
    }

    this._prevResources = { particles, relics, artifacts };
  }

  _pulseResourceBar() {
    this.resourceBar.classList.add('pulse');
    setTimeout(() => this.resourceBar.classList.remove('pulse'), 300);
  }

  _roleName(role) {
    switch (role) {
      case ROLES.COLLECTOR: return 'Mneme-Sammler';
      case ROLES.WEAVER: return 'Erinnerungsweber';
      case ROLES.GUARDIAN: return 'Vergessenswächter';
      default: return role;
    }
  }
}