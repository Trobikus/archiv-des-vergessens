// ============================================================
// FILE: core/state-integration.js – Brücke zwischen Managern und State
// ============================================================

import { EVENTS } from './events.js';
import { updateHero, updateResources, updateClan, setSavingStatus } from './state-actions.js';

/**
 * Bindet den StateManager an die bestehenden Manager und Events.
 */
export function integrateStateManager(stateManager, context) {
    const { eventBus, hero, resourceManager, clanManager } = context;

    // ---- EVENT-BINDING: Manager-Änderungen -> State ----
    
    eventBus.subscribe(EVENTS.HERO_UPDATED, () => {
        stateManager.dispatch(updateHero(hero.toJSON()));
    });

    eventBus.subscribe(EVENTS.RESOURCES_UPDATED, () => {
        stateManager.dispatch(updateResources(resourceManager.toJSON()));
    });

    eventBus.subscribe(EVENTS.CLAN_MEMBERS_UPDATED, () => {
        stateManager.dispatch(updateClan(clanManager.toJSON()));
    });

    // ---- SAVE-STATE ----
    eventBus.subscribe('save:started', () => {
        stateManager.dispatch(setSavingStatus(true));
    });

    eventBus.subscribe('save:completed', () => {
        stateManager.dispatch(setSavingStatus(false));
    });

    // ---- VIEW-STATE ----
    eventBus.subscribe('ui:enterGame', () => {
        stateManager.dispatch((state) => { state.ui.currentView = 'game'; });
    });

    eventBus.subscribe('ui:enterHub', () => {
        stateManager.dispatch((state) => { state.ui.currentView = 'hub'; });
    });

    // ---- STATE -> MANAGER (Re-Hydration) ----
    // Wird bei loadGameData aufgerufen

    /**
     * Lädt den State aus einem Save in die Manager.
     */
    function hydrateManagers(saveData) {
        if (!saveData) return false;
        
        try {
            if (saveData.hero && hero.fromJSON) {
                hero.fromJSON(saveData.hero);
            }
            if (saveData.resources && resourceManager.fromJSON) {
                resourceManager.fromJSON(saveData.resources);
            }
            if (saveData.clan && clanManager.fromJSON) {
                clanManager.fromJSON(saveData.clan);
            }
            
            // State aktualisieren
            stateManager.sync(hero, resourceManager, clanManager);
            return true;
        } catch (e) {
            console.error('[StateIntegration] Hydration fehlgeschlagen:', e);
            return false;
        }
    }

    return { hydrateManagers };
}