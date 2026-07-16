// --- START OF FILE resourcemanager.js ---

import { EVENTS } from '../core/events.js';

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
  }

  addParticles(amount) {
    if (amount <= 0) return this.particles;
    this.particles += amount;
    this.totalParticles += amount;
    this._publishUpdate();
    return this.particles;
  }

  removeParticles(amount) {
    if (amount <= 0 || this.particles < amount) return false;
    this.particles -= amount;
    this._publishUpdate();
    return true;
  }

  addRelics(amount) {
    if (amount <= 0) return this.relics;
    this.relics += amount;
    this.totalRelics += amount;
    this._publishUpdate();
    return this.relics;
  }

  removeRelics(amount) {
    if (amount <= 0 || this.relics < amount) return false;
    this.relics -= amount;
    this._publishUpdate();
    return true;
  }

  addArtifacts(amount) {
    if (amount <= 0) return this.artifacts;
    this.artifacts += amount;
    this._publishUpdate();
    return this.artifacts;
  }

  removeArtifacts(amount) {
    if (amount <= 0 || this.artifacts < amount) return false;
    this.artifacts -= amount;
    this._publishUpdate();
    return true;
  }

  addMemoryDust(amount) {
    if (amount <= 0) return this.memoryDust;
    this.memoryDust += amount;
    this._publishUpdate();
    return this.memoryDust;
  }

  removeMemoryDust(amount) {
    if (amount <= 0 || this.memoryDust < amount) return false;
    this.memoryDust -= amount;
    this._publishUpdate();
    return true;
  }

  _publishUpdate() {
    this.eventBus.publish(EVENTS.RESOURCES_UPDATED, this.getResources());
  }

  getResources() {
    return {
      particles: this.particles,
      relics: this.relics,
      artifacts: this.artifacts,
      memoryDust: this.memoryDust,
      timeBank: this.timeBank,
      totalParticles: this.totalParticles,
      totalRelics: this.totalRelics
    };
  }

  toJSON() {
    return this.getResources();
  }

  fromJSON(data) {
    this.particles = data.particles || 0;
    this.relics = data.relics || 0;
    this.artifacts = data.artifacts || 0;
    this.memoryDust = data.memoryDust || 0;
    this.timeBank = data.timeBank || 0;
    this.totalParticles = data.totalParticles || this.particles;
    this.totalRelics = data.totalRelics || this.relics;
    this._publishUpdate();
  }
}