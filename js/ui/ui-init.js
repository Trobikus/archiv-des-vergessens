// ============================================================
// FILE: ui/ui-init.js – UI-Initialisierung
// ============================================================

import ClanUI from './clanui.js';
import HeroUI from './heroui.js';
import StoryUI from './storyui.js';
import ForgeUI from './forgeui.js';
import LibraryUI from './libraryui.js';
import ExpeditionUI from './expeditionui.js';
import RecruitmentUI from './recruitmentui.js';
import UIController from './uicontroller.js';
import RelicHuntUI from './relicHuntUI.js';
import SkillTreeUI from './skilltreeui.js';
import ChallengeUI from './challengeui.js';
import QuestUI from './questui.js';
import TutorialUI from './tutorialui.js';
import CraftingUI from './craftingui.js';
import LeaderboardUI from './LeaderboardUI.js';
import DialogUI from './DialogUI.js';
import CodexUI from './CodexUI.js';
import GuildUI from './GuildUI.js';
import FriendUI from './FriendUI.js';
import ChatUI from './ChatUI.js';
import GatherController from '../controllers/gather.js';
import { safeAddEventListener } from './errorHandler.js';
import { EVENTS } from '../core/events.js';

/**
 * Initialisiert alle UI-Komponenten und bindet Event-Listener.
 * @param {object} context – Der Spielkontext
 * @returns {object} – Die initialisierten UI-Instanzen
 */
export function initUI(context) {
    const { eventBus } = context;
    const uiInstances = [];

    console.log('[ui-init] Initialisiere UI-Komponenten...');

    const clanUI = new ClanUI(context);
    uiInstances.push(clanUI);

    const heroUI = new HeroUI(context);
    uiInstances.push(heroUI);

    const storyUI = new StoryUI(context);
    uiInstances.push(storyUI);

    const forgeUI = new ForgeUI(context);
    uiInstances.push(forgeUI);

    const libraryUI = new LibraryUI(context);
    uiInstances.push(libraryUI);

    const expeditionUI = new ExpeditionUI(context);
    uiInstances.push(expeditionUI);

    const recruitmentUI = new RecruitmentUI(context);
    uiInstances.push(recruitmentUI);

    const uiController = new UIController(context);
    uiInstances.push(uiController);

    const relicHuntUI = new RelicHuntUI(context);
    uiInstances.push(relicHuntUI);

    const skillTreeUI = new SkillTreeUI(context);
    uiInstances.push(skillTreeUI);

    const challengeUI = new ChallengeUI(context);
    uiInstances.push(challengeUI);

    const questUI = new QuestUI(context);
    uiInstances.push(questUI);

    const tutorialUI = new TutorialUI(context);
    uiInstances.push(tutorialUI);

    const gatherController = new GatherController(context);
    uiInstances.push(gatherController);

    const craftingUI = new CraftingUI(context);
    uiInstances.push(craftingUI);

    const leaderboardUI = new LeaderboardUI(context);
    uiInstances.push(leaderboardUI);

    const dialogUI = new DialogUI(context);
    uiInstances.push(dialogUI);

    const codexUI = new CodexUI(context);
    uiInstances.push(codexUI);

    const guildUI = new GuildUI(context);
    uiInstances.push(guildUI);

    const friendUI = new FriendUI(context);
    uiInstances.push(friendUI);

    const chatUI = new ChatUI(context);
    uiInstances.push(chatUI);

    console.log('[ui-init] UI-Komponenten erfolgreich initialisiert.');

    // ---- Hub-Button-Listener binden ----
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

    return {
        clanUI,
        heroUI,
        storyUI,
        forgeUI,
        libraryUI,
        expeditionUI,
        recruitmentUI,
        uiController,
        relicHuntUI,
        skillTreeUI,
        challengeUI,
        questUI,
        tutorialUI,
        gatherController,
        craftingUI,
        leaderboardUI,
        dialogUI,
        codexUI,
        guildUI,
        friendUI,
        chatUI,
        uiInstances
    };
}