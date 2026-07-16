import { EVENTS } from '../core/events.js';

export default class TutorialManager {
  constructor(eventBus, hero, resourceManager) {
    this.eventBus = eventBus;
    this.hero = hero;
    this.resourceManager = resourceManager;
    
    this.isActive = false;
    this.currentStepIndex = 0;
    this.completed = false;

    this.steps = [
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
        text: 'Der letzte Hüter ist gefallen... doch ein Funke der Erinnerung hat <b>dich</b> erwählt. Du bist der neue Hüter. Es liegt an dir, den Mneme-Bund neu zu gründen und das Archiv zurückzuerobern.',
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
        text: 'Lass uns keine Zeit verlieren. Klicke hier, um die ersten <span style="color:#d4af37;">Mneme-Partikel</span> aus dem Äther zu extrahieren. Sammle 10 Stück!',
        target: '#manual-gather-btn',
        action: 'wait_event',
        eventName: EVENTS.RESOURCES_UPDATED,
        condition: () => this.resourceManager.particles >= 10
      },
      {
        id: 'recruit',
        text: 'Hervorragend! Du bist nicht allein. Mit 10 Partikeln kannst du deinen ersten <span style="color:#9acd9a;">Sammler</span> rekrutieren. Er wird ab sofort automatisch für dich suchen.',
        target: '#recruit-collector',
        action: 'wait_event',
        eventName: EVENTS.CLAN_MEMBERS_UPDATED,
        condition: () => true 
      },
      {
        id: 'quests',
        text: 'Das Archiv wird dich leiten. Hier findest du deine <span style="color:#e0a080;">Missionen</span>. Sie zeigen dir den Weg und gewähren dir Belohnungen.',
        target: '#quest-tracker-btn',
        action: 'next'
      },
      {
        id: 'finish',
        text: '<span style="color:#d4af37; font-weight:bold;">Deine Wache beginnt</span><br><br>Erweitere deinen Bund, rüste dich in der Schmiede aus und besiege die Schatten, die das Archiv besetzt halten. Viel Glück, Hüter.',
        target: null,
        action: 'finish'
      }
    ];
  }

  start() {
    if (this.completed) return;
    this.isActive = true;
    this.currentStepIndex = 0;
    this.eventBus.publish('tutorial:step', this.steps[this.currentStepIndex]);
  }

  nextStep() {
    if (!this.isActive) return;
    this.currentStepIndex++;
    
    if (this.currentStepIndex >= this.steps.length) {
      this.finish();
    } else {
      this.eventBus.publish('tutorial:step', this.steps[this.currentStepIndex]);
    }
  }

  finish() {
    this.isActive = false;
    this.completed = true;
    this.eventBus.publish('tutorial:end');
  }

  toJSON() {
    return { completed: this.completed };
  }

  fromJSON(data) {
    if (data) this.completed = data.completed || false;
  }
}