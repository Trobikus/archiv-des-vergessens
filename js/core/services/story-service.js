/**
 * ============================================================
 * FILE: core/services/story-service.js – Story- & Boss-Service
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Boss-Daten bereitstellen
 * - Kampf-Logik (Echtzeit v2.0 & Cutscenes v3.0)
 * - Boss-Belohnungen verarbeiten
 * - Auto-Boss-Funktion
 * - Dialoge & Lore-Cutscenes an Bosskämpfe docken
 * ============================================================
 */

import StateManager from '../state/manager.js';
import * as Actions from '../state/actions.js';
import { selectHero, selectHeroCombatStats } from '../state/selectors.js';
import { generateStoryBosses } from '../../data/bosses.js';
import { CONFIG } from '../../data/config.js';
import { sanitizeNumber, clamp } from '../../utils/sanitizer.js';
import { ITEM_TEMPLATES } from '../../data/items.js';
import { Item } from '../../models/item.js';
import { EVENTS } from '../events/definitions.js';
import RNG from '../../utils/rng.js';

/** @typedef {import('../events/bus.js').default} EventBus */

/** @typedef {import('./resource-service.js').default} ResourceService */
/** @typedef {import('./hero-service.js').default} HeroService */

// Story-Dialog-Datenbank für Meilenstein-Bosskämpfe (v3.0)
const BOSS_DIALOGUES = {
  // Kapitel 1, Boss 1: Verlorener Schatten (ID: 1)
  1: {
    intro: [
      { speaker: 'Nyx (Stimme des Schattens)', portrait: '🌑', text: 'Ein neuer Funke glimmt im Staub... Also bist du der neue Mneme-Hüter.' },
      { speaker: 'Nyx (Stimme des Schattens)', portrait: '🌑', text: 'Sei achtsam. Dieser erste Schatten ist ein Abbild deiner eigenen Ängste. Wenn du zögerst, verschlingt er dich.' }
    ],
    enrage: [
      { speaker: 'Nyx (Stimme des Schattens)', portrait: '🌑', text: 'Der Schatten erzittert! Er versucht dich mit sich in den Abgrund zu reißen! Verwende deine Zauber!' }
    ],
    victory: [
      { speaker: 'Nyx (Stimme des Schattens)', portrait: '🌑', text: 'Erstaunlich. Du hast deine Furcht überwunden. Aber das war erst der Anfang deines langen Weges.' }
    ]
  },
  // Kapitel 1, Boss 5: Wächter der Vergessenheit (ID: 5)
  5: {
    intro: [
      { speaker: 'Wächterin Elara', portrait: '🛡️', text: 'Halt, Hüter! Der Wächter der Vergessenheit schützt dieses Segment der alten Chroniken.' },
      { speaker: 'Wächterin Elara', portrait: '🛡️', text: 'Seine Rüstung absorbiert jeden normalen Schlag. Nutze deine Mneme-Zauber weise, um seine Verteidigung zu brechen!' }
    ],
    enrage: [
      { speaker: 'Wächter der Vergessenheit', portrait: '👹', text: 'STERBLICHER! Du wirst das Siegel der Erinnerung nicht brechen!' }
    ],
    victory: [
      { speaker: 'Wächterin Elara', portrait: '🛡️', text: 'Hervorragend gekämpft. Das erste große Siegel ist gebrochen. Du hast bewiesen, dass du des Titels würdig bist.' }
    ]
  },
  // Kapitel 1, Boss 10: Echo der Stille (ID: 10)
  10: {
    intro: [
      { speaker: 'Archivar Theron', portrait: '📜', text: 'Hüter, wir stehen vor dem Echo der Stille. Es ernährt sich von unseren ungesagten Worten.' },
      { speaker: 'Archivar Theron', portrait: '📜', text: 'Es wird versuchen, deine Zauber verstummen zu lassen. Verliere nicht den Glauben an den Bund!' }
    ],
    enrage: [
      { speaker: 'Echo der Stille', portrait: '👹', text: 'SCHWEIGEN... wird über deine Welt hereinbrechen...' }
    ],
    victory: [
      { speaker: 'Archivar Theron', portrait: '📜', text: 'Das Echo ist endlich verstummt! Schau, die Chroniken füllen sich wieder mit goldenen Zeilen.' },
      { speaker: 'Archivar Theron', portrait: '📜', text: 'Du hast uns Hoffnung geschenkt. Bereite dich auf das nächste Kapitel vor, Hüter.' }
    ]
  }
};

export class StoryService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   * @param {ResourceService} resourceService
   * @param {HeroService} heroService
   */
  constructor(stateManager, eventBus, resourceService, heroService) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._resourceService = resourceService;
    this._heroService = heroService;
    this._bosses = generateStoryBosses();
    this._slowTickSubscription = null;
    this._battleTimeout = null;
    this._autoBossTimer = 0; // Lokaler, flüchtiger Timer für Auto-Boss-Ticks

    this._bindSlowTick();
    this._bindEvents();
  }

  _bindSlowTick() {
    this._slowTickSubscription = this._eventBus.subscribe(EVENTS.GAME_SLOW_TICK, (data) => {
      this._processAutoBoss(data.delta);
      this._processBattleTimer(data.delta);
    });
  }

  _bindEvents() {
    this._eventBus.subscribe(EVENTS.HERO_PRESTIGE, () => {
      this._abortBattle();
    });
  }

  // ---- ÖFFENTLICHE API ----

  /**
   * Gibt alle Bosse zurück.
   */
  getBosses() {
    return this._bosses;
  }

  /**
   * Gibt den aktuellen Boss zurück (basierend auf bossProgress).
   */
  getCurrentBoss() {
    const state = this._stateManager.getState();
    const progress = state.hero.prestige.bossProgress;
    if (progress >= this._bosses.length) return null;
    return this._bosses[Math.floor(progress)];
  }

  /**
   * Startet einen Bosskampf im Echtzeit-System v2.0 mit v3.0 Story-Intro-Check.
   */
  startBossFight() {
    const state = this._stateManager.getState();
    if (state.story.battleInProgress) return;

    const boss = this.getCurrentBoss();
    if (!boss) {
      this._eventBus.publish('ui:showToast', {
        message: '🏆 Alle Bosse besiegt!',
        type: 'success',
        duration: 3000
      });
      return;
    }

    const cStats = selectHeroCombatStats(state);

    // Dialog-Check: Intro vorhanden?
    const introLines = BOSS_DIALOGUES[boss.id]?.intro;
    let initialActiveDialogue = null;
    if (introLines && introLines.length > 0) {
      initialActiveDialogue = {
        type: 'intro',
        lines: introLines,
        currentIndex: 0,
        speaker: introLines[0].speaker,
        portrait: introLines[0].portrait,
        text: introLines[0].text
      };
    }

    const initialBattleState = {
      heroHp: cStats.maxHp,
      heroMaxHp: cStats.maxHp,
      bossHp: boss.hp,
      bossMaxHp: boss.hp,
      boss: boss,
      combatLog: [
        { text: `⚔️ Der Kampf gegen ${boss.name} beginnt!`, type: 'info' }
      ],
      spells: [
        { id: 'spear', name: 'Speer des Bundes', icon: '⚡', desc: 'Blitzschneller Speer: Fügt dem Boss sofort 150% deines Angriffs als Schaden zu (Abklingzeit: 6s).', cooldown: 0, maxCooldown: 6000, color: '#ff4d4d' },
        { id: 'shield', name: 'Schild der Vergessenen', icon: '🛡️', desc: 'Barriere: Absorbiert die nächsten Angriffe bis zu 40% deiner max HP (Abklingzeit: 10s).', cooldown: 0, maxCooldown: 10000, color: '#4d79ff' },
        { id: 'heal', name: 'Temporale Heilung', icon: '❤️', desc: 'Zeitumkehr: Heilt dich sofort um 35% deiner maximalen HP (Abklingzeit: 8s).', cooldown: 0, maxCooldown: 8000, color: '#33cc33' }
      ],
      activeEffects: {
        shieldAmount: 0,
        isEnraged: false
      },
      activeDialogue: initialActiveDialogue
    };

    // Battle-State setzen
    this._stateManager.dispatch((state) => ({
      ...state,
      story: {
        ...state.story,
        battleInProgress: true,
        battleTimer: 1, // Behalte Dummy-Wert für Kompatibilität
        battleState: initialBattleState
      }
    }), 'story/battleStart');

    this._eventBus.publish('story:battleStarted', { boss, victory: false });
    this._eventBus.publish('ui:showToast', {
      message: `⚔️ Kampf gegen ${boss.name} beginnt!`,
      type: 'info',
      duration: 2000
    });
  }

  /**
   * Weiterschalten des aktuell aktiven Dialogs (Story-Pausierungs-System v3.0).
   */
  advanceDialogue() {
    const state = this._stateManager.getState();
    if (!state.story.battleInProgress || !state.story.battleState) return;

    const battleState = state.story.battleState;
    const currentDialogue = battleState.activeDialogue;
    if (!currentDialogue) return;

    const lines = currentDialogue.lines;
    const nextIdx = currentDialogue.currentIndex + 1;

    if (nextIdx < lines.length) {
      // Nächste Zeile im aktuellen Dialog
      const nextLine = lines[nextIdx];
      this._stateManager.dispatch((state) => ({
        ...state,
        story: {
          ...state.story,
          battleState: {
            ...state.story.battleState,
            activeDialogue: {
              ...currentDialogue,
              currentIndex: nextIdx,
              speaker: nextLine.speaker,
              portrait: nextLine.portrait,
              text: nextLine.text
            }
          }
        }
      }), 'story/dialogueNext');
    } else {
      // Dialog ist beendet!
      const dialogueType = currentDialogue.type; // 'intro', 'enrage', 'victory'

      this._stateManager.dispatch((state) => ({
        ...state,
        story: {
          ...state.story,
          battleState: {
            ...state.story.battleState,
            activeDialogue: null
          }
        }
      }), 'story/dialogueEnd');

      // Falls es ein Sieg-Dialog war, schließe den Kampf endgültig ab!
      if (dialogueType === 'victory') {
        const { boss, heroHp, bossHp } = currentDialogue.meta;
        this._finishBattleDirect(true, boss, heroHp, bossHp);
      }
    }

    this._eventBus.publish('story:battleTick', {});
  }

  /**
   * Wirkt einen Mneme-Zauber während des Kampfes.
   */
  castSpell(spellId) {
    const state = this._stateManager.getState();
    if (!state.story.battleInProgress || !state.story.battleState) {
      return { success: false, message: 'Kein aktiver Kampf.' };
    }

    const battleState = state.story.battleState;
    
    // Keine Zauber während eines aktiven Dialogs
    if (battleState.activeDialogue) {
      return { success: false, message: 'Spiel ist pausiert.' };
    }

    const spell = battleState.spells.find(s => s.id === spellId);
    if (!spell) return { success: false, message: 'Zauber nicht gefunden.' };
    if (spell.cooldown > 0) return { success: false, message: 'Zauber hat noch Abklingzeit.' };

    const cStats = selectHeroCombatStats(state);
    const heroDamageMultiplier = state.hero.unlockedSkills.includes('warrior_2') ? 1.2 : 1;
    const heroAttack = cStats.attack * heroDamageMultiplier;

    let logMessage = '';
    let updatedBossHp = battleState.bossHp;
    let updatedHeroHp = battleState.heroHp;
    let updatedShieldAmount = battleState.activeEffects.shieldAmount;

    if (spellId === 'spear') {
      const damageBase = heroAttack * 1.5;
      const bossDamageReduction = battleState.boss.defense / (battleState.boss.defense + 100);
      const damageDealt = Math.max(1, Math.floor(damageBase * (1 - bossDamageReduction)));
      updatedBossHp = Math.max(0, updatedBossHp - damageDealt);
      logMessage = `⚡ Speer des Bundes geschleudert! Du fügst ${battleState.boss.name} ${damageDealt} Schaden zu!`;
    } else if (spellId === 'spell-shield' || spellId === 'shield') {
      const shieldValue = Math.floor(battleState.heroMaxHp * 0.4);
      updatedShieldAmount = shieldValue;
      logMessage = `🛡️ Schild der Vergessenen aktiviert! Du blockierst die nächsten ${shieldValue} Schaden.`;
    } else if (spellId === 'heal') {
      const healValue = Math.floor(battleState.heroMaxHp * 0.35);
      updatedHeroHp = Math.min(battleState.heroMaxHp, updatedHeroHp + healValue);
      logMessage = `❤️ Temporale Heilung gewirkt! Du heilst dich um +${healValue} HP.`;
    }

    // State aktualisieren
    this._stateManager.dispatch((state) => {
      const currentBattleState = state.story.battleState;
      if (!currentBattleState) return state;

      const newBattleState = {
        ...currentBattleState,
        bossHp: updatedBossHp,
        heroHp: updatedHeroHp,
        combatLog: [
          ...currentBattleState.combatLog,
          { text: logMessage, type: `spell-${spellId === 'spell-shield' ? 'shield' : spellId}` }
        ],
        spells: currentBattleState.spells.map(s => s.id === spellId ? { ...s, cooldown: s.maxCooldown } : s),
        activeEffects: {
          ...currentBattleState.activeEffects,
          shieldAmount: updatedShieldAmount
        }
      };

      return {
        ...state,
        story: {
          ...state.story,
          battleState: newBattleState
        }
      };
    }, 'story/castSpell');

    this._eventBus.publish('story:battleTick', {});

    // Direkt nach Zaubereffekt prüfen, ob Boss tot ist
    if (updatedBossHp <= 0) {
      const victoryLines = BOSS_DIALOGUES[battleState.boss.id]?.victory;
      if (victoryLines && victoryLines.length > 0) {
        const activeDialogue = {
          type: 'victory',
          lines: victoryLines,
          currentIndex: 0,
          speaker: victoryLines[0].speaker,
          portrait: victoryLines[0].portrait,
          text: victoryLines[0].text,
          meta: { boss: battleState.boss, heroHp: updatedHeroHp, bossHp: updatedBossHp }
        };

        this._stateManager.dispatch((state) => ({
          ...state,
          story: {
            ...state.story,
            battleState: {
              ...state.story.battleState,
              bossHp: updatedBossHp,
              heroHp: updatedHeroHp,
              activeDialogue
            }
          }
        }), 'story/castSpellWithVictoryDialogue');

        this._eventBus.publish('story:battleTick', {});
      } else {
        this._finishBattleDirect(true, battleState.boss, updatedHeroHp, updatedBossHp);
      }
    }

    return { success: true };
  }

  /**
   * Verarbeitet den Battle-Timer (wird bei Tick aufgerufen).
   */
  _processBattleTimer(delta) {
    const state = this._stateManager.getState();
    if (!state.story.battleInProgress || !state.story.battleState) return;

    const battleState = state.story.battleState;

    // SYSTEM v3.0: Pausieren, falls Dialog aktiv ist
    if (battleState.activeDialogue) return;

    const boss = battleState.boss;
    const cStats = selectHeroCombatStats(state);
    const heroDamageMultiplier = state.hero.unlockedSkills.includes('warrior_2') ? 1.2 : 1;
    const heroAttack = cStats.attack * heroDamageMultiplier;

    // Cooldowns reduzieren
    const updatedSpells = battleState.spells.map(s => ({
      ...s,
      cooldown: Math.max(0, s.cooldown - delta)
    }));

    let combatLog = [...battleState.combatLog];
    let heroHp = battleState.heroHp;
    let bossHp = battleState.bossHp;
    let shieldAmount = battleState.activeEffects.shieldAmount;
    let isEnraged = battleState.activeEffects.isEnraged;

    // --- 1. HELDEN-ATTACKE (Auto-Angriff) ---
    const isHeroCrit = RNG.next() < (cStats.critChance / 100);
    const heroMultiplier = isHeroCrit ? (cStats.critDamage / 100) : 1.0;
    const heroBaseDmg = heroAttack * heroMultiplier;
    const bossDefenseReduction = boss.defense / (boss.defense + 100);
    const heroDamageDealt = Math.max(1, Math.floor(heroBaseDmg * (1 - bossDefenseReduction)));
    bossHp = Math.max(0, bossHp - heroDamageDealt);

    combatLog.push({
      text: `⚔️ Du triffst ${boss.name} für ${heroDamageDealt} Schaden.${isHeroCrit ? ' (KRITISCH!)' : ''}`,
      type: isHeroCrit ? 'crit' : 'damage-deal'
    });

    // Sieg prüfen mit Dialog-Check
    if (bossHp <= 0) {
      const victoryLines = BOSS_DIALOGUES[boss.id]?.victory;
      if (victoryLines && victoryLines.length > 0) {
        const activeDialogue = {
          type: 'victory',
          lines: victoryLines,
          currentIndex: 0,
          speaker: victoryLines[0].speaker,
          portrait: victoryLines[0].portrait,
          text: victoryLines[0].text,
          meta: { boss, heroHp, bossHp }
        };

        this._stateManager.dispatch((state) => ({
          ...state,
          story: {
            ...state.story,
            battleState: {
              ...state.story.battleState,
              heroHp,
              bossHp,
              combatLog,
              activeDialogue
            }
          }
        }), 'story/battleTickWithVictoryDialogue');

        this._eventBus.publish('story:battleTick', {});
        return;
      }

      this._finishBattleDirect(true, boss, heroHp, bossHp);
      return;
    }

    // --- 2. ENRAGE CHECK & PAUSIERUNG ---
    if (bossHp <= boss.hp / 2 && !isEnraged) {
      isEnraged = true;
      combatLog.push({
        text: `🔥 ${boss.name} gerät unter 50% HP in Wut! (+50% Angriffskraft!)`,
        type: 'enrage'
      });

      const enrageLines = BOSS_DIALOGUES[boss.id]?.enrage;
      if (enrageLines && enrageLines.length > 0) {
        const activeDialogue = {
          type: 'enrage',
          lines: enrageLines,
          currentIndex: 0,
          speaker: enrageLines[0].speaker,
          portrait: enrageLines[0].portrait,
          text: enrageLines[0].text
        };

        this._stateManager.dispatch((state) => ({
          ...state,
          story: {
            ...state.story,
            battleState: {
              ...state.story.battleState,
              heroHp,
              bossHp,
              combatLog,
              spells: updatedSpells,
              activeEffects: {
                shieldAmount,
                isEnraged
              },
              activeDialogue
            }
          }
        }), 'story/battleTickWithEnrageDialogue');

        this._eventBus.publish('story:battleTick', {});
        return; // Kampf hält an, Boss brüllt zuerst
      }
    }

    // --- 3. BOSS-ATTACKE (Auto-Angriff) ---
    const isHeroDodge = RNG.next() < (cStats.dodgeChance / 100);
    if (isHeroDodge) {
      combatLog.push({
        text: `⚡ Du weichst dem Angriff von ${boss.name} aus!`,
        type: 'dodge'
      });
    } else {
      const bossAttackPower = isEnraged ? boss.attack * 1.5 : boss.attack;
      const heroDefenseReduction = cStats.damageReduction;
      let bossDamageDealt = Math.max(1, Math.floor(bossAttackPower * (1 - heroDefenseReduction)));

      if (shieldAmount > 0) {
        const absorb = Math.min(shieldAmount, bossDamageDealt);
        shieldAmount -= absorb;
        bossDamageDealt -= absorb;
        combatLog.push({
          text: `🛡️ Dein Schild absorbiert ${absorb} Schaden. (Verbleibend: ${shieldAmount})`,
          type: 'shield-absorb'
        });
      }

      if (bossDamageDealt > 0) {
        heroHp = Math.max(0, heroHp - bossDamageDealt);
        combatLog.push({
          text: `💥 ${boss.name} trifft dich für ${bossDamageDealt} Schaden.`,
          type: 'damage-taken'
        });
      }
    }

    if (heroHp <= 0) {
      this._finishBattleDirect(false, boss, heroHp, bossHp);
      return;
    }

    // Combat Log begrenzen
    if (combatLog.length > 25) {
      combatLog = combatLog.slice(combatLog.length - 25);
    }

    // State updaten
    this._stateManager.dispatch((state) => ({
      ...state,
      story: {
        ...state.story,
        battleState: {
          ...state.story.battleState,
          heroHp,
          bossHp,
          combatLog,
          spells: updatedSpells,
          activeEffects: {
            shieldAmount,
            isEnraged
          }
        }
      }
    }), 'story/battleTick');

    this._eventBus.publish('story:battleTick', {});
  }

  /**
   * Beendet den Kampf direkt und verarbeitet das Resultat.
   */
  _finishBattleDirect(victory, boss, heroHp, bossHp) {
    this._stateManager.dispatch((state) => ({
      ...state,
      story: {
        ...state.story,
        battleInProgress: false,
        battleTimer: 0,
        battleState: null
      }
    }), 'story/battleEnd');

    if (victory) {
      this._processVictory(boss);
    } else {
      this._processDefeat(boss);
    }

    this._eventBus.publish('story:battleResult', { victory, boss, heroHP: heroHp, bossHP: bossHp });
  }

  _finishBattle() {
    // Nicht mehr benötigt.
  }

  /**
   * Verarbeitet einen Sieg.
   */
  _processVictory(boss) {
    const hero = this._heroService.getHero();

    // Boss-Fortschritt erhöhen
    this._stateManager.dispatch((state) => {
      const progress = state.hero.prestige.bossProgress + 1;
      const defeated = [...state.hero.prestige.defeatedBosses, boss.id];
      return {
        ...state,
        hero: {
          ...state.hero,
          prestige: {
            ...state.hero.prestige,
            bossProgress: progress,
            defeatedBosses: defeated
          }
        }
      };
    }, 'story/bossDefeated');

    // Erfahrung vergeben
    const expReward = boss.reward.exp || CONFIG.STORY.BASE_EXP_REWARD;
    this._heroService.addExperience(expReward);

    // Item-Belohnungen
    if (boss.reward.items && boss.reward.items.length > 0) {
      for (const itemName of boss.reward.items) {
        const template = ITEM_TEMPLATES[itemName];
        if (template) {
          const item = new Item(
            itemName,
            template.slot,
            template.rarity,
            { ...template.stats },
            '',
            false,
            1
          );
          this._heroService._stateManager.dispatch((state) => ({
            ...state,
            hero: {
              ...state.hero,
              inventory: {
                ...state.hero.inventory,
                equipment: [...state.hero.inventory.equipment, item.toJSON()]
              }
            }
          }), 'story/addItemReward');
        }
      }
    }

    // Prüfung für Achievement "Boss ohne Ausrüstung"
    const heroState = this._heroService.getHero();
    const hasEquip = Object.values(heroState.equipment).some(slot => slot !== null);
    if (!hasEquip) {
      this._stateManager.dispatch((state) => ({
        ...state,
        hero: {
          ...state.hero,
          _bossNoEquipmentWins: (state.hero._bossNoEquipmentWins || 0) + 1
        }
      }), 'story/noEquipWin');
    }

    // Event
    this._eventBus.publish('story:bossDefeated', { boss });
    this._eventBus.publish('ui:showToast', {
      message: `🏆 ${boss.name} besiegt! +${expReward} XP`,
      type: 'success',
      duration: 3000
    });
  }

  /**
   * Verarbeitet eine Niederlage.
   */
  _processDefeat(boss) {
    this._eventBus.publish('ui:showToast', {
      message: `💀 Niederlage gegen ${boss.name}... Verbessere deine Ausrüstung!`,
      type: 'warning',
      duration: 4000
    });
  }

  /**
   * Auto-Boss: Startet automatisch Kämpfe, wenn Talent freigeschaltet.
   */
  _processAutoBoss(delta) {
    const state = this._stateManager.getState();
    if (state.story.battleInProgress) return;
    if (!state.hero.unlockedSkills.includes('auto_boss')) return;
    if (state.hero.prestige.bossProgress >= this._bosses.length) return;

    this._autoBossTimer += delta;
    if (this._autoBossTimer >= CONFIG.STORY.AUTO_BOSS_INTERVAL_MS) {
      this._autoBossTimer = 0;
      this.startBossFight();
    }
  }

  /**
   * Bricht den aktuellen Kampf ab.
   */
  _abortBattle() {
    const state = this._stateManager.getState();
    if (!state.story.battleInProgress) return;

    this._stateManager.dispatch((state) => ({
      ...state,
      story: {
        ...state.story,
        battleInProgress: false,
        battleState: null
      }
    }), 'story/abortBattle');

    this._eventBus.publish('story:battleAborted', {});
  }

  /**
   * Zerstört den Service.
   */
  destroy() {
    if (this._slowTickSubscription !== null) {
      this._eventBus.unsubscribe(this._slowTickSubscription);
      this._slowTickSubscription = null;
    }
    if (this._battleTimeout) {
      clearTimeout(this._battleTimeout);
      this._battleTimeout = null;
    }
  }
}

export default StoryService;