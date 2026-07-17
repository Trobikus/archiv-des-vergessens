// ============================================================
// FILE: js/main.js – AAA-REFACTORED, FEHLERFREI, PERFORMANT
// ============================================================

// --- CORE ---
import EventBus from './core/eventBus.js';
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
import { IntegrityChecker } from './core/security.js';

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

// --- AUDIO, CLOUD, LEADERBOARD ---
import AudioManager from './audio/AudioManager.js';
import CloudSaveManager from './core/CloudSaveManager.js';
import LocalLeaderboard from './core/LocalLeaderboard.js';
import TransitionManager from './core/TransitionManager.js';
import UIAnimations from './ui/animations.js';

// --- STORY, CODEX, COMMUNITY ---
import StoryBranchManager from './core/StoryBranchManager.js';
import CodexManager from './core/CodexManager.js';
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
import LoadingUI from './ui/LoadingUI.js';

// --- PREACT ---
import { html, render } from './ui/preact-setup.js';
import AchievementUI from './ui/achievementui.js';

// --- CONTROLLERS ---
import NavigationController from './controllers/navigation.js';
import GatherController from './controllers/gather.js';

// ---- Globale Referenzen ----
let _globalContext = null;
let _globalUIInstances = [];

// ============================================================
// DOM-READY – EINSTIEGSPUNKT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[main] DOM ready – initializing game...');

    // ============================================================
    // GLOBALE FEHLERBEHANDLUNG
    // ============================================================
    window.addEventListener('error', (e) => {
        console.error('[Global Error]', e.message, e.error?.stack);
        try {
            const toast = new ToastManager();
            toast.show(`⚠️ ${e.message}`, 'error', 6000);
        } catch { /* ignore */ }
    });

    window.addEventListener('unhandledrejection', (e) => {
        console.error('[Unhandled Promise]', e.reason);
        try {
            const toast = new ToastManager();
            toast.show(`⚠️ ${e.reason?.message || 'Unbekannter Fehler'}`, 'error', 6000);
        } catch { /* ignore */ }
    });

    window.addEventListener('beforeunload', async () => {
        try {
            await SaveGameManager.saveGame();
        } catch (error) {
            console.warn('[beforeunload] Save failed:', error);
        }
    });

    // ============================================================
    // LOGGER + EVENTBUS
    // ============================================================
    const logger = new Logger();
    logger.level = 'info';

    const container = new DIContainer();
    container.register('eventBus', () => new EventBus());
    const eventBus = container.get('eventBus');
    logger.setEventBus(eventBus);

    const toastManager = new ToastManager();
    toastManager.setEventBus(eventBus);

    const loadingUI = new LoadingUI();
    eventBus.subscribe('ui:showLoading', (data) => {
        if (data.show) {
            loadingUI.show(data.text || 'Lade...', data.progress || 0);
        } else {
            loadingUI.hide();
        }
    });

    // ============================================================
    // DI-CONTAINER REGISTRIERUNG
    // ============================================================
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

    // ---- Context-Objekt für alle Komponenten ----
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

    _globalContext = context;
    logger.info('Spiel-Bootstrapping gestartet', { version: '1.5' });

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

    // ---- Audio-Context aktivieren ----
    const handleUserGestureAudio = () => {
        const audio = context.audioManager;
        if (!audio.isInitialized) {
            audio.init();
            audio.playMusic('menu');
        }
        document.removeEventListener('click', handleUserGestureAudio);
    };
    document.addEventListener('click', handleUserGestureAudio);

    // ---- SaveGame-Schnittstellen registrieren ----
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

    // ============================================================
    // UI-INITIALISIERUNG
    // ============================================================
    let heroUI, storyUI, forgeUI, libraryUI, relicHuntUI, skillTreeUI, challengeUI;
    let clanUI, expeditionUI, recruitmentUI, uiController, gatherController;
    let questUI, tutorialUI, craftingUI, leaderboardUI, dialogUI, codexUI;
    let guildUI, friendUI, chatUI;

    try {
        console.log('[main] Initialisiere UI-Komponenten...');

        clanUI = new ClanUI(context);
        _globalUIInstances.push(clanUI);

        heroUI = new HeroUI(context);
        _globalUIInstances.push(heroUI);

        storyUI = new StoryUI(context);
        _globalUIInstances.push(storyUI);

        forgeUI = new ForgeUI(context);
        _globalUIInstances.push(forgeUI);

        libraryUI = new LibraryUI(context);
        _globalUIInstances.push(libraryUI);

        expeditionUI = new ExpeditionUI(context);
        _globalUIInstances.push(expeditionUI);

        recruitmentUI = new RecruitmentUI(context);
        _globalUIInstances.push(recruitmentUI);

        uiController = new UIController(context);
        _globalUIInstances.push(uiController);

        relicHuntUI = new RelicHuntUI(context);
        _globalUIInstances.push(relicHuntUI);

        skillTreeUI = new SkillTreeUI(context);
        _globalUIInstances.push(skillTreeUI);

        challengeUI = new ChallengeUI(context);
        _globalUIInstances.push(challengeUI);

        questUI = new QuestUI(context);
        _globalUIInstances.push(questUI);

        tutorialUI = new TutorialUI(context);
        _globalUIInstances.push(tutorialUI);

        gatherController = new GatherController(context);
        _globalUIInstances.push(gatherController);

        craftingUI = new CraftingUI(context);
        _globalUIInstances.push(craftingUI);

        leaderboardUI = new LeaderboardUI(context);
        _globalUIInstances.push(leaderboardUI);

        dialogUI = new DialogUI(context);
        _globalUIInstances.push(dialogUI);

        codexUI = new CodexUI(context);
        _globalUIInstances.push(codexUI);

        guildUI = new GuildUI(context);
        _globalUIInstances.push(guildUI);

        friendUI = new FriendUI(context);
        _globalUIInstances.push(friendUI);

        chatUI = new ChatUI(context);
        _globalUIInstances.push(chatUI);

        console.log('[main] UI-Komponenten erfolgreich initialisiert.');

    } catch (e) {
        console.error('[main] UI-Initialisierung fehlgeschlagen:', e);
        toastManager.show(`⚠️ UI-Fehler: ${e.message}`, 'error', 10000);
        logger.error('Kritischer Fehler bei UI-Initialisierung', { error: e.message, stack: e.stack });
    }

    // ---- Preact Root (Achievements) ----
    try {
        const preactRoot = document.getElementById('preact-root');
        if (preactRoot) {
            render(html`<${AchievementUI} context=${context} />`, preactRoot);
        }
    } catch (e) {
        console.error('[main] Preact-Render Fehler:', e);
    }

    // ---- EVENT-LISTENER FÜR HUB-BUTTONS ----
    const btnHero = document.getElementById('hub-hero');
    const btnStory = document.getElementById('hub-story');

    if (btnHero && heroUI) {
        safeAddEventListener(btnHero, 'click', () => heroUI.open());
    }
    if (btnStory && storyUI) {
        safeAddEventListener(btnStory, 'click', () => storyUI.open());
    }

    safeAddEventListener(document.getElementById('hub-artifact'), 'click', () => {
        if (forgeUI) forgeUI.open();
    });
    safeAddEventListener(document.getElementById('hub-relic'), 'click', () => {
        if (relicHuntUI) relicHuntUI.open();
    });
    safeAddEventListener(document.getElementById('hub-skills'), 'click', () => {
        if (skillTreeUI) skillTreeUI.open();
    });
    safeAddEventListener(document.getElementById('hub-challenges'), 'click', () => {
        if (challengeUI) challengeUI.open();
    });
    safeAddEventListener(document.getElementById('hub-library'), 'click', () => {
        if (libraryUI) libraryUI.open();
    });
    safeAddEventListener(document.getElementById('hub-crafting'), 'click', () => {
        if (craftingUI) craftingUI.open();
    });
    safeAddEventListener(document.getElementById('hub-leaderboard'), 'click', () => {
        if (leaderboardUI) leaderboardUI.open();
    });
    safeAddEventListener(document.getElementById('hub-story-branch'), 'click', () => {
        if (dialogUI) dialogUI.openWithNPC('archivist');
    });
    safeAddEventListener(document.getElementById('hub-codex'), 'click', () => {
        if (codexUI) codexUI.open();
    });
    safeAddEventListener(document.getElementById('hub-guild'), 'click', () => {
        if (guildUI) guildUI.open();
    });
    safeAddEventListener(document.getElementById('hub-friends'), 'click', () => {
        if (friendUI) friendUI.open();
    });
    safeAddEventListener(document.getElementById('hub-chat'), 'click', () => {
        if (chatUI) chatUI.open();
    });
    safeAddEventListener(document.getElementById('open-achievements-btn'), 'click', () => {
        eventBus.publish('ui:openAchievements');
    });

    initParticles();

    // ============================================================
    // SAVE-SYSTEM & AUTOSAVE
    // ============================================================
    let saveTimer = null;
    let isSaving = false;

    async function saveGame() {
        if (isSaving) return false;
        if (context.storyManager.battleInProgress) return false;

        isSaving = true;
        try {
            const result = await SaveGameManager.saveGame();
            if (result && context.cloudSaveManager.isCloudEnabled()) {
                context.cloudSaveManager.sync();
            }
            return result;
        } catch (error) {
            logger.error('Save failed', { error: error.message });
            return false;
        } finally {
            isSaving = false;
        }
    }

    function startAutosave() {
        const interval = parseInt(context.settingsManager.get('autosave'), 10);
        if (saveTimer) clearInterval(saveTimer);
        if (interval > 0) saveTimer = setInterval(() => saveGame(), interval);
        logger.debug('Autosave-Intervall gesetzt', { interval });
    }

    const autoSaveEvents = [
        EVENTS.STORY_BOSS_DEFEATED,
        EVENTS.FORGE_CRAFTED,
        EVENTS.CRAFTING_MASTERWORK,
        EVENTS.HERO_PRESTIGE,
        EVENTS.ACHIEVEMENT_CLAIMED,
        EVENTS.EXPEDITION_STARTED,
        EVENTS.SETTINGS_UPDATED,
        'story:branchChanged',
        'story:endingReached',
        'codex:entryUnlocked',
        'guild:created',
        'guild:memberJoined',
        'guild:memberLeft',
        'guild:deleted',
        'guild:levelUp',
        'friend:accepted',
        'friend:removed'
    ];

    for (const evt of autoSaveEvents) {
        eventBus.subscribe(evt, () => saveGame());
    }

    // ---- Leaderboard-Updates ----
    eventBus.subscribe(EVENTS.HERO_UPDATED, () => {
        if (context.leaderboardManager && typeof context.leaderboardManager.addEntry === 'function') {
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

    // ============================================================
    // LADEN & NAVIGATION
    // ============================================================
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

            // ---- SICHERHEIT: Integritätsprüfung ----
            const errors = IntegrityChecker.checkAll(context);
            if (errors.length > 0) {
                console.warn('[Integrity] Korrupte Daten gefunden:', errors);
                IntegrityChecker.repair(context);
                logger.warn('Integritätsprobleme wurden repariert', { errors });
                toastManager.show('⚠️ Spielstand wurde repariert – einige Werte wurden korrigiert.', 'warning', 5000);
            } else {
                logger.info('Integritätsprüfung bestanden');
            }

            if (context.cloudSaveManager.isCloudEnabled()) {
                context.cloudSaveManager.sync(saveData);
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

                    const offlineOverlay = document.getElementById('offline-modal-overlay');
                    if (offlineOverlay) {
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

            eventBus.publish(EVENTS.UI_ADD_LOG, { text: 'Spielstand erfolgreich geladen!', type: 'system' });
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

    // ---- OPTIONEN ----
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

    // ---- NAVIGATION ----
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
                toastManager.show('⚠️ Der lokale Spielstand konnte nicht geladen werden.', 'error', 6000);
                navController.updateMenuButtons();
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

            // Spielstand löschen
            await SaveGameManager.deleteSaveGame();
            context.cloudSaveManager.clearCloudData();
            context.leaderboardManager.reset();

            // UI-Instanzen bereinigen
            for (const instance of _globalUIInstances) {
                if (instance && typeof instance.destroy === 'function') {
                    try { instance.destroy(); } catch (e) { /* ignore */ }
                }
            }
            _globalUIInstances = [];
            if (toastManager && typeof toastManager.destroy === 'function') toastManager.destroy();
            if (loadingUI && typeof loadingUI.destroy === 'function') loadingUI.destroy();

            // Button-Status sofort aktualisieren
            await navController.updateMenuButtons();

            // Seite neu laden, um alle Zustände zurückzusetzen
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

    // Menü-Buttons initial aktualisieren und Menü anzeigen
    await navController.updateMenuButtons();
    navController.showMenu();

    // ============================================================
    // HUB TABS
    // ============================================================
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

    // ============================================================
    // HUB PLAYER INFO
    // ============================================================
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

    // ============================================================
    // QUEST INDICATOR
    // ============================================================
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

    // ============================================================
    // GLOBAL CLEANUP
    // ============================================================
    window.cleanupApp = function cleanupApp() {
        logger.info('App-Cleanup wird durchgeführt...');
        if (context.gameLoop.isRunning()) context.gameLoop.stop();
        if (saveTimer) { clearInterval(saveTimer); saveTimer = null; }
        floatTextPool.destroy();
        for (const instance of _globalUIInstances) {
            if (instance && typeof instance.destroy === 'function') {
                try { instance.destroy(); } catch (e) { /* ignore */ }
            }
        }
        _globalUIInstances = [];
        if (toastManager && typeof toastManager.destroy === 'function') toastManager.destroy();
        if (loadingUI && typeof loadingUI.destroy === 'function') loadingUI.destroy();
        if (eventBus && typeof eventBus.clear === 'function') eventBus.clear();
        SaveGameManager.destroy();
        if (container && typeof container.clear === 'function') container.clear();
        logger.info('App-Cleanup abgeschlossen');
    };

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && context.gameLoop.isRunning()) {
            saveGame();
        }
    });

    logger.info('Bootstrapping abgeschlossen – Spiel bereit');
    console.log('[main] Bootstrapping abgeschlossen.');
});