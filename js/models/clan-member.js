/**
 * ============================================================
 * FILE: models/clan-member.js – Clan-Mitglied (Datenmodell)
 * ============================================================
 */

export const ROLES = {
  COLLECTOR: 'collector',
  WEAVER: 'weaver',
  GUARDIAN: 'guardian'
};

export class ClanMember {
  constructor(id, name, role, level = 1, experience = 0, progress = 0) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.level = level;
    this.experience = experience;
    this.progress = progress;
    this.expToNextLevel = 50;
    this.baseCollectRate = role === ROLES.COLLECTOR ? 2.0 :
                           role === ROLES.WEAVER ? 1.2 : 0.8;
  }

  getCollectRate(prestigeBonus = 0) {
    const base = this.baseCollectRate * Math.pow(1.05, this.level - 1);
    return base * (1 + prestigeBonus / 100);
  }

  getExpForLevelUp() {
    return Math.floor(this.expToNextLevel * Math.pow(1.15, this.level - 1));
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      level: this.level,
      experience: this.experience,
      progress: this.progress,
      expToNextLevel: this.expToNextLevel,
      baseCollectRate: this.baseCollectRate
    };
  }

  static fromJSON(data) {
    const member = new ClanMember(data.id, data.name, data.role, data.level, data.experience, data.progress);
    member.expToNextLevel = data.expToNextLevel || 50;
    member.baseCollectRate = data.baseCollectRate || 1.0;
    return member;
  }
}

export default ClanMember;