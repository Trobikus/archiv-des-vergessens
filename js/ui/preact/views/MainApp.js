import { h, html, useStateSelector, useState, useEffect } from '../setup.js';
import { IntroView } from './IntroView.js';
import { MenuView } from './MenuView.js';
import { OptionsView } from './OptionsView.js';
import { HubView } from './HubView.js';
import { GameView } from './GameView.js';

// Import all existing Preact UIs
import { ToastManager } from '../shared/ToastManager.js';
import { HeroUI } from '../hero/HeroUI.js';
import { StoryUI } from '../story/StoryUI.js';
import { ForgeUI } from '../forge/ForgeUI.js';
import { CraftingUI } from '../crafting/CraftingUI.js';
import { QuestUI } from '../quest/QuestUI.js';
import { AchievementUI } from '../achievement/AchievementUI.js';
import { GuildUI } from '../guild/GuildUI.js';
import { ChatUI } from '../chat/ChatUI.js';
import { DialogUI } from '../dialog/DialogUI.js';
import { CodexUI } from '../codex/CodexUI.js';
import { LibraryUI } from '../library/LibraryUI.js';
import { SkillTreeUI } from '../skilltree/SkillTreeUI.js';
import { ChallengeUI } from '../challenges/ChallengeUI.js';
import { RelicHuntUI } from '../relic/RelicHuntUI.js';
import { LeaderboardUI } from '../leaderboard/LeaderboardUI.js';
import { TutorialUI } from '../tutorial/TutorialUI.js';
import { FriendsUI } from '../friends/FriendsUI.js';

export function MainApp({ stateManager, eventBus, services }) {
  const currentView = useStateSelector(stateManager, (state) => state.system?.currentView || 'intro');
  const [newGameModalOpen, setNewGameModalOpen] = useState(false);
  const [newGameName, setNewGameName] = useState('Der Mneme-Bund');

  useEffect(() => {
    const showNewGame = () => setNewGameModalOpen(true);
    const hideNewGame = () => setNewGameModalOpen(false);

    eventBus.subscribe('ui:showNewGameModal', showNewGame);
    eventBus.subscribe('ui:hideNewGameModal', hideNewGame);

    return () => {
      // unsubscribing happens automatically on unmount if we use eventBus helper,
      // but since we subscribed manually here, we will just let it be or unsubscribe if needed.
    };
  }, [eventBus]);

  const handleNewGameCancel = () => {
    setNewGameModalOpen(false);
  };

  const handleNewGameStart = () => {
    eventBus.publish('menu:startNewGame', { name: newGameName.trim() });
    setNewGameModalOpen(false);
  };

  const renderActiveView = () => {
    switch (currentView) {
      case 'intro':
        return html`<${IntroView} />`;
      case 'menu':
        return html`<${MenuView} eventBus=${eventBus} services=${services} />`;
      case 'options':
        return html`<${OptionsView} stateManager=${stateManager} eventBus=${eventBus} services=${services} />`;
      case 'hub':
        return html`<${HubView} stateManager=${stateManager} eventBus=${eventBus} />`;
      case 'game':
        return html`<${GameView} stateManager=${stateManager} eventBus=${eventBus} services=${services} />`;
      default:
        return html`<${IntroView} />`;
    }
  };

  return html`
    <div class="preact-root-inner">
      <!-- Active View -->
      ${renderActiveView()}

      <!-- Global Modals & Managers -->
      <${ToastManager} eventBus=${eventBus} />
      <${HeroUI} stateManager=${stateManager} eventBus=${eventBus} services=${services} />
      <${StoryUI} stateManager=${stateManager} eventBus=${eventBus} services=${services} />
      <${ForgeUI} stateManager=${stateManager} eventBus=${eventBus} services=${services} />
      <${CraftingUI} stateManager=${stateManager} eventBus=${eventBus} services=${services} />
      <${QuestUI} stateManager=${stateManager} eventBus=${eventBus} services=${services} />
      <${AchievementUI} stateManager=${stateManager} eventBus=${eventBus} services=${services} />
      <${GuildUI} stateManager=${stateManager} eventBus=${eventBus} services=${services} />
      <${ChatUI} stateManager=${stateManager} eventBus=${eventBus} services=${services} />
      <${DialogUI} stateManager=${stateManager} eventBus=${eventBus} services=${services} />
      <${CodexUI} stateManager=${stateManager} eventBus=${eventBus} services=${services} />
      <${LibraryUI} stateManager=${stateManager} eventBus=${eventBus} services=${services} />
      <${SkillTreeUI} stateManager=${stateManager} eventBus=${eventBus} services=${services} />
      <${ChallengeUI} stateManager=${stateManager} eventBus=${eventBus} services=${services} />
      <${RelicHuntUI} stateManager=${stateManager} eventBus=${eventBus} services=${services} />
      <${LeaderboardUI} stateManager=${stateManager} eventBus=${eventBus} services=${services} />
      <${TutorialUI} stateManager=${stateManager} eventBus=${eventBus} services=${services} />
      <${FriendsUI} stateManager=${stateManager} eventBus=${eventBus} services=${services} />

      <!-- NEUES SPIEL DIALOG -->
      ${newGameModalOpen ? html`
        <div id="new-game-modal-overlay" class="modal-overlay" style="display: flex; z-index: 9999;" role="dialog" aria-label="Neues Spiel">
          <div id="new-game-modal" class="modal-content-small glass-panel">
            <h2 class="glow-text text-gold cinzel text-center">NEUES ARCHIV ÖFFNEN</h2>
            <p class="text-muted text-center mb-2">Wie lautet der Name deines Helden?</p>
            <input type="text" id="new-game-hero-name" class="ui-select w-100 mb-2 text-center text-lg" style="padding: 1rem; color: var(--color-gold);" value=${newGameName} onInput=${(e) => setNewGameName(e.target.value)} autocomplete="off" spellcheck="false" aria-label="Heldenname" />
            <div class="flex-row gap-md">
              <button id="new-game-cancel-btn" class="glass-btn" style="flex: 1;" type="button" onClick=${handleNewGameCancel}>Abbrechen</button>
              <button id="new-game-start-btn" class="glass-btn primary" style="flex: 1.5;" type="button" onClick=${handleNewGameStart}>Reise beginnen</button>
            </div>
          </div>
        </div>
      ` : null}
    </div>
  `;
}

export default MainApp;
