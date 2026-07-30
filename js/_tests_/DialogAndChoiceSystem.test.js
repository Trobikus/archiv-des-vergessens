import { describe, it, expect, beforeEach, vi } from 'vitest';
import StateManager from '../core/state/manager.js';
import EventBus from '../core/events/bus.js';
import ResourceService from '../core/services/resource-service.js';
import HeroService from '../core/services/hero-service.js';
import CodexService from '../core/services/codex-service.js';
import DialogService from '../core/services/dialog-service.js';
import StoryService from '../core/services/story-service.js';
import { getBossDialogue } from '../data/boss_dialogues.js';

describe('Dialog- & Entscheidungs-System (AAA)', () => {
  let stateManager;
  let eventBus;
  let resourceService;
  let heroService;
  let codexService;
  let dialogService;
  let storyService;

  beforeEach(() => {
    eventBus = new EventBus();
    stateManager = new StateManager(eventBus);
    stateManager.init();

    // Custom state test setup
    stateManager.dispatch((st) => ({
      ...st,
      hero: {
        ...st.hero,
        prestige: {
          ...st.hero.prestige,
          bossProgress: 100,
          defeatedBosses: [10, 20, 30, 40, 95]
        }
      },
      resources: {
        ...st.resources,
        particles: '1000000'
      }
    }), 'test/setup');

    resourceService = new ResourceService(stateManager, eventBus);
    heroService = new HeroService(stateManager, eventBus);
    codexService = new CodexService(stateManager, eventBus, heroService);
    dialogService = new DialogService(stateManager, eventBus, resourceService, heroService, codexService);
    storyService = new StoryService(stateManager, eventBus, resourceService, heroService);
  });

  it('sollte Pfad-sensitive Boss-Dialoge basierend auf Story-Flags auflösen', () => {
    // Normaler Pfad
    const defaultDialogue = getBossDialogue(10, 'intro', {});
    expect(defaultDialogue[0].text).toContain('Wer wagt es, den Asche-Garten zu betreten');

    // Guardian Pfad
    const guardianDialogue = getBossDialogue(10, 'intro', { guardian_path: true });
    expect(guardianDialogue[0].text).toContain('Kreuzritter des Ordens');

    // Scholar Pfad
    const scholarDialogue = getBossDialogue(10, 'intro', { scholar_path: true });
    expect(scholarDialogue[0].text).toContain('verbotener Alchemie');
  });

  it('sollte Lore-Node Entscheidungen verarbeiten, Multiplikatoren vergeben, Codex freischalten & Event feuern', () => {
    const pathChangedSpy = vi.fn();
    eventBus.subscribe('ui:storyPathChanged', pathChangedSpy);

    const result = dialogService.unlockLoreNodeChoice('node_prologue', 'diligence');
    expect(result.success).toBe(true);

    const state = stateManager.getState();
    // 1. Permanent Multipliers
    expect(state.storyBranch.multipliers.expMultiplier).toBe(1.15);

    // 2. Story Flag
    expect(state.storyBranch.flags.scholar_path).toBe(true);

    // 3. Unlocked Lore Nodes
    expect(state.storyBranch.unlockedLoreNodes.node_prologue).toBe('diligence');

    // 4. Codex freigeschaltet
    expect(state.codex.entries['origin_of_mneme']?.unlocked).toBe(true);

    // 5. Visual event fired
    expect(pathChangedSpy).toHaveBeenCalledWith(expect.objectContaining({
      pathFlag: 'scholar_path',
      theme: 'gold'
    }));
  });
});
