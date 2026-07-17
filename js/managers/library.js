// ============================================================
// FILE: js/managers/library.js
// ============================================================
import { EVENTS } from '../core/events.js';
import { Sanitizer } from '../core/security.js';

export default class LibraryManager {
    constructor(eventBus, resourceManager) {
        this.eventBus = eventBus;
        this.resourceManager = resourceManager;

        this.upgrades = {
            gather_boost: { id: 'gather_boost', name: 'Mneme-Fokus', desc: '+10% Klick-Ertrag pro Stufe', level: 0, baseCost: { particles: 1000 }, costMult: 1.5, maxLevel: 999 },
            clan_boost: { id: 'clan_boost', name: 'Synergie des Bundes', desc: '+5% Clan-Produktion pro Stufe', level: 0, baseCost: { particles: 5000, relics: 50 }, costMult: 1.6, maxLevel: 999 },
            forge_discount: { id: 'forge_discount', name: 'Geheimnisse der Schmiede', desc: '-1% Schmiedekosten pro Stufe (Max -50%)', level: 0, baseCost: { particles: 10000, artifacts: 10 }, costMult: 1.8, maxLevel: 50 }
        };
    }

    getUpgrades() { return Object.values(this.upgrades); }

    getUpgradeCost(id) {
        const upg = this.upgrades[id];
        if (!upg) return {};
        const cost = {};
        for (const res in upg.baseCost) {
            cost[res] = Math.floor(upg.baseCost[res] * Math.pow(upg.costMult, upg.level));
            cost[res] = Sanitizer.clamp(cost[res], 0, 1e15);
        }
        return cost;
    }

    buyUpgrade(id) {
        const upg = this.upgrades[id];
        if (!upg || upg.level >= upg.maxLevel) return false;

        const cost = this.getUpgradeCost(id);
        const res = this.resourceManager.getResources();

        if ((cost.particles && res.particles < cost.particles) ||
            (cost.relics && res.relics < cost.relics) ||
            (cost.artifacts && res.artifacts < cost.artifacts)) {
            return false;
        }

        if (cost.particles) this.resourceManager.removeParticles(cost.particles);
        if (cost.relics) this.resourceManager.removeRelics(cost.relics);
        if (cost.artifacts) this.resourceManager.removeArtifacts(cost.artifacts);

        upg.level = Sanitizer.clamp(upg.level + 1, 0, upg.maxLevel);
        this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `📚 Forschung verbessert: ${upg.name} (Stufe ${upg.level})`, type: 'event' });
        this.eventBus.publish(EVENTS.HERO_UPDATED);
        this.eventBus.publish(EVENTS.RESOURCES_UPDATED);
        return true;
    }

    getBonus(id) {
        const level = this.upgrades[id]?.level || 0;
        if (id === 'gather_boost') return level * 0.10;
        if (id === 'clan_boost') return level * 0.05;
        if (id === 'forge_discount') return level * 0.01;
        return 0;
    }

    toJSON() {
        const data = {};
        for (const key in this.upgrades) {
            data[key] = this.upgrades[key].level;
        }
        return data;
    }

    fromJSON(data) {
        if (!data) return;
        for (const key in this.upgrades) {
            if (data[key] !== undefined) {
                this.upgrades[key].level = Sanitizer.clamp(Sanitizer.sanitizeNumber(data[key], 0), 0, this.upgrades[key].maxLevel);
            }
        }
    }
}