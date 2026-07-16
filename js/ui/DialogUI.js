// --- START OF FILE ui/DialogUI.js ---

import BaseModalUI from './basemodal.js';
import { getNPC, getDialog } from '../data/dialogs.js';
import { EVENTS } from '../core/events.js';

export default class DialogUI extends BaseModalUI {
    constructor(context) {
        super('dialog-overlay', 'dialog-close');

        this.eventBus = context.eventBus;
        this.storyBranchManager = context.storyBranchManager;
        this.codexManager = context.codexManager;
        this.hero = context.hero;
        this.resourceManager = context.resourceManager;

        this.currentNpcId = null;
        this.currentDialogId = null;
        this.dialogHistory = [];

        // DOM-Elemente
        this.npcNameEl = document.getElementById('dialog-npc-name');
        this.npcTitleEl = document.getElementById('dialog-npc-title');
        this.npcPortraitEl = document.getElementById('dialog-npc-portrait');
        this.dialogTextEl = document.getElementById('dialog-text');
        this.optionsContainer = document.getElementById('dialog-options');

        // Event-Bus abonnieren
        this.eventBus.subscribe('ui:openDialog', (data) => {
            if (data && data.npcId) {
                this.openWithNPC(data.npcId);
            }
        });

        // Close-Event
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }
    }

    openWithNPC(npcId) {
        this.currentNpcId = npcId;
        this.dialogHistory = [];
        const npc = getNPC(npcId);
        if (!npc) {
            console.warn('[DialogUI] NPC nicht gefunden:', npcId);
            return;
        }

        // Ersten Dialog laden
        const firstDialogId = npc.defaultDialog || npc.dialogs[0]?.id;
        if (firstDialogId) {
            this.currentDialogId = firstDialogId;
        }

        this.open();
        this.render();
    }

    onOpen() {
        this.render();
    }

    onClose() {
        this.currentNpcId = null;
        this.currentDialogId = null;
        this.dialogHistory = [];
    }

    render() {
        if (!this.currentNpcId) return;

        const npc = getNPC(this.currentNpcId);
        if (!npc) return;

        // NPC-Info anzeigen
        if (this.npcNameEl) this.npcNameEl.textContent = npc.name;
        if (this.npcTitleEl) this.npcTitleEl.textContent = npc.title || '';
        if (this.npcPortraitEl) this.npcPortraitEl.textContent = npc.portrait || '👤';

        // Dialog laden
        const dialog = getDialog(this.currentNpcId, this.currentDialogId);
        if (!dialog) {
            // Fallback: ersten Dialog laden
            const firstDialog = npc.dialogs[0];
            if (firstDialog) {
                this.currentDialogId = firstDialog.id;
                this.render();
                return;
            }
            return;
        }

        // Text anzeigen
        if (this.dialogTextEl) {
            this.dialogTextEl.innerHTML = dialog.text;
        }

        // Optionen anzeigen
        this.optionsContainer.innerHTML = '';

        if (dialog.isEnding || dialog.options.length === 0) {
            // Schließen-Button
            const closeBtn = document.createElement('button');
            closeBtn.className = 'glass-btn primary w-100';
            closeBtn.textContent = '✕ Schließen';
            closeBtn.addEventListener('click', () => this.close());
            this.optionsContainer.appendChild(closeBtn);
            return;
        }

        for (const option of dialog.options) {
            const btn = document.createElement('button');
            btn.className = 'glass-btn w-100 mb-1';
            btn.textContent = option.text;

            btn.addEventListener('click', () => {
                // Prüfe, ob die Option eine Aktion hat
                if (option.action) {
                    this._executeAction(option.action);
                }

                // Nächsten Dialog laden
                const nextDialogId = option.next;
                if (nextDialogId) {
                    const nextDialog = getDialog(this.currentNpcId, nextDialogId);
                    if (nextDialog) {
                        this.currentDialogId = nextDialogId;
                        this.dialogHistory.push({
                            dialogId: this.currentDialogId,
                            optionText: option.text,
                            timestamp: Date.now()
                        });
                        this.render();

                        // Codex-Einträge durch Dialog freischalten
                        if (this.codexManager) {
                            this.codexManager.unlockFromNPC(this.currentNpcId);
                        }
                        return;
                    }
                }

                // Falls kein nächster Dialog: schließen
                this.close();
            });

            this.optionsContainer.appendChild(btn);
        }
    }

    _executeAction(action) {
        switch (action) {
            case 'trade_particles':
                if (this.resourceManager) {
                    const cost = 100;
                    if (this.resourceManager.particles >= cost) {
                        this.resourceManager.removeParticles(cost);
                        this.resourceManager.addRelics(10);
                        this.eventBus.publish(EVENTS.UI_ADD_LOG, {
                            text: '⚗️ 100 Partikel gegen 10 Relikte getauscht!',
                            type: 'event'
                        });
                    } else {
                        this.eventBus.publish(EVENTS.UI_ADD_LOG, {
                            text: '❌ Nicht genug Partikel für den Tausch.',
                            type: 'system'
                        });
                    }
                }
                break;
            default:
                console.log('[DialogUI] Unbekannte Aktion:', action);
        }
    }

    // Externe Methode: Dialog mit NPC starten
    startDialog(npcId) {
        this.openWithNPC(npcId);
    }

    // Externe Methode: Dialog schließen
    closeDialog() {
        this.close();
    }
}