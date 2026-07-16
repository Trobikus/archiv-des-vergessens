// ============================================================
// FILE: managers/relicHunt.js – mit Prestige-Reset
// ============================================================
import { EVENTS } from '../core/events.js';
import { CONFIG } from '../core/config.js';
import RNG from '../utils/rng.js';

export default class RelicHuntManager {
  constructor(context) {
    this.eventBus = context.eventBus;
    this.hero = context.hero;
    this.resourceManager = context.resourceManager;
    this.cooldown = CONFIG.RELIC_HUNT.COOLDOWN_MS;
    this.cost = CONFIG.RELIC_HUNT.COST;

    this.isOnCooldown = false;
    this.remainingCooldown = 0;

    this.eventBus.subscribe(EVENTS.GAME_LOGIC_TICK, this._onTick.bind(this));
    this.eventBus.subscribe(EVENTS.HERO_PRESTIGE, this._onPrestige.bind(this));
  }

  _onPrestige() {
    this.isOnCooldown = false;
    this.remainingCooldown = 0;
    this.eventBus.publish(EVENTS.RELICHUNT_READY);
  }

  _onTick({ delta }) {
    if (this.isOnCooldown) {
      this.remainingCooldown -= delta;
      if (this.remainingCooldown <= 0) {
        this.isOnCooldown = false;
        this.remainingCooldown = 0;
        this.eventBus.publish(EVENTS.RELICHUNT_READY);
      }
    }
  }

  performHunt() {
    if (this.isOnCooldown) return { success: false, message: 'Warte noch...' };
    if (this.resourceManager.particles < this.cost) return { success: false, message: 'Nicht genug Partikel!' };

    this.resourceManager.removeParticles(this.cost);

    let chance = CONFIG.RELIC_HUNT.BASE_CHANCE;
    chance += this.hero.level * CONFIG.RELIC_HUNT.LEVEL_BONUS;
    chance += this.hero.getTotalPower() * CONFIG.RELIC_HUNT.POWER_BONUS;
    chance += this.hero.getPrestigeBonusPercent('relicChance') / 100;
    chance = Math.min(CONFIG.RELIC_HUNT.MAX_CHANCE, Math.max(CONFIG.RELIC_HUNT.MIN_CHANCE, chance));

    const roll = RNG.next();
    let reward = null;
    let experience = 0;
    let message = '';

    if (roll < chance) {
      const relics = 1 + Math.floor(RNG.next() * 2) + Math.floor(this.hero.level / 10);
      const finalRelics = Math.max(1, relics);
      this.resourceManager.addRelics(finalRelics);
      experience = 5 + Math.floor(RNG.next() * 5);
      this.hero.addExperience(experience);
      message = `Erfolg! +${finalRelics} Relikte und +${experience} EP.`;
      this.eventBus.publish(EVENTS.HERO_UPDATED);
      this.eventBus.publish(EVENTS.RESOURCES_UPDATED);
    } else {
      message = 'Fehlgeschlagen... Die Erinnerung war nur ein Schatten.';
    }

    this.isOnCooldown = true;
    this.remainingCooldown = this.cooldown;
    this.eventBus.publish(EVENTS.RELICHUNT_COOLDOWN, { remaining: this.remainingCooldown });

    return { success: roll < chance, message, reward, experience };
  }

  updateCooldown() {
    if (!this.isOnCooldown) return { ready: true };
    return { ready: false, remaining: Math.max(0, this.remainingCooldown), total: this.cooldown };
  }
}