// ============================================================
// FILE: js/managers/expedition.js
// ============================================================
import { ROLES } from '../models/clanmember.js';
import { EVENTS } from '../core/events.js';
import RNG from '../utils/rng.js';
import { Sanitizer } from '../core/security.js';

export default class ExpeditionManager {
    constructor(eventBus, clanManager, resourceManager) {
        this.eventBus = eventBus;
        this.clanManager = clanManager;
        this.resourceManager = resourceManager;
        this._activeExpeditions = new Map();

        this.eventBus.subscribe(EVENTS.GAME_SLOW_TICK, this._onTick.bind(this));
        this.eventBus.subscribe(EVENTS.HERO_PRESTIGE, this._onPrestige.bind(this));
    }

    _onPrestige() {
        for (const [memberId] of this._activeExpeditions) {
            this.clanManager.setMemberExpedition(memberId, false);
        }
        this._activeExpeditions.clear();
    }

    startExpedition(memberId, durationSeconds, successChance) {
        const member = this.clanManager.getMemberById(memberId);
        if (!member) return false;
        if (this._activeExpeditions.has(memberId)) return false;

        this.clanManager.setMemberExpedition(memberId, true);

        const remainingTime = durationSeconds * 1000;
        let chanceMultiplier = this.resourceManager.hero.unlockedSkills.includes('explorer_1') ? 1.1 : 1;
        const clampedChance = Sanitizer.clamp(successChance * chanceMultiplier, 0.05, 0.95);

        this._activeExpeditions.set(memberId, {
            remainingTime,
            duration: durationSeconds,
            successChance: clampedChance
        });
        this.eventBus.publish(EVENTS.EXPEDITION_STARTED, { memberId, remainingTime, duration: durationSeconds, successChance: clampedChance });
        return true;
    }

    _calculateSuccessChance(member) {
        let base = 0.5;
        let levelBonus = (member.level - 1) * 0.05;
        let roleBonus = 0;
        if (member.role === ROLES.COLLECTOR) roleBonus = 0.1;
        else if (member.role === ROLES.GUARDIAN) roleBonus = 0.2;
        return Sanitizer.clamp(base + levelBonus + roleBonus, 0.05, 0.95);
    }

    _generateReward(member) {
        const role = member.role;
        if (role === ROLES.COLLECTOR) {
            return { particles: 5 + Math.floor(RNG.next() * 6) };
        }
        if (role === ROLES.WEAVER) {
            return { relics: 1 + Math.floor(RNG.next() * 2) };
        }
        if (role === ROLES.GUARDIAN) {
            return { artifacts: 1 };
        }
        return {};
    }

    _onTick({ delta }) {
        const completed = [];

        for (const [memberId, expedition] of this._activeExpeditions.entries()) {
            expedition.remainingTime -= delta;
            if (expedition.remainingTime <= 0) {
                completed.push(memberId);
            }
        }

        for (const memberId of completed) {
            this._completeExpedition(memberId);
        }

        if (this.resourceManager.hero && this.resourceManager.hero.unlockedSkills.includes('auto_expedition')) {
            const idleMembers = this.clanManager.members.filter(m => !this._activeExpeditions.has(m.id));
            for (const m of idleMembers) {
                this.startExpedition(m.id, 20, this._calculateSuccessChance(m));
            }
        }
    }

    _completeExpedition(memberId) {
        const expedition = this._activeExpeditions.get(memberId);
        if (!expedition) return;
        const member = this.clanManager.getMemberById(memberId);

        if (!member) {
            this._activeExpeditions.delete(memberId);
            return;
        }

        const success = RNG.next() < expedition.successChance;
        let reward = null;

        if (success) {
            reward = this._generateReward(member);
            let rewardMultiplier = this.resourceManager.hero.unlockedSkills.includes('explorer_2') ? 1.2 : 1;

            if (reward.particles) this.resourceManager.addParticles(Math.floor(reward.particles * rewardMultiplier));
            if (reward.relics) this.resourceManager.addRelics(Math.floor(reward.relics * rewardMultiplier));
            if (reward.artifacts) this.resourceManager.addArtifacts(Math.floor(reward.artifacts * rewardMultiplier));
        } else {
            member.addExperience(1, this.eventBus);
        }

        this.clanManager.setMemberExpedition(memberId, false);
        this._activeExpeditions.delete(memberId);
        this.eventBus.publish(EVENTS.EXPEDITION_COMPLETE, { memberId, success, reward, member });

        if (success && this.resourceManager.hero) {
            this.resourceManager.hero._successfulExpeditions = (this.resourceManager.hero._successfulExpeditions || 0) + 1;
        }
    }

    isOnExpedition(memberId) { return this._activeExpeditions.has(memberId); }

    getRemainingTime(memberId) {
        const exp = this._activeExpeditions.get(memberId);
        if (!exp) return 0;
        return Math.max(0, exp.remainingTime);
    }

    toJSON() {
        return { activeExpeditions: Array.from(this._activeExpeditions.entries()) };
    }

    fromJSON(data) {
        if (data && data.activeExpeditions) {
            this._activeExpeditions = new Map(data.activeExpeditions);
            for (const [id, exp] of this._activeExpeditions) {
                exp.remainingTime = Sanitizer.sanitizeNumber(exp.remainingTime, 0);
                exp.duration = Sanitizer.sanitizeNumber(exp.duration, 20);
                exp.successChance = Sanitizer.clamp(exp.successChance, 0.05, 0.95);
            }
        } else {
            this._activeExpeditions = new Map();
        }
    }
}