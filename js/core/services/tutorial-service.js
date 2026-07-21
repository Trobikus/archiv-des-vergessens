/**
 * ============================================================
 * FILE: core/services/tutorial-service.js – Tutorial-Service
 * ============================================================
 */

import StateManager from '../state/manager.js';
import { EVENTS } from '../events/definitions.js';

export class TutorialService {
  /**
   * @param {StateManager} stateManager
   * @param {import('../events/bus.js').default} eventBus
   */
  constructor(stateManager, eventBus) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._currentStepIndex = -1;
    this._isActive = false;

    // State abonnieren für automatischen Start / Wiederaufnahme
    this._stateManager.subscribe((state) => {
      this._checkTutorialState(state);
    });
  }

  _checkTutorialState(state) {
    if (!state || !state.system) return;

    const view = state.system.currentView;
    const isFinished = state.system.tutorialFinished === true;
    const step = state.system.tutorialStep !== undefined ? state.system.tutorialStep : 0;

    // Nur auf Hub oder Game ausführen, wenn nicht beendet
    if (!isFinished && step >= 0 && (view === 'hub' || view === 'game')) {
      if (!this._isActive || this._currentStepIndex !== step) {
        this.startStep(step);
      }
    } else if (isFinished && this._isActive) {
      this._isActive = false;
      this._currentStepIndex = -1;
      this._eventBus.publish('tutorial:end');
    }
  }

  getSteps() {
    return [
      // 1. Epischer Intro-Teil (ohne Targets)
      {
        title: 'Das Erwachen',
        text: 'Die Welten brannten im eisigen Wind des Vergessens. Reiche, Könige, Kriege... all ihre Taten und Errungenschaften wurden aus den Geistern der Sterblichen getilgt. Nur das mystische <b>Archiv des Vergessens</b> steht noch als letzte Bastion des Seins.',
        target: null,
        action: 'next'
      },
      {
        title: 'Die Berufung',
        text: 'Du wurdest auserwählt. Nicht als Krieger des Stahls, sondern als Hüter der verlorenen Mnemes – der kostbaren Erinnerungspartikel, die durch das Nichts treiben. Deine Bestimmung ist es, diese Partikel zu sammeln, um das Archiv wiederaufzubauen.',
        target: null,
        action: 'next'
      },
      {
        title: 'Das Bündnis',
        text: 'Die Last des Bundes ruht nun auf deinen Schultern. Die Schatten breiten sich aus, doch das Licht der Erinnerung darf niemals erlöschen. Tritt ein, Hüter...',
        target: null,
        action: 'next'
      },
      // 2. Interaktive Menüführung
      {
        text: 'Um Erinnerungspartikel zu extrahieren, betreten wir zuerst das Archiv. Klicke auf den Button 📜 <b>Archiv</b>!',
        target: '#hub-archive',
        action: 'click_target'
      },
      {
        text: 'Hier gewinnst du Mneme-Partikel aus den Strömen des Vergessens. Klicke mehrmals auf den großen Button <b>✨ Mneme-Partikel extrahieren ✨</b>, bis du mindestens 50 Partikel gesammelt hast!',
        target: '#manual-gather-btn',
        action: 'wait_event'
      },
      {
        text: 'Ausgezeichnet! Nun kannst du deine Klick-Stärke verbessern. Klicke auf <b>Klick-Stärke verbessern</b> (Kosten: 50 Partikel)!',
        target: '#upgrade-click-btn',
        action: 'click_target'
      },
      {
        title: 'Die Diener des Bundes',
        text: 'Hier kannst du Gefährten anwerben, die automatisch für dich arbeiten:<br/><br/>• <b>Sammler</b> (10 Partikel): Generiert stetig Partikel.<br/>• <b>Weber</b> (25 Partikel): Generiert mehr Partikel, mit der Chance auf Relikte.<br/>• <b>Wächter</b> (40 Partikel): Generiert am meisten Partikel, mit der Chance auf Artefakte.',
        target: '#clan-recruit-panel',
        action: 'next'
      },
      {
        text: 'Gute Arbeit! Lass uns nun zum Hub zurückkehren, um weitere Bereiche deines Reiches zu erkunden. Klicke auf <b>« Zurück zum Hub</b>.',
        target: '#back-to-hub-btn',
        action: 'click_target'
      },
      {
        text: 'Zurück auf dem Hub siehst du verschiedene Menüs. Lass uns deinen Helden inspizieren. Klicke auf 👤 <b>Mein Held</b>!',
        target: '#hub-hero',
        action: 'click_target'
      },
      {
        text: 'Hier siehst du deine Attribute, Ausrüstung und dein Inventar. Mit jedem Level-Up kannst du hier Attributspunkte verteilen. Klicke auf das <b>×</b> oben rechts, um das Menü zu schließen.',
        target: '#hero-close',
        action: 'click_target',
        dialogPosition: 'bottom_center'
      },
      {
        text: 'Als Hüter wirst du dich auch Feinden stellen müssen. Klicke auf 📖 <b>Story & Bosse</b>!',
        target: '#hub-story',
        action: 'click_target'
      },
      {
        text: 'Hier triffst du auf Bosse, die die Erinnerung blockieren. Besiege sie, um neue Kapitel freizuschalten. Klicke auf das <b>×</b> oben rechts, um das Menü zu schließen.',
        target: '#story-close',
        action: 'click_target',
        dialogPosition: 'bottom_center'
      },
      {
        title: 'Der Neubeginn',
        text: 'Hervorragend, du hast die Grundlagen verstanden! Baue deinen Clan auf, rekrutiere Gefährten, schmiede Artefakte und bewahre die Welt vor der ewigen Dunkelheit. Möge die Mneme dich leiten!',
        target: null,
        action: 'finish'
      }
    ];
  }

  startStep(index) {
    const steps = this.getSteps();
    if (index < 0 || index >= steps.length) {
      this.finish();
      return;
    }

    this._isActive = true;
    this._currentStepIndex = index;

    const stepData = steps[index];
    this._eventBus.publish('tutorial:step', stepData);

    this._setupStepHooks(index, stepData);
  }

  _setupStepHooks(index, stepData) {
    // Falls ein Target geklickt werden soll
    if (stepData.target && stepData.action === 'click_target') {
      const checkInterval = setInterval(() => {
        const el = document.querySelector(stepData.target);
        if (el) {
          clearInterval(checkInterval);
          const onClick = () => {
            el.removeEventListener('click', onClick);
            setTimeout(() => {
              if (this._currentStepIndex === index) {
                this.nextStep();
              }
            }, 100);
          };
          el.addEventListener('click', onClick);
        }
      }, 100);
      
      // Sicherheits-Cleanup nach 10 Sekunden
      setTimeout(() => clearInterval(checkInterval), 10000);
    }

    // Spezial-Bedingung für Schritt 4: 50 Partikel sammeln
    if (index === 4) {
      let subId;
      subId = this._stateManager.subscribe((state) => {
        const particles = BigInt(state.resources.particles || '0');
        if (particles >= BigInt(50) && this._currentStepIndex === 4) {
          if (subId !== undefined) {
            this._stateManager.unsubscribe(subId);
          } else {
            setTimeout(() => {
              this._stateManager.unsubscribe(subId);
            }, 0);
          }
          this.nextStep();
        }
      });
    }
  }

  nextStep() {
    const nextIdx = this._currentStepIndex + 1;
    const steps = this.getSteps();
    if (nextIdx >= steps.length) {
      this.finish();
    } else {
      this._stateManager.dispatch((state) => ({
        ...state,
        system: {
          ...state.system,
          tutorialStep: nextIdx
        }
      }), 'tutorial/nextStep');
    }
  }

  finish() {
    this._isActive = false;
    this._currentStepIndex = -1;
    this._stateManager.dispatch((state) => ({
      ...state,
      system: {
        ...state.system,
        tutorialFinished: true,
        tutorialStep: -1
      }
    }), 'tutorial/finish');
    this._eventBus.publish('tutorial:end');
  }
}

export default TutorialService;
