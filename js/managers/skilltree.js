// ============================================================
// FILE: js/managers/skilltree.js
// ============================================================
import { EVENTS } from '../core/events.js';
import { Sanitizer } from '../core/security.js';

export default class SkillTreeManager {
    constructor(eventBus, hero) {
        this.eventBus = eventBus;
        this.hero = hero;
        this.skills = {
            warrior_1: { id: 'warrior_1', name: 'Pfad des Kriegers I', desc: '+10% Angriff', cost: 1, req: [] },
            warrior_2: { id: 'warrior_2', name: 'Pfad des Kriegers II', desc: '+20% Boss-Schaden', cost: 2, req: ['warrior_1'] },
            auto_boss: { id: 'auto_boss', name: 'Ewiger Kampf (Auto)', desc: 'Startet Bosskämpfe automatisch, wenn möglich.', cost: 3, req: ['warrior_2'] },
            scholar_1: { id: 'scholar_1', name: 'Pfad des Gelehrten I', desc: '-10% Schmiedekosten', cost: 1, req: [] },
            scholar_2: { id: 'scholar_2', name: 'Pfad des Gelehrten II', desc: '+20% Offline-Produktion', cost: 2, req: ['scholar_1'] },
            auto_salvage: { id: 'auto_salvage', name: 'Rost-Schredder (Auto)', desc: 'Gewöhnliche Schmiede-Items werden automatisch zu Staub verwertet.', cost: 2, req: ['scholar_2'] },
            explorer_1: { id: 'explorer_1', name: 'Pfad des Entdeckers I', desc: '+10% Expeditions-Erfolg', cost: 1, req: [] },
            explorer_2: { id: 'explorer_2', name: 'Pfad des Entdeckers II', desc: '+20% Expeditions-Belohnung', cost: 2, req: ['explorer_1'] },
            auto_expedition: { id: 'auto_expedition', name: 'Rastlose Sucher (Auto)', desc: 'Freie Mitglieder starten endlos automatisch Expeditionen.', cost: 3, req: ['explorer_2'] },
            master_crafter: { id: 'master_crafter', name: 'Meisterschmied', desc: '+15% Qualität beim Craften', cost: 2, req: ['scholar_1'] },
            auto_craft: { id: 'auto_craft', name: 'Automatischer Katalysator', desc: 'Produziert passiv Katalysator.', cost: 2, req: ['master_crafter'] }
        };

        this.eventBus.subscribe(EVENTS.HERO_PRESTIGE, this._onPrestige.bind(this));
    }

    _onPrestige() {
        // Skills bleiben erhalten, Prestige-Punkte werden im Hero verwaltet
    }

    getSkills() {
        return Object.values(this.skills);
    }

    unlockSkill(skillId) {
        const skill = this.skills[skillId];
        if (!skill) return { success: false, message: 'Talent nicht gefunden.' };
        if (this.hero.unlockedSkills.includes(skillId)) return { success: false, message: 'Bereits freigeschaltet.' };
        if (this.hero.prestigePoints < skill.cost) return { success: false, message: 'Nicht genug Prestige-Punkte.' };

        for (const req of skill.req) {
            if (!this.hero.unlockedSkills.includes(req)) {
                return { success: false, message: `Voraussetzung "${this.skills[req]?.name || req}" nicht erfüllt.` };
            }
        }

        this.hero.prestigePoints = Sanitizer.clamp(this.hero.prestigePoints - skill.cost, 0, 9999);
        this.hero.unlockedSkills.push(skillId);
        this.eventBus.publish(EVENTS.HERO_UPDATED);
        this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `🌳 Talent freigeschaltet: ${skill.name}`, type: 'event' });
        return { success: true, message: `${skill.name} freigeschaltet!` };
    }

    toJSON() {
        return {
            unlockedSkills: this.hero.unlockedSkills
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.hero.unlockedSkills = Sanitizer.sanitizeArray(data.unlockedSkills, []);
    }
}