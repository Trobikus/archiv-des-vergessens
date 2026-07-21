// --- START OF FILE data/story_branches.js ---

export const STORY_BRANCHES = {
    // ===== PROLOG =====
    prologue: {
        id: 'prologue',
        title: 'Das Erwachen',
        text: 'Die Dunkelheit hat das Archiv verschlungen. Du erwachst in einer Welt, die vergessen wurde. Ein Flüstern zieht durch die leeren Hallen...',
        options: [
            { id: 'prologue_fight', text: 'Stelle dich dem Schatten!', next: 'chapter1_hero' },
            { id: 'prologue_flee', text: 'Fliehe und lebe...', next: 'chapter1_coward' }
        ],
        flags: { prologue_completed: true }
    },

    // ===== KAPITEL 1 – HELDENWEG =====
    chapter1_hero: {
        id: 'chapter1_hero',
        title: 'Der Heldenweg',
        text: 'Du schreitest mutig voran. Deine Hand ruht auf der Waffe. Der erste Boss erwartet dich – der Verlorene Schatten.',
        options: [
            { id: 'ch1_hero_attack', text: 'Angriff!', next: 'chapter2_hero' },
            { id: 'ch1_hero_parley', text: 'Versuche zu verhandeln...', next: 'chapter2_diplomat' }
        ],
        flags: { hero_path: true },
        bossRequired: 1
    },

    // ===== KAPITEL 1 – FEIGLINGSWEG =====
    chapter1_coward: {
        id: 'chapter1_coward',
        title: 'Der Weg der Schande',
        text: 'Du fliehst. Die Schande verfolgt dich wie ein Schatten. Du findest Unterschlupf in einer verfallenen Bibliothek...',
        options: [
            { id: 'ch1_coward_return', text: 'Kehre zurück und kämpfe', next: 'chapter2_redemption' },
            { id: 'ch1_coward_hide', text: 'Verstecke dich weiter...', next: 'chapter2_hidden' }
        ],
        flags: { coward_path: true }
    },

    // ===== KAPITEL 2 – HERO =====
    chapter2_hero: {
        id: 'chapter2_hero',
        title: 'Der siegreiche Krieger',
        text: 'Du hast den Verlorenen Schatten besiegt! Dein Ruhm eilt dir voraus. Die Mneme-Wächter haben dich bemerkt.',
        options: [
            { id: 'ch2_hero_join', text: 'Tritt den Wächtern bei', next: 'chapter3_guardian' },
            { id: 'ch2_hero_alone', text: 'Gehe deinen eigenen Weg', next: 'chapter3_lone_wolf' }
        ],
        flags: { hero_path: true, boss_defeated_1: true },
        bossRequired: 2
    },

    // ===== KAPITEL 2 – DIPLOMAT =====
    chapter2_diplomat: {
        id: 'chapter2_diplomat',
        title: 'Der Diplomat',
        text: 'Du hast mit dem Schatten verhandelt. Er hat dir ein Geheimnis verraten – die Position der versteckten Archivkammer.',
        options: [
            { id: 'ch2_diplomat_secret', text: 'Suche die Kammer', next: 'chapter3_secrets' },
            { id: 'ch2_diplomat_share', text: 'Teile das Geheimnis mit den Wächtern', next: 'chapter3_guardian' }
        ],
        flags: { diplomat_path: true, secret_known: true }
    },

    // ===== KAPITEL 2 – REDEMPTION =====
    chapter2_redemption: {
        id: 'chapter2_redemption',
        title: 'Die Erlösung',
        text: 'Du hast deine Angst überwunden und kehrst zurück. Die Schatten erkennen deinen neuen Mut an.',
        options: [
            { id: 'ch2_redemption_fight', text: 'Kämpfe für deine Ehre', next: 'chapter3_guardian' }
        ],
        flags: { redemption_path: true }
    },

    // ===== KAPITEL 2 – HIDDEN =====
    chapter2_hidden: {
        id: 'chapter2_hidden',
        title: 'Der Versteckte',
        text: 'Du bleibst im Verborgenen. Die Zeit vergeht. Du findest alte Schriften über die Mneme...',
        options: [
            { id: 'ch2_hidden_study', text: 'Studiere die Schriften', next: 'chapter3_scholar' },
            { id: 'ch2_hidden_emerge', text: 'Tritt aus dem Schatten', next: 'chapter3_lone_wolf' }
        ],
        flags: { hidden_path: true }
    },

    // ===== KAPITEL 3 – GUARDIAN =====
    chapter3_guardian: {
        id: 'chapter3_guardian',
        title: 'Der Mneme-Wächter',
        text: 'Du bist nun ein Wächter des Archivs. Die Last der Erinnerung ruht auf deinen Schultern. Der wahre Feind offenbart sich...',
        options: [
            { id: 'ch3_guardian_fight', text: 'Stelle dich dem Erzfeind', next: 'chapter4_epic' },
            { id: 'ch3_guardian_seal', text: 'Versiegle das Archiv für immer', next: 'chapter4_seal' }
        ],
        flags: { guardian_path: true, boss_defeated_2: true },
        bossRequired: 4
    },

    // ===== KAPITEL 3 – LONE WOLF =====
    chapter3_lone_wolf: {
        id: 'chapter3_lone_wolf',
        title: 'Der Einsame Wolf',
        text: 'Du gehst deinen eigenen Weg. Die Wächter misstrauen dir, aber du hast deine eigene Mission.',
        options: [
            { id: 'ch3_lone_fight', text: 'Konfrontiere die Wächter', next: 'chapter4_rebel' },
            { id: 'ch3_lone_leave', text: 'Verlasse das Archiv für immer', next: 'ending_exile' }
        ],
        flags: { lone_wolf_path: true }
    },

    // ===== KAPITEL 3 – SECRETS =====
    chapter3_secrets: {
        id: 'chapter3_secrets',
        title: 'Die verborgene Kammer',
        text: 'Du hast die Kammer gefunden. Sie enthält die ursprünglichen Mneme – die ersten Erinnerungen der Welt.',
        options: [
            { id: 'ch3_secrets_power', text: 'Nimm die Macht an', next: 'chapter4_god' },
            { id: 'ch3_secrets_destroy', text: 'Zerstöre die Mneme', next: 'ending_void' }
        ],
        flags: { secrets_path: true }
    },

    // ===== KAPITEL 3 – SCHOLAR =====
    chapter3_scholar: {
        id: 'chapter3_scholar',
        title: 'Der Gelehrte',
        text: 'Du hast die Schriften studiert. Du verstehst nun die wahre Natur der Mneme – und die Gefahr, die von ihnen ausgeht.',
        options: [
            { id: 'ch3_scholar_teach', text: 'Lehre die Wächter', next: 'chapter4_guardian' },
            { id: 'ch3_scholar_use', text: 'Nutze das Wissen selbst', next: 'chapter4_god' }
        ],
        flags: { scholar_path: true, knowledge_gained: true }
    },

    // ===== KAPITEL 4 – EPIC =====
    chapter4_epic: {
        id: 'chapter4_epic',
        title: 'Die letzte Schlacht',
        text: 'Der Erzfeind steht vor dir – eine Kreatur aus purem Vergessen. Die finale Konfrontation beginnt.',
        options: [
            { id: 'ch4_epic_win', text: 'Besiege das Vergessen', next: 'ending_victory' },
            { id: 'ch4_epic_sacrifice', text: 'Opfere dich für das Archiv', next: 'ending_sacrifice' }
        ],
        flags: { epic_path: true },
        bossRequired: 10
    },

    // ===== KAPITEL 4 – SEAL =====
    chapter4_seal: {
        id: 'chapter4_seal',
        title: 'Die Versiegelung',
        text: 'Du versiegelst das Archiv für immer. Die Erinnerungen der Welt sind sicher – aber um welchen Preis?',
        options: [
            { id: 'ch4_seal_eternal', text: 'Bleibe als ewiger Wächter', next: 'ending_eternal' }
        ],
        flags: { seal_path: true }
    },

    // ===== KAPITEL 4 – REBEL =====
    chapter4_rebel: {
        id: 'chapter4_rebel',
        title: 'Der Rebell',
        text: 'Du stellst dich den Wächtern. Du kämpfst für die Freiheit der Erinnerung – gegen die Tyrannei des Archivs.',
        options: [
            { id: 'ch4_rebel_victory', text: 'Stürze die Wächter', next: 'ending_rebel' },
            { id: 'ch4_rebel_join', text: 'Ergreife die Kontrolle', next: 'ending_tyrant' }
        ],
        flags: { rebel_path: true }
    },

    // ===== KAPITEL 4 – GOD =====
    chapter4_god: {
        id: 'chapter4_god',
        title: 'Der Mneme-Gott',
        text: 'Du hast die ursprüngliche Macht an dich gerissen. Du bist nun der Hüter aller Erinnerungen – und ihr Herrscher.',
        options: [
            { id: 'ch4_god_rule', text: 'Regiere das Archiv', next: 'ending_ruler' },
            { id: 'ch4_god_free', text: 'Befreie die Erinnerungen', next: 'ending_free' }
        ],
        flags: { god_path: true }
    },

    // ===== ENDEN =====
    ending_victory: {
        id: 'ending_victory',
        title: '🏆 Sieg des Lichts',
        text: 'Du hast das Vergessen besiegt. Die Mneme leuchten heller denn je. Das Archiv lebt – und du bist sein Held.',
        isEnding: true,
        options: []
    },

    ending_sacrifice: {
        id: 'ending_sacrifice',
        title: '🕯️ Das Opfer',
        text: 'Du opferst dich für das Archiv. Die Welt wird sich an dich erinnern – für immer.',
        isEnding: true,
        options: []
    },

    ending_eternal: {
        id: 'ending_eternal',
        title: '⏳ Der ewige Wächter',
        text: 'Du wachst für immer über das Archiv. Die Zeit verliert ihre Bedeutung. Du bist die Erinnerung selbst.',
        isEnding: true,
        options: []
    },

    ending_rebel: {
        id: 'ending_rebel',
        title: '⚔️ Der Befreier',
        text: 'Du hast die Wächter gestürzt. Die Erinnerungen sind frei. Die Welt beginnt neu zu träumen.',
        isEnding: true,
        options: []
    },

    ending_tyrant: {
        id: 'ending_tyrant',
        title: '👑 Der Tyrann',
        text: 'Du hast die Kontrolle über das Archiv übernommen. Die Erinnerungen gehorchen dir nun.',
        isEnding: true,
        options: []
    },

    ending_ruler: {
        id: 'ending_ruler',
        title: '👑 Der Mneme-Herrscher',
        text: 'Du regierst über alle Erinnerungen. Die Welt ist dein Archiv. Du bist unsterblich.',
        isEnding: true,
        options: []
    },

    ending_free: {
        id: 'ending_free',
        title: '🕊️ Die Befreiung',
        text: 'Du hast die Erinnerungen in die Welt zurückgegeben. Die Menschen träumen wieder. Die Dunkelheit weicht.',
        isEnding: true,
        options: []
    },

    ending_exile: {
        id: 'ending_exile',
        title: '🌅 Das Exil',
        text: 'Du verlässt das Archiv und tauchst in eine neue Welt ein. Die Erinnerungen bleiben zurück – aber du bist frei.',
        isEnding: true,
        options: []
    },

    ending_void: {
        id: 'ending_void',
        title: '🌀 Die Leere',
        text: 'Du zerstörst die Mneme. Die Welt vergisst sich selbst. Du bleibst allein in der Leere zurück.',
        isEnding: true,
        options: []
    }
};

// Hilfsfunktion: Knoten nach ID suchen
export function getStoryNode(id) {
    return STORY_BRANCHES[id] || null;
}

// Hilfsfunktion: Prüfen, ob ein Knoten ein Ende ist
export function isEndingNode(id) {
    const node = getStoryNode(id);
    return node ? node.isEnding === true : false;
}