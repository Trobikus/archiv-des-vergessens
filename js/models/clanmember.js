// ============================================================
// FILE: js/models/clanmember.js – Clan-Mitglied
// ============================================================
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
                              role === ROLES.WEAVER ? 1.2 : 0.8;
    }

    /**
     * Berechnet die aktuelle Sammelrate basierend auf Level und Prestige-Bonus.
     */
    getCollectRate(prestigeJobRateBonus = 0) {
        const baseRate = this.baseCollectRate * Math.pow(1.05, this.level - 1);
        return baseRate * (1 + prestigeJobRateBonus / 100);
    }

    /**
     * Berechnet die benötigte Erfahrung für den nächsten Levelaufstieg.
     */
    getExpForLevelUp() {
        return Math.floor(this.expToNextLevel * Math.pow(1.15, this.level - 1));
    }

    /**
     * Fügt Erfahrung hinzu und löst ggf. Level-Up aus.
     * @param {number} amount - Erfahrungspunkte
     * @param {EventBus} eventBus - Eventbus für Events
     * @param {boolean} isOffline - Wenn true, wird kein Event gesendet (Performance)
     */
    addExperience(amount, eventBus = null, isOffline = false) {
        this.experience += amount;
        const needed = this.getExpForLevelUp();
        while (this.experience >= needed) {
            this.experience -= needed;
            this.level++;
            if (eventBus && !isOffline) {
                eventBus.publish('member:levelUp', { member: this });
            }
        }
    }
}