/**
 * ============================================================
 * FILE: ui/preact/index.js – Preact-UI-Initialisierung (KOMPLETT)
 * ============================================================
 */

import { h, render } from "preact";
import { HeroUI } from './hero/HeroUI.js';
import { StoryUI } from './story/StoryUI.js';
import { ClanUI } from './clan/ClanUI.js';
import { ForgeUI } from './forge/ForgeUI.js';
import { CraftingUI } from './crafting/CraftingUI.js';
import { QuestUI } from './quest/QuestUI.js'; 
import { AchievementUI } from './achievement/AchievementUI.js';
import { GuildUI } from './guild/GuildUI.js';
import { ChatUI } from './chat/ChatUI.js';
import { DialogUI } from './dialog/DialogUI.js';
import { CodexUI } from './codex/CodexUI.js';
import { LibraryUI } from './library/LibraryUI.js';
import { SkillTreeUI } from './skilltree/SkillTreeUI.js';
import { ChallengeUI } from './challenges/ChallengeUI.js';
import { RelicHuntUI } from './relic/RelicHuntUI.js';
import { LeaderboardUI } from './leaderboard/LeaderboardUI.js';
import { TutorialUI } from './tutorial/TutorialUI.js';
import { ToastManager } from './shared/ToastManager.js';

export function bootPreactUI({ container, stateManager, eventBus, services }) {
  // Root-Komponente – alle UIs werden gerendert (sichtbar via Modals)
  const App = () => {
    return h('div', { className: 'preact-root-inner' },
      h(ToastManager, { eventBus }),
      h(HeroUI, { stateManager, eventBus, services }),
      h(StoryUI, { stateManager, eventBus, services }),
      h(ForgeUI, { stateManager, eventBus, services }),
      h(CraftingUI, { stateManager, eventBus, services }),
      h(QuestUI, { stateManager, eventBus, services }),
      h(AchievementUI, { stateManager, eventBus, services }),
      h(GuildUI, { stateManager, eventBus, services }),
      h(ChatUI, { stateManager, eventBus, services }),
      h(DialogUI, { stateManager, eventBus, services }),
      h(CodexUI, { stateManager, eventBus, services }),
      h(LibraryUI, { stateManager, eventBus, services }),
      h(SkillTreeUI, { stateManager, eventBus, services }),
      h(ChallengeUI, { stateManager, eventBus, services }),
      h(RelicHuntUI, { stateManager, eventBus, services }),
      h(LeaderboardUI, { stateManager, eventBus, services }),
      h(TutorialUI, { stateManager, eventBus, services })
    );
  };

  render(h(App, null), container);

  const clanRoot = document.getElementById('preact-clan-root');
  if (clanRoot) {
    render(h(ClanUI, { stateManager, eventBus, services }), clanRoot);
  }

  return {
    destroy: () => {
      render(null, container);
      if (clanRoot) {
        render(null, clanRoot);
      }
    }
  };
}

export default bootPreactUI;