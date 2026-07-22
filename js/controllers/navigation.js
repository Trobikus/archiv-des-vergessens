/**
 * ============================================================
 * FILE: controllers/navigation.js – Navigation (v2.0 Preact-Migrated)
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - View-Wechsel via State-Updates (Menu, Hub, Game, Options)
 * - Empfang von EventBus-Nachrichten aus Preact-Views
 * - Spielstand-Lade/Start-Schnittstellen
 * - Audio- & Grafik-Einstellungen verwalten
 * ============================================================
 */

import { EVENTS } from '../core/events/definitions.js';
import { setCurrentView } from '../core/state/actions.js';
import { CONFIG } from '../data/config.js';

/** @typedef {import('../core/events/bus.js').default} EventBus */
/** @typedef {import('../core/state/manager.js').default} StateManager */
/** @typedef {import('../core/game/loop.js').default} GameLoop */
/** @typedef {import('../core/services/hero-service.js').default} HeroService */
/** @typedef {import('../core/services/resource-service.js').default} ResourceService */
/** @typedef {import('../core/services/clan-service.js').default} ClanService */
/** @typedef {typeof import('../core/persistence/save-manager.js').default} SaveManager */

export class NavigationController {
  /**
   * @param {Object} deps
   * @param {EventBus} deps.eventBus
   * @param {StateManager} deps.stateManager
   * @param {GameLoop} deps.gameLoop
   * @param {HeroService} deps.heroService
   * @param {ResourceService} deps.resourceService
   * @param {ClanService} deps.clanService
   * @param {SaveManager} deps.saveManager
   * @param {import('../core/settings.js').default} deps.settingsManager
   * @param {import('../core/persistence/cloud-manager.js').default} deps.cloudManager
   * @param {import('../core/services/i18n-service.js').default} [deps.i18nService]
   */
  constructor({ eventBus, stateManager, gameLoop, heroService, resourceService, clanService, saveManager, settingsManager, cloudManager, i18nService }) {
    this._eventBus = eventBus;
    this._stateManager = stateManager;
    this._gameLoop = gameLoop;
    this._heroService = heroService;
    this._resourceService = resourceService;
    this._clanService = clanService;
    this._saveManager = saveManager;
    this._settingsManager = settingsManager;
    this._cloudManager = cloudManager;
    this._i18nService = i18nService;

    this._bindEvents();
  }

  _bindEvents() {
    // --- Auth / Login-Events ---
    this._eventBus.subscribe('auth:proceedToMenu', () => this.showCharacterSelect());
    this._eventBus.subscribe('auth:showLogin', () => this.showLogin());

    // --- Character-Events ---
    this._eventBus.subscribe('character:select', (data) => this._selectCharacterSlot(data.slotId));
    this._eventBus.subscribe('character:create', (data) => this._createCharacterSlot(data));

    // --- Menü-Events ---
    this._eventBus.subscribe('menu:newGame', () => this._showNewGameModal());
    this._eventBus.subscribe('menu:continue', () => this._loadGame());
    this._eventBus.subscribe('menu:options', () => this.showOptions());
    this._eventBus.subscribe('menu:quit', () => this._quitGame());
    this._eventBus.subscribe('menu:startNewGame', (data) => this._startNewGame(data.name));

    // --- Options-Events ---
    this._eventBus.subscribe('options:setLanguage', (data) => this._setLanguage(data.value));
    this._eventBus.subscribe('options:setParticles', (data) => this._setParticles(data.value));
    this._eventBus.subscribe('options:setFloating', (data) => this._setFloating(data.value));
    this._eventBus.subscribe('options:toggleAudio', () => this._toggleAudio());
    this._eventBus.subscribe('options:setMusicVolume', (data) => this._setMusicVolume(data.value));
    this._eventBus.subscribe('options:setSfxVolume', (data) => this._setSfxVolume(data.value));
    this._eventBus.subscribe('options:setAutosave', (data) => this._setAutosave(data.value));
    this._eventBus.subscribe('options:setCloudEnabled', (data) => this._setCloudEnabled(data.value));
    this._eventBus.subscribe('options:syncCloud', () => this._syncCloud());
    this._eventBus.subscribe('options:hardReset', () => this._hardReset());
    this._eventBus.subscribe('options:back', () => this._saveAndExitOptions());

    // --- Hub-Events ---
    this._eventBus.subscribe('hub:backToMenu', () => this.showCharacterSelect());
    this._eventBus.subscribe('hub:enterGame', () => this.showGame());

    // --- In-Game-Events ---
    this._eventBus.subscribe('game:manualGather', (data) => this._manualGather(data.clientX, data.clientY));
    this._eventBus.subscribe('game:upgradeClickPower', () => this._upgradeClickPower());
    this._eventBus.subscribe('game:openAchievements', () => this._eventBus.publish(EVENTS.UI_OPEN_ACHIEVEMENTS));
    this._eventBus.subscribe('game:backToHub', () => this.showHub());

    // In-Game Loop Status & Ticks abhören
    let logicTickCount = 0;
    this._eventBus.subscribe(EVENTS.GAME_LOGIC_TICK, (data) => {
      logicTickCount++;
      const tickInfoEl = document.getElementById('tick-info');
      if (tickInfoEl) {
        tickInfoEl.textContent = `Tick: ${logicTickCount} | Δ: ${Math.round(data.delta)}ms`;
      }
      
      const speedIndicatorEl = document.getElementById('speed-indicator');
      if (speedIndicatorEl) {
        const catchupActive = this._gameLoop.isCatchupActive();
        speedIndicatorEl.style.display = catchupActive ? 'inline-block' : 'none';
      }

      this._updateGameLoopStatus();
    });

    // Offline-Modal Schließen (falls DOM offline modal noch besteht, wir behalten die DB-Aktion hier)
    const offlineCloseBtn = document.getElementById('offline-close-btn');
    offlineCloseBtn?.addEventListener('click', () => {
      const modal = document.getElementById('offline-modal-overlay');
      if (modal) modal.style.display = 'none';
      this._resourceService.setTimeBank(0);
    });
  }

  // ---- VIEW-WECHSEL ----

  showLogin() {
    this._stateManager.dispatch(setCurrentView('login'));
  }

  showCharacterSelect() {
    this._stateManager.dispatch(setCurrentView('characterSelect'));
  }

  async _selectCharacterSlot(slotId) {
    this._saveManager.setActiveSlot(slotId);
    const loadedState = await this._saveManager.load(slotId);
    if (loadedState) {
      this._stateManager.dispatch(() => loadedState, 'character/load');
    }
    this.showHub();
  }

  async _createCharacterSlot({ slotId, name, avatar, title }) {
    this._saveManager.setActiveSlot(slotId);
    this._stateManager.reset();
    this._stateManager.dispatch((state) => ({
      ...state,
      hero: {
        ...state.hero,
        name: name || 'Hüter',
        avatar: avatar || '🛡️',
        title: title || 'Schatten-Hüter'
      }
    }), 'character/create');

    await this._saveManager.save(this._stateManager.getState(), slotId);
    this.showHub();
  }

  showMenu() {
    this._stateManager.dispatch(setCurrentView('menu'));
    this._eventBus.publish(EVENTS.UI_REFRESH_QUEST);
  }

  showHub() {
    this._stateManager.dispatch(setCurrentView('hub'));
    if (!this._gameLoop.isRunning()) this._gameLoop.start();
    this._eventBus.publish(EVENTS.UI_REFRESH_QUEST);
  }

  showGame() {
    this._stateManager.dispatch(setCurrentView('game'));
    if (!this._gameLoop.isRunning()) this._gameLoop.start();
    this._eventBus.publish(EVENTS.UI_ENTER_GAME);
    this._eventBus.publish(EVENTS.UI_REFRESH_QUEST);
  }

  showOptions() {
    const currentView = this._stateManager.getState()?.system?.currentView || 'hub';
    if (currentView !== 'options') {
      this._previousView = (currentView === 'menu' ? 'hub' : currentView);
    }
    this._stateManager.dispatch(setCurrentView('options'));
  }

  // ---- NEUES SPIEL LOGIK ----

  _showNewGameModal() {
    this._eventBus.publish('ui:showNewGameModal');
  }

  _hideNewGameModal() {
    this._eventBus.publish('ui:hideNewGameModal');
  }

  async _startNewGame(name) {
    // Prüfen, ob ein Save existiert – ggf. löschen
    const hasSave = await this._saveManager.hasSave();
    if (hasSave) {
      if (!(await window.gameConfirm('Möchtest du den alten Spielstand überschreiben?'))) return;
      await this._saveManager.deleteSave();
    }

    // State komplett zurücksetzen
    this._stateManager.reset();

    // Hero-Namen setzen
    this._stateManager.dispatch((state) => ({
      ...state,
      hero: { ...state.hero, name }
    }), 'game/setHeroName');

    // Lokale Service-Zustände zurücksetzen
    this._clanService.reset();
    this._eventBus.publish('game:reset');

    // Zum Hub navigieren
    this.showHub();
    this._eventBus.publish('hero:updated', {});
    this._eventBus.publish('resources:updated', {});
    this._eventBus.publish('clan:membersUpdated', {});
    this._eventBus.publish('ui:showToast', {
      message: `🌅 Willkommen, ${name}! Deine Reise beginnt.`,
      type: 'success',
      duration: 4000
    });
  }

  // ---- SPIELSTAND LADEN ----

  async _loadGame() {
    const state = this._stateManager.getState();
    if (state) {
      this._clanService.cleanupExpeditions();
      
      // Richtige View basierend auf Tutorial wiederherstellen
      this._navigateToCorrectViewAfterLoad(state);

      // Offline-Zeit berechnen
      const now = Date.now();
      const lastSave = state.system.originalLastSave || state.system.lastSave || now;
      const offlineMs = now - lastSave;

      // originalLastSave löschen, damit es bei erneutem Weiter-Klicken nicht nochmal verwendet wird
      if (state.system.originalLastSave) {
        this._stateManager.dispatch((s) => {
          const newSystem = { ...s.system };
          delete newSystem.originalLastSave;
          return { ...s, system: newSystem };
        }, 'system/clearOriginalLastSave');
      }

      if (offlineMs > 60000) {
        const clampedOffline = Math.min(offlineMs, 12 * 60 * 60 * 1000);
        
        // Offline-Fortschritt berechnen
        const prestigeBonus = state.hero?.prestige?.level * 2 || 0;
        const libraryBonus = (state.library?.upgrades?.clan_boost || 0) * 0.05;
        const tickRateMs = 10000; // CONFIG.CLAN.TICK_RATE_MS ist 10000 (10 Sekunden)
        const expPerCycle = 1; // CONFIG.CLAN.EXP_PER_CYCLE ist 1
        
        let totalParticles = 0;
        let totalRelics = 0;
        let totalArtifacts = 0;
        let totalLevels = 0;
        
        const simulatedMembers = [];
        const members = state.clan?.members || [];
        const expeditionStatus = state.clan?.expeditionStatus || {};
        
        for (const member of members) {
          // Wenn das Mitglied auf einer Expedition ist, produziert es keine Ressourcen offline
          if (expeditionStatus[member.id] === true) {
            simulatedMembers.push({ ...member });
            continue;
          }
          
          let memberProgress = member.progress || 0;
          let memberLevel = member.level || 1;
          let memberExp = member.experience || 0;
          let memberExpToNext = member.expToNextLevel || 50;
          const baseRate = member.baseCollectRate || 1.0;
          
          let remainingTime = clampedOffline;
          
          while (remainingTime > 0) {
            let rate = baseRate * Math.pow(1.05, memberLevel - 1);
            rate *= (1 + prestigeBonus / 100);
            rate *= (1 + libraryBonus);
            
            if (rate <= 0) break;
            
            // msNeeded = verbleibender Fortschritt bis 100 * tickRateMs / (rate * 100)
            const msNeeded = ((100 - memberProgress) * tickRateMs) / (rate * 100);
            
            if (remainingTime >= msNeeded) {
              remainingTime -= msNeeded;
              memberProgress = 0;
              
              const role = member.role;
              if (role === 'collector') {
                totalParticles += 1;
              } else if (role === 'weaver') {
                if (Math.random() < 0.1) {
                  totalRelics += 1;
                } else {
                  totalParticles += 2;
                }
              } else if (role === 'guardian') {
                if (Math.random() < 0.05) {
                  totalArtifacts += 1;
                } else {
                  totalParticles += 3;
                }
              } else if (role === 'archivist') {
                if (Math.random() < 0.15) {
                  totalRelics += 1;
                } else {
                  totalParticles += 4;
                }
              } else if (role === 'elder') {
                const rand = Math.random();
                if (rand < 0.1) {
                  totalArtifacts += 1;
                } else if (rand < 0.3) {
                  totalRelics += 1;
                } else {
                  totalParticles += 6;
                }
              }
              
              memberExp += expPerCycle;
              while (memberExp >= memberExpToNext) {
                memberExp -= memberExpToNext;
                memberLevel++;
                totalLevels++;
                memberExpToNext = Math.floor(memberExpToNext * 1.15);
              }
            } else {
              const progressGain = (rate * remainingTime) / tickRateMs * 100;
              memberProgress = Math.min(100, memberProgress + progressGain);
              remainingTime = 0;
            }
          }
          
          simulatedMembers.push({
            ...member,
            level: memberLevel,
            experience: memberExp,
            progress: memberProgress,
            expToNextLevel: memberExpToNext
          });
        }
        
        // Ressourcen und Clan-Mitglieder im State aktualisieren
        this._stateManager.dispatch((state) => {
          const currentParticles = BigInt(state.resources.particles || '0');
          const totalParticlesAcc = BigInt(state.resources.totalParticles || '0');
          const currentRelics = BigInt(state.resources.relics || '0');
          const totalRelicsAcc = BigInt(state.resources.totalRelics || '0');
          const currentArtifacts = BigInt(state.resources.artifacts || '0');
          
          return {
            ...state,
            resources: {
              ...state.resources,
              particles: String(currentParticles + BigInt(totalParticles)),
              totalParticles: String(totalParticlesAcc + BigInt(totalParticles)),
              relics: String(currentRelics + BigInt(totalRelics)),
              totalRelics: String(totalRelicsAcc + BigInt(totalRelics)),
              artifacts: String(currentArtifacts + BigInt(totalArtifacts)),
              timeBank: 0 // Da wir die Belohnungen sofort gewähren, ist kein zeitbasierter Catchup nötig
            },
            clan: {
              ...state.clan,
              members: simulatedMembers
            }
          };
        }, 'game/offlineProgress');
        
        // Offline-Modal einblenden & Werte aktualisieren
        const offlineModal = document.getElementById('offline-modal-overlay');
        if (offlineModal) offlineModal.style.display = 'flex';
        
        const offlineTimeVal = document.getElementById('offline-time-val');
        if (offlineTimeVal) offlineTimeVal.textContent = this._formatTime(clampedOffline);
        
        const offlineParticlesVal = document.getElementById('offline-particles-val');
        if (offlineParticlesVal) offlineParticlesVal.textContent = totalParticles.toLocaleString();
        
        const offlineRelicsVal = document.getElementById('offline-relics-val');
        if (offlineRelicsVal) offlineRelicsVal.textContent = totalRelics.toLocaleString();
        
        const offlineArtifactsVal = document.getElementById('offline-artifacts-val');
        if (offlineArtifactsVal) offlineArtifactsVal.textContent = totalArtifacts.toLocaleString();
        
        const offlineLevelsVal = document.getElementById('offline-levels-val');
        if (offlineLevelsVal) offlineLevelsVal.textContent = totalLevels.toLocaleString();
        
        // Event-Bus benachrichtigen, um alle Views und Overlays zu aktualisieren
        this._eventBus.publish('resources:updated', {});
        this._eventBus.publish('clan:membersUpdated', { members: this._clanService.getMembers() });
      }
      this._eventBus.publish('ui:showToast', {
        message: '💾 Spielstand geladen!',
        type: 'success',
        duration: 2000
      });
    } else {
      this._eventBus.publish('ui:showToast', {
        message: '❌ Kein Spielstand vorhanden.',
        type: 'warning',
        duration: 2000
      });
    }
  }

  _navigateToCorrectViewAfterLoad(state) {
    const isFinished = state.system?.tutorialFinished === true;
    const step = state.system?.tutorialStep !== undefined ? state.system.tutorialStep : -1;

    if (!isFinished && step >= 0) {
      if (step === 4 || step === 5 || step === 6 || step === 7) {
        this.showGame();
        return;
      }
      if (step === 9) {
        this.showHub();
        setTimeout(() => this._eventBus.publish(EVENTS.UI_OPEN_HERO), 150);
        return;
      }
      if (step === 11) {
        this.showHub();
        setTimeout(() => this._eventBus.publish(EVENTS.UI_OPEN_STORY), 150);
        return;
      }
    }
    this.showHub();
  }

  _formatTime(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    let str = '';
    if (hours > 0) str += hours + 'h ';
    if (minutes > 0) str += minutes + 'm ';
    str += seconds + 's';
    return str;
  }

  // ---- BEENDEN ----

  async _quitGame() {
    if (await window.gameConfirm('Möchtest du das Spiel wirklich beenden?')) {
      this._eventBus.publish('save:started');
      this._saveManager.save(this._stateManager.getState()).then(() => {
        if (window.electronAPI && typeof window.electronAPI.sendQuitReady === 'function') {
          window.electronAPI.sendQuitReady();
        } else {
          window.close();
        }
      });
    }
  }

  // ---- OPTIONEN SETTINGS LOGIK ----

  _setParticles(val) {
    this._settingsManager.set('particles', val);
    this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, particles: val }
    }), 'settings/updateParticles');
  }

  _setFloating(val) {
    this._settingsManager.set('floatingText', val);
    this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, floatingText: val }
    }), 'settings/updateFloatingText');
  }

  _setLanguage(val) {
    if (this._i18nService) {
      this._i18nService.setLanguage(val);
    }
    this._settingsManager.set('language', val);
    this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, language: val }
    }), 'settings/updateLanguage');
  }

  _toggleAudio() {
    const settings = this._stateManager.getState().settings;
    const newVal = !settings.music;
    this._settingsManager.set('music', newVal);
    this._settingsManager.set('sfx', newVal);
    this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, music: newVal, sfx: newVal }
    }), 'settings/toggleAudio');
  }

  _setMusicVolume(val) {
    const isMuted = val === 0;
    this._settingsManager.set('music', !isMuted);
    this._settingsManager.set('volume', val / 100);
    this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, music: !isMuted, volume: val / 100 }
    }), 'settings/updateMusicVolume');
  }

  _setSfxVolume(val) {
    const isMuted = val === 0;
    this._settingsManager.set('sfx', !isMuted);
    this._settingsManager.set('sfxVolume', val / 100);
    this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, sfx: !isMuted, sfxVolume: val / 100 }
    }), 'settings/updateSfxVolume');
  }

  _setAutosave(val) {
    this._settingsManager.set('autosave', val);
    this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, autosave: val }
    }), 'settings/updateAutosave');
  }

  _setCloudEnabled(val) {
    this._cloudManager.setEnabled(val);
    this._settingsManager.set('cloudEnabled', val);
    this._stateManager.dispatch((state) => ({
      ...state,
      settings: { ...state.settings, cloudEnabled: val }
    }), 'settings/updateCloudEnabled');
  }

  async _syncCloud() {
    if (!this._cloudManager.isEnabled()) {
      this._eventBus.publish('ui:showToast', {
        message: '⚠️ Cloud-Sync ist deaktiviert. Bitte zuerst aktivieren.',
        type: 'warning',
        duration: 3000
      });
      return;
    }
    
    this._eventBus.publish('ui:showToast', {
      message: '☁️ Synchronisiere mit Cloud...',
      type: 'info',
      duration: 1500
    });
    
    const success = await this._cloudManager.sync(this._stateManager.getState());
    if (success) {
      this._eventBus.publish('ui:showToast', {
        message: '💾 Cloud-Sync erfolgreich abgeschlossen!',
        type: 'success',
        duration: 3000
      });
    } else {
      this._eventBus.publish('ui:showToast', {
        message: '❌ Cloud-Sync fehlgeschlagen.',
        type: 'error',
        duration: 3000
      });
    }
  }

  _saveAndExitOptions() {
    this._eventBus.publish('save:started');
    const state = this._stateManager.getState();
    this._saveManager.save(state).then(() => {
      console.log('[Settings] Einstellungen erfolgreich persistent gespeichert.');
    }).catch((err) => {
      console.error('[Settings] Fehler beim automatischen Speichern der Einstellungen:', err);
    });

    const targetView = this._previousView && this._previousView !== 'options' && this._previousView !== 'menu'
      ? this._previousView
      : 'hub';

    if (targetView === 'characterSelect') {
      this.showCharacterSelect();
    } else if (targetView === 'game') {
      this.showGame();
    } else if (targetView === 'login') {
      this.showLogin();
    } else {
      this.showHub();
    }
  }

  async _hardReset() {
    if (!(await window.gameConfirm('🚨 ACHTUNG: Möchtest du deinen Spielstand wirklich unwiderruflich löschen? Alle Fortschritte gehen verloren!', 'SPIELSTAND LÖSCHEN'))) return;
    
    await this._saveManager.deleteSave();
    this._cloudManager.clearCloudData();
    this._stateManager.reset();
    this._clanService.reset();
    this._eventBus.publish('game:reset');
    
    await this.showMenu();
    this._eventBus.publish('hero:updated', {});
    this._eventBus.publish('resources:updated', {});
    this._eventBus.publish('clan:membersUpdated', {});
    
    this._eventBus.publish('ui:showToast', {
      message: '🗑️ Spielstand wurde erfolgreich gelöscht.',
      type: 'success',
      duration: 4000
    });
  }

  // ---- MANUAL GATHER IN-GAME ----

  _manualGather(clientX, clientY) {
    const state = this._stateManager.getState();
    const clickPowerLevel = state.hero.clickPowerLevel || 0;
    const base = CONFIG.GATHER.BASE_AMOUNT + clickPowerLevel * CONFIG.GATHER.POWER_MULT;
    const gatherLevel = state.library.upgrades?.gather_boost || 0;
    const libraryBonus = gatherLevel * 0.10;
    
    // Finstre Pakte Multiplikatoren
    let amount = Math.floor(base * (1 + libraryBonus));
    const activePact = state.hero?.prestige?.activePact;
    if (activePact === 'solitary_wanderer') {
      amount = Math.floor(amount * 2.5); // +150% click power
    }

    this._resourceService.addParticles(amount);
    this._eventBus.publish(EVENTS.QUEST_MANUAL_GATHER, {});

    // Time Warp aufladen
    if (!state.system?.timeWarpActive) {
      const currentCharge = state.system?.timeWarpCharge || 0;
      if (currentCharge < 100) {
        this._stateManager.dispatch((s) => ({
          ...s,
          system: {
            ...s.system,
            timeWarpCharge: Math.min(100, currentCharge + 1.0)
          }
        }), 'system/chargeTimeWarp');
      }
    }

    const x = clientX || window.innerWidth / 2;
    const y = clientY || window.innerHeight / 2;
    this._eventBus.publish(EVENTS.CMD_SPAWN_FLOAT_TEXT, {
      text: `+${amount} Partikel`,
      x,
      y
    });
  }

  _upgradeClickPower() {
    const state = this._stateManager.getState();
    const clickPowerLevel = state.hero.clickPowerLevel || 0;
    let cost = Math.floor(CONFIG.GATHER.UPGRADE_BASE_COST * Math.pow(CONFIG.GATHER.UPGRADE_COST_MULT, clickPowerLevel));
    
    const activePact = state.hero?.prestige?.activePact;
    if (activePact === 'ancient_folios') {
      cost = Math.floor(cost * 1.5); // +50% Upgrade-Kosten
    }

    const currentParticles = BigInt(state.resources.particles || '0');

    if (currentParticles < BigInt(cost)) {
      this._eventBus.publish('ui:showToast', {
        message: '❌ Nicht genügend Partikel!',
        type: 'warning',
        duration: 2000
      });
      return;
    }

    this._stateManager.dispatch((s) => {
      const nextClickPowerLevel = (s.hero.clickPowerLevel || 0) + 1;
      const particlesAfter = BigInt(s.resources.particles || '0') - BigInt(cost);
      return {
         ...s,
        resources: {
          ...s.resources,
          particles: String(particlesAfter)
        },
        hero: {
          ...s.hero,
          clickPowerLevel: nextClickPowerLevel
        }
      };
    }, 'hero/upgradeClickPower');

    this._eventBus.publish('ui:showToast', {
      message: '⚡ Klick-Stärke erfolgreich verbessert!',
      type: 'success',
      duration: 2000
    });
    
    this._eventBus.publish('resources:updated', { type: 'particles' });
    this._eventBus.publish('hero:updated', {});
  }

  _updateGameLoopStatus() {
    const statusTextEl = document.getElementById('game-state-text');
    const statusIndicatorEl = document.querySelector('.status-indicator');
    if (statusTextEl) {
      statusTextEl.textContent = this._gameLoop.isRunning() ? 'Running' : 'Paused';
    }
    if (statusIndicatorEl) {
      if (this._gameLoop.isRunning()) {
        statusIndicatorEl.classList.remove('paused');
        statusIndicatorEl.classList.add('running');
      } else {
        statusIndicatorEl.classList.remove('running');
        statusIndicatorEl.classList.add('paused');
      }
    }
  }
}

export default NavigationController;