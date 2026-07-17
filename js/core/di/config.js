/**
 * ============================================================
 * FILE: core/di/config.js – DI-Container Registrierung (VOLLSTÄNDIG)
 * ============================================================
 */

import StateManager from '../state/manager.js';
import HeroService from '../services/hero-service.js';
import ResourceService from '../services/resource-service.js';
import ClanService from '../services/clan-service.js';
import StoryService from '../services/story-service.js';
import ForgeService from '../services/forge-service.js';
import CraftingService from '../services/crafting-service.js';
import QuestService from '../services/quest-service.js';
import AchievementService from '../services/achievement-service.js';
import GuildService from '../services/guild-service.js';
import FriendService from '../services/friend-service.js';
import ChatService from '../services/chat-service.js';
import CodexService from '../services/codex-service.js';
import RelicHuntService from '../services/relic-hunt-service.js';
import DailyRewardService from '../services/daily-reward-service.js';
import LeaderboardService from '../services/leaderboard-service.js';
import StoryBranchService from '../services/story-branch-service.js';
import SkillTreeService from '../services/skilltree-service.js';
import ChallengeService from '../services/challenge-service.js';
import LibraryService from '../services/library-service.js';
import SettingsManager from '../settings.js';
import SaveManager from '../persistence/save-manager.js';
import GameLoop from '../game/loop.js';

export function registerServices(container) {
  // Core
  container.register('stateManager', () => new StateManager(container.get('eventBus')));
  container.register('settingsManager', () => new SettingsManager(container.get('eventBus')));

  // Services
  container.register('heroService', (c) => new HeroService(c.get('stateManager'), c.get('eventBus')));
  container.register('resourceService', (c) => new ResourceService(c.get('stateManager'), c.get('eventBus')));
  container.register('clanService', (c) => new ClanService(c.get('stateManager'), c.get('eventBus'), c.get('resourceService')));
  container.register('storyService', (c) => new StoryService(c.get('stateManager'), c.get('eventBus'), c.get('resourceService'), c.get('heroService')));
  container.register('forgeService', (c) => new ForgeService(c.get('stateManager'), c.get('eventBus'), c.get('resourceService'), c.get('heroService')));
  container.register('craftingService', (c) => new CraftingService(c.get('stateManager'), c.get('eventBus'), c.get('resourceService'), c.get('heroService'), c.get('clanService'), c.get('forgeService')));
  container.register('questService', (c) => new QuestService(c.get('stateManager'), c.get('eventBus'), c.get('resourceService'), c.get('heroService'), c.get('clanService')));
  container.register('achievementService', (c) => new AchievementService(c.get('stateManager'), c.get('eventBus'), c.get('resourceService'), c.get('heroService')));

  // Neue Services
  container.register('guildService', (c) => new GuildService(c.get('stateManager'), c.get('eventBus'), c.get('heroService')));
  container.register('friendService', (c) => new FriendService(c.get('stateManager'), c.get('eventBus'), c.get('heroService')));
  container.register('chatService', (c) => new ChatService(c.get('stateManager'), c.get('eventBus'), c.get('heroService'), c.get('guildService')));
  container.register('codexService', (c) => new CodexService(c.get('stateManager'), c.get('eventBus'), c.get('heroService')));
  container.register('relicHuntService', (c) => new RelicHuntService(c.get('stateManager'), c.get('eventBus'), c.get('resourceService'), c.get('heroService')));
  container.register('dailyRewardService', (c) => new DailyRewardService(c.get('stateManager'), c.get('eventBus'), c.get('resourceService'), c.get('heroService')));
  container.register('leaderboardService', (c) => new LeaderboardService(c.get('stateManager'), c.get('eventBus')));
  container.register('storyBranchService', (c) => new StoryBranchService(c.get('stateManager'), c.get('eventBus'), c.get('heroService')));
  container.register('skillTreeService', (c) => new SkillTreeService(c.get('stateManager'), c.get('eventBus'), c.get('heroService')));
  container.register('challengeService', (c) => new ChallengeService(c.get('stateManager'), c.get('eventBus'), c.get('heroService')));
  container.register('libraryService', (c) => new LibraryService(c.get('stateManager'), c.get('eventBus'), c.get('resourceService')));

  // Persistenz
  container.register('saveManager', () => SaveManager);

  // Game Loop
  container.register('gameLoop', (c) => new GameLoop({
    eventBus: c.get('eventBus'),
    stateManager: c.get('stateManager'),
    services: {
      resourceService: c.get('resourceService'),
      clanService: c.get('clanService'),
      storyService: c.get('storyService')
    }
  }));
}