/**
 * ============================================================
 * FILE: core/state/manager.js – Zentraler State Manager (v2.0)
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

import { deepClone, deepFreeze, isPlainObject } from '../utils/object-utils.js';
import { formatNumber } from '../utils/format.js';

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
 * @property {Object} settings - Benutzereinstellungen
 * @property {Object} system - System-Status
 */

/**
 * @typedef {function(State): State} StateReducer
 */

/**
 * @typedef {Object} Middleware
 * @property {function(State, State): void} [onBefore] - Vor der Änderung
 * @property {function(State, State): void} [onAfter] - Nach der Änderung
 * @property {function(Error, State): void} [onError] - Bei Fehler
 */

export class StateManager {
  /**
   * @param {EventBus} eventBus - Event-Bus für Benachrichtigungen
   */
  constructor(eventBus) {
    this._eventBus = eventBus;
    this._state = this._getInitialState();
    this._subscribers = new Map(); // id -> callback
    this._nextSubscriberId = 0;
    this._middleware = [];
    this._history = [];
    this._maxHistory = 100;
    this._isRecording = true;
    this._isDispatching = false;
    
    // Debounce für Subscriber-Benachrichtigungen
    this._debounceTimer = null;
    this._debounceDelay = 16; // ~1 Frame
    this._pendingNotifications = new Set();
    
    // Idle-Tasks
    this._idleTasks = [];
    this._idleScheduled = false;
    
    // BigInt-Unterstützung für Ressourcen
    this._useBigInt = typeof BigInt !== 'undefined';
    
    // Initialen State einfrieren
    this._state = deepFreeze(this._state);
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
        prestige: { level: 0, points: 0, bossProgress: 0, defeatedBosses: [] },
        unlockedSkills: [],
        clickPowerLevel: 0,
        titles: [],
        title: '',
        _bossNoEquipmentWins: 0,
        _craftedRecipeCount: 0,
        _successfulExpeditions: 0
      },
      resources: {
        particles: '0', // BigInt als String
        relics: '0',
        artifacts: '0',
        memoryDust: '0',
        catalyst: '0',
        essence: '0',
        timeBank: 0,
        totalParticles: '0',
        totalRelics: '0'
      },
      clan: {
        members: [],
        nextId: 1,
        expeditionStatus: {}
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
      settings: { particles: true, floatingText: true, autosave: 15000, music: true, sfx: true, volume: 0.7, cloudEnabled: true },
      system: { currentView: 'menu', isSaving: false, lastSave: null, gameVersion: '1.6' }
    };
  }
  
  // ============================================================
  // PUBLIC API
  // ============================================================
  
  /**
   * Holt den gesamten State (tiefgefrorene Kopie).
   * @returns {State}
   */
  getState() {
    return deepClone(this._state);
  }
  
  /**
   * Holt einen Teil des States (tiefgefrorene Kopie).
   * @param {string} path – Punkt-notation, z.B. 'hero.level'
   * @returns {*}
   */
  getSlice(path) {
    const parts = path.split('.');
    let current = this._state;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current !== undefined ? deepClone(current) : undefined;
  }
  
  /**
   * Dispatched eine Aktion (State-Reduktion).
   * @param {StateReducer|function(State): State} reducer
   * @param {string} name – Aktion-Name für Debugging
   * @returns {State} – Neuer State
   */
  dispatch(reducer, name = 'anonymous') {
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
      
      // Reducer anwenden
      const newState = reducer(oldState);
      
      // Sicherstellen, dass der Reducer einen State zurückgibt
      if (!newState || typeof newState !== 'object') {
        throw new Error(`Reducer "${name}" hat keinen gültigen State zurückgegeben`);
      }
      
      // State einfrieren
      const frozenState = deepFreeze(newState);
      
      // Änderungen prüfen
      if (frozenState !== oldState) {
        this._state = frozenState;
        
        // History aufzeichnen
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
        
        // Benachrichtigungen triggern (debounced)
        this._notifySubscribers();
        
        // Event-Bus benachrichtigen
        this._eventBus.publish('state:changed', {
          action: name,
          timestamp: Date.now()
        });
      }
      
      // Middleware: After
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
   * @param {function(State): void} callback
   * @param {string} [path] – Optional: Nur bei Änderungen an diesem Pfad benachrichtigen
   * @returns {number} – Subscription-ID zum Kündigen
   */
  subscribe(callback, path = null) {
    const id = ++this._nextSubscriberId;
    this._subscribers.set(id, { callback, path });
    
    // Sofortige Benachrichtigung mit aktuellem State
    try {
      const state = path ? this.getSlice(path) : this.getState();
      callback(state);
    } catch (e) {
      console.error('[StateManager] Subscriber-Initial-Fehler:', e);
    }
    
    return id;
  }
  
  /**
   * Kündigt ein Abonnement.
   * @param {number} id – Subscription-ID
   */
  unsubscribe(id) {
    this._subscribers.delete(id);
  }
  
  /**
   * Fügt Middleware hinzu.
   * @param {Middleware} middleware
   * @returns {StateManager} – Für Chaining
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
   * @param {function(): void} task
   * @param {number} [priority=1] – Höhere Priorität = frühere Ausführung
   */
  scheduleIdleTask(task, priority = 1) {
    if (typeof task !== 'function') return;
    this._idleTasks.push({ task, priority });
    this._scheduleIdleProcessing();
  }
  
  /**
   * Time-Travel: Springt zu einem früheren State zurück.
   * @param {number} index – History-Index
   * @returns {boolean} – Erfolg
   */
  jumpTo(index) {
    if (index < 0 || index >= this._history.length) return false;
    const entry = this._history[index];
    if (!entry) return false;
    
    this._state = deepFreeze(deepClone(entry.prevState));
    this._history = this._history.slice(0, index + 1);
    this._notifySubscribersImmediate();
    this._eventBus.publish('state:timeTravel', { index, state: this._state });
    return true;
  }
  
  /**
   * Holt die History für Debugging.
   * @returns {Array}
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
   * @param {boolean} enabled
   */
  setRecording(enabled) {
    this._isRecording = enabled;
  }
  
  /**
   * Setzt den State zurück (Hard-Reset).
   */
  reset() {
    this._state = deepFreeze(this._getInitialState());
    this._history = [];
    this._notifySubscribersImmediate();
    this._eventBus.publish('state:reset', {});
  }
  
  // ============================================================
  // PRIVATE METHODEN
  // ============================================================
  
  /**
   * Benachrichtigt Subscriber (debounced).
   * Verhindert Layout-Thrashing bei schnellen State-Änderungen.
   */
  _notifySubscribers() {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    
    this._debounceTimer = setTimeout(() => {
      this._debounceTimer = null;
      this._notifySubscribersImmediate();
    }, this._debounceDelay);
  }
  
  /**
   * Benachrichtigt Subscriber sofort (ohne Debounce).
   * Wird für kritische Updates verwendet.
   */
  _notifySubscribersImmediate() {
    const state = this._state;
    
    for (const [id, { callback, path }] of this._subscribers) {
      try {
        if (path) {
          const value = this._getNestedValue(state, path);
          callback(value);
        } else {
          callback(state);
        }
      } catch (e) {
        console.error(`[StateManager] Subscriber ${id} Fehler:`, e);
      }
    }
  }
  
  /**
   * Holt einen verschachtelten Wert aus dem State.
   * @param {Object} obj – State-Objekt
   * @param {string} path – Punkt-notation
   * @returns {*}
   */
  _getNestedValue(obj, path) {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }
  
  /**
   * Plant die Verarbeitung von Idle-Tasks.
   */
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
  
  /**
   * Verarbeitet Idle-Tasks.
   * @param {IdleDeadline} deadline
   */
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
  
  /**
   * Gibt die Anzahl der Subscriber zurück.
   * @returns {number}
   */
  getSubscriberCount() {
    return this._subscribers.size;
  }
}

// ============================================================
// EXPORT
// ============================================================

export default StateManager;