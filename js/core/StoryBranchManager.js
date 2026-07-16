// --- START OF FILE core/StoryBranchManager.js ---

import { STORY_BRANCHES, getStoryNode, isEndingNode } from '../data/story_branches.js';
import { EVENTS } from './events.js';

export default class StoryBranchManager {
    constructor(eventBus, hero) {
        this.eventBus = eventBus;
        this.hero = hero;
        this.currentNodeId = 'prologue';
        this.flags = {};
        this.visitedNodes = [];
        this.branchHistory = [];
        this.endingReached = false;

        // Events abonnieren
        this.eventBus.subscribe(EVENTS.STORY_BOSS_DEFEATED, this._onBossDefeated.bind(this));
        this.eventBus.subscribe(EVENTS.HERO_PRESTIGE, this._onPrestige.bind(this));
    }

    // ---- ÖFFENTLICHE METHODEN ----

    getCurrentNode() {
        return getStoryNode(this.currentNodeId);
    }

    getCurrentNodeId() {
        return this.currentNodeId;
    }

    getFlags() {
        return { ...this.flags };
    }

    getVisitedNodes() {
        return [...this.visitedNodes];
    }

    getBranchHistory() {
        return [...this.branchHistory];
    }

    isEnding() {
        return this.endingReached;
    }

    chooseOption(optionId) {
        const node = this.getCurrentNode();
        if (!node) return { success: false, message: 'Kein aktueller Knoten.' };

        const option = node.options.find(o => o.id === optionId);
        if (!option) return { success: false, message: 'Option nicht gefunden.' };

        // Prüfe Boss-Anforderungen
        if (node.bossRequired && this.hero.bossProgress < node.bossRequired) {
            return { success: false, message: `Du musst zuerst mehr Bosse besiegen (${node.bossRequired} benötigt).` };
        }

        // Flags setzen
        if (node.flags) {
            for (const [key, value] of Object.entries(node.flags)) {
                this.flags[key] = value;
            }
        }

        // Aktion ausführen (z.B. Handel)
        if (option.action) {
            this._executeAction(option.action);
        }

        // Zur nächsten Node wechseln
        const nextNodeId = option.next;
        const nextNode = getStoryNode(nextNodeId);

        if (!nextNode) {
            return { success: false, message: `Zielknoten "${nextNodeId}" nicht gefunden.` };
        }

        // Prüfe, ob Zielknoten Boss-Anforderung hat
        if (nextNode.bossRequired && this.hero.bossProgress < nextNode.bossRequired) {
            return { success: false, message: `Du musst erst mehr Bosse besiegen (${nextNode.bossRequired} benötigt).` };
        }

        // History speichern
        this.branchHistory.push({
            from: this.currentNodeId,
            option: optionId,
            to: nextNodeId,
            timestamp: Date.now()
        });

        this.currentNodeId = nextNodeId;
        this.visitedNodes.push(nextNodeId);

        // Prüfen, ob es ein Ende ist
        if (nextNode.isEnding) {
            this.endingReached = true;
            this.eventBus.publish('story:endingReached', { endingId: nextNodeId, node: nextNode });
        }

        this.eventBus.publish('story:branchChanged', {
            nodeId: this.currentNodeId,
            node: nextNode,
            ending: nextNode.isEnding || false
        });

        return { success: true, node: nextNode };
    }

    resetStory() {
        this.currentNodeId = 'prologue';
        this.flags = {};
        this.visitedNodes = ['prologue'];
        this.branchHistory = [];
        this.endingReached = false;
        this.eventBus.publish('story:branchReset', {});
    }

    // ---- PRIVATE METHODEN ----

    _onBossDefeated(data) {
        // Prüfe, ob der Boss neue Story-Knoten freischaltet
        const bossId = data.boss.id;
        // Automatische Fortschritte können hier eingebaut werden
    }

    _onPrestige() {
        // Optional: Bei Prestige die Story zurücksetzen oder Flags erhalten
    }

    _executeAction(action) {
        switch (action) {
            case 'trade_particles':
                if (this.eventBus) {
                    this.eventBus.publish('story:actionTradeParticles', {});
                }
                break;
            default:
                console.log('[StoryBranch] Unbekannte Aktion:', action);
        }
    }

    // ---- ABFRAGEN ----

    canProgress() {
        const node = this.getCurrentNode();
        if (!node) return false;
        if (node.isEnding) return false;
        if (node.bossRequired && this.hero.bossProgress < node.bossRequired) return false;
        return node.options.length > 0;
    }

    getAvailableOptions() {
        const node = this.getCurrentNode();
        if (!node) return [];
        if (node.isEnding) return [];
        if (node.bossRequired && this.hero.bossProgress < node.bossRequired) return [];

        return node.options;
    }

    getProgress() {
        // Fortschritt: Wie viele Knoten besucht / Gesamt
        const totalNodes = Object.keys(STORY_BRANCHES).length;
        const visited = this.visitedNodes.length;
        return Math.min(100, Math.floor((visited / totalNodes) * 100));
    }

    // ---- SPEICHERN / LADEN ----

    toJSON() {
        return {
            currentNodeId: this.currentNodeId,
            flags: this.flags,
            visitedNodes: this.visitedNodes,
            branchHistory: this.branchHistory,
            endingReached: this.endingReached
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.currentNodeId = data.currentNodeId || 'prologue';
        this.flags = data.flags || {};
        this.visitedNodes = data.visitedNodes || ['prologue'];
        this.branchHistory = data.branchHistory || [];
        this.endingReached = data.endingReached || false;
    }
}