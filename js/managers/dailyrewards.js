// ============================================================
// managers/dailyrewards.js – FIXED: RNG.next() statt Math.random()
// ============================================================
import { Item } from '../models/item.js';
import { EVENTS } from '../core/events.js';
import RNG from '../utils/rng.js';

export default class DailyRewardManager {
  constructor(eventBus, hero, resourceManager) {
    this.eventBus = eventBus;
    this.hero = hero;
    this.resourceManager = resourceManager;
    this.lastClaimDate = null;
    this.streak = 0;
    this.claimedToday = false;
    this.currentBoost = null;
  }

  _todayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }

  canClaimToday() {
    const today = this._todayKey();
    return !this.claimedToday || this.lastClaimDate !== today;
  }

  claimDailyReward() {
    const today = this._todayKey();
    if (!this.canClaimToday()) {
      return { success: false, message: 'Heute wurde die Belohnung bereits abgeholt.' };
    }

    const isFirstLoginToday = this.lastClaimDate !== today;
    const isNewStreak = this.lastClaimDate && this._daysBetween(this.lastClaimDate, today) === 1;

    if (isFirstLoginToday) {
      if (this.lastClaimDate && isNewStreak) this.streak += 1;
      else this.streak = 1;
    }

    let reward = null;
    if (this.streak === 7) {
      reward = { particles: 250, relics: 15, artifacts: 5, title: 'Tagebuch der Erinnerung', amulet: true };
    } else {
      const rewards = [
        { particles: 80 },
        { relics: 12 },
        { artifacts: 4 },
        { particles: 50, relics: 4, boost: 'collect-2x' }
      ];
      // ---------- SEEDED RNG für Belohnungsauswahl ----------
      const idx = Math.floor(RNG.next() * rewards.length);
      reward = rewards[idx];
    }

    this.lastClaimDate = today;
    this.claimedToday = true;

    if (reward.particles) this.resourceManager.addParticles(reward.particles);
    if (reward.relics) this.resourceManager.addRelics(reward.relics);
    if (reward.artifacts) this.resourceManager.addArtifacts(reward.artifacts);
    if (reward.boost) this.currentBoost = reward.boost;

    if (reward.amulet) {
      const amulet = new Item('Amulett der täglichen Wiederkehr', 'amulet', 'legendary', { attack: 6, defense: 4, stamina: 4 }, 'Einzigartige tägliche Belohnung.', false);
      this.hero.addEquipmentItem(amulet);
    }
    if (reward.title) {
      this.hero.titles = this.hero.titles || [];
      if (!this.hero.titles.includes(reward.title)) {
        this.hero.titles.push(reward.title);
        this.hero.title = reward.title;
      }
    }

    this.eventBus.publish(EVENTS.HERO_UPDATED);
    this.eventBus.publish(EVENTS.RESOURCES_UPDATED);
    this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `🌅 Tägliche Belohnung erhalten (${this.streak}. Tag)`, type: 'event' });
    return { success: true, reward, streak: this.streak };
  }

  _daysBetween(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }

  getState() {
    return {
      canClaimToday: this.canClaimToday(),
      streak: this.streak,
      lastClaimDate: this.lastClaimDate,
      claimedToday: this.claimedToday,
      currentBoost: this.currentBoost
    };
  }

  toJSON() {
    return {
      lastClaimDate: this.lastClaimDate,
      streak: this.streak,
      claimedToday: this.claimedToday,
      currentBoost: this.currentBoost
    };
  }

  fromJSON(data) {
    if (!data) return;
    this.lastClaimDate = data.lastClaimDate || null;
    this.streak = data.streak || 0;
    this.claimedToday = data.claimedToday || false;
    this.currentBoost = data.currentBoost || null;
  }
}