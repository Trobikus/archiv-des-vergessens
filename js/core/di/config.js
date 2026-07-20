/**
 * ============================================================
 * FILE: core/di/config.js – DI-Container Registrierung (VOLLSTÄNDIG)
 * ============================================================
 */

import SettingsManager from '../settings.js';
import SaveManager from '../persistence/save-manager.js';
import CloudManager from '../persistence/cloud-manager.js';

// Services
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
import TutorialService from '../services/tutorial-service.js';

/**
 * Registriert ALLE Dienste im DI-Container.
 */
export function registerServices(container) {
  // ============================================================
  // CORE
  // ============================================================
  
  // HINWEIS: "stateManager" wird bewusst NICHT hier registriert.
  // game-boot.js erstellt die EINE StateManager-Instanz (inkl. Middleware-Kette)
  // und registriert sie im Container, BEVOR registerServices() aufgerufen wird.
  // Eine zweite Registrierung hier würde eine losgelöste, nie initialisierte
  // Zweit-Instanz erzeugen, die alle Services statt der echten bekämen
  // (führte zu "state is null" / "dispatch vor init()"-Fehlern).
  container.register('settingsManager', () => new SettingsManager(container.get('eventBus')));
  container.register('cloudManager', () => new CloudManager(container.get('eventBus')));

  // ============================================================
  // SERVICES
  // ============================================================
  
  container.register('heroService', (c) => new HeroService(c.get('stateManager'), c.get('eventBus')));
  container.register('resourceService', (c) => new ResourceService(c.get('stateManager'), c.get('eventBus')));
  container.register('clanService', (c) => new ClanService(c.get('stateManager'), c.get('eventBus'), c.get('resourceService')));
  container.register('storyService', (c) => new StoryService(c.get('stateManager'), c.get('eventBus'), c.get('resourceService'), c.get('heroService')));
  container.register('forgeService', (c) => new ForgeService(c.get('stateManager'), c.get('eventBus'), c.get('resourceService'), c.get('heroService')));
  container.register('craftingService', (c) => new CraftingService(c.get('stateManager'), c.get('eventBus'), c.get('resourceService'), c.get('heroService'), c.get('clanService'), c.get('forgeService')));
  container.register('questService', (c) => new QuestService(c.get('stateManager'), c.get('eventBus'), c.get('resourceService'), c.get('heroService'), c.get('clanService')));
  container.register('achievementService', (c) => new AchievementService(c.get('stateManager'), c.get('eventBus'), c.get('resourceService'), c.get('heroService')));
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
  container.register('tutorialService', (c) => new TutorialService(c.get('stateManager'), c.get('eventBus')));

  // ============================================================
  // PERSISTENZ
  // ============================================================
  
  container.register('saveManager', () => SaveManager);

  // ============================================================
  // GAME LOOP
  // ============================================================
  
  // HINWEIS: "gameLoop" wird bewusst NICHT hier registriert.
  // game-boot.js erstellt die GameLoop-Instanz erst NACH der State-Initialisierung
  // (Abschnitt 6) und registriert sie dort selbst. Eine Registrierung hier
  // würde nur eine ungenutzte Zweit-Instanz erzeugen und die Warnung
  // "[DI] Dienst 'gameLoop' wird überschrieben." auslösen.
}

export default registerServices;