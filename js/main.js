// --- START OF FILE main.js ---

// --- CORE ---
import EventBus from './core/eventbus.js';
import SettingsManager from './core/settings.js';
import GameLoop from './core/gameloop.js';
import GameStateManager from './core/gamestate.js';
import SaveGameManager from './core/savegame.js';
import DOMPool from './core/pool.js';
import { EVENTS } from './core/events.js';
import { CONFIG } from './core/config.js';
import { formatNumber } from './utils/format.js';

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

// --- PREACT IMPORTS ---
import { html, render } from './ui/preact-setup.js';
import AchievementUI from './ui/achievementui.js';

// --- CONTROLLERS ---
import NavigationController from './controllers/navigation.js';
import GatherController from './controllers/gather.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[main] DOM bereit, initialisiere Spiel...');

  const eventBus = new EventBus();
  let saveTimer = null;

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

  // --- DEPENDENCY INJECTION / CONTEXT CREATION ---
  const context = { eventBus };

  context.settingsManager = new SettingsManager(eventBus);
  context.gameLoop = new GameLoop(context);
  context.gameStateManager = new GameStateManager(eventBus);
  context.hero = new Hero(eventBus);
  context.resourceManager = new ResourceManager(eventBus);
  context.resourceManager.hero = context.hero;

  context.libraryManager = new LibraryManager(eventBus, context.resourceManager);
  context.challengeManager = new ChallengeManager(eventBus, context.hero);
  context.clanManager = new ClanManager(eventBus, context.resourceManager, context.challengeManager);
  context.expeditionManager = new ExpeditionManager(eventBus, context.clanManager, context.resourceManager);
  context.storyManager = new StoryManager(eventBus, context.hero);
  context.forgeManager = new ForgeManager(eventBus, context.hero, context.resourceManager);

  context.clanManager.libraryManager = context.libraryManager;
  context.forgeManager.libraryManager = context.libraryManager;

  context.relicHuntManager = new RelicHuntManager(context);
  context.achievementManager = new AchievementManager(eventBus, context.hero, context.resourceManager);
  context.dailyRewardManager = new DailyRewardManager(eventBus, context.hero, context.resourceManager);
  context.skillTreeManager = new SkillTreeManager(eventBus, context.hero);
  context.questManager = new QuestManager(eventBus, context.hero, context.resourceManager, context.clanManager);
  context.tutorialManager = new TutorialManager(eventBus, context.hero, context.resourceManager);
  context.craftingManager = new CraftingManager(context);

  // --- PHASE 1 MANAGER ---
  context.audioManager = new AudioManager(eventBus);
  context.cloudSaveManager = new CloudSaveManager(eventBus);
  context.leaderboardManager = new LocalLeaderboard();
  context.transitionManager = new TransitionManager(eventBus);
  context.uiAnimations = new UIAnimations(context);

  // --- PHASE 2 MANAGER ---
  context.storyBranchManager = new StoryBranchManager(eventBus, context.hero);
  context.codexManager = new CodexManager(eventBus, context.hero);

  // Audio initialisieren (nach User-Interaktion)
  document.addEventListener('click', () => {
    if (!context.audioManager.isInitialized) {
      context.audioManager.init();
      context.audioManager.playMusic('menu');
    }
  }, { once: true });

  // --- SAVEGAME REGISTRATION ---
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

  // --- UI INITIALIZATION ---
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

    // --- PREACT RENDERING ---
    const preactRoot = document.getElementById('preact-root');
    if (preactRoot) {
      render(html`<${AchievementUI} context=${context} />`, preactRoot);
    }

    // Event für den "Erfolge" Button im Hub binden
    const openAchBtn = document.getElementById('open-achievements-btn');
    if (openAchBtn) {
      openAchBtn.addEventListener('click', () => {
        eventBus.publish('ui:openAchievements');
      });
    }

    // Hub-Button für Meisterwerkstatt
    const hubCraftingBtn = document.getElementById('hub-crafting');
    if (hubCraftingBtn) {
      hubCraftingBtn.addEventListener('click', () => {
        eventBus.publish(EVENTS.UI_OPEN_CRAFTING);
      });
    }

    // Hub-Button für Leaderboard
    const leaderboardBtn = document.getElementById('hub-leaderboard');
    if (leaderboardBtn) {
      leaderboardBtn.addEventListener('click', () => {
        eventBus.publish(EVENTS.UI_OPEN_LEADERBOARD);
      });
    }

    // Hub-Button für Story-Branching
    const storyBranchBtn = document.getElementById('hub-story-branch');
    if (storyBranchBtn) {
      storyBranchBtn.addEventListener('click', () => {
        eventBus.publish('ui:openDialog', { npcId: 'archivist' });
      });
    }

    // Hub-Button für Codex
    const codexBtn = document.getElementById('hub-codex');
    if (codexBtn) {
      codexBtn.addEventListener('click', () => {
        eventBus.publish('ui:openCodex');
      });
    }

  } catch (e) {
    console.error("Fehler bei der UI-Initialisierung:", e);
  }

  initParticles();

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
  }

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

  // Hero-Updates für Leaderboard
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

  // --- OPTIONEN: AUDIO & CLOUD EVENT LISTENER ---
  // Audio Toggle
  const audioToggleBtn = document.getElementById('opt-audio-toggle');
  if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', () => {
      const muted = context.audioManager.toggleMute();
      audioToggleBtn.textContent = muted ? '🔇 Stumm' : '🔊 Aktiv';
      eventBus.publish(EVENTS.UI_ADD_LOG, { text: muted ? '🔇 Audio stummgeschaltet' : '🔊 Audio aktiviert', type: 'system' });
    });
    if (context.audioManager.isMuted) {
      audioToggleBtn.textContent = '🔇 Stumm';
    }
  }

  // Musik-Lautstärke
  const musicVolumeSlider = document.getElementById('opt-music-volume');
  if (musicVolumeSlider) {
    musicVolumeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value) / 100;
      context.audioManager.setMusicVolume(val);
    });
    musicVolumeSlider.value = context.audioManager.musicVolume * 100;
  }

  // SFX-Lautstärke
  const sfxVolumeSlider = document.getElementById('opt-sfx-volume');
  if (sfxVolumeSlider) {
    sfxVolumeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value) / 100;
      context.audioManager.setSfxVolume(val);
    });
    sfxVolumeSlider.value = context.audioManager.sfxVolume * 100;
  }

  // Cloud-Sync aktivieren
  const cloudEnabledCheck = document.getElementById('opt-cloud-enabled');
  if (cloudEnabledCheck) {
    cloudEnabledCheck.addEventListener('change', (e) => {
      context.cloudSaveManager.setEnabled(e.target.checked);
      eventBus.publish(EVENTS.UI_ADD_LOG, { text: e.target.checked ? '☁️ Cloud-Sync aktiviert' : '☁️ Cloud-Sync deaktiviert', type: 'system' });
      updateCloudLastSync();
    });
    cloudEnabledCheck.checked = context.cloudSaveManager.isCloudEnabled();
  }

  // Cloud manuell synchronisieren
  const cloudSyncBtn = document.getElementById('opt-cloud-sync-btn');
  if (cloudSyncBtn) {
    cloudSyncBtn.addEventListener('click', async () => {
      if (!context.cloudSaveManager.isCloudEnabled()) {
        eventBus.publish(EVENTS.UI_ADD_LOG, { text: '⚠️ Cloud-Sync ist deaktiviert. Bitte zuerst aktivieren.', type: 'system' });
        return;
      }
      cloudSyncBtn.textContent = '⏳ Synchrone...';
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

  function updateCloudLastSync() {
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
  }
  updateCloudLastSync();

  eventBus.subscribe('cloud:synced', updateCloudLastSync);

  // --- OPTIONEN: BESTEHENDE EVENT LISTENER ---
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
      if (confirm('WARNUNG! Möchtest du deinen kompletten Spielstand UNWIDERRUFLICH löschen?')) {
        if (saveTimer) clearInterval(saveTimer);
        if (context.gameLoop.isRunning()) context.gameLoop.stop();
        await SaveGameManager.deleteSaveGame();
        context.cloudSaveManager.clearCloudData();
        context.leaderboardManager.reset();
        location.reload();
      }
    });
  }

  // --- NAVIGATION ---
  async function loadGame() {
    const saveData = await SaveGameManager.loadGame();
    if (!saveData) return false;

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

          document.getElementById('offline-time-val').textContent = formatTime(clampedOfflineMs);

          document.getElementById('offline-particles-val').parentElement.style.display = 'none';
          document.getElementById('offline-relics-val').parentElement.style.display = 'none';
          document.getElementById('offline-artifacts-val').parentElement.style.display = 'none';
          document.getElementById('offline-levels-val').parentElement.innerHTML = `
            <span class="text-muted">Zeitstaub erhalten:</span>
            <span class="text-gold text-bold">${formatTime(clampedOfflineMs)} (4x Speed)</span>
          `;

          document.getElementById('offline-modal-overlay').classList.remove('hidden');
          document.getElementById('offline-modal-overlay').style.display = 'flex';
          const offlineCloseBtn = document.getElementById('offline-close-btn');
          if (offlineCloseBtn) offlineCloseBtn.textContent = 'Zum Hub';
        }
      }

      eventBus.publish(EVENTS.UI_ADD_LOG, { text: `Spielstand geladen!`, type: 'system' });
      startAutosave();
      return true;
    } catch (error) {
      console.error('[LoadGame] Fehler:', error);
      return false;
    }
  }

  function formatTime(ms) {
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
      const success = await loadGame();
      if (success) navController.showHub();
      else alert('Spielstand konnte nicht geladen werden.');
    },
    onNewGame: async (heroName) => {
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
      context.audioManager.fromJSON({});
      context.cloudSaveManager.fromJSON({});
      context.leaderboardManager.fromJSON({});
      context.storyBranchManager.fromJSON({});
      context.codexManager.fromJSON({});

      eventBus.publish(EVENTS.HERO_UPDATED);

      startAutosave();
      navController.showHub();
      context.tutorialManager.start();

      if (context.audioManager.isInitialized) {
        context.audioManager.playMusic('hub');
      }
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
    }
  });

  navElements.btnHubHero.addEventListener('click', () => heroUI.open());
  navElements.btnHubStory.addEventListener('click', () => storyUI.open());
  navElements.btnHubArtifact.addEventListener('click', () => forgeUI.open());
  navElements.btnHubRelic.addEventListener('click', () => relicHuntUI.open());
  navElements.btnHubSkills.addEventListener('click', () => skillTreeUI.open());
  navElements.btnHubChallenges.addEventListener('click', () => challengeUI.open());
  if (navElements.btnHubLibrary) navElements.btnHubLibrary.addEventListener('click', () => libraryUI.open());
  if (navElements.btnHubCrafting) {
    navElements.btnHubCrafting.addEventListener('click', () => {
      eventBus.publish(EVENTS.UI_OPEN_CRAFTING);
    });
  }
  if (navElements.btnHubLeaderboard) {
    navElements.btnHubLeaderboard.addEventListener('click', () => {
      eventBus.publish(EVENTS.UI_OPEN_LEADERBOARD);
    });
  }
  if (navElements.btnHubStoryBranch) {
    navElements.btnHubStoryBranch.addEventListener('click', () => {
      eventBus.publish('ui:openDialog', { npcId: 'archivist' });
    });
  }
  if (navElements.btnHubCodex) {
    navElements.btnHubCodex.addEventListener('click', () => {
      eventBus.publish('ui:openCodex');
    });
  }

  eventBus.subscribe(EVENTS.UI_START_BOSS_FIGHT, () => context.storyManager.startBossFromHub());

  // Codex: Boss-Einträge beim Besiegen freischalten
  eventBus.subscribe(EVENTS.STORY_BOSS_DEFEATED, (data) => {
    if (context.codexManager) {
      // CodexManager hat eigene Event-Listener
    }
  });

  await navController.updateMenuButtons();
  navController.showMenu();
});