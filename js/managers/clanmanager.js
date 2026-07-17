// ============================================================
// FILE: js/managers/clanmanager.js
// ============================================================
import ClanMember, { ROLES } from '../models/clanmember.js';
import { EVENTS } from '../core/events.js';
import { CONFIG } from '../core/config.js';
import RNG from '../utils/rng.js';
import { Sanitizer } from '../core/security.js';

export default class ClanManager {
    constructor(eventBus, resourceManager, challengeManager) {
        this.eventBus = eventBus;
        this.resourceManager = resourceManager;
        this.challengeManager = challengeManager;
        this.libraryManager = null;

        this.members = [];
        this._nextId = 1;
        this._expeditionStatus = new Map();
        this._rateCache = new Map();
        this._pendingProgressUpdates = new Map();
        this._updateScheduled = false;

        this.eventBus.subscribe(EVENTS.GAME_SLOW_TICK, this._onSlowTick.bind(this));
        this.eventBus.subscribe(EVENTS.CLAN_RECRUIT_MEMBER, this._onRecruitMember.bind(this));
        this.eventBus.subscribe(EVENTS.HERO_PRESTIGE, () => { this._rateCache.clear(); });
        this.eventBus.subscribe(EVENTS.MEMBER_LEVEL_UP, () => { this._rateCache.clear(); });
    }

    _onSlowTick({ delta }) {
        const isDrought = this.challengeManager && this.challengeManager.activeChallenge === 'drought';
        const libraryBonus = this.libraryManager ? (1 + this.libraryManager.getBonus('clan_boost')) : 1;

        let needsUpdate = false;

        for (let i = 0; i < this.members.length; i++) {
            const member = this.members[i];
            if (this._expeditionStatus.get(member.id)) continue;

            let rate = this._rateCache.get(member.id);
            if (rate === undefined) {
                const hero = this.resourceManager.hero;
                const prestigeBonus = hero ? hero.getPrestigeBonus('jobRate') : 0;
                rate = member.getCollectRate(prestigeBonus);
                rate *= libraryBonus;
                if (isDrought && member.role === ROLES.COLLECTOR) rate *= 0.2;
                this._rateCache.set(member.id, rate);
            }

            member.progress += (rate * delta) / CONFIG.CLAN.TICK_RATE_MS * 100;

            if (member.progress >= 100) {
                const cycles = Math.floor(member.progress / 100);
                member.progress = member.progress % 100;
                for (let c = 0; c < cycles; c++) {
                    this._produceResource(member);
                    member.addExperience(CONFIG.CLAN.EXP_PER_CYCLE, this.eventBus, true);
                }
                needsUpdate = true;
                this._rateCache.delete(member.id);
            }

            this._pendingProgressUpdates.set(member.id, member.progress);
        }

        if (needsUpdate) {
            this.eventBus.publish(EVENTS.CLAN_MEMBERS_UPDATED, { members: this.members });
        }
        this._scheduleUIUpdate();
    }

    _scheduleUIUpdate() {
        if (this._updateScheduled) return;
        this._updateScheduled = true;
        requestAnimationFrame(() => {
            this._updateScheduled = false;
            if (this._pendingProgressUpdates.size > 0) {
                this.eventBus.publish(EVENTS.CLAN_PROGRESS_UPDATED, {
                    progress: new Map(this._pendingProgressUpdates)
                });
                this._pendingProgressUpdates.clear();
            }
        });
    }

    _produceResource(member) {
        if (member.role === ROLES.COLLECTOR) {
            this.resourceManager.addParticles(1);
        } else if (member.role === ROLES.WEAVER) {
            if (RNG.next() < 0.1) {
                this.resourceManager.addRelics(1);
            } else {
                this.resourceManager.addParticles(2);
            }
        } else if (member.role === ROLES.GUARDIAN) {
            if (RNG.next() < 0.05) {
                this.resourceManager.addArtifacts(1);
            } else {
                this.resourceManager.addParticles(3);
            }
        }
    }

    _onRecruitMember(data) {
        const { role, cost } = data;
        const safeCost = Sanitizer.sanitizeNumber(cost, 0);
        if (this.resourceManager.particles >= safeCost) {
            this.resourceManager.removeParticles(safeCost);
            const names = ['Lyra', 'Theron', 'Kael', 'Elara', 'Vane', 'Sira', 'Jace', 'Rin'];
            const name = names[Math.floor(RNG.next() * names.length)] + ' ' + this._nextId;
            const newMember = new ClanMember(this._nextId++, name, role);
            this.members.push(newMember);
            this._expeditionStatus.set(newMember.id, false);
            this._rateCache.set(newMember.id, newMember.getCollectRate(0));
            this.eventBus.publish(EVENTS.CLAN_MEMBERS_UPDATED, { members: this.members });
            this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `${name} ist dem Bund beigetreten!`, type: 'event' });
        }
    }

    getMemberById(id) {
        return this.members.find(m => m.id === id) || null;
    }

    setMemberExpedition(id, isOut) {
        this._expeditionStatus.set(id, !!isOut);
    }

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
        if (!data) return;
        this.members = (data.members || []).map(m => {
            const member = new ClanMember(m.id, m.name, m.role);
            member.level = Sanitizer.clamp(Sanitizer.sanitizeNumber(m.level, 1), 1, 9999);
            member.experience = Sanitizer.sanitizeNumber(m.experience, 0);
            member.progress = Sanitizer.clamp(Sanitizer.sanitizeNumber(m.progress, 0), 0, 100);
            member.expToNextLevel = Math.max(1, Sanitizer.sanitizeNumber(m.expToNextLevel, 50));
            member.baseCollectRate = Math.max(0.1, Sanitizer.sanitizeNumber(m.baseCollectRate, 1));
            this._rateCache.set(member.id, member.getCollectRate(0));
            return member;
        });
        this._nextId = Sanitizer.sanitizeNumber(data.nextId, 1);
        this._expeditionStatus = new Map(data.expeditionStatus || []);
        this.eventBus.publish(EVENTS.CLAN_MEMBERS_UPDATED, { members: this.members });
    }
}