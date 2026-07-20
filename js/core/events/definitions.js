/**
 * ============================================================
 * FILE: core/events/definitions.js – Zentrale Event-Definitionen
 * ============================================================
 * 
 * ALLE Events des Spiels als zentrale, unveränderliche Konstanten.
 * ============================================================
 */

export const EVENTS = {
  // ==================== GAME ====================
  GAME_RENDER_TICK: 'game:renderTick',
  GAME_LOGIC_TICK: 'game:logicTick',
  GAME_SLOW_TICK: 'game:slowTick',
  GAME_STATE_CHANGED: 'game:stateChanged',
  GAME_BOOTED: 'game:booted',

  // ==================== HERO ====================
  HERO_UPDATED: 'hero:updated',
  HERO_LEVEL_UP: 'hero:levelUp',
  HERO_PRESTIGE: 'hero:prestige',

  // ==================== RESOURCES ====================
  RESOURCES_UPDATED: 'resources:updated',
  RESOURCES_RESET: 'resources:reset',

  // ==================== CLAN ====================
  CLAN_MEMBERS_UPDATED: 'clan:membersUpdated',
  CLAN_PROGRESS_UPDATED: 'clan:progressUpdated',
  CLAN_MEMBER_LEVEL_UP: 'clan:memberLevelUp',
  CLAN_RECRUIT_MEMBER: 'clan:recruitMember',
  CLAN_RESET: 'clan:reset',

  // ==================== EXPEDITION ====================
  EXPEDITION_STARTED: 'expedition:started',
  EXPEDITION_COMPLETE: 'expedition:complete',

  // ==================== STORY ====================
  STORY_UPDATED: 'story:updated',
  STORY_BOSS_DEFEATED: 'story:bossDefeated',
  STORY_BATTLE_RESULT: 'story:battleResult',
  STORY_BATTLE_STARTED: 'story:battleStarted',
  STORY_BATTLE_ABORTED: 'story:battleAborted',
  STORY_ENDING_REACHED: 'story:endingReached',
  STORY_BRANCH_CHANGED: 'story:branchChanged',
  STORY_BRANCH_RESET: 'story:branchReset',

  // ==================== FORGE ====================
  FORGE_CRAFTED: 'forge:crafted',
  FORGE_UPGRADED: 'forge:upgraded',
  FORGE_SALVAGED: 'forge:salvaged',
  UI_OPEN_FORGE: 'ui:openForge',

  // ==================== CRAFTING ====================
  CRAFTING_MASTERWORK: 'crafting:masterwork',
  UI_OPEN_CRAFTING: 'ui:openCrafting',

  // ==================== ACHIEVEMENTS ====================
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
  ACHIEVEMENT_CLAIMED: 'achievement:claimed',
  UI_OPEN_ACHIEVEMENTS: 'ui:openAchievements',

  // ==================== RELIC HUNT ====================
  RELICHUNT_RESULT: 'relicHunt:result',
  RELICHUNT_COOLDOWN: 'relicHunt:cooldown',
  RELICHUNT_READY: 'relicHunt:ready',
  UI_OPEN_RELICHUNT: 'ui:openRelicHunt',

  // ==================== QUESTS ====================
  QUEST_COMPLETED: 'quest:completed',
  QUEST_UPDATED: 'quest:updated',
  QUEST_CHECK: 'quest:check',
  QUEST_MANUAL_GATHER: 'quest:manualGather',
  UI_REFRESH_QUEST: 'ui:refreshQuestUI',

  // ==================== DAILY ====================
  DAILY_CLAIMED: 'daily:claimed',

  // ==================== LIBRARY ====================
  LIBRARY_UPGRADED: 'library:upgraded',
  UI_OPEN_LIBRARY: 'ui:openLibrary',

  // ==================== SKILLTREE ====================
  SKILLTREE_UNLOCKED: 'skilltree:unlocked',
  UI_OPEN_SKILLTREE: 'ui:openSkillTree',

  // ==================== CHALLENGES ====================
  CHALLENGE_STARTED: 'challenge:started',
  CHALLENGE_ABORTED: 'challenge:aborted',
  CHALLENGE_COMPLETED: 'challenge:completed',
  UI_OPEN_CHALLENGES: 'ui:openChallenges',

  // ==================== CODEX ====================
  CODEX_ENTRY_UNLOCKED: 'codex:entryUnlocked',
  UI_OPEN_CODEX: 'ui:openCodex',

  // ==================== GUILD ====================
  GUILD_CREATED: 'guild:created',
  GUILD_MEMBER_JOINED: 'guild:memberJoined',
  GUILD_MEMBER_LEFT: 'guild:memberLeft',
  GUILD_DELETED: 'guild:deleted',
  GUILD_LEVEL_UP: 'guild:levelUp',
  UI_OPEN_GUILD: 'ui:openGuild',

  // ==================== FRIENDS ====================
  FRIEND_REQUEST_SENT: 'friend:requestSent',
  FRIEND_ACCEPTED: 'friend:accepted',
  FRIEND_REMOVED: 'friend:removed',
  UI_OPEN_FRIENDS: 'ui:openFriends',

  // ==================== CHAT ====================
  CHAT_GLOBAL_MESSAGE: 'chat:globalMessage',
  CHAT_GUILD_MESSAGE: 'chat:guildMessage',
  CHAT_CLEARED: 'chat:cleared',
  UI_OPEN_CHAT: 'ui:openChat',

  // ==================== DIALOG ====================
  UI_OPEN_DIALOG: 'ui:openDialog',

  // ==================== LEADERBOARD ====================
  LEADERBOARD_UPDATED: 'leaderboard:updated',
  LEADERBOARD_CLEARED: 'leaderboard:cleared',
  UI_OPEN_LEADERBOARD: 'ui:openLeaderboard',

  // ==================== NAVIGATION ====================
  UI_OPEN_HERO: 'ui:openHero',
  UI_OPEN_STORY: 'ui:openStory',
  UI_ENTER_GAME: 'ui:enterGame',
  UI_ENTER_HUB: 'ui:enterHub',

  // ==================== SETTINGS ====================
  SETTINGS_UPDATED: 'settings:updated',

  // ==================== SAVE ====================
  SAVE_STARTED: 'save:started',
  SAVE_COMPLETED: 'save:completed',
  SAVE_ERROR: 'save:error',

  // ==================== STATE ====================
  STATE_CHANGED: 'state:changed',
  STATE_RESET: 'state:reset',
  STATE_TIME_TRAVEL: 'state:timeTravel',

  // ==================== COMMANDS ====================
  CMD_SPAWN_FLOAT_TEXT: 'cmd:spawnFloatText',
  CMD_HERO_ADD_BASE_STAT: 'cmd:hero:addBaseStat',
  CMD_FORGE_SALVAGE: 'cmd:forge:salvage',

  // ==================== CLOUD ====================
  CLOUD_SYNCED: 'cloud:synced',
  CLOUD_SYNC_FAILED: 'cloud:syncFailed',
  CLOUD_CLEARED: 'cloud:cleared',
  CLOUD_STATE_CHANGED: 'cloud:stateChanged',

  // ==================== TUTORIAL ====================
  TUTORIAL_STEP: 'tutorial:step',
  TUTORIAL_END: 'tutorial:end',

  // ==================== CATCHUP ====================
  CATCHUP_ENDED: 'catchup:ended'
};

// Tief einfrieren
Object.freeze(EVENTS);

export default EVENTS;