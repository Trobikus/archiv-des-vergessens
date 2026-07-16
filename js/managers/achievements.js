// --- START OF FILE achievements.js ---

import { EVENTS } from '../core/events.js';

export default class AchievementManager {
  constructor(eventBus, hero, resourceManager) {
    this.eventBus = eventBus;
    this.hero = hero;
    this.resourceManager = resourceManager;
    this.achievements = this._buildBaseAchievements();

    this.eventBus.subscribe(EVENTS.RESOURCES_UPDATED, () => this._checkProgress());
    this.eventBus.subscribe(EVENTS.STORY_BOSS_DEFEATED, () => this._checkProgress());
    this.eventBus.subscribe(EVENTS.FORGE_CRAFTED, () => this._checkProgress());
    this.eventBus.subscribe(EVENTS.EXPEDITION_COMPLETE, () => this._checkProgress());
    this.eventBus.subscribe(EVENTS.HERO_UPDATED, () => this._checkProgress());
  }

  _buildBaseAchievements() {
    return [
      { id: 'particles_100', label: '100 Partikel gesammelt', target: 100, progress: 0, achieved: false, claimed: false, reward: { particles: 50, title: 'Sammler' } },
      { id: 'particles_1000', label: '1.000 Partikel gesammelt', target: 1000, progress: 0, achieved: false, claimed: false, reward: { particles: 120, title: 'Sammel-Meister' } },
      { id: 'relics_100', label: '100 Relikte gesammelt', target: 100, progress: 0, achieved: false, claimed: false, reward: { relics: 20, title: 'Erinnerungssucher' } },
      { id: 'boss_first_no_equip', label: 'Erster Boss ohne Ausrüstung', target: 1, progress: 0, achieved: false, claimed: false, reward: { particles: 80, title: 'Nackter Streiter' } },
      { id: 'recipes_10', label: '10 Rezepte geschmiedet', target: 10, progress: 0, achieved: false, claimed: false, reward: { artifacts: 8, title: 'Schmied' } },
      { id: 'recipes_50', label: '50 Rezepte geschmiedet', target: 50, progress: 0, achieved: false, claimed: false, reward: { particles: 300, title: 'Meisterschmied' } },
      { id: 'expeditions_100', label: '100 Expeditionen erfolgreich', target: 100, progress: 0, achieved: false, claimed: false, reward: { relics: 25, title: 'Pfadfinder' } }
    ];
  }

  _checkProgress() {
    const res = this.resourceManager.getResources();
    const progressMap = {
      particles_100: Math.floor(res.totalParticles),
      particles_1000: Math.floor(res.totalParticles),
      relics_100: Math.floor(res.totalRelics),
      boss_first_no_equip: this._bossNoEquipmentWins(),
      recipes_10: this._craftedRecipesCount(),
      recipes_50: this._craftedRecipesCount(),
      expeditions_100: this._successfulExpeditionCount()
    };

    let updated = false;

    this.achievements.forEach(ach => {
      const current = progressMap[ach.id] || 0;
      ach.progress = Math.min(current, ach.target);

      if (!ach.achieved && ach.progress >= ach.target) {
        ach.achieved = true;
        updated = true;
        this.eventBus.publish(EVENTS.ACHIEVEMENT_UNLOCKED, { achievement: ach });
        this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `🏆 Erfolg erreicht: ${ach.label}! (Belohnung im Erfolge-Menü abholen)`, type: 'event' });
      }
    });

    if (updated) this.eventBus.publish(EVENTS.HERO_UPDATED);
  }

  claimReward(id) {
    const ach = this.achievements.find(a => a.id === id);
    if (ach && ach.achieved && !ach.claimed) {
      ach.claimed = true;

      if (ach.reward.particles) this.resourceManager.addParticles(ach.reward.particles);
      if (ach.reward.relics) this.resourceManager.addRelics(ach.reward.relics);
      if (ach.reward.artifacts) this.resourceManager.addArtifacts(ach.reward.artifacts);
      if (ach.reward.title) {
        const titles = this.hero.titles || [];
        if (!titles.includes(ach.reward.title)) {
          titles.push(ach.reward.title);
          this.hero.titles = titles;
          this.hero.title = ach.reward.title;
        }
      }

      this.eventBus.publish(EVENTS.ACHIEVEMENT_CLAIMED, { achievement: ach });
      this.eventBus.publish(EVENTS.HERO_UPDATED);
      this.eventBus.publish(EVENTS.RESOURCES_UPDATED);
      return true;
    }
    return false;
  }

  _craftedRecipesCount() { return this.hero._craftedRecipeCount || 0; }
  _successfulExpeditionCount() { return this.hero._successfulExpeditions || 0; }
  _bossNoEquipmentWins() { return this.hero._bossNoEquipmentWins || 0; }

  recordCraftedRecipe() { this.hero._craftedRecipeCount = (this.hero._craftedRecipeCount || 0) + 1; this._checkProgress(); }
  recordSuccessfulExpedition() { this.hero._successfulExpeditions = (this.hero._successfulExpeditions || 0) + 1; this._checkProgress(); }
  recordBossVictoryWithoutEquipment() { this.hero._bossNoEquipmentWins = (this.hero._bossNoEquipmentWins || 0) + 1; this._checkProgress(); }

  getAchievements() { return this.achievements; }

  reset() {
    this.achievements = this._buildBaseAchievements();
    this._checkProgress();
  }

  toJSON() {
    return this.achievements.map(ach => ({
      id: ach.id,
      progress: ach.progress,
      achieved: ach.achieved,
      claimed: ach.claimed
    }));
  }

  fromJSON(data) {
    if (!data.length) return;
    const map = new Map(data.map(item => [item.id, item]));
    this.achievements = this._buildBaseAchievements().map(ach => {
      const saved = map.get(ach.id);
      if (saved) {
        ach.progress = saved.progress || 0;
        ach.achieved = !!saved.achieved;
        ach.claimed = !!saved.claimed;
      }
      return ach;
    });
    this._checkProgress();
  }
}