// ============================================================
// FILE: core/di-config.js – DI-Container Registrierungen
// ============================================================

import EventBus from './events/EventBus.js';
import SettingsManager from './settings.js';
import GameLoop from './gameloop.js';
import GameStateManager from './gamestate.js';
import Hero from '../models/hero/Hero.js';
import ResourceManager from '../managers/resourcemanager.js';
import ClanManager from '../managers/clanmanager.js';
import ExpeditionManager from '../managers/expedition.js';
import StoryManager from '../managers/story.js';
import ForgeManager from '../managers/forge.js';
import RelicHuntManager from '../managers/relicHunt.js';
import AchievementManager from '../managers/achievements.js';
import DailyRewardManager from '../managers/dailyrewards.js';
import SkillTreeManager from '../managers/skilltree.js';
import ChallengeManager from '../managers/challenges.js';
import QuestManager from '../managers/quests.js';
import TutorialManager from '../managers/tutorial.js';
import LibraryManager from '../managers/library.js';
import CraftingManager from '../managers/crafting.js';
import AudioManager from '../audio/AudioManager.js';
import CloudSaveManager from '../core/CloudSaveManager.js';
import LocalLeaderboard from '../core/LocalLeaderboard.js';
import TransitionManager from '../core/TransitionManager.js';
import UIAnimations from '../ui/animations.js';
import StoryBranchManager from '../core/StoryBranchManager.js';
import CodexManager from '../core/CodexManager.js';
import GuildManager from '../core/GuildManager.js';
import FriendManager from '../core/FriendManager.js';
import ChatManager from '../core/ChatManager.js';

/**
 * Registriert alle Dienste im DI-Container.
 * @param {DIContainer} container – Der DI-Container
 * @param {EventBus} eventBus – Die EventBus-Instanz
 */
export function registerServices(container, eventBus) {
    container.register('eventBus', () => eventBus);
    container.register('settingsManager', () => new SettingsManager(eventBus));
    container.register('gameLoop', (c) => new GameLoop({ 
        eventBus, 
        resourceManager: c.get('resourceManager') 
    }));
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

    container.register('expeditionManager', (c) => 
        new ExpeditionManager(eventBus, c.get('clanManager'), c.get('resourceManager'))
    );
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

    container.register('achievementManager', (c) => 
        new AchievementManager(eventBus, c.get('hero'), c.get('resourceManager'))
    );
    container.register('dailyRewardManager', (c) => 
        new DailyRewardManager(eventBus, c.get('hero'), c.get('resourceManager'))
    );
    container.register('skillTreeManager', (c) => new SkillTreeManager(eventBus, c.get('hero')));
    container.register('questManager', (c) => 
        new QuestManager(eventBus, c.get('hero'), c.get('resourceManager'), c.get('clanManager'))
    );
    container.register('tutorialManager', (c) => 
        new TutorialManager(eventBus, c.get('hero'), c.get('resourceManager'))
    );

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
    container.register('uiAnimations', (c) => 
        new UIAnimations({ eventBus, transitionManager: c.get('transitionManager') })
    );

    container.register('storyBranchManager', (c) => new StoryBranchManager(eventBus, c.get('hero')));
    container.register('codexManager', (c) => new CodexManager(eventBus, c.get('hero')));

    container.register('guildManager', (c) => new GuildManager(eventBus, c.get('hero')));
    container.register('friendManager', (c) => new FriendManager(eventBus, c.get('hero')));
    container.register('chatManager', (c) => 
        new ChatManager(eventBus, c.get('hero'), c.get('guildManager'))
    );
}

/**
 * Erstellt das vollständige Context-Objekt für alle Komponenten.
 */
export function createContext(container) {
    return {
        eventBus: container.get('eventBus'),
        container,
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
}