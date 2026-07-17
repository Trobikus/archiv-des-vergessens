// ============================================================
// FILE: js/managers/challenges.js
// ============================================================
import { EVENTS } from '../core/events.js';
import { CHALLENGES_DATA } from '../data/challenges.js';
import { Sanitizer } from '../core/security.js';

export default class ChallengeManager {
    constructor(eventBus, hero) {
        this.eventBus = eventBus;
        this.hero = hero;
        this.activeChallenge = null;
        this.completedChallenges = [];
        this.challenges = CHALLENGES_DATA;

        this.eventBus.subscribe(EVENTS.STORY_BOSS_DEFEATED, this._onBossDefeated.bind(this));
        this.eventBus.subscribe(EVENTS.HERO_PRESTIGE, this._onPrestige.bind(this));
    }

    _onPrestige() {
        this.activeChallenge = null;
    }

    getChallenges() {
        return Object.values(this.challenges);
    }

    startChallenge(challengeId) {
        if (this.hero.bossProgress > 0) {
            return { success: false, message: 'Anomalien können nur direkt nach einem Prestige (Boss 0) gestartet werden.' };
        }
        if (this.activeChallenge) {
            return { success: false, message: 'Es läuft bereits eine Anomalie.' };
        }
        if (this.completedChallenges.includes(challengeId)) {
            return { success: false, message: 'Diese Anomalie wurde bereits gemeistert.' };
        }

        this.activeChallenge = challengeId;
        this.eventBus.publish(EVENTS.HERO_UPDATED);
        this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `🔥 Anomalie gestartet: ${this.challenges[challengeId].name}`, type: 'system' });
        return { success: true, message: `Anomalie '${this.challenges[challengeId].name}' gestartet!` };
    }

    abortChallenge() {
        if (!this.activeChallenge) return { success: false, message: 'Keine Anomalie aktiv.' };
        this.activeChallenge = null;
        this.eventBus.publish(EVENTS.HERO_UPDATED);
        this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `❌ Anomalie abgebrochen.`, type: 'system' });
        return { success: true, message: 'Anomalie abgebrochen.' };
    }

    _onBossDefeated() {
        if (!this.activeChallenge) return;
        const challenge = this.challenges[this.activeChallenge];
        if (this.hero.getChapter() >= challenge.targetChapter) {
            this.completedChallenges.push(this.activeChallenge);
            this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `🌟 Anomalie '${challenge.name}' gemeistert! Belohnung freigeschaltet.`, type: 'event' });
            this.activeChallenge = null;
            this.eventBus.publish(EVENTS.HERO_UPDATED);
        }
    }

    toJSON() {
        return {
            activeChallenge: this.activeChallenge,
            completedChallenges: this.completedChallenges
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.activeChallenge = data.activeChallenge || null;
        this.completedChallenges = Sanitizer.sanitizeArray(data.completedChallenges, []);
    }
}