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

import { LoginView } from './LoginView.js';
import { CharacterSelectView } from './CharacterSelectView.js';
import { AccountModal } from '../account/AccountModal.js';
import { SharedVaultModal } from '../shared/SharedVaultModal.js';

export function MainApp({ stateManager, eventBus, services }) {
  const { i18nService } = services;
  const currentView = useStateSelector(stateManager, (state) => state.system?.currentView || 'intro');
  const [newGameModalOpen, setNewGameModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [newGameName, setNewGameName] = useState('Der Mneme-Bund');

  // i18n Reaktivität
  const [lang, setLang] = useState(i18nService.getLanguage());
  useEffect(() => {
    const unsub = eventBus.subscribe('i18n:languageChanged', (data) => {
      setLang(data.language);
    });
    return () => eventBus.unsubscribe(unsub);
  }, [eventBus]);
  
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    isAlert: false,
    onConfirm: null,
    onCancel: null
  });

  useEffect(() => {
    const showNewGame = () => setNewGameModalOpen(true);
    const hideNewGame = () => setNewGameModalOpen(false);
    const openAccount = () => setAccountModalOpen(true);
    const closeAccount = () => setAccountModalOpen(false);

    const openConfirm = (data) => {
      setConfirmModal({
        isOpen: true,
        title: data.title || (data.isAlert ? (lang === 'de' ? 'HINWEIS' : 'NOTICE') : (lang === 'de' ? 'BESTÄTIGUNG' : 'CONFIRMATION')),
        message: data.message || '',
        isAlert: data.isAlert || false,
        onConfirm: data.onConfirm,
        onCancel: data.onCancel
      });
    };

    const sub1 = eventBus.subscribe('ui:showNewGameModal', showNewGame);
    const sub2 = eventBus.subscribe('ui:hideNewGameModal', hideNewGame);
    const sub3 = eventBus.subscribe('ui:openAccountModal', openAccount);
    const sub4 = eventBus.subscribe('ui:closeAccountModal', closeAccount);
    const sub5 = eventBus.subscribe('ui:openConfirm', openConfirm);
    const sub6 = eventBus.subscribe('ui:openSharedVault', () => setVaultModalOpen(true));

    return () => {
      eventBus.unsubscribe(sub1);
      eventBus.unsubscribe(sub2);
      eventBus.unsubscribe(sub3);
      eventBus.unsubscribe(sub4);
      eventBus.unsubscribe(sub5);
      eventBus.unsubscribe(sub6);
    };
  }, [eventBus, lang]);

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
      case 'login':
        return html`<${LoginView} eventBus=${eventBus} services=${services} />`;
      case 'characterSelect':
        return html`<${CharacterSelectView} eventBus=${eventBus} services=${services} />`;
      case 'menu':
        return html`<${MenuView} eventBus=${eventBus} services=${services} />`;
      case 'options':
        return html`<${OptionsView} stateManager=${stateManager} eventBus=${eventBus} services=${services} />`;
      case 'hub':
        return html`<${HubView} stateManager=${stateManager} eventBus=${eventBus} services=${services} />`;
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

      <!-- ACCOUNT MODAL -->
      <${AccountModal} isOpen=${accountModalOpen} onClose=${() => setAccountModalOpen(false)} eventBus=${eventBus} services=${services} />

      <!-- SHARED ACCOUNT VAULT MODAL -->
      <${SharedVaultModal} isOpen=${vaultModalOpen} onClose=${() => setVaultModalOpen(false)} eventBus=${eventBus} services=${services} />

      <!-- NEUES SPIEL DIALOG -->
      ${newGameModalOpen ? html`
        <div id="new-game-modal-overlay" class="modal-overlay" style="display: flex; z-index: 9999;" role="dialog" aria-label=${lang === 'de' ? 'Neues Spiel' : 'New Game'}>
          <div id="new-game-modal" class="modal-content-small glass-panel">
            <h2 class="glow-text text-gold cinzel text-center">${lang === 'de' ? 'NEUES ARCHIV ÖFFNEN' : 'OPEN NEW ARCHIVE'}</h2>
            <p class="text-muted text-center mb-2">${lang === 'de' ? 'Wie lautet der Name deines Helden?' : "What is your hero's name?"}</p>
            <input type="text" id="new-game-hero-name" class="ui-select w-100 mb-2 text-center text-lg" style="padding: 1rem; color: var(--color-gold);" value=${newGameName} onInput=${(e) => setNewGameName(e.target.value)} autocomplete="off" spellcheck="false" aria-label=${lang === 'de' ? 'Heldenname' : "Hero's Name"} />
            <div class="flex-row gap-md">
              <button id="new-game-cancel-btn" class="glass-btn" style="flex: 1;" type="button" onClick=${handleNewGameCancel}>${lang === 'de' ? 'Abbrechen' : 'Cancel'}</button>
              <button id="new-game-start-btn" class="glass-btn primary" style="flex: 1.5;" type="button" onClick=${handleNewGameStart}>${lang === 'de' ? 'Reise beginnen' : 'Begin Journey'}</button>
            </div>
          </div>
        </div>
      ` : null}

      <!-- SYSTEMEIGENER BESTÄTIGUNGS-MODAL (CUSTOM POPUP) -->
      ${confirmModal.isOpen ? html`
        <div class="modal-overlay" style="display: flex; z-index: 12000;" role="dialog" aria-label=${lang === 'de' ? 'Bestätigung' : 'Confirmation'}>
          <div class="modal-content-small glass-panel" style="width: 450px; text-align: center; max-width: 95vw;">
            <h2 class="glow-text text-gold cinzel text-center" style="margin-bottom: 0.8rem; font-size: 1.4rem;">${confirmModal.title}</h2>
            <div class="glass-inner-panel mb-2" style="padding: 1.2rem; line-height: 1.6; text-align: center; background: rgba(0,0,0,0.3); border-radius: 4px; border: 1px solid rgba(197, 160, 89, 0.15);">
              <span class="text-main" style="font-size: 1rem; color: #e2d5c3; font-family: var(--font-main);">${confirmModal.message}</span>
            </div>
            <div class="flex-row gap-md" style="margin-top: 1rem; width: 100%; display: flex; justify-content: center; gap: 0.8rem;">
              ${!confirmModal.isAlert ? html`
                <button class="glass-btn btn-small" style="flex: 1; padding: 0.8rem 1rem;" onClick=${() => {
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  if (confirmModal.onCancel) confirmModal.onCancel();
                }}>${lang === 'de' ? 'ABBRECHEN' : 'CANCEL'}</button>
              ` : null}
              <button class="glass-btn primary btn-small" style=${confirmModal.isAlert ? "flex: 1; max-width: 200px; padding: 0.8rem 1rem;" : "flex: 1.5; padding: 0.8rem 1rem;"} onClick=${() => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                if (confirmModal.onConfirm) confirmModal.onConfirm();
              }}>OK</button>
            </div>
          </div>
        </div>
      ` : null}
    </div>
  `;
}

export default MainApp;
