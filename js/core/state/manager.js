/**
 * ============================================================
 * FILE: core/state/manager.js – Zentraler State Manager (v2.0 FINAL)
 * ============================================================
 * 
 * SINGLE SOURCE OF TRUTH für den gesamten Spielzustand.
 * - Unveränderlicher State (Immer neue Kopien bei Änderungen)
 * - Middleware-Support (Logging, Persistenz, Validierung)
 * - Debounced Subscriber-Notifications (16ms)
 * - Time-Travel für Debugging
 * - BigInt-Unterstützung für Ressourcen
 * ============================================================
 */

import { deepFreeze, isPlainObject, getNestedValue } from '../../utils/object-utils.js';
import { EVENTS } from '../events/definitions.js';
import { APP_VERSION } from '../../utils/version.js';

/**
 * Friert nur den Root-State und seine direkten Kind-Objekte ein (O(n) statt O(n²)).
 * Sicher weil: Reducer erstellen neue Objekte per Spread, und unveränderte
 * Sub-Objekte stammen aus dem bereits tiefgefrorenen Vorgänger-State.
 * @param {Object} obj
 * @returns {Object}
 */
function shallowFreezeState(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  // Root einfrieren
  Object.freeze(obj);
  // Direkte Kind-Objekte einfrieren (eine Ebene tiefer)
  for (const key in obj) {
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      Object.freeze(val);
    }
  }
  return obj;
}

/**
 * @typedef {Object} State
 * @property {Object} hero - Helden-Daten
 * @property {Object} resources - Ressourcen (mit BigInt)
 * @property {Object} clan - Clan-Daten
 * @property {Object} achievements - Errungenschaften
 * @property {Object} quests - Missionen
 * @property {Object} story - Story-Fortschritt
 * @property {Object} forge - Schmiede-Daten
 * @property {Object} crafting - Handwerks-Daten
 * @property {Object} library - Bibliotheks-Upgrades
 * @property {Object} skillTree - Talentbaum
 * @property {Object} challenges - Anomalien
 * @property {Object} guild - Gilden-Daten
 * @property {Object} friends - Freunde
 * @property {Object} chat - Chat-Nachrichten
 * @property {Object} codex - Codex-Einträge
 * @property {Object} storyBranch - Story-Verzweigungen
 * @property {Object} leaderboard - Bestenliste
 * @property {Object} lore - Chroniken
 * @property {Object} settings - Benutzereinstellungen
 * @property {Object} system - System-Status
 */

/**
 * @typedef {function(State): State} StateReducer
 */

/**
 * @typedef {Object} Middleware
 * @property {function(State, Object): void} [onBefore] - Vor der Änderung
 * @property {function(State, Object): void} [onAfter] - Nach der Änderung
 * @property {function(Error, State, Object): void} [onError] - Bei Fehler
 */

/** @typedef {import('../events/bus.js').default} EventBus */

export class StateManager {
  /**
   * @param {EventBus} eventBus - Event-Bus für Benachrichtigungen
   */
  constructor(eventBus) {
    this._eventBus = eventBus;
    this._state = null;
    this._subscribers = new Map();
    this._nextSubscriberId = 0;
    this._middleware = [];
    this._history = [];
    this._maxHistory = 50;
    this._isRecording = false;
    this._isDispatching = false;
    this._initialized = false;
    this._debounceTimer = null;
    this._debounceDelay = 16;
    this._idleTasks = [];
    this._idleScheduled = false;
    this._useBigInt = typeof BigInt !== 'undefined';
  }

  /**
   * @returns {State} – Initialer State (tiefgefroren)
   */
  _getInitialState() {
    return {
      hero: {
        id: 'hero_1',
        name: 'Der Mneme-Bund',
        level: 1,
        experience: 0,
        expToNext: 50,
        baseStats: { attack: 5, defense: 3, agility: 4, stamina: 6 },
        spentStats: { attack: 0, defense: 0, agility: 0, stamina: 0 },
        unspentStatPoints: 0,
        equipment: { weapon: null, shield: null, helmet: null, shoulders: null, armor: null, gloves: null, belt: null, boots: null, amulet: null, ring: null, ring2: null },
        inventory: { equipment: [], loot: [] },
        prestige: { level: 0, points: 0, bossProgress: 0, defeatedBosses: [], activePact: null },
        unlockedSkills: [],
        clickPowerLevel: 0,
        titles: [],
        title: '',
        _bossNoEquipmentWins: 0,
        _craftedRecipeCount: 0,
        _successfulExpeditions: 0
      },
      resources: {
        particles: '0',
        relics: '0',
        artifacts: '0',
        memoryDust: '0',
        catalyst: '0',
        essence: '0',
        timeBank: 0,
        totalParticles: '0',
        totalRelics: '0',
        mnemeFragmente: '0',
        totalMnemeFragmente: '0',
        ewigeMneme: '0'
      },
      idleGenerators: {
        gedankenArchiv: {
          level: 0,
          baseCost: 10,
          costMultiplier: 1.15,
          baseYield: 1.0,
          upgrades: {
            focusBonus: 0
          }
        }
      },
      clan: {
        members: [],
        nextId: 1,
        expeditionStatus: {},
        raid: {
          active: false,
          members: [],
          durationSeconds: 0,
          maxDuration: 3600,
          lastRaidTime: 0,
          rewardClaimed: false
        }
      },
      achievements: {
        list: [],
        progress: {}
      },
      quests: {
        mainIndex: 0,
        daily: { date: '', gatherClicks: 0, expeditions: 0, craftedItems: 0, claimed: [] }
      },
      story: {
        currentBoss: null,
        battleInProgress: false,
        battleTimer: 0,
        autoBossTimer: 0
      },
      forge: { recipes: [], upgrades: {} },
      crafting: { level: 0, exp: 0, expToNext: 100, unlockedRecipes: ['basic_weapon', 'basic_armor'] },
      library: { upgrades: { gather_boost: 0, clan_boost: 0, forge_discount: 0 } },
      skillTree: { unlocked: [] },
      challenges: { active: null, completed: [] },
      guild: { id: null, guilds: {}, memberGuilds: {} },
      friends: { list: [], pending: [], sent: [] },
      chat: { global: [], guild: [], messageId: 0 },
      codex: { entries: {} },
      storyBranch: { currentNode: 'prologue', flags: {}, visited: ['prologue'], history: [], endingReached: false },
      leaderboard: {
        highestPrestige: 0,
        totalPrestiges: 0,
        fastestBossKill: Infinity,
        totalBossesDefeated: 0,
        highestChapterReached: 0,
        highestLevel: 1,
        fastestLevelUp: Infinity,
        highestCraftingLevel: 0,
        totalMasterworksCrafted: 0,
        highestItemQuality: 0,
        peakParticlesPerSecond: 0,
        totalParticlesCollected: 0,
        peakRelicsPerSecond: 0,
        totalRelicsCollected: 0,
        totalExpeditions: 0,
        successfulExpeditions: 0,
        achievementsUnlocked: 0,
        fastestPrestige: Infinity,
        totalPlayTime: 0,
        sessionCount: 0,
        lastPlayed: Date.now()
      },
      lore: {
        decrypted: {}
      },
      settings: { particles: true, floatingText: true, autosave: 15000, music: true, sfx: true, volume: 0.7, cloudEnabled: true },
      system: {
        currentView: 'intro',
        isSaving: false,
        lastSave: null,
        gameVersion: APP_VERSION,
        tutorialStep: 0,
        tutorialFinished: false,
        timeWarpCharge: 0,
        timeWarpActive: false,
        timeWarpRemaining: 0
      }
    };
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Initialisiert den State (wird beim Boot aufgerufen).
   * @param {Object} [heroData]
   * @param {Object} [resourceData]
   * @param {Object} [clanData]
   * @param {Object} [settingsData]
   */
  init(heroData = null, resourceData = null, clanData = null, settingsData = null) {
    const initialState = this._getInitialState();
    if (heroData) initialState.hero = { ...initialState.hero, ...heroData };
    if (resourceData) initialState.resources = { ...initialState.resources, ...resourceData };
    if (clanData) initialState.clan = { ...initialState.clan, ...clanData };
    if (settingsData) initialState.settings = { ...initialState.settings, ...settingsData };
    
    // Migriere alten Spielstand-Status vor dem Einfrieren
    const migratedState = this._migrateState(initialState);
    
    this._state = deepFreeze(migratedState);
    this._initialized = true;
    this._notifySubscribersImmediate();
    this._eventBus.publish('state:initialized', { state: this._state });
    return this;
  }

  /**
   * Migriert ältere Spielstände auf das aktuelle State-Schema (Abwärtskompatibilität).
   * Wird einmalig bei der Initialisierung ausgeführt, um den Heißpfad beim Dispatch zu entlasten.
   */
  _migrateState(state) {
    let migrated = { ...state };
    const defaultState = this._getInitialState();

    if (!migrated.leaderboard) {
      migrated.leaderboard = defaultState.leaderboard;
    }

    if (!migrated.lore) {
      migrated.lore = defaultState.lore;
    }

    if (migrated.clan && !migrated.clan.raid) {
      migrated.clan = {
        ...migrated.clan,
        raid: defaultState.clan.raid
      };
    }

    if (migrated.system && migrated.system.timeWarpCharge === undefined) {
      migrated.system = {
        ...migrated.system,
        timeWarpCharge: 0,
        timeWarpActive: false,
        timeWarpRemaining: 0
      };
    }

    if (migrated.hero && migrated.hero.prestige && migrated.hero.prestige.activePact === undefined) {
      migrated.hero = {
        ...migrated.hero,
        prestige: {
          ...migrated.hero.prestige,
          activePact: null
        }
      };
    }

    if (!migrated.idleGenerators) {
      migrated.idleGenerators = defaultState.idleGenerators;
    } else if (!migrated.idleGenerators.gedankenArchiv) {
      migrated.idleGenerators = {
        ...migrated.idleGenerators,
        gedankenArchiv: defaultState.idleGenerators.gedankenArchiv
      };
    }

    if (migrated.resources) {
      if (migrated.resources.mnemeFragmente === undefined) migrated.resources.mnemeFragmente = '0';
      if (migrated.resources.totalMnemeFragmente === undefined) migrated.resources.totalMnemeFragmente = '0';
      if (migrated.resources.ewigeMneme === undefined) migrated.resources.ewigeMneme = '0';
    }

    return migrated;
  }

  /**
   * Holt den gesamten State (tiefgefrorene Kopie).
   */
  getState() {
    if (!this._initialized) {
      console.warn('[StateManager] getState aufgerufen, bevor init() ausgeführt wurde.');
      return null;
    }
    return this._state;
  }

  /**
   * Holt einen Teil des States.
   */
  getSlice(path) {
    if (!this._initialized) return undefined;
    return getNestedValue(this._state, path);
  }

  /**
   * Dispatched eine Aktion (State-Reduktion).
   */
  dispatch(reducer, name = 'anonymous') {
    if (!this._initialized) {
      console.warn('[StateManager] dispatch aufgerufen, bevor init() ausgeführt wurde.');
      return null;
    }
    if (this._isDispatching) {
      console.warn('[StateManager] Rekursive Dispatch erkannt – ignoriert');
      return this._state;
    }

    this._isDispatching = true;
    const startTime = performance.now();
    const oldState = this._state;

    try {
      // Middleware: Before
      for (const mw of this._middleware) {
        if (mw.onBefore) mw.onBefore(oldState, { name });
      }

      let newState = reducer(oldState);

      if (!newState || typeof newState !== 'object') {
        throw new Error(`Reducer "${name}" hat keinen gültigen State zurückgegeben`);
      }

      // Kompatibilitäts-Prüfungen wurden nach init() ausgelagert, um den Dispatch-Heißpfad zu entlasten

      // Shallow-Freeze: Root + direkte Kind-Objekte (O(n) statt O(n²) deepFreeze)
      // Unveränderte Sub-Objekte sind bereits tiefgefroren (kommen aus oldState).
      const frozenState = shallowFreezeState(newState);

      if (frozenState !== oldState) {
        this._state = frozenState;

        if (this._isRecording) {
          this._history.push({
            timestamp: Date.now(),
            name,
            duration: performance.now() - startTime,
            prevState: oldState,
            newState: frozenState
          });
          if (this._history.length > this._maxHistory) {
            this._history.shift();
          }
        }

        this._notifySubscribers();
        this._eventBus.publish('state:changed', {
          action: name,
          timestamp: Date.now()
        });
      }

      for (const mw of this._middleware) {
        if (mw.onAfter) mw.onAfter(frozenState, { name, duration: performance.now() - startTime });
      }

      return frozenState;

    } catch (error) {
      console.error(`[StateManager] Dispatch-Fehler in "${name}":`, error);
      this._eventBus.publish('ui:showToast', {
        message: `⚠️ State-Fehler: ${error.message}`,
        type: 'error',
        duration: 5000
      });

      for (const mw of this._middleware) {
        if (mw.onError) mw.onError(error, this._state, { name });
      }

      return this._state;

    } finally {
      this._isDispatching = false;
    }
  }

  /**
   * Registriert einen Subscriber für State-Änderungen.
   */
  subscribe(callback, path = null) {
    const id = ++this._nextSubscriberId;
    this._subscribers.set(id, { callback, path });

    if (this._initialized) {
      try {
        const state = path ? this.getSlice(path) : this.getState();
        callback(state);
      } catch (e) {
        console.error('[StateManager] Subscriber-Initial-Fehler:', e);
      }
    }

    return id;
  }

  /**
   * Kündigt ein Abonnement.
   */
  unsubscribe(id) {
    this._subscribers.delete(id);
  }

  /**
   * Fügt Middleware hinzu.
   */
  use(middleware) {
    if (typeof middleware === 'function') {
      this._middleware.push({ onAfter: middleware });
    } else if (isPlainObject(middleware)) {
      this._middleware.push(middleware);
    }
    return this;
  }

  /**
   * Führt eine nicht-kritische Aufgabe im Idle-Callback aus.
   */
  scheduleIdleTask(task, priority = 1) {
    if (typeof task !== 'function') return;
    this._idleTasks.push({ task, priority });
    this._scheduleIdleProcessing();
  }

  /**
   * Time-Travel: Springt zu einem früheren State zurück.
   */
  jumpTo(index) {
    if (!this._initialized) return false;
    if (index < 0 || index >= this._history.length) return false;
    const entry = this._history[index];
    if (!entry) return false;

    this._state = entry.prevState;
    this._history = this._history.slice(0, index + 1);
    this._notifySubscribersImmediate();
    this._eventBus.publish('state:timeTravel', { index, state: this._state });
    return true;
  }

  /**
   * Holt die History für Debugging.
   */
  getHistory() {
    return this._history.map((entry, index) => ({
      index,
      timestamp: entry.timestamp,
      name: entry.name,
      duration: entry.duration
    }));
  }

  /**
   * Setzt die Aufzeichnung zurück.
   */
  clearHistory() {
    this._history = [];
  }

  /**
   * Aktiviert/Deaktiviert die Aufzeichnung.
   */
  setRecording(enabled) {
    this._isRecording = enabled;
  }

  /**
   * Setzt den State zurück (Hard-Reset).
   */
  reset() {
    if (!this._initialized) {
      this.init();
      return;
    }
    this._state = deepFreeze(this._getInitialState());
    this._history = [];
    this._notifySubscribersImmediate();
    this._eventBus.publish('state:reset', {});
  }

  /**
   * Synchronisiert den State mit aktuellen Manager-Daten.
   * @param {Object} [hero] - Neue Hero-Daten (ersetzt state.hero, falls angegeben)
   * @param {Object} [resources] - Neue Ressourcen-Daten (ersetzt state.resources, falls angegeben)
   * @param {Object} [clan] - Neue Clan-Daten (ersetzt state.clan, falls angegeben)
   */
  sync(hero, resources, clan) {
    this.dispatch((state) => ({
      ...state,
      hero: hero || state.hero,
      resources: resources || state.resources,
      clan: clan || state.clan,
      system: { ...state.system, lastSync: Date.now() }
    }), 'state/sync');
  }

  /**
   * Gibt zurück, ob der State initialisiert wurde.
   */
  isInitialized() {
    return this._initialized;
  }

  /**
   * Gibt die Anzahl der Subscriber zurück.
   */
  getSubscriberCount() {
    return this._subscribers.size;
  }

  // ============================================================
  // PRIVATE METHODEN
  // ============================================================

  _notifySubscribers() {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = setTimeout(() => {
      this._debounceTimer = null;
      this._notifySubscribersImmediate();
    }, this._debounceDelay);
  }

  _notifySubscribersImmediate() {
    if (!this._initialized) return;
    const state = this._state;

    for (const [id, { callback, path }] of this._subscribers) {
      try {
        if (path) {
          const value = getNestedValue(state, path);
          callback(value);
        } else {
          callback(state);
        }
      } catch (e) {
        console.error(`[StateManager] Subscriber ${id} Fehler:`, e);
      }
    }
  }

  _scheduleIdleProcessing() {
    if (this._idleScheduled) return;
    this._idleScheduled = true;

    if (typeof window !== 'undefined' && window.requestIdleCallback) {
      window.requestIdleCallback((deadline) => {
        this._idleScheduled = false;
        this._processIdleTasks(deadline);
      }, { timeout: 2000 });
    } else {
      setTimeout(() => {
        this._idleScheduled = false;
        const deadline = { didTimeout: false, timeRemaining: () => 50 };
        this._processIdleTasks(deadline);
      }, 50);
    }
  }

  _processIdleTasks(deadline) {
    this._idleTasks.sort((a, b) => b.priority - a.priority);

    while (this._idleTasks.length > 0 && deadline.timeRemaining() > 1) {
      const { task } = this._idleTasks.shift();
      try { task(); } catch (e) { console.error('[StateManager] Idle-Task-Fehler:', e); }
    }

    if (this._idleTasks.length > 0) {
      this._scheduleIdleProcessing();
    }
  }
}

export default StateManager;