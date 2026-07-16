import { ROLES } from '../models/clanmember.js';
import { EVENTS } from '../core/events.js';
import BaseModalUI from './basemodal.js';

export default class ExpeditionUI extends BaseModalUI {
  constructor(context) {
    super('expedition-modal-overlay', 'expedition-modal-close');
    this.eventBus = context.eventBus;
    this.expeditionManager = context.expeditionManager;
    this.clanManager = context.clanManager;
    
    this.currentMemberId = null;
    this.expeditionRunning = false;
    this.currentDurationSec = 20;

    this.modalMemberName = document.getElementById('expedition-member-name');
    this.modalMemberRole = document.getElementById('expedition-member-role');
    this.modalMemberLevel = document.getElementById('expedition-member-level');
    this.modalSuccessChance = document.getElementById('expedition-success-chance');
    this.modalDuration = document.getElementById('expedition-duration');
    this.modalStartBtn = document.getElementById('expedition-start-btn');
    this.modalStatus = document.getElementById('expedition-status');
    this.modalProgressFill = document.getElementById('expedition-progress-fill');
    this.modalProgressText = document.getElementById('expedition-progress-text');
    this.modalResult = document.getElementById('expedition-result');

    this.modalStartBtn.addEventListener('click', () => this._startExpedition());

    this.eventBus.subscribe(EVENTS.UI_MEMBER_CLICKED, this._onMemberClicked.bind(this));
    this.eventBus.subscribe(EVENTS.EXPEDITION_COMPLETE, this._onExpeditionComplete.bind(this));
    this.eventBus.subscribe(EVENTS.GAME_LOGIC_TICK, this._onTick.bind(this));
  }

  _onMemberClicked(data) {
    const { memberId } = data;
    this.currentMemberId = memberId;
    
    const member = this.clanManager.getMemberById(memberId);
    if (!member) return;

    this.modalMemberName.textContent = member.name;
    this.modalMemberRole.textContent = this._roleName(member.role);
    this.modalMemberLevel.textContent = member.level;

    const successChance = this._calculateSuccessChance(member);
    this.modalSuccessChance.textContent = Math.round(successChance * 100) + '%';
    
    const isOnExpedition = this.expeditionManager.isOnExpedition(memberId);
    
    if (isOnExpedition) {
      const expData = this.expeditionManager._activeExpeditions.get(memberId);
      this.currentDurationSec = expData ? expData.duration : 20;
      this.modalDuration.textContent = this.currentDurationSec + ' Sekunden';
      this.expeditionRunning = true;
      this.modalStartBtn.disabled = true;
      this.modalStartBtn.textContent = 'Unterwegs...';
      this.modalStatus.textContent = 'Expedition läuft';
      this.modalResult.textContent = '';
      this.modalResult.className = '';
    } else {
      this.currentDurationSec = 20;
      this.modalDuration.textContent = '20 Sekunden';
      this.expeditionRunning = false;
      this.modalStartBtn.disabled = false;
      this.modalStartBtn.textContent = 'Expedition starten';
      this.modalStatus.textContent = 'Bereit';
      this.modalResult.textContent = '';
      this.modalResult.className = '';
      this.modalProgressFill.style.width = '0%';
      this.modalProgressText.textContent = '0%';
    }
    
    this.open(); 
  }

  onClose() {
    this.currentMemberId = null;
    this.expeditionRunning = false;
    this.modalResult.textContent = '';
    this.modalResult.className = '';
    this.modalStatus.textContent = '';
  }

  _startExpedition() {
    if (!this.currentMemberId) return;
    const member = this.clanManager.getMemberById(this.currentMemberId);
    if (!member || this.expeditionManager.isOnExpedition(this.currentMemberId)) return;

    const successChance = this._calculateSuccessChance(member);
    const duration = this.currentDurationSec;

    const started = this.expeditionManager.startExpedition(this.currentMemberId, duration, successChance);

    if (started) {
      this.expeditionRunning = true;
      this.modalStartBtn.disabled = true;
      this.modalStartBtn.textContent = 'Unterwegs...';
      this.modalStatus.textContent = 'Expedition läuft';
      this.modalResult.textContent = '';
      this.modalResult.className = '';
    } else {
      this.modalStatus.textContent = 'Start fehlgeschlagen – bereits unterwegs?';
    }
  }

  _onExpeditionComplete(data) {
    if (data.memberId === this.currentMemberId) {
      this.expeditionRunning = false;
      this.modalStartBtn.disabled = false;
      this.modalStartBtn.textContent = 'Expedition starten';
      this.modalStatus.textContent = 'Abgeschlossen';
      this.modalProgressFill.style.width = '100%';
      this.modalProgressText.textContent = '100%';

      if (data.success) {
        let rewardText = '';
        if (data.reward.particles) rewardText += data.reward.particles + ' Partikel ';
        if (data.reward.relics) rewardText += data.reward.relics + ' Relikte ';
        if (data.reward.artifacts) rewardText += data.reward.artifacts + ' Artefakte ';
        this.modalResult.textContent = '✅ Erfolg! Belohnung: ' + rewardText;
        this.modalResult.className = 'success';
        
        const modal = document.getElementById('expedition-modal');
        modal.style.borderColor = '#9acd9a';
        modal.style.boxShadow = '0 0 30px rgba(154, 205, 154, 0.4)';
        setTimeout(() => {
          modal.style.borderColor = '#4a3e2e';
          modal.style.boxShadow = 'none';
        }, 400);
      } else {
        this.modalResult.textContent = '❌ Misserfolg – aber 1 Erfahrung gewonnen.';
        this.modalResult.className = 'failure';
      }
    }
  }

  _onTick() {
    if (!this.currentMemberId || !this.expeditionRunning) return;
    
    const remaining = this.expeditionManager.getRemainingTime(this.currentMemberId);
    const total = this.currentDurationSec * 1000;
    
    const progress = Math.max(0, (1 - remaining / total) * 100);
    
    this.modalProgressFill.style.width = Math.min(100, progress) + '%';
    this.modalProgressText.textContent = Math.floor(Math.min(100, progress)) + '%';
    
    const secondsLeft = Math.ceil(remaining / 1000);
    if (secondsLeft > 0) {
      this.modalStatus.textContent = 'Noch ' + secondsLeft + ' Sekunden...';
    } else {
      this.modalStatus.textContent = 'Wird abgeschlossen...';
    }
  }

  _calculateSuccessChance(member) {
    let base = 0.5;
    let levelBonus = (member.level - 1) * 0.05;
    let roleBonus = 0;
    if (member.role === ROLES.COLLECTOR) roleBonus = 0.1;
    else if (member.role === ROLES.GUARDIAN) roleBonus = 0.2;
    return Math.min(0.95, Math.max(0.05, base + levelBonus + roleBonus));
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