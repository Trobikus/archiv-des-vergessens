/**
 * ============================================================
 * FILE: core/di/service-map.js – Typisierte Service-Registry
 * ============================================================
 *
 * Reine Typdefinitionen (kein Laufzeit-Code, keine Exporte nötig).
 * Verknüpft jeden im DIContainer registrierten String-Key mit
 * seinem konkreten Klassentyp, damit `container.get('key')` den
 * richtigen Typ liefert – und ein Tippfehler im Key beim
 * Type-Check auffällt statt erst zur Laufzeit als
 * "[DI] Dienst ... nicht registriert".
 *
 * WICHTIG: Wird hier ein neuer Dienst in core/di/config.js oder
 * game-boot.js registriert, muss der Key auch hier ergänzt werden.
 * ============================================================
 */

/**
 * @typedef {Object} ServiceMap
 * @property {import('../events/bus.js').default} eventBus
 * @property {import('../state/manager.js').StateManager} stateManager
 * @property {import('../settings.js').default} settingsManager
 * @property {import('../persistence/save-manager.js').default} saveManager
 * @property {import('../persistence/cloud-manager.js').default} cloudManager
 * @property {import('../logger.js').default} logger
 * @property {import('../game/loop.js').default} gameLoop
 * @property {import('../../controllers/navigation.js').default} navigation
 * @property {ReturnType<typeof import('../../ui/dom/index.js').initDOMUI>} domUI
 * @property {ReturnType<typeof import('../../ui/preact/index.js').bootPreactUI>} preactUI
 * @property {import('../services/hero-service.js').default} heroService
 * @property {import('../services/resource-service.js').default} resourceService
 * @property {import('../services/clan-service.js').default} clanService
 * @property {import('../services/story-service.js').default} storyService
 * @property {import('../services/forge-service.js').default} forgeService
 * @property {import('../services/crafting-service.js').default} craftingService
 * @property {import('../services/quest-service.js').default} questService
 * @property {import('../services/achievement-service.js').default} achievementService
 * @property {import('../services/guild-service.js').default} guildService
 * @property {import('../services/friend-service.js').default} friendService
 * @property {import('../services/chat-service.js').default} chatService
 * @property {import('../services/codex-service.js').default} codexService
 * @property {import('../services/relic-hunt-service.js').default} relicHuntService
 * @property {import('../services/daily-reward-service.js').default} dailyRewardService
 * @property {import('../services/leaderboard-service.js').default} leaderboardService
 * @property {import('../services/story-branch-service.js').default} storyBranchService
 * @property {import('../services/skilltree-service.js').default} skillTreeService
 * @property {import('../services/challenge-service.js').default} challengeService
 * @property {import('../services/library-service.js').default} libraryService
 * @property {import('../services/tutorial-service.js').default} tutorialService
 */

export {};
