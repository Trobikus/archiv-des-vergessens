// ============================================================
// FILE: main.js
// ============================================================

// --- CORE ---
import EventBus from './core/eventbus.js';
import SettingsManager from './core/settings.js';
import GameLoop from './core/gameloop.js';
import GameStateManager from './core/gamestate.js';
import SaveGameManager from './core/savegame.js';
import DOMPool from './core/pool.js';
import { DIContainer } from './core/di.js';
import { EVENTS } from './core/events.js';
import { CONFIG } from './core/config.js';
import { formatNumber } from './utils/format.js';
import Logger from './core/Logger.js';

// --- MODELS ---
import Hero from './models/hero.js';

// --- MANAGERS ---
import ResourceManager from './managers/resourcemanager.js';
import ClanManager from './managers/clanmanager.js';
import ExpeditionManager from './managers/expedition.js';
import StoryManager from './managers/story.js';
import ForgeManager from './managers/forge.js';
import RelicHuntManager from './managers/relicHunt.js';
import AchievementManager from './managers/achievements.js';
import DailyRewardManager from './managers/dailyrewards.js';
import SkillTreeManager from './managers/skilltree.js';
import ChallengeManager from './managers/challenges.js';
import QuestManager from './managers/quests.js';
import TutorialManager from './managers/tutorial.js';
import LibraryManager from './managers/library.js';
import CraftingManager from './managers/crafting.js';

// --- PHASE 1: AUDIO, CLOUD, LEADERBOARD ---
import AudioManager from './audio/AudioManager.js';
import CloudSaveManager from './core/CloudSaveManager.js';
import LocalLeaderboard from './core/LocalLeaderboard.js';
import TransitionManager from './core/TransitionManager.js';
import UIAnimations from './ui/animations.js';

// --- PHASE 2: STORY BRANCHING, DIALOG, CODEX ---
import StoryBranchManager from './core/StoryBranchManager.js';
import CodexManager from './core/CodexManager.js';

// --- PHASE 3: COMMUNITY FEATURES ---
import GuildManager from './core/GuildManager.js';
import FriendManager from './core/FriendManager.js';
import ChatManager from './core/ChatManager.js';

// --- UI ---
import ClanUI from './ui/clanui.js';
import HeroUI from './ui/heroui.js';
import StoryUI from './ui/storyui.js';
import ForgeUI from './ui/forgeui.js';
import ExpeditionUI from './ui/expeditionui.js';
import RecruitmentUI from './ui/recruitmentui.js';
import UIController from './ui/uicontroller.js';
import initParticles from './ui/particles.js';
import RelicHuntUI from './ui/relicHuntUI.js';
import SkillTreeUI from './ui/skilltreeui.js';
import ChallengeUI from './ui/challengeui.js';
import QuestUI from './ui/questui.js';
import TutorialUI from './ui/tutorialui.js';
import LibraryUI from './ui/libraryui.js';
import CraftingUI from './ui/craftingui.js';
import LeaderboardUI from './ui/LeaderboardUI.js';
import DialogUI from './ui/DialogUI.js';
import CodexUI from './ui/CodexUI.js';
import GuildUI from './ui/GuildUI.js';
import FriendUI from './ui/FriendUI.js';
import ChatUI from './ui/ChatUI.js';
import { safeAddEventListener } from './ui/errorHandler.js';

// --- UI HELPER ---
import ToastManager from './ui/ToastManager.js';
import ConfirmDialog from './ui/ConfirmDialog.js';
import LoadingUI from './ui/LoadingUI.js';

// --- PREACT IMPORTS ---
import { html, render } from './ui/preact-setup.js';
import AchievementUI from './ui/achievementui.js';

// --- CONTROLLERS ---
import NavigationController from './controllers/navigation.js';
import GatherController from './controllers/gather.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[main] DOM bereit, initialisiere Spielkomponenten...');

  // ============================================================
  // LOGGER INTEGRATION
  // ============================================================
  const logger = new Logger();
  logger.level = 'info';

  const container = new DIContainer();

  container.register('eventBus', () => new EventBus());
  const eventBus = container.get('eventBus');

  logger.setEventBus(eventBus);

  window.addEventListener('error', (e) => {
    logger.error('Globaler Fehler', { message: e.message, stack: e.error?.stack, filename: e.filename });
  });
  window.addEventListener('unhandledrejection', (e) => {
    logger.error('Unbehandelte Promise-Ablehnung', { reason: e.reason });
  });

  container.register('settingsManager', () => new SettingsManager(eventBus));
  container.register('gameLoop', (c) => new GameLoop({ eventBus, resourceManager: c.get('resourceManager') }));
  container.register('gameStateManager', () => new GameStateManager(eventBus));
  container.register('hero', () => new Hero(eventBus));

  container.register('resourceManager', (c) => {
    const rm = new ResourceManager(eventBus);
    rm.hero = c.get('hero');
    return rm;
  });

  container.register('libraryManager', (c) => new LibraryManager(eventBus, c.get('resourceManager')));
  container.register('challengeManager', (c) => new ChallengeManager(eventBus, c.get('hero')));

  container.register('clanManager', (c) => {
    const cm = new ClanManager(eventBus, c.get('resourceManager'), c.get('challengeManager'));
    cm.libraryManager = c.get('libraryManager');
    return cm;
  });

  container.register('expeditionManager', (c) => new ExpeditionManager(eventBus, c.get('clanManager'), c.get('resourceManager')));
  container.register('storyManager', (c) => new StoryManager(eventBus, c.get('hero')));

  container.register('forgeManager', (c) => {
    const fm = new ForgeManager(eventBus, c.get('hero'), c.get('resourceManager'));
    fm.libraryManager = c.get('libraryManager');
    return fm;
  });

  container.register('relicHuntManager', (c) => new RelicHuntManager({
    eventBus,
    hero: c.get('hero'),
    resourceManager: c.get('resourceManager')
  }));

  container.register('achievementManager', (c) => new AchievementManager(eventBus, c.get('hero'), c.get('resourceManager')));
  container.register('dailyRewardManager', (c) => new DailyRewardManager(eventBus, c.get('hero'), c.get('resourceManager')));
  container.register('skillTreeManager', (c) => new SkillTreeManager(eventBus, c.get('hero')));
  container.register('questManager', (c) => new QuestManager(eventBus, c.get('hero'), c.get('resourceManager'), c.get('clanManager')));
  container.register('tutorialManager', (c) => new TutorialManager(eventBus, c.get('hero'), c.get('resourceManager')));

  container.register('craftingManager', (c) => new CraftingManager({
    eventBus,
    hero: c.get('hero'),
    resourceManager: c.get('resourceManager'),
    clanManager: c.get('clanManager'),
    forgeManager: c.get('forgeManager')
  }));

  container.register('audioManager', () => new AudioManager(eventBus));
  container.register('cloudSaveManager', () => new CloudSaveManager(eventBus));
  container.register('leaderboardManager', () => new LocalLeaderboard());
  container.register('transitionManager', () => new TransitionManager(eventBus));
  container.register('uiAnimations', (c) => new UIAnimations({ eventBus, transitionManager: c.get('transitionManager') }));

  container.register('storyBranchManager', (c) => new StoryBranchManager(eventBus, c.get('hero')));
  container.register('codexManager', (c) => new CodexManager(eventBus, c.get('hero')));

  container.register('guildManager', (c) => new GuildManager(eventBus, c.get('hero')));
  container.register('friendManager', (c) => new FriendManager(eventBus, c.get('hero')));
  container.register('chatManager', (c) => new ChatManager(eventBus, c.get('hero'), c.get('guildManager')));

  const context = {
    eventBus,
    container,
    logger,
    get settingsManager() { return container.get('settingsManager'); },
    get gameLoop() { return container.get('gameLoop'); },
    get gameStateManager() { return container.get('gameStateManager'); },
    get hero() { return container.get('hero'); },
    get resourceManager() { return container.get('resourceManager'); },
    get libraryManager() { return container.get('libraryManager'); },
    get challengeManager() { return container.get('challengeManager'); },
    get clanManager() { return container.get('clanManager'); },
    get expeditionManager() { return container.get('expeditionManager'); },
    get storyManager() { return container.get('storyManager'); },
    get forgeManager() { return container.get('forgeManager'); },
    get relicHuntManager() { return container.get('relicHuntManager'); },
    get achievementManager() { return container.get('achievementManager'); },
    get dailyRewardManager() { return container.get('dailyRewardManager'); },
    get skillTreeManager() { return container.get('skillTreeManager'); },
    get questManager() { return container.get('questManager'); },
    get tutorialManager() { return container.get('tutorialManager'); },
    get craftingManager() { return container.get('craftingManager'); },
    get audioManager() { return container.get('audioManager'); },
    get cloudSaveManager() { return container.get('cloudSaveManager'); },
    get leaderboardManager() { return container.get('leaderboardManager'); },
    get transitionManager() { return container.get('transitionManager'); },
    get uiAnimations() { return container.get('uiAnimations'); },
    get storyBranchManager() { return container.get('storyBranchManager'); },
    get codexManager() { return container.get('codexManager'); },
    get guildManager() { return container.get('guildManager'); },
    get friendManager() { return container.get('friendManager'); },
    get chatManager() { return container.get('chatManager'); }
  };

  logger.info('Spiel-Bootstrapping gestartet', { version: '1.5' });

  // ============================================================
  // TOAST MANAGER
  // ============================================================
  const toastManager = new ToastManager();
  toastManager.setEventBus(eventBus);

  // ============================================================
  // LOADING UI
  // ============================================================
  const loadingUI = new LoadingUI();
  eventBus.subscribe('ui:showLoading', (data) => {
    if (data.show) {
      loadingUI.show(data.text || 'Lade...', data.progress || 0);
    } else {
      loadingUI.hide();
    }
  });

  // ============================================================
  // DOMPool für Floating-Text
  // ============================================================
  const floatTextPool = new DOMPool(() => {
    const el = document.createElement('div');
    el.className = 'float-text';
    el.dataset.baseClass = 'float-text';
    return el;
  }, 30);

  eventBus.subscribe(EVENTS.CMD_SPAWN_FLOAT_TEXT, (data) => {
    const { text, targetId, x, y } = data;
    const el = floatTextPool.get();
    el.textContent = text;
    if (targetId) {
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        el.style.left = rect.left + rect.width / 2 - 20 + 'px';
        el.style.top = rect.top + 'px';
      }
    } else if (x !== undefined && y !== undefined) {
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    }
    setTimeout(() => floatTextPool.release(el), 1200);
  });

  // Audio-Context aktivieren
  const handleUserGestureAudio = () => {
    const audio = context.audioManager;
    if (!audio.isInitialized) {
      audio.init();
      audio.playMusic('menu');
    }
    document.removeEventListener('click', handleUserGestureAudio);
  };
  document.addEventListener('click', handleUserGestureAudio);

  // SaveGame-Schnittstellen
  SaveGameManager.register('hero', context.hero);
  SaveGameManager.register('clan', context.clanManager);
  SaveGameManager.register('expedition', context.expeditionManager);
  SaveGameManager.register('resources', context.resourceManager);
  SaveGameManager.register('library', context.libraryManager);
  SaveGameManager.register('achievements', context.achievementManager);
  SaveGameManager.register('dailyRewards', context.dailyRewardManager);
  SaveGameManager.register('challenges', context.challengeManager);
  SaveGameManager.register('quests', context.questManager);
  SaveGameManager.register('tutorial', context.tutorialManager);
  SaveGameManager.register('crafting', context.craftingManager);
  SaveGameManager.register('audio', context.audioManager);
  SaveGameManager.register('cloud', context.cloudSaveManager);
  SaveGameManager.register('leaderboard', context.leaderboardManager);
  SaveGameManager.register('storyBranch', context.storyBranchManager);
  SaveGameManager.register('codex', context.codexManager);
  SaveGameManager.register('guild', context.guildManager);
  SaveGameManager.register('friends', context.friendManager);
  SaveGameManager.register('chat', context.chatManager);

  // UI-Instanzen
  let heroUI, storyUI, forgeUI, libraryUI, relicHuntUI, skillTreeUI, challengeUI;
  try {
    new ClanUI(context);
    heroUI = new HeroUI(context);
    storyUI = new StoryUI(context);
    forgeUI = new ForgeUI(context);
    libraryUI = new LibraryUI(context);
    new ExpeditionUI(context);
    new RecruitmentUI(context);
    new UIController(context);
    relicHuntUI = new RelicHuntUI(context);
    skillTreeUI = new SkillTreeUI(context);
    challengeUI = new ChallengeUI(context);
    new QuestUI(context);
    new TutorialUI(context);
    new GatherController(context);
    new CraftingUI(context);
    new LeaderboardUI(context);
    new DialogUI(context);
    new CodexUI(context);
    new GuildUI(context);
    new FriendUI(context);
    new ChatUI(context);

    const preactRoot = document.getElementById('preact-root');
    if (preactRoot) {
      render(html`<${AchievementUI} context=${context} />`, preactRoot);
    }

    safeAddEventListener(document.getElementById('open-achievements-btn'), 'click', () => {
      eventBus.publish('ui:openAchievements');
    });
    safeAddEventListener(document.getElementById('hub-crafting'), 'click', () => {
      eventBus.publish(EVENTS.UI_OPEN_CRAFTING);
    });
    safeAddEventListener(document.getElementById('hub-leaderboard'), 'click', () => {
      eventBus.publish(EVENTS.UI_OPEN_LEADERBOARD);
    });
    safeAddEventListener(document.getElementById('hub-story-branch'), 'click', () => {
      eventBus.publish('ui:openDialog', { npcId: 'archivist' });
    });
    safeAddEventListener(document.getElementById('hub-codex'), 'click', () => {
      eventBus.publish('ui:openCodex');
    });
    safeAddEventListener(document.getElementById('hub-guild'), 'click', () => {
      eventBus.publish('ui:openGuild');
    });
    safeAddEventListener(document.getElementById('hub-friends'), 'click', () => {
      eventBus.publish('ui:openFriends');
    });
    safeAddEventListener(document.getElementById('hub-chat'), 'click', () => {
      eventBus.publish('ui:openChat');
    });

  } catch (e) {
    logger.error('Kritischer Fehler bei UI-Initialisierung', { error: e.message, stack: e.stack });
  }

  initParticles();

  // Save-System
  let saveTimer = null;
  async function saveGame() {
    if (context.storyManager.battleInProgress) return false;
    const result = await SaveGameManager.saveGame();
    if (result && context.cloudSaveManager.isCloudEnabled()) {
      context.cloudSaveManager.sync();
    }
    return result;
  }

  function startAutosave() {
    const interval = parseInt(context.settingsManager.get('autosave'), 10);
    if (saveTimer) clearInterval(saveTimer);
    if (interval > 0) saveTimer = setInterval(() => saveGame(), interval);
    logger.debug('Autosave-Intervall gesetzt', { interval });
  }

  // Events für automatisches Speichern
  eventBus.subscribe(EVENTS.STORY_BOSS_DEFEATED, () => saveGame());
  eventBus.subscribe(EVENTS.FORGE_CRAFTED, () => saveGame());
  eventBus.subscribe(EVENTS.CRAFTING_MASTERWORK, () => saveGame());
  eventBus.subscribe(EVENTS.HERO_PRESTIGE, () => saveGame());
  eventBus.subscribe(EVENTS.ACHIEVEMENT_CLAIMED, () => saveGame());
  eventBus.subscribe(EVENTS.EXPEDITION_STARTED, () => saveGame());
  eventBus.subscribe(EVENTS.SETTINGS_UPDATED, () => startAutosave());
  eventBus.subscribe('story:branchChanged', () => saveGame());
  eventBus.subscribe('story:endingReached', () => saveGame());
  eventBus.subscribe('codex:entryUnlocked', () => saveGame());
  eventBus.subscribe('guild:created', () => saveGame());
  eventBus.subscribe('guild:memberJoined', () => saveGame());
  eventBus.subscribe('guild:memberLeft', () => saveGame());
  eventBus.subscribe('guild:deleted', () => saveGame());
  eventBus.subscribe('guild:levelUp', () => saveGame());
  eventBus.subscribe('friend:accepted', () => saveGame());
  eventBus.subscribe('friend:removed', () => saveGame());

  // Leaderboard-Update
  eventBus.subscribe(EVENTS.HERO_UPDATED, () => {
    if (context.leaderboardManager) {
      context.leaderboardManager.addEntry({
        name: context.hero.name,
        prestige: context.hero.prestigeLevel,
        bosses: context.hero.defeatedBosses.length,
        level: context.hero.level,
        craftingLevel: context.craftingManager ? context.craftingManager.craftingLevel : 0,
        particles: context.resourceManager.totalParticles
      });
    }
  });

  eventBus.subscribe('catchup:ended', () => {
    const speedIndicator = document.getElementById('speed-indicator');
    if (speedIndicator) speedIndicator.style.display = 'none';
    eventBus.publish(EVENTS.UI_REFRESH_QUEST);
    logger.info('Catchup-Modus beendet');
  });

  // --- OPTIONEN ---
  const audioToggleBtn = document.getElementById('opt-audio-toggle');
  safeAddEventListener(audioToggleBtn, 'click', () => {
    const muted = context.audioManager.toggleMute();
    audioToggleBtn.textContent = muted ? '🔇 Stumm' : '🔊 Aktiv';
    eventBus.publish(EVENTS.UI_ADD_LOG, {
      text: muted ? '🔇 Audio stummgeschaltet' : '🔊 Audio aktiviert',
      type: 'system'
    });
    logger.info(`Audio ${muted ? 'stummgeschaltet' : 'aktiviert'}`);
  });
  if (context.audioManager.isMuted && audioToggleBtn) {
    audioToggleBtn.textContent = '🔇 Stumm';
  }

  const musicVolumeSlider = document.getElementById('opt-music-volume');
  if (musicVolumeSlider) {
    musicVolumeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value) / 100;
      context.audioManager.setMusicVolume(val);
    });
    musicVolumeSlider.value = context.audioManager.musicVolume * 100;
  }

  const sfxVolumeSlider = document.getElementById('opt-sfx-volume');
  if (sfxVolumeSlider) {
    sfxVolumeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value) / 100;
      context.audioManager.setSfxVolume(val);
    });
    sfxVolumeSlider.value = context.audioManager.sfxVolume * 100;
  }

  const cloudEnabledCheck = document.getElementById('opt-cloud-enabled');
  if (cloudEnabledCheck) {
    cloudEnabledCheck.addEventListener('change', (e) => {
      context.cloudSaveManager.setEnabled(e.target.checked);
      eventBus.publish(EVENTS.UI_ADD_LOG, {
        text: e.target.checked ? '☁️ Cloud-Sync aktiviert' : '☁️ Cloud-Sync deaktiviert',
        type: 'system'
      });
      updateCloudLastSync();
    });
    cloudEnabledCheck.checked = context.cloudSaveManager.isCloudEnabled();
  }

  const cloudSyncBtn = document.getElementById('opt-cloud-sync-btn');
  if (cloudSyncBtn) {
    cloudSyncBtn.addEventListener('click', async () => {
      if (!context.cloudSaveManager.isCloudEnabled()) {
        eventBus.publish(EVENTS.UI_ADD_LOG, {
          text: '⚠️ Cloud-Sync ist deaktiviert. Bitte zuerst in den Einstellungen aktivieren.',
          type: 'system'
        });
        return;
      }
      cloudSyncBtn.textContent = '⏳ Sichern...';
      cloudSyncBtn.disabled = true;
      const success = await context.cloudSaveManager.forceSync();
      cloudSyncBtn.disabled = false;
      cloudSyncBtn.textContent = '☁️ Jetzt sichern';
      if (success) {
        eventBus.publish(EVENTS.UI_ADD_LOG, { text: '☁️ Spielstand erfolgreich in der Cloud gesichert!', type: 'system' });
        updateCloudLastSync();
      } else {
        eventBus.publish(EVENTS.UI_ADD_LOG, { text: '⚠️ Cloud-Sync fehlgeschlagen.', type: 'system' });
      }
    });
  }

  const updateCloudLastSync = () => {
    const lastSyncEl = document.getElementById('opt-cloud-last-sync');
    if (lastSyncEl) {
      const info = context.cloudSaveManager.getCloudInfo();
      if (info && info.timestamp) {
        const date = new Date(info.timestamp);
        lastSyncEl.textContent = date.toLocaleString();
      } else {
        lastSyncEl.textContent = 'Nie';
      }
    }
  };
  updateCloudLastSync();
  eventBus.subscribe('cloud:synced', updateCloudLastSync);

  const optParticles = document.getElementById('opt-particles');
  if (optParticles) {
    optParticles.addEventListener('change', (e) => {
      context.settingsManager.set('particles', e.target.checked);
    });
    optParticles.checked = context.settingsManager.get('particles');
  }

  const optFloating = document.getElementById('opt-floating');
  if (optFloating) {
    optFloating.addEventListener('change', (e) => {
      context.settingsManager.set('floatingText', e.target.checked);
    });
    optFloating.checked = context.settingsManager.get('floatingText');
  }

  const optAutosave = document.getElementById('opt-autosave');
  if (optAutosave) {
    optAutosave.addEventListener('change', (e) => {
      context.settingsManager.set('autosave', e.target.value);
    });
    optAutosave.value = context.settingsManager.get('autosave');
  }

  const optHardReset = document.getElementById('opt-hard-reset');
  if (optHardReset) {
    optHardReset.addEventListener('click', async () => {
      const confirmed = await ConfirmDialog.ask(
        '🧨 Spielstand unwiderruflich löschen?',
        'Alle Fortschritte, Erfolge, Ausrüstung und Ressourcen werden dauerhaft gelöscht.',
        'Diese Aktion kann nicht rückgängig gemacht werden!',
        'Ja, löschen',
        'Abbrechen'
      );
      if (confirmed) {
        logger.warn('Hard-Reset durchgeführt');
        if (saveTimer) clearInterval(saveTimer);
        if (context.gameLoop.isRunning()) context.gameLoop.stop();
        await SaveGameManager.deleteSaveGame();
        context.cloudSaveManager.clearCloudData();
        context.leaderboardManager.reset();
        location.reload();
      }
    });
  }

  // --- NAVIGATION & SPEICHER-ENGINE ---
  async function loadGameData() {
    loadingUI.show('Archiv wird geladen...', 20);

    const saveData = await SaveGameManager.loadGame();
    if (!saveData) {
      loadingUI.hide();
      logger.info('Kein Spielstand gefunden – neues Spiel wird gestartet');
      return false;
    }

    loadingUI.setProgress(50, 'Erinnerungen werden entfaltet...');

    try {
      eventBus.publish(EVENTS.HERO_UPDATED);
      eventBus.publish(EVENTS.RESOURCES_UPDATED);
      eventBus.publish(EVENTS.CLAN_MEMBERS_UPDATED, { members: context.clanManager.members });

      if (context.cloudSaveManager.isCloudEnabled()) {
        context.cloudSaveManager.sync(saveData);
        updateCloudLastSync();
      }

      if (saveData.timestamp) {
        const now = Date.now();
        const offlineMs = now - saveData.timestamp;

        if (offlineMs > 60000) {
          const clampedOfflineMs = Math.min(offlineMs, CONFIG.SYSTEM.MAX_OFFLINE_MS);
          const offlineSeconds = clampedOfflineMs / 1000;

          context.resourceManager.timeBank = (context.resourceManager.timeBank || 0) + offlineSeconds;
          logger.info('Offline-Catchup aktiv', { offlineSeconds, clampedOfflineMs });

          loadingUI.setProgress(80, `Offline-Zeit: ${formatOfflineTime(clampedOfflineMs)} – 4× Geschwindigkeit`);

          const timeEl = document.getElementById('offline-time-val');
          if (timeEl) timeEl.textContent = formatOfflineTime(clampedOfflineMs);

          const particlesParent = document.getElementById('offline-particles-val')?.parentElement;
          if (particlesParent) particlesParent.style.display = 'none';
          const relicsParent = document.getElementById('offline-relics-val')?.parentElement;
          if (relicsParent) relicsParent.style.display = 'none';
          const artifactsParent = document.getElementById('offline-artifacts-val')?.parentElement;
          if (artifactsParent) artifactsParent.style.display = 'none';

          const levelsEl = document.getElementById('offline-levels-val');
          if (levelsEl) {
            levelsEl.parentElement.innerHTML = `
              <span class="text-muted">Zeitstaub erhalten:</span>
              <span class="text-gold text-bold">${formatOfflineTime(clampedOfflineMs)} (4x Geschwindigkeit)</span>
            `;
          }

          const offlineOverlay = document.getElementById('offline-modal-overlay');
          if (offlineOverlay) {
            offlineOverlay.classList.remove('hidden');
            offlineOverlay.style.display = 'flex';
            const offlineCloseBtn = document.getElementById('offline-close-btn');
            if (offlineCloseBtn) {
              const newBtn = offlineCloseBtn.cloneNode(true);
              offlineCloseBtn.parentNode.replaceChild(newBtn, offlineCloseBtn);
              newBtn.textContent = 'Zum Hub';
              newBtn.addEventListener('click', () => {
                offlineOverlay.style.display = 'none';
                if (context.resourceManager.timeBank > 0) {
                  context.gameLoop._catchupActive = true;
                }
                loadingUI.hide();
              }, { once: true });
            }
          } else {
            loadingUI.hide();
          }
        } else {
          loadingUI.hide();
        }
      } else {
        loadingUI.hide();
      }

      eventBus.publish(EVENTS.UI_ADD_LOG, { text: `Spielstand erfolgreich geladen!`, type: 'system' });
      logger.info('Spielstand geladen', { timestamp: saveData.timestamp });
      startAutosave();

      setTimeout(() => {
        const offlineOverlay = document.getElementById('offline-modal-overlay');
        if (!offlineOverlay || offlineOverlay.style.display === 'none') {
          loadingUI.hide();
        }
      }, 500);

      return true;
    } catch (error) {
      logger.error('Fehler beim Laden des Spielstands', { error: error.message, stack: error.stack });
      loadingUI.hide();
      return false;
    }
  }

  function formatOfflineTime(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    let str = '';
    if (hours > 0) str += hours + 'h ';
    if (minutes > 0) str += minutes + 'm ';
    str += seconds + 's';
    return str;
  }

  const navElements = {
    menuContainer: document.getElementById('menu-container'),
    hubContainer: document.getElementById('hub-container'),
    gameContainer: document.getElementById('game-container'),
    optionsContainer: document.getElementById('options-container'),
    btnNewGame: document.getElementById('menu-new-game'),
    btnContinue: document.getElementById('menu-continue'),
    btnOptions: document.getElementById('menu-options'),
    btnQuit: document.getElementById('menu-quit'),
    btnHubArchive: document.getElementById('hub-archive'),
    btnHubHero: document.getElementById('hub-hero'),
    btnHubStory: document.getElementById('hub-story'),
    btnHubArtifact: document.getElementById('hub-artifact'),
    btnHubRelic: document.getElementById('hub-relic'),
    btnHubSkills: document.getElementById('hub-skills'),
    btnHubChallenges: document.getElementById('hub-challenges'),
    btnHubLibrary: document.getElementById('hub-library'),
    btnHubCrafting: document.getElementById('hub-crafting'),
    btnHubLeaderboard: document.getElementById('hub-leaderboard'),
    btnHubStoryBranch: document.getElementById('hub-story-branch'),
    btnHubCodex: document.getElementById('hub-codex'),
    btnHubGuild: document.getElementById('hub-guild'),
    btnHubFriends: document.getElementById('hub-friends'),
    btnHubChat: document.getElementById('hub-chat'),
    btnHubBack: document.getElementById('hub-back-to-menu'),
    btnBackToHub: document.getElementById('back-to-hub-btn'),
    btnOptionsBack: document.getElementById('options-back-btn'),
    offlineModalOverlay: document.getElementById('offline-modal-overlay'),
    btnOfflineClose: document.getElementById('offline-close-btn'),
    newGameModalOverlay: document.getElementById('new-game-modal-overlay'),
    newGameStartBtn: document.getElementById('new-game-start-btn'),
    newGameCancelBtn: document.getElementById('new-game-cancel-btn'),
    newGameInput: document.getElementById('new-game-hero-name')
  };

  const navController = new NavigationController(context, navElements, {
    hasSaveGame: () => SaveGameManager.hasSaveGame(),
    onSave: () => saveGame(),
    onLoad: async () => {
      const success = await loadGameData();
      if (success) navController.showHub();
      else {
        loadingUI.hide();
        alert('Der lokale Spielstand konnte nicht fehlerfrei dekomprimiert werden.');
      }
    },
    onNewGame: async (heroName) => {
      logger.info('Neues Spiel gestartet', { heroName });
      const hasSave = await SaveGameManager.hasSaveGame();
      if (hasSave) await SaveGameManager.deleteSaveGame();

      context.hero.fromJSON(new Hero(eventBus).toJSON());
      context.hero.name = heroName;

      context.resourceManager.fromJSON({ particles: 0, relics: 0, artifacts: 0, memoryDust: 0, timeBank: 0, catalyst: 0, essence: 0 });
      context.clanManager.fromJSON({ members: [], nextId: 1, expeditionStatus: [] });
      context.expeditionManager.fromJSON({ activeExpeditions: [] });
      context.libraryManager.fromJSON({});
      context.achievementManager.reset();
      context.dailyRewardManager.fromJSON({ lastClaimDate: null, streak: 0, claimedToday: false, currentBoost: null });
      context.challengeManager.fromJSON({ activeChallenge: null, completedChallenges: [] });
      context.questManager.fromJSON({ questIndex: 0, dailyQuests: { date: '', gatherClicks: 0, expeditions: 0, craftedItems: 0, claimed: [] } });
      context.tutorialManager.fromJSON({ completed: false });
      context.craftingManager.fromJSON({});
      
      if (context.audioManager && typeof context.audioManager.fromJSON === 'function') {
        context.audioManager.fromJSON({});
      }
      if (context.cloudSaveManager && typeof context.cloudSaveManager.fromJSON === 'function') {
        context.cloudSaveManager.fromJSON({});
      }
      if (context.leaderboardManager && typeof context.leaderboardManager.fromJSON === 'function') {
        context.leaderboardManager.fromJSON({});
      }
      if (context.storyBranchManager && typeof context.storyBranchManager.fromJSON === 'function') {
        context.storyBranchManager.fromJSON({});
      }
      if (context.codexManager && typeof context.codexManager.fromJSON === 'function') {
        context.codexManager.fromJSON({});
      }
      if (context.guildManager && typeof context.guildManager.fromJSON === 'function') {
        context.guildManager.fromJSON({});
      }
      if (context.friendManager && typeof context.friendManager.fromJSON === 'function') {
        context.friendManager.fromJSON({});
      }
      if (context.chatManager && typeof context.chatManager.fromJSON === 'function') {
        context.chatManager.fromJSON({});
      }

      eventBus.publish(EVENTS.HERO_UPDATED);

      startAutosave();
      navController.showHub();
      context.tutorialManager.start();

      if (context.audioManager.isInitialized) {
        context.audioManager.playMusic('hub');
      }

      setTimeout(updateHubPlayerInfo, 200);
      setTimeout(updateQuestIndicator, 300);
    },
    onHardReset: async () => {
      if (saveTimer) clearInterval(saveTimer);
      if (context.gameLoop.isRunning()) context.gameLoop.stop();
      await SaveGameManager.deleteSaveGame();
      context.cloudSaveManager.clearCloudData();
      context.leaderboardManager.reset();
      location.reload();
    },
    onGameStart: () => {
      context.achievementManager._checkProgress();
      if (context.audioManager.isInitialized) {
        context.audioManager.playMusic('game');
      }
      logger.info('Spiel gestartet (Game-View)');
    }
  });

  safeAddEventListener(navElements.btnHubHero, 'click', () => heroUI.open());
  safeAddEventListener(navElements.btnHubStory, 'click', () => storyUI.open());
  safeAddEventListener(navElements.btnHubArtifact, 'click', () => forgeUI.open());
  safeAddEventListener(navElements.btnHubRelic, 'click', () => relicHuntUI.open());
  safeAddEventListener(navElements.btnHubSkills, 'click', () => skillTreeUI.open());
  safeAddEventListener(navElements.btnHubChallenges, 'click', () => challengeUI.open());
  safeAddEventListener(navElements.btnHubLibrary, 'click', () => libraryUI.open());
  safeAddEventListener(navElements.btnHubCrafting, 'click', () => {
    eventBus.publish(EVENTS.UI_OPEN_CRAFTING);
  });
  safeAddEventListener(navElements.btnHubLeaderboard, 'click', () => {
    eventBus.publish(EVENTS.UI_OPEN_LEADERBOARD);
  });
  safeAddEventListener(navElements.btnHubStoryBranch, 'click', () => {
    eventBus.publish('ui:openDialog', { npcId: 'archivist' });
  });
  safeAddEventListener(navElements.btnHubCodex, 'click', () => {
    eventBus.publish('ui:openCodex');
  });
  safeAddEventListener(navElements.btnHubGuild, 'click', () => {
    eventBus.publish('ui:openGuild');
  });
  safeAddEventListener(navElements.btnHubFriends, 'click', () => {
    eventBus.publish('ui:openFriends');
  });
  safeAddEventListener(navElements.btnHubChat, 'click', () => {
    eventBus.publish('ui:openChat');
  });

  eventBus.subscribe(EVENTS.UI_START_BOSS_FIGHT, () => context.storyManager.startBossFromHub());

  await navController.updateMenuButtons();
  navController.showMenu();

  // --- HUB TABS ---
  const tabButtons = document.querySelectorAll('.hub-tab-btn');
  const categories = {
    core: document.getElementById('hub-category-core'),
    progression: document.getElementById('hub-category-progression'),
    crafting: document.getElementById('hub-category-crafting'),
    collection: document.getElementById('hub-category-collection'),
    social: document.getElementById('hub-category-social')
  };

  for (const [key, el] of Object.entries(categories)) {
    if (el) el.style.display = key === 'core' ? 'block' : 'none';
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      for (const el of Object.values(categories)) {
        if (el) el.style.display = 'none';
      }
      const category = btn.dataset.category;
      if (categories[category]) {
        categories[category].style.display = 'block';
      }
    });
  });

  // --- HUB PLAYER INFO ---
  function updateHubPlayerInfo() {
    const hero = context.hero;
    if (!hero) return;
    const nameEl = document.getElementById('hub-hero-name');
    const levelEl = document.getElementById('hub-level');
    const prestigeEl = document.getElementById('hub-prestige');
    if (nameEl) nameEl.textContent = hero.name || 'Held';
    if (levelEl) levelEl.textContent = hero.level || 1;
    if (prestigeEl) prestigeEl.textContent = hero.prestigeLevel || 0;
  }

  eventBus.subscribe(EVENTS.HERO_UPDATED, updateHubPlayerInfo);
  setTimeout(updateHubPlayerInfo, 100);

  // --- QUEST INDICATOR ---
  function updateQuestIndicator() {
    const indicator = document.getElementById('hub-quest-indicator');
    if (!indicator) return;
    const q = context.questManager?.getCurrentQuest?.();
    if (q) {
      indicator.style.display = 'inline';
      if (context.questManager?.isCurrentQuestComplete?.()) {
        indicator.textContent = '✅ Mission bereit';
        indicator.style.color = 'var(--color-success)';
      } else {
        indicator.textContent = '📋 Mission aktiv';
        indicator.style.color = 'var(--color-text-muted)';
      }
    } else {
      indicator.style.display = 'none';
    }
  }

  eventBus.subscribe(EVENTS.QUEST_UPDATED, updateQuestIndicator);
  eventBus.subscribe(EVENTS.QUEST_COMPLETED, updateQuestIndicator);
  eventBus.subscribe(EVENTS.UI_REFRESH_QUEST, updateQuestIndicator);
  setTimeout(updateQuestIndicator, 200);

  logger.info('Bootstrapping abgeschlossen – Spiel bereit');
  console.log('[main] Bootstrapping abgeschlossen.');
});