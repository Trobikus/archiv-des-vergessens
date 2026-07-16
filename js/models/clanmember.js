// =====================================================
// ClanMember – Datenmodell & Berufe (reine Daten)
// =====================================================
export const ROLES = Object.freeze({
  COLLECTOR: 'collector',
  WEAVER: 'weaver',
  GUARDIAN: 'guardian'
});

export default class ClanMember {
  constructor(id, name, role) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.level = 1;
    this.experience = 0;
    this.progress = 0;
    this.expToNextLevel = 50;
    this.baseCollectRate = role === ROLES.COLLECTOR ? 2.0 :
                           role === ROLES.WEAVER    ? 1.2 : 0.8;
  }

  getCollectRate() {
    return this.baseCollectRate * Math.pow(1.05, this.level - 1);
  }

  getExpForLevelUp() {
    return Math.floor(this.expToNextLevel * Math.pow(1.15, this.level - 1));
  }

  // Neu: isOffline verhindert einen Event-Spam nach langer Inaktivität
  addExperience(amount, eventBus = null, isOffline = false) {
    this.experience += amount;
    const needed = this.getExpForLevelUp();
    while (this.experience >= needed) {
      this.experience -= needed;
      this.level++;
      
      // Wenn wir im Offline-Catchup sind, fluten wir den Bus NICHT mit Events
      if (eventBus && !isOffline) {
        eventBus.publish('member:levelUp', { member: this });
      }
    }
  }
}