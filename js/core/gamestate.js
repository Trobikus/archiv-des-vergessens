// ============================================================
// FILE: js/core/gamestate.js – Spielzustandsverwaltung
// ============================================================
import { EVENTS } from './events.js';

export default class GameStateManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.currentState = 'start';
        this.allowedTransitions = {
            start: ['running'],
            running: ['paused', 'gameover'],
            paused: ['running', 'gameover'],
            gameover: ['start']
        };
    }

    transitionTo(newState) {
        if (!this.allowedTransitions[this.currentState]?.includes(newState)) {
            return false;
        }
        const oldState = this.currentState;
        this.currentState = newState;
        this.eventBus.publish(EVENTS.GAME_STATE_CHANGED, { oldState, newState });
        return true;
    }

    getState() {
        return this.currentState;
    }
}