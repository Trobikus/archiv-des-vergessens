import { EVENTS } from '../core/events.js';

export default class TutorialManager {
  constructor(eventBus, hero, resourceManager) {
    this.eventBus = eventBus;
    this.hero = hero;
    this.resourceManager = resourceManager;

    this.isActive = false;
    this.currentSequence = null;
    this.currentStepIndex = 0;

    // Speichert den Fortschritt der einzelnen Tutorial-Stränge
    this.completed = {
      main: false,
      hero: false,
      story: false
    };

    // Die verschiedenen Tutorial-Abläufe
    this.sequences = {
      main: [
        {
          id: 'intro_1',
          text: '<span style="color:#d4af37; font-size:1.1rem; font-weight:bold;">Das Große Vergessen</span><br><br>Einst bewahrte das <i>Archiv des Vergessens</i> alle Erinnerungen der Welt. Doch die alten Siegel brachen. Eine dunkle Leere hat die Realität verschlungen.',
          target: null,
          action: 'next'
        },
        {
          id: 'intro_2',
          text: 'Die Erinnerungen ganzer Zivilisationen sind in unzählige Fragmente zersplittert – die <span style="color:#d4af37;">Mneme-Partikel</span>. Wenn sie erlöschen, hat die Welt nie existiert.',
          target: null,
          action: 'next'
        },
        {
          id: 'intro_3',
          text: 'Der letzte Hüter ist gefallen... doch ein Funke der Erinnerung hat <b>dich</b> erwählt. Du bist der neue Hüter. Es liegt an dir, den Mneme-Bund neu zu gründen.',
          target: null,
          action: 'next'
        },
        {
          id: 'enter_archive',
          text: 'Deine Reise beginnt hier im Hub. Betritt das <span style="color:#d4af37;">Archiv des Vergessens</span>, um deine Arbeit aufzunehmen.',
          target: '#hub-archive',
          action: 'wait_event',
          eventName: EVENTS.UI_ENTER_GAME,
          condition: () => true
        },
        {
          id: 'gather',
          text: 'Lass uns keine Zeit verlieren. Klicke hier, um <span style="color:#d4af37;">Mneme-Partikel</span> aus dem Äther zu extrahieren. Sammle 10 Stück!',
          target: '#manual-gather-btn',
          action: 'wait_event',
          eventName: EVENTS.RESOURCES_UPDATED,
          condition: () => this.resourceManager.particles >= 10
        },
        {
          id: 'recruit',
          text: 'Hervorragend! Mit 10 Partikeln kannst du einen <span style="color:#9acd9a;">Sammler</span> rekrutieren. Er wird ab sofort automatisch für dich suchen.',
          target: '#recruit-collector',
          action: 'wait_event',
          eventName: EVENTS.CLAN_MEMBERS_UPDATED,
          condition: () => true
        },
        {
          id: 'quests',
          text: 'Hier findest du deine <span style="color:#e0a080;">Missionen</span>. Sie leiten dich und gewähren Belohnungen. Kehre zum Hub zurück und erkunde die anderen Bereiche!',
          target: '#quest-tracker-btn',
          action: 'finish'
        }
      ],

      hero: [
        {
          id: 'hero_1',
          text: '<span style="color:#d4af37; font-size:1.1rem; font-weight:bold;">Dein Held</span><br><br>Hier spiegelt sich deine Macht wider. Mit jeder gewonnenen Erfahrung wächst du.',
          target: '.hero-avatar-panel',
          action: 'next'
        },
        {
          id: 'hero_2',
          text: 'Mit jedem Stufenaufstieg erhältst du <b>Attributspunkte</b>. Investiere sie in Stärke, Zähigkeit, Geschick oder Vitalität.',
          target: '#hero-stats',
          action: 'next'
        },
        {
          id: 'hero_3',
          text: 'Hier findest du Ressourcen, Beute (Loot) und <b>Ausrüstung</b>. Vergiss nicht, gefundene Items anzulegen, bevor du in den Kampf ziehst.',
          target: '.hero-details-panel',
          action: 'finish'
        }
      ],

      story: [
        {
          id: 'story_1',
          text: '<span style="color:#f87171; font-size:1.1rem; font-weight:bold;">Die Schatten</span><br><br>Das Archiv ist von verderbten Wächtern besetzt. Besiege sie, um neue Kapitel freizuschalten.',
          target: '#story-boss-list',
          action: 'next'
        },
        {
          id: 'story_2',
          text: 'Kämpfe laufen deterministisch (mathematisch) ab. Werte deine Attribute und Rüstung auf, wenn du zu schwach bist.',
          target: '#story-current-boss',
          action: 'next'
        },
        {
          id: 'story_3',
          text: 'Bist du bereit? Fordere die Dunkelheit heraus!',
          target: '#story-fight-btn',
          action: 'finish'
        }
      ]
    };

    // Auto-Trigger für Sub-Tutorials, sobald die Menüs geöffnet werden
    this.eventBus.subscribe(EVENTS.UI_OPEN_HERO, () => this.startSequence('hero'));
    this.eventBus.subscribe(EVENTS.UI_OPEN_STORY, () => this.startSequence('story'));
  }

  // Wird vom Main.js beim Start des Spiels aufgerufen
  start() {
    this.startSequence('main');
  }

  startSequence(sequenceId) {
    // Falls diese Sequenz schon beendet ist oder gerade eine andere läuft, abbrechen
    if (this.completed[sequenceId] || this.isActive) return;

    this.isActive = true;
    this.currentSequence = sequenceId;
    this.currentStepIndex = 0;

    this.eventBus.publish('tutorial:step', this.getCurrentStep());
  }

  getCurrentStep() {
    if (!this.isActive || !this.currentSequence) return null;
    return this.sequences[this.currentSequence][this.currentStepIndex];
  }

  nextStep() {
    if (!this.isActive || !this.currentSequence) return;
    this.currentStepIndex++;

    if (this.currentStepIndex >= this.sequences[this.currentSequence].length) {
      this.finish();
    } else {
      this.eventBus.publish('tutorial:step', this.getCurrentStep());
    }
  }

  finish() {
    if (this.currentSequence) {
      this.completed[this.currentSequence] = true;
    }
    this.isActive = false;
    this.currentSequence = null;
    this.eventBus.publish('tutorial:end');
  }

  toJSON() {
    return { completed: this.completed };
  }

  fromJSON(data) {
    if (data && data.completed) {
      // Rückwärtskompatibilität zum alten Savegame (wo completed nur ein Boolean war)
      if (typeof data.completed === 'boolean') {
        this.completed.main = data.completed;
      } else {
        this.completed = { ...this.completed, ...data.completed };
      }
    }
  }
}