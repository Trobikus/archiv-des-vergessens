import { generateStoryBosses } from '../data/bosses.js';
import { ITEM_TEMPLATES } from '../data/items.js';
import { Item } from '../models/item.js';
import { EVENTS } from '../core/events.js';
import { CONFIG } from '../core/config.js';

export default class StoryManager {
  constructor(eventBus, hero) {
    this.eventBus = eventBus;
    this.hero = hero;
    this.bosses = generateStoryBosses();
    this.battleInProgress = false;
    this.battle = null;
    
    this.autoBossTimer = 0;
    this.battleTimer = 0;
    
    this.eventBus.subscribe(EVENTS.GAME_LOGIC_TICK, this._onTick.bind(this));
  }

  getCurrentBoss() {
    if (this.hero.bossProgress >= this.bosses.length) return null;
    return this.bosses[this.hero.bossProgress];
  }

  _onTick({ delta }) {
    if (this.battleInProgress) {
      this.battleTimer -= delta;
      if (this.battleTimer <= 0) {
        this._finishBattle(this.battle.victory);
      }
      return;
    }

    if (this.hero.unlockedSkills.includes('auto_boss') && this.hero.bossProgress < this.bosses.length) {
      this.autoBossTimer += delta;
      if (this.autoBossTimer >= CONFIG.STORY.AUTO_BOSS_INTERVAL_MS) {
        this.autoBossTimer = 0;
        this.startBossFight();
      }
    } else {
      this.autoBossTimer = 0;
    }
  }

  startBossFight() {
    if (this.battleInProgress) return;
    
    const boss = this.getCurrentBoss();
    if (!boss) return;

    this.battleInProgress = true;
    this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `⚔️ Kampf gegen ${boss.name} beginnt!`, type: 'event' });
    this.eventBus.publish(EVENTS.STORY_UPDATED);

    const cStats = this.hero.getCombatStats();
    let heroDamageMultiplier = this.hero.unlockedSkills.includes('warrior_2') ? 1.2 : 1;
    
    const bossDamageReduction = boss.defense / (boss.defense + 100);
    
    let baseHeroDamage = (cStats.attack * heroDamageMultiplier) * (1 - bossDamageReduction);
    let expectedHeroDamage = Math.max(1, baseHeroDamage * (1 + (cStats.critChance / 100) * ((cStats.critDamage / 100) - 1)));
    
    let baseBossDamage = boss.attack * (1 - cStats.damageReduction);
    let expectedBossDamage = Math.max(1, baseBossDamage * (1 - (cStats.dodgeChance / 100)));

    let roundsToKillBoss = Math.ceil(boss.hp / expectedHeroDamage);
    let roundsToKillHero = Math.ceil(cStats.maxHp / expectedBossDamage);

    const victory = roundsToKillBoss <= roundsToKillHero;
    let rounds = victory ? roundsToKillBoss : roundsToKillHero;
    
    let bossHP = victory ? 0 : Math.max(0, Math.floor(boss.hp - (rounds * expectedHeroDamage)));
    let heroHP = victory ? Math.max(0, Math.floor(cStats.maxHp - (rounds * expectedBossDamage))) : 0;

    this.battle = { boss, heroHP, bossHP, rounds, victory };
    this.battleTimer = CONFIG.STORY.BATTLE_DURATION_MS;
  }

  _finishBattle(victory) {
    if (!this.battle) return;
    const boss = this.battle.boss;
    this.battleInProgress = false;
    this.autoBossTimer = 0; 

    this.eventBus.publish(EVENTS.STORY_BATTLE_RESULT, { victory, boss });

    if (victory && this.battle.heroHP > 0) {
      this.hero.bossProgress++;
      this.hero.defeatedBosses.push(boss.id);
      this.hero.addExperience(boss.reward.exp || CONFIG.STORY.BASE_EXP_REWARD);

      let itemRewardText = '';
      if (boss.reward.items) {
        for (const itemName of boss.reward.items) {
          const template = ITEM_TEMPLATES[itemName];
          if (template) {
            const item = new Item(itemName, template.slot, template.rarity, { ...template.stats }, '', false, 1);
            this.hero.addEquipmentItem(item);
            itemRewardText += ` + ${item.name}`;
          }
        }
      }

      this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `🏆 ${boss.name} besiegt! +${boss.reward.exp || CONFIG.STORY.BASE_EXP_REWARD} XP${itemRewardText}`, type: 'event' });
      this.eventBus.publish(EVENTS.STORY_BOSS_DEFEATED, { boss });

      if (!this.hero.equipment.weapon && !this.hero.equipment.armor && !this.hero.equipment.amulet && !this.hero.equipment.ring && !this.hero.equipment.ring2) {
        this.hero._bossNoEquipmentWins = (this.hero._bossNoEquipmentWins || 0) + 1;
      }
      this.eventBus.publish(EVENTS.HERO_UPDATED);
    } else {
      this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `💀 Niederlage gegen ${boss.name}... Verbessere deine Ausrüstung!`, type: 'system' });
    }
    
    this.battle = null;
    this.eventBus.publish(EVENTS.STORY_UPDATED); 
  }

  startBossFromHub() {
    this.startBossFight();
  }
}