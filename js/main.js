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

// --- NEU: LEADERBOARD ---
import LocalLeaderboard from './core/LocalLeaderboard.js';

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

// --- NEU: LEADERBOARD UI ---
import LeaderboardUI from './ui/LeaderboardUI.js';

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

  // --- NEU: LEADERBOARD MANAGER ---
  context.leaderboardManager = new LocalLeaderboard();

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
  SaveGameManager.register('leaderboard', context.leaderboardManager); // NEU

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
    new LeaderboardUI(context); // NEU

    // --- PREACT RENDERING ---
    const preactRoot = document.getElementById('preact-root');
    if (preactRoot) {
      render(html`<${AchievementUI} context=${context} />`, preactRoot);
    }

    const openAchBtn = document.getElementById('open-achievements-btn');
    if (openAchBtn) {
      openAchBtn.addEventListener('click', () => {
        eventBus.publish('ui:openAchievements');
      });
    }

    const hubCraftingBtn = document.getElementById('hub-crafting');
    if (hubCraftingBtn) {
      hubCraftingBtn.addEventListener('click', () => {
        eventBus.publish(EVENTS.UI_OPEN_CRAFTING);
      });
    }

    // --- NEU: LEADERBOARD BUTTON ---
    const leaderboardBtn = document.getElementById('hub-leaderboard');
    if (leaderboardBtn) {
      leaderboardBtn.addEventListener('click', () => {
        eventBus.publish(EVENTS.UI_OPEN_LEADERBOARD);
      });
    }

  } catch (e) {
    console.error("Fehler bei der UI-Initialisierung:", e);
  }

  initParticles();

  async function saveGame() {
    if (context.storyManager.battleInProgress) return false;
    return await SaveGameManager.saveGame();
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

  // --- NEU: LEADERBOARD UPDATES ---

  // Bei Boss-Sieg
  eventBus.subscribe(EVENTS.STORY_BOSS_DEFEATED, (data) => {
    if (context.leaderboardManager) {
      const boss = data.boss;
      const chapter = context.hero.getChapter();
      const timeSincePrestige = context.hero._prestigeStartTime
        ? (Date.now() - context.hero._prestigeStartTime) / 1000
        : 0;
      context.leaderboardManager.updateBossDefeated(boss.id, timeSincePrestige, chapter);
    }
  });

  // Bei Prestige
  eventBus.subscribe(EVENTS.HERO_PRESTIGE, (data) => {
    if (context.leaderboardManager) {
      const timeSinceLastPrestige = data.timeSinceLastPrestige || 0;
      context.leaderboardManager.updatePrestige(data.prestigeLevel, timeSinceLastPrestige);
    }
  });

  // Bei Level-Up (wird über hero:updated getriggert)
  let lastLeaderboardLevel = context.hero.level;
  eventBus.subscribe(EVENTS.HERO_UPDATED, () => {
    if (context.leaderboardManager && context.hero.level > lastLeaderboardLevel) {
      const timePerLevel = 0; // Kann später berechnet werden
      context.leaderboardManager.updateHero(context.hero.level, timePerLevel);
      lastLeaderboardLevel = context.hero.level;
    }
  });

  // Bei Crafting
  eventBus.subscribe(EVENTS.CRAFTING_MASTERWORK, (data) => {
    if (context.leaderboardManager && data.quality !== undefined) {
      const level = context.craftingManager ? context.craftingManager.craftingLevel : 0;
      context.leaderboardManager.updateCrafting(level, data.quality, data.quality >= 90);
    }
  });

  // Bei Expedition
  eventBus.subscribe(EVENTS.EXPEDITION_COMPLETE, (data) => {
    if (context.leaderboardManager) {
      context.leaderboardManager.updateExpedition(data.success);
    }
  });

  // Bei Achievements
  eventBus.subscribe(EVENTS.ACHIEVEMENT_UNLOCKED, () => {
    if (context.leaderboardManager && context.achievementManager) {
      const count = context.achievementManager.getAchievements().filter(a => a.achieved).length;
      context.leaderboardManager.updateAchievements(count);
    }
  });

  // Ressourcen-Update für Spitzenwerte (alle 5 Sekunden)
  let lastResourceUpdate = 0;
  eventBus.subscribe(EVENTS.GAME_RENDER_TICK, (data) => {
    if (context.leaderboardManager && context.resourceManager) {
      const now = Date.now();
      if (now - lastResourceUpdate > 5000) {
        const res = context.resourceManager.getResources();
        const ps = res.particles / 5; // Partikel pro Sekunde über 5 Sekunden
        const rs = res.relics / 5;
        context.leaderboardManager.updateResources(ps, rs, res.totalParticles, res.totalRelics);
        lastResourceUpdate = now;
      }
    }
  });

  // Spielzeit
  let playTimeAccumulator = 0;
  eventBus.subscribe(EVENTS.GAME_LOGIC_TICK, (data) => {
    if (context.leaderboardManager && context.gameStateManager.getState() === 'running') {
      playTimeAccumulator += data.delta / 1000;
      if (playTimeAccumulator >= 60) {
        context.leaderboardManager.updatePlayTime(Math.floor(playTimeAccumulator));
        playTimeAccumulator = 0;
      }
    }
  });

  // Session-Count beim ersten Laden
  if (context.leaderboardManager) {
    context.leaderboardManager.incrementSession();
  }

  async function loadGame() {
    const saveData = await SaveGameManager.loadGame();
    if (!saveData) return false;

    try {
      eventBus.publish(EVENTS.HERO_UPDATED);
      eventBus.publish(EVENTS.RESOURCES_UPDATED);
      eventBus.publish(EVENTS.CLAN_MEMBERS_UPDATED, { members: context.clanManager.members });

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
    btnHubLeaderboard: document.getElementById('hub-leaderboard'), // NEU
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
      context.leaderboardManager.fromJSON({}); // NEU

      eventBus.publish(EVENTS.HERO_UPDATED);

      startAutosave();
      navController.showHub();
      context.tutorialManager.start();

      // Leaderboard Session increment
      if (context.leaderboardManager) {
        context.leaderboardManager.incrementSession();
      }
    },
    onHardReset: async () => {
      if (saveTimer) clearInterval(saveTimer);
      if (context.gameLoop.isRunning()) context.gameLoop.stop();
      await SaveGameManager.deleteSaveGame();
      if (context.leaderboardManager) {
        context.leaderboardManager.reset();
      }
      location.reload();
    },
    onGameStart: () => {
      context.achievementManager._checkProgress();
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

  eventBus.subscribe(EVENTS.UI_START_BOSS_FIGHT, () => context.storyManager.startBossFromHub());

  await navController.updateMenuButtons();
  navController.showMenu();
});