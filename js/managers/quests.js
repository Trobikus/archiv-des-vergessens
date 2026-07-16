// ============================================================
// FILE: managers/quests.js – mit Prestige-Reset
// ============================================================
import { EVENTS } from '../core/events.js';
import { MAIN_QUESTS_DATA, DAILY_QUESTS_DATA } from '../data/quests.js';

export default class QuestManager {
  constructor(eventBus, hero, resourceManager, clanManager) {
    this.eventBus = eventBus;
    this.hero = hero;
    this.resourceManager = resourceManager;
    this.clanManager = clanManager;

    this.questIndex = 0;
    this.dailyQuests = { date: '', gatherClicks: 0, expeditions: 0, craftedItems: 0, claimed: [] };

    this.mainQuestsData = MAIN_QUESTS_DATA;
    this.dailyDefs = DAILY_QUESTS_DATA;

    this._checkDailyReset();

    this.eventBus.subscribe(EVENTS.HERO_PRESTIGE, this._onPrestige.bind(this));
    this.eventBus.subscribe(EVENTS.RESOURCES_UPDATED, () => this.checkCurrentQuest());
    this.eventBus.subscribe(EVENTS.CLAN_MEMBERS_UPDATED, () => this.checkCurrentQuest());
    this.eventBus.subscribe(EVENTS.HERO_UPDATED, () => this.checkCurrentQuest());
    this.eventBus.subscribe(EVENTS.QUEST_CHECK, () => this.checkCurrentQuest());
    this.eventBus.subscribe(EVENTS.EXPEDITION_STARTED, () => this.checkCurrentQuest());

    this.eventBus.subscribe(EVENTS.QUEST_MANUAL_GATHER, () => {
      this._checkDailyReset();
      this.dailyQuests.gatherClicks++;
      this.checkCurrentQuest();
    });
    this.eventBus.subscribe(EVENTS.EXPEDITION_COMPLETE, () => {
      this._checkDailyReset();
      this.dailyQuests.expeditions++;
      this.checkCurrentQuest();
    });
    this.eventBus.subscribe(EVENTS.FORGE_CRAFTED, () => {
      this._checkDailyReset();
      this.dailyQuests.craftedItems++;
      this.checkCurrentQuest();
    });

    setTimeout(() => this.checkCurrentQuest(), 100);
  }

  _onPrestige() {
    this.questIndex = 0;
    const today = new Date().toISOString().split('T')[0];
    this.dailyQuests = {
      date: today,
      gatherClicks: 0,
      expeditions: 0,
      craftedItems: 0,
      claimed: []
    };
    this.eventBus.publish(EVENTS.QUEST_UPDATED);
    this.eventBus.publish(EVENTS.UI_REFRESH_QUEST);
  }

  _checkDailyReset() {
    const today = new Date().toISOString().split('T')[0];
    if (this.dailyQuests.date !== today) {
      this.dailyQuests = { date: today, gatherClicks: 0, expeditions: 0, craftedItems: 0, claimed: [] };
      this.eventBus.publish(EVENTS.HERO_UPDATED);
    }
  }

  _checkCondition(questId) {
    switch (questId) {
      case 'q1': return this.resourceManager.particles >= 10;
      case 'q2': return this.clanManager.members.length >= 1;
      case 'q3': return this.clanManager.members.some(m => this.hero._successfulExpeditions > 0 || this.clanManager._expeditionStatus.get(m.id));
      case 'q4': return this.hero.bossProgress >= 1;
      case 'q5': return Object.values(this.hero.equipment).some(item => item !== null);
      case 'q6': return this.hero.clickPowerLevel >= 1;
      case 'q7': return this.hero._craftedRecipeCount > 0;
      case 'q8': return this.hero.bossProgress >= 10;
      case 'q9': return this.resourceManager.relics >= 20;
      case 'q10': return this.clanManager.members.length >= 5;
      case 'q11': return this.hero.level >= 10;
      case 'q12': return Object.values(this.hero.equipment).some(i => i && i.level > 1);
      case 'q13': return this.hero._successfulExpeditions >= 25;
      case 'q14': return this.hero.bossProgress >= 20;
      case 'q15': return this.resourceManager.particles >= 1000;
      default: return false;
    }
  }

  _grantReward(rewardObj) {
    if (rewardObj.particles) this.resourceManager.addParticles(rewardObj.particles);
    if (rewardObj.relics) this.resourceManager.addRelics(rewardObj.relics);
    if (rewardObj.artifacts) this.resourceManager.addArtifacts(rewardObj.artifacts);
    if (rewardObj.memoryDust) this.resourceManager.addMemoryDust(rewardObj.memoryDust);
  }

  get mainQuests() {
    return this.mainQuestsData.map(q => ({
      ...q,
      check: () => this._checkCondition(q.id),
      rewardFunc: () => this._grantReward(q.reward)
    }));
  }

  getCurrentQuest() {
    if (this.questIndex >= this.mainQuests.length) return null;
    return this.mainQuests[this.questIndex];
  }

  isCurrentQuestComplete() {
    const q = this.getCurrentQuest();
    return q ? q.check() : false;
  }

  checkCurrentQuest() {
    if (this.isCurrentQuestComplete()) this.eventBus.publish(EVENTS.QUEST_COMPLETED);
    this.eventBus.publish(EVENTS.QUEST_UPDATED);
  }

  claimReward() {
    if (this.isCurrentQuestComplete()) {
      const q = this.getCurrentQuest();
      q.rewardFunc();
      this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `✅ Mission erfüllt: ${q.text} (+${q.rewardText})`, type: 'event' });
      this.questIndex++;
      this.eventBus.publish(EVENTS.HERO_UPDATED);
      this.eventBus.publish(EVENTS.QUEST_UPDATED);
    }
  }

  getDailyQuests() {
    this._checkDailyReset();
    return this.dailyDefs.map(def => {
      const progress = this.dailyQuests[def.key] || 0;
      const isClaimed = this.dailyQuests.claimed.includes(def.id);
      return {
        ...def,
        progress: Math.min(progress, def.target),
        isClaimed,
        isComplete: progress >= def.target,
        rewardFunc: () => this._grantReward(def.reward)
      };
    });
  }

  claimDailyReward(dailyId) {
    const d = this.getDailyQuests().find(q => q.id === dailyId);
    if (d && d.isComplete && !d.isClaimed) {
      this.dailyQuests.claimed.push(dailyId);
      d.rewardFunc();
      this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `📅 Tägliche Mission: ${d.text} (+${d.rewardText})`, type: 'event' });
      this.eventBus.publish(EVENTS.HERO_UPDATED);
      this.eventBus.publish(EVENTS.QUEST_UPDATED);
    }
  }

  toJSON() {
    return {
      questIndex: this.questIndex,
      dailyQuests: this.dailyQuests
    };
  }

  fromJSON(data) {
    if (!data) return;
    this.questIndex = data.questIndex || 0;
    this.dailyQuests = data.dailyQuests || { date: '', gatherClicks: 0, expeditions: 0, craftedItems: 0, claimed: [] };
  }
}