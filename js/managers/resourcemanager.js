// ============================================================
// FILE: js/managers/resourcemanager.js
// ============================================================
import { EVENTS } from '../core/events.js';
import { Sanitizer } from '../core/security.js';

export default class ResourceManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.particles = 0;
        this.relics = 0;
        this.artifacts = 0;
        this.memoryDust = 0;
        this.timeBank = 0;
        this.totalParticles = 0;
        this.totalRelics = 0;
        this.catalyst = 0;
        this.essence = 0;

        this.MAX_PARTICLES = 1e15;
        this.MAX_RELICS = 1e12;
        this.MAX_ARTIFACTS = 1e9;
        this.MAX_DUST = 1e12;
        this.MAX_CATALYST = 1e9;
        this.MAX_ESSENCE = 1e9;

        this._publishUpdate = () => {
            if (this.eventBus) {
                this.eventBus.publish(EVENTS.RESOURCES_UPDATED, this.getResources());
            }
        };
    }

    _clamp(value, max) {
        return Sanitizer.clamp(value, 0, max);
    }

    addParticles(amount) {
        if (amount <= 0) return this.particles;
        const safeAmount = Sanitizer.sanitizeNumber(amount, 0);
        this.particles = this._clamp(this.particles + safeAmount, this.MAX_PARTICLES);
        this.totalParticles = this._clamp(this.totalParticles + safeAmount, this.MAX_PARTICLES);
        this._publishUpdate();
        return this.particles;
    }

    removeParticles(amount) {
        const safeAmount = Sanitizer.sanitizeNumber(amount, 0);
        if (safeAmount <= 0 || this.particles < safeAmount) return false;
        this.particles = this._clamp(this.particles - safeAmount, this.MAX_PARTICLES);
        this._publishUpdate();
        return true;
    }

    addRelics(amount) {
        if (amount <= 0) return this.relics;
        const safeAmount = Sanitizer.sanitizeNumber(amount, 0);
        this.relics = this._clamp(this.relics + safeAmount, this.MAX_RELICS);
        this.totalRelics = this._clamp(this.totalRelics + safeAmount, this.MAX_RELICS);
        this._publishUpdate();
        return this.relics;
    }

    removeRelics(amount) {
        const safeAmount = Sanitizer.sanitizeNumber(amount, 0);
        if (safeAmount <= 0 || this.relics < safeAmount) return false;
        this.relics = this._clamp(this.relics - safeAmount, this.MAX_RELICS);
        this._publishUpdate();
        return true;
    }

    addArtifacts(amount) {
        if (amount <= 0) return this.artifacts;
        const safeAmount = Sanitizer.sanitizeNumber(amount, 0);
        this.artifacts = this._clamp(this.artifacts + safeAmount, this.MAX_ARTIFACTS);
        this._publishUpdate();
        return this.artifacts;
    }

    removeArtifacts(amount) {
        const safeAmount = Sanitizer.sanitizeNumber(amount, 0);
        if (safeAmount <= 0 || this.artifacts < safeAmount) return false;
        this.artifacts = this._clamp(this.artifacts - safeAmount, this.MAX_ARTIFACTS);
        this._publishUpdate();
        return true;
    }

    addMemoryDust(amount) {
        if (amount <= 0) return this.memoryDust;
        const safeAmount = Sanitizer.sanitizeNumber(amount, 0);
        this.memoryDust = this._clamp(this.memoryDust + safeAmount, this.MAX_DUST);
        this._publishUpdate();
        return this.memoryDust;
    }

    removeMemoryDust(amount) {
        const safeAmount = Sanitizer.sanitizeNumber(amount, 0);
        if (safeAmount <= 0 || this.memoryDust < safeAmount) return false;
        this.memoryDust = this._clamp(this.memoryDust - safeAmount, this.MAX_DUST);
        this._publishUpdate();
        return true;
    }

    addCatalyst(amount) {
        if (amount <= 0) return this.catalyst;
        const safeAmount = Sanitizer.sanitizeNumber(amount, 0);
        this.catalyst = this._clamp(this.catalyst + safeAmount, this.MAX_CATALYST);
        this._publishUpdate();
        return this.catalyst;
    }

    removeCatalyst(amount) {
        const safeAmount = Sanitizer.sanitizeNumber(amount, 0);
        if (safeAmount <= 0 || this.catalyst < safeAmount) return false;
        this.catalyst = this._clamp(this.catalyst - safeAmount, this.MAX_CATALYST);
        this._publishUpdate();
        return true;
    }

    addEssence(amount) {
        if (amount <= 0) return this.essence;
        const safeAmount = Sanitizer.sanitizeNumber(amount, 0);
        this.essence = this._clamp(this.essence + safeAmount, this.MAX_ESSENCE);
        this._publishUpdate();
        return this.essence;
    }

    removeEssence(amount) {
        const safeAmount = Sanitizer.sanitizeNumber(amount, 0);
        if (safeAmount <= 0 || this.essence < safeAmount) return false;
        this.essence = this._clamp(this.essence - safeAmount, this.MAX_ESSENCE);
        this._publishUpdate();
        return true;
    }

    getResources() {
        return {
            particles: this.particles,
            relics: this.relics,
            artifacts: this.artifacts,
            memoryDust: this.memoryDust,
            timeBank: this.timeBank,
            totalParticles: this.totalParticles,
            totalRelics: this.totalRelics,
            catalyst: this.catalyst,
            essence: this.essence
        };
    }

    toJSON() {
        return this.getResources();
    }

    fromJSON(data) {
        if (!data) return;
        this.particles = Sanitizer.clamp(Sanitizer.sanitizeNumber(data.particles, 0), 0, this.MAX_PARTICLES);
        this.relics = Sanitizer.clamp(Sanitizer.sanitizeNumber(data.relics, 0), 0, this.MAX_RELICS);
        this.artifacts = Sanitizer.clamp(Sanitizer.sanitizeNumber(data.artifacts, 0), 0, this.MAX_ARTIFACTS);
        this.memoryDust = Sanitizer.clamp(Sanitizer.sanitizeNumber(data.memoryDust, 0), 0, this.MAX_DUST);
        this.timeBank = Sanitizer.sanitizeNumber(data.timeBank, 0);
        this.totalParticles = Sanitizer.clamp(Sanitizer.sanitizeNumber(data.totalParticles, this.particles), 0, this.MAX_PARTICLES);
        this.totalRelics = Sanitizer.clamp(Sanitizer.sanitizeNumber(data.totalRelics, this.relics), 0, this.MAX_RELICS);
        this.catalyst = Sanitizer.clamp(Sanitizer.sanitizeNumber(data.catalyst, 0), 0, this.MAX_CATALYST);
        this.essence = Sanitizer.clamp(Sanitizer.sanitizeNumber(data.essence, 0), 0, this.MAX_ESSENCE);
        this._publishUpdate();
    }
}