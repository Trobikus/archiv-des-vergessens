import ClanMember, { ROLES } from '../models/clanmember.js';
import { EVENTS } from '../core/events.js';
import { CONFIG } from '../core/config.js';

export default class ClanManager {
  constructor(eventBus, resourceManager, challengeManager) {
    this.eventBus = eventBus;
    this.resourceManager = resourceManager;
    this.challengeManager = challengeManager;
    this.libraryManager = null; 
    
    this.members = [];
    this._nextId = 1;
    this._expeditionStatus = new Map();

    this.eventBus.subscribe(EVENTS.GAME_LOGIC_TICK, this._onTick.bind(this));
    this.eventBus.subscribe(EVENTS.CLAN_RECRUIT_MEMBER, this._onRecruitMember.bind(this));
  }

  _onTick(data) {
    const { delta } = data;
    const isDrought = this.challengeManager && this.challengeManager.activeChallenge === 'drought';
    const libraryBonus = this.libraryManager ? (1 + this.libraryManager.getBonus('clan_boost')) : 1;

    this.members.forEach(member => {
      if (this._expeditionStatus.get(member.id)) return;

      let rate = member.getCollectRate(this.resourceManager.hero ? this.resourceManager.hero.getPrestigeBonus('jobRate') : 0);
      rate *= libraryBonus;
      if (isDrought && member.role === ROLES.COLLECTOR) rate *= 0.2;

      member.progress += (rate * delta) / CONFIG.CLAN.TICK_RATE_MS * 100;

      if (member.progress >= 100) {
        const cycles = Math.floor(member.progress / 100);
        member.progress = member.progress % 100;
        for (let i = 0; i < cycles; i++) {
          this._produceResource(member);
          member.addExperience(CONFIG.CLAN.EXP_PER_CYCLE, this.eventBus);
        }
      }
    });
  }

  _produceResource(member) {
    if (member.role === ROLES.COLLECTOR) {
      this.resourceManager.addParticles(1);
    } else if (member.role === ROLES.WEAVER) {
      if (Math.random() < 0.1) this.resourceManager.addRelics(1);
      else this.resourceManager.addParticles(2);
    } else if (member.role === ROLES.GUARDIAN) {
      if (Math.random() < 0.05) this.resourceManager.addArtifacts(1);
      else this.resourceManager.addParticles(3);
    }
  }

  _onRecruitMember(data) {
    const { role, cost } = data;
    if (this.resourceManager.particles >= cost) {
      this.resourceManager.removeParticles(cost);
      const names = ['Lyra', 'Theron', 'Kael', 'Elara', 'Vane', 'Sira', 'Jace', 'Rin'];
      const name = names[Math.floor(Math.random() * names.length)] + ' ' + this._nextId;
      const newMember = new ClanMember(this._nextId++, name, role);
      this.members.push(newMember);
      this._expeditionStatus.set(newMember.id, false);
      this.eventBus.publish(EVENTS.CLAN_MEMBERS_UPDATED, { members: this.members });
      this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `${name} ist dem Bund beigetreten!`, type: 'event' });
    }
  }

  getMemberById(id) { return this.members.find(m => m.id === id); }
  
  setMemberExpedition(id, isOut) { this._expeditionStatus.set(id, isOut); }
  
  toJSON() {
    return {
      members: this.members.map(m => ({
        id: m.id, name: m.name, role: m.role, level: m.level,
        experience: m.experience, progress: m.progress,
        expToNextLevel: m.expToNextLevel, baseCollectRate: m.baseCollectRate
      })),
      nextId: this._nextId,
      expeditionStatus: Array.from(this._expeditionStatus.entries())
    };
  }

  fromJSON(data) {
    this.members = (data.members || []).map(m => {
      const member = new ClanMember(m.id, m.name, m.role);
      member.level = m.level;
      member.experience = m.experience;
      member.progress = m.progress % 100;
      member.expToNextLevel = m.expToNextLevel;
      member.baseCollectRate = m.baseCollectRate;
      return member;
    });
    this._nextId = data.nextId || 1;
    this._expeditionStatus = new Map(data.expeditionStatus || []);
    this.eventBus.publish(EVENTS.CLAN_MEMBERS_UPDATED, { members: this.members });
  }
}