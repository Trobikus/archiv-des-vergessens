// --- START OF FILE data/dialogs.js ---

export const NPCS = {
    // ===== HUB-NPCS =====
    archivist: {
        id: 'archivist',
        name: 'Archivar Theron',
        title: 'Hüter der Schriften',
        portrait: '📜',
        location: 'hub',
        dialogs: [
            {
                id: 'first_meeting',
                text: 'Willkommen, Reisender. Ich bin Theron, der Hüter der Schriften. Das Archiv ist alt und voller Geheimnisse.',
                options: [
                    { text: 'Was ist das Archiv?', next: 'what_is_archive' },
                    { text: 'Ich suche nach einem Weg...', next: 'seeking_path' },
                    { text: 'Ich habe keine Zeit für Geschwafel.', next: 'rude_dismiss' }
                ]
            },
            {
                id: 'what_is_archive',
                text: 'Das Archiv ist der Ort, an dem alle Erinnerungen der Welt aufbewahrt werden. Jede Gedanke, jeder Traum, jedes vergessene Wort – hier lebt es weiter.',
                options: [
                    { text: 'Wie kann ich helfen?', next: 'how_to_help' },
                    { text: 'Das ist zu viel für mich.', next: 'overwhelmed' }
                ]
            },
            {
                id: 'how_to_help',
                text: 'Die Mneme-Partikel sind zerstreut. Sammle sie, und du wirst die Kraft des Archivs wiederherstellen. Beginne mit der Extraktion – der Rest wird sich zeigen.',
                options: [
                    { text: 'Ich verstehe. Danke.', next: 'thank_you' }
                ]
            },
            {
                id: 'seeking_path',
                text: 'Der Weg ist nicht geradlinig. Die Vergangenheit ist ein Labyrinth. Aber wenn du stark genug bist, wirst du die Wahrheit finden.',
                options: [
                    { text: 'Ich bin stark genug.', next: 'how_to_help' },
                    { text: 'Vielleicht hast du recht...', next: 'overwhelmed' }
                ]
            },
            {
                id: 'rude_dismiss',
                text: 'Dann geh. Aber vergiss nicht: Die Dunkelheit wartet auf niemanden.',
                options: [
                    { text: 'Ich... entschuldige.', next: 'first_meeting' }
                ]
            },
            {
                id: 'overwhelmed',
                text: 'Das ist verständlich. Der erste Schritt ist der schwerste. Aber du bist hier – das bedeutet etwas.',
                options: [
                    { text: 'Vielen Dank.', next: 'thank_you' }
                ]
            },
            {
                id: 'thank_you',
                text: 'Möge die Mneme dich leiten, Reisender.',
                isEnding: true,
                options: []
            }
        ],
        defaultDialog: 'first_meeting'
    },

    merchant: {
        id: 'merchant',
        name: 'Händlerin Mira',
        title: 'Die Schattenschmugglerin',
        portrait: '⚗️',
        location: 'hub',
        dialogs: [
            {
                id: 'first_meeting',
                text: 'Ah, ein neues Gesicht! Ich bin Mira. Ich habe... Dinge. Seltene Dinge. Gegen einen kleinen Preis natürlich.',
                options: [
                    { text: 'Was hast du anzubieten?', next: 'offerings' },
                    { text: 'Ich vertraue Schmugglern nicht.', next: 'distrust' },
                    { text: 'Ich suche nach etwas Besonderem.', next: 'special' }
                ]
            },
            {
                id: 'offerings',
                text: 'Alles Mögliche! Von alten Relikten bis zu uralten Schriftrollen. Aber das meiste ist... naja, vergessen. Deshalb bin ich ja hier.',
                options: [
                    { text: 'Ich schaue mich um.', next: 'thank_you' },
                    { text: 'Hast du auch Mneme-Partikel?', next: 'particles_offer' }
                ]
            },
            {
                id: 'particles_offer',
                text: 'Natürlich! Aber die sind teuer. Ich verlang 100 Partikel für 10 extra. Ein fairer Tausch?',
                options: [
                    { text: 'Deal!', next: 'deal_accepted', action: 'trade_particles' },
                    { text: 'Das ist zu viel.', next: 'thank_you' }
                ]
            },
            {
                id: 'deal_accepted',
                text: 'Exzellent! Hier sind deine Relikte. Ich hoffe, sie bringen dir Glück.',
                isEnding: true,
                options: []
            },
            {
                id: 'distrust',
                text: 'Weise Entscheidung. Aber die Wahrheit ist, dass im Archiv alles vergessen wird – sogar meine Herkunft.',
                options: [
                    { text: 'Vielleicht... vertraue ich dir doch.', next: 'offerings' }
                ]
            },
            {
                id: 'special',
                text: 'Etwas Besonderes? Nun... es gibt Gerüchte über eine alte Mneme-Krone. Aber die liegt tief in den verbotenen Kammern.',
                options: [
                    { text: 'Erzähl mir mehr.', next: 'crown_story' },
                    { text: 'Das klingt gefährlich.', next: 'thank_you' }
                ]
            },
            {
                id: 'crown_story',
                text: 'Die Mneme-Krone soll denjenigen, der sie trägt, zum Herrscher über alle Erinnerungen machen. Aber sie ist verflucht – oder gesegnet. Je nachdem, wen du fragst.',
                options: [
                    { text: 'Wo finde ich sie?', next: 'crown_location' },
                    { text: 'Das klingt zu gefährlich.', next: 'thank_you' }
                ]
            },
            {
                id: 'crown_location',
                text: 'In der vergessenen Kammer, tief unter dem Archiv. Aber pass auf – die Wächter dort sind nicht freundlich.',
                isEnding: true,
                options: []
            },
            {
                id: 'thank_you',
                text: 'Komm wieder, wenn du mehr wissen willst. Ich bin immer hier.',
                isEnding: true,
                options: []
            }
        ],
        defaultDialog: 'first_meeting'
    },

    guardian_npc: {
        id: 'guardian_npc',
        name: 'Wächterin Elara',
        title: 'Die eiserne Hüterin',
        portrait: '🛡️',
        location: 'hub',
        dialogs: [
            {
                id: 'first_meeting',
                text: 'Halt! Du betrittst das heilige Archiv. Wer bist du, Sterblicher?',
                options: [
                    { text: 'Ich bin der neue Mneme-Hüter.', next: 'recognition' },
                    { text: 'Ich habe mich verlaufen.', next: 'lost' },
                    { text: 'Das geht dich nichts an.', next: 'hostile' }
                ]
            },
            {
                id: 'recognition',
                text: 'Der Hüter? Dann kennst du die Last der Erinnerung. Willkommen, Bruder. Ich bin Elara, die Hüterin der eisernen Pforten.',
                options: [
                    { text: 'Was bewachst du?', next: 'what_guards' },
                    { text: 'Ich brauche deine Hilfe.', next: 'help_request' }
                ]
            },
            {
                id: 'what_guards',
                text: 'Die Pforten der Vergangenheit. Hinter ihnen liegt die erste Mneme – die Ur-Erinnerung. Sie zu finden, ist das Ziel jedes wahren Hüters.',
                options: [
                    { text: 'Wie komme ich dahin?', next: 'path_to_ancient' },
                    { text: 'Das ist zu gefährlich.', next: 'too_dangerous' }
                ]
            },
            {
                id: 'path_to_ancient',
                text: 'Du musst die sieben Siegel brechen. Jedes Siegel wird von einem Wächter bewacht. Besiege sie, und der Weg öffnet sich.',
                options: [
                    { text: 'Ich werde sie besiegen.', next: 'thank_you' },
                    { text: 'Das klingt unmöglich.', next: 'too_dangerous' }
                ]
            },
            {
                id: 'help_request',
                text: 'Die Wächter der Schatten sind aufgewacht. Sie bedrohen das Archiv. Ich brauche deine Stärke.',
                options: [
                    { text: 'Ich stehe bereit.', next: 'thank_you' },
                    { text: 'Ich bin nicht bereit dafür.', next: 'too_dangerous' }
                ]
            },
            {
                id: 'lost',
                text: 'Verloren? Im Archiv verliert sich jeder irgendwann. Aber vielleicht bist du genau deshalb hier.',
                options: [
                    { text: 'Was meinst du?', next: 'recognition' }
                ]
            },
            {
                id: 'hostile',
                text: 'Dann wirst du gehen – oder ich werde dich zwingen. Das ist deine letzte Warnung.',
                options: [
                    { text: 'Ich gehe.', next: 'thank_you' },
                    { text: 'Ich möchte bleiben.', next: 'recognition' }
                ]
            },
            {
                id: 'too_dangerous',
                text: 'Das ist weise. Nicht jeder ist bereit für die Wahrheit. Komm zurück, wenn du stärker geworden bist.',
                isEnding: true,
                options: []
            },
            {
                id: 'thank_you',
                text: 'Möge die Mneme deine Schritte leiten, Hüter.',
                isEnding: true,
                options: []
            }
        ],
        defaultDialog: 'first_meeting'
    },

    // ===== STORY-NPCS (im Spiel) =====
    shadow_voice: {
        id: 'shadow_voice',
        name: 'Die Stimme des Schattens',
        title: '???',
        portrait: '🌑',
        location: 'story',
        dialogs: [
            {
                id: 'first_encounter',
                text: 'Du bist also der neue Hüter... Wie interessant. Ich habe dich beobachtet, seit du das Archiv betreten hast.',
                options: [
                    { text: 'Wer bist du?', next: 'reveal' },
                    { text: 'Zeig dich!', next: 'reveal' },
                    { text: 'Ich fürchte mich nicht.', next: 'reveal' }
                ]
            },
            {
                id: 'reveal',
                text: 'Ich bin das, was die Mneme erschaffen haben – der Schatten der Erinnerung. Manche nennen mich das Vergessen. Aber ich habe einen Namen: Nyx.',
                options: [
                    { text: 'Was willst du von mir?', next: 'purpose' }
                ]
            },
            {
                id: 'purpose',
                text: 'Ich will das Archiv nicht zerstören. Ich will es befreien. Die Wächter haben die Erinnerungen gefangen genommen. Sie sollten frei sein.',
                options: [
                    { text: 'Ich werde dir helfen.', next: 'ally' },
                    { text: 'Du bist der Feind.', next: 'enemy' }
                ]
            },
            {
                id: 'ally',
                text: 'Dann haben wir einen Pakt. Gehe zu den sieben Siegeln. Brich sie. Befreie die Erinnerungen. Ich werde dich führen.',
                isEnding: true,
                options: []
            },
            {
                id: 'enemy',
                text: 'Schade. Ich hatte gehofft, du würdest verstehen. Aber das Archiv wird fallen – mit oder ohne deine Hilfe.',
                isEnding: true,
                options: []
            }
        ],
        defaultDialog: 'first_encounter'
    }
};

// Hilfsfunktion: NPC nach ID suchen
export function getNPC(id) {
    return NPCS[id] || null;
}

// Hilfsfunktion: Dialog nach NPC und Dialog-ID suchen
export function getDialog(npcId, dialogId) {
    const npc = getNPC(npcId);
    if (!npc) return null;
    return npc.dialogs.find(d => d.id === dialogId) || null;
}