/**
 * ============================================================
 * FILE: ui/preact/index.js – Preact-UI-Initialisierung
 * ============================================================
 */

import { h, render, Component } from './setup.js';
import { AchievementUI } from './achievement/AchievementUI.js';
import { HeroUI } from './hero/HeroUI.js';
import { StoryUI } from './story/StoryUI.js';
import { ForgeUI } from './forge/ForgeUI.js';
import { CraftingUI } from './crafting/CraftingUI.js';
import { ClanUI } from './clan/ClanUI.js';
import { GuildUI } from './guild/GuildUI.js';
import { ChatUI } from './chat/ChatUI.js';
import { QuestUI } from './quest/QuestUI.js';

export function initPreactUI({ container, stateManager, eventBus, services }) {
  // Root-Komponente
  const App = () => {
    return h('div', { className: 'preact-root-inner' },
      h(AchievementUI, { stateManager, eventBus, services }),
      h(HeroUI, { stateManager, eventBus, services }),
      h(StoryUI, { stateManager, eventBus, services }),
      h(ForgeUI, { stateManager, eventBus, services }),
      h(CraftingUI, { stateManager, eventBus, services }),
      h(ClanUI, { stateManager, eventBus, services }),
      h(GuildUI, { stateManager, eventBus, services }),
      h(ChatUI, { stateManager, eventBus, services }),
      h(QuestUI, { stateManager, eventBus, services })
    );
  };

  render(h(App), container);

  return {
    destroy: () => {
      render(null, container);
    }
  };
}