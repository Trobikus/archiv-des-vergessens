export const EVENTS = {
    GAME_RENDER_TICK: 'game:renderTick',
    GAME_LOGIC_TICK: 'game:logicTick',
    GAME_STATE_CHANGED: 'game:stateChanged',

    HERO_UPDATED: 'hero:updated',
    HERO_PRESTIGE: 'hero:prestige',

    RESOURCES_UPDATED: 'resources:updated',

    CLAN_MEMBERS_UPDATED: 'clan:membersUpdated',
    CLAN_RECRUIT_MEMBER: 'clan:recruitMember',
    MEMBER_LEVEL_UP: 'member:levelUp',

    EXPEDITION_STARTED: 'expedition:started',
    EXPEDITION_COMPLETE: 'expedition:complete',

    STORY_BATTLE_RESULT: 'story:battleResult',
    STORY_BOSS_DEFEATED: 'story:bossDefeated',
    STORY_UPDATED: 'story:updated',

    FORGE_CRAFTED: 'forge:crafted',

    ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
    ACHIEVEMENT_CLAIMED: 'achievement:claimed',

    RELICHUNT_COOLDOWN: 'relicHunt:cooldown',
    RELICHUNT_READY: 'relicHunt:ready',

    QUEST_COMPLETED: 'quest:completed',
    QUEST_UPDATED: 'quest:updated',
    QUEST_CHECK: 'quest:check',
    QUEST_MANUAL_GATHER: 'quest:manualGather',

    SETTINGS_UPDATED: 'settings:updated',

    TUTORIAL_STEP: 'tutorial:step',
    TUTORIAL_END: 'tutorial:end',

    UI_ADD_LOG: 'ui:addLog',
    UI_MEMBER_CLICKED: 'ui:memberClicked',
    UI_OPEN_HERO: 'ui:openHero',
    UI_OPEN_STORY: 'ui:openStory',
    UI_OPEN_FORGE: 'ui:openForge',
    UI_OPEN_RELICHUNT: 'ui:openRelicHunt',
    UI_OPEN_LIBRARY: 'ui:openLibrary',
    UI_REFRESH_QUEST: 'ui:refreshQuestUI',
    UI_START_BOSS_FIGHT: 'ui:startBossFight',
    UI_ENTER_GAME: 'ui:enterGame', 

    CMD_SPAWN_FLOAT_TEXT: 'cmd:spawnFloatText',
    CMD_HERO_ADD_BASE_STAT: 'cmd:hero:addBaseStat',
    CMD_FORGE_SALVAGE: 'cmd:forge:salvage'
};