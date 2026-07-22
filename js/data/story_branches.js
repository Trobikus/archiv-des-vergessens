// --- START OF FILE data/story_branches.js ---

export const STORY_BRANCHES = {
    // ===== PROLOG =====
    prologue: {
        id: 'prologue',
        title: 'Das Erwachen der Asche',
        text: 'Die Dunkelheit hat das Letzte Archiv verschlungen. Du erwachst auf einem endlosen Feld aus weißem Staub. Über dir erstreckt sich kein Himmel, sondern ein bodenloser schwarzer Schlund, in dem riesige, brennende Pergamente wie Kometen verglühen. Ein kaltes, drängendes Flüstern zieht durch die leeren Hallen und rüttelt an deinem Verstand...',
        options: [
            { id: 'prologue_fight', text: 'Zieh deine Klinge aus gefrorenem Licht und stelle dich dem gefräßigen Schatten!', next: 'chapter1_hero' },
            { id: 'prologue_flee', text: 'Weiche zurück, flüchte in das Labyrinth der schwebenden Buchregale und überlebe...', next: 'chapter1_coward' }
        ],
        flags: { prologue_completed: true }
    },

    // ===== KAPITEL 1 – HELDENWEG =====
    chapter1_hero: {
        id: 'chapter1_hero',
        title: 'Der beschwerliche Heldenweg',
        text: 'Du schreitest mutig voran, während glitzernde Asche wie Schnee auf deine Schultern rieselt. Deine Hand ruht fest auf dem Knauf deines Schwertes. Die Luft knistert vor geladener Lethe-Energie. Vor dir materialisiert sich die erste Barriere – Malakor, der Erste Hüter, nun ein riesiges, verzerrendes Echo aus Obsidian und verlorenem Stolz. Er fordert deinen Geist heraus.',
        options: [
            { id: 'ch1_hero_attack', text: 'Gehe zum Frontalangriff über und zerschmettere den Schatten!', next: 'chapter2_hero' },
            { id: 'ch1_hero_parley', text: 'Senke die Waffe und versuche, die leidende Seele hinter der Bestie anzusprechen...', next: 'chapter2_diplomat' }
        ],
        flags: { hero_path: true },
        bossRequired: 1
    },

    // ===== KAPITEL 1 – FEIGLINGSWEG =====
    chapter1_coward: {
        id: 'chapter1_coward',
        title: 'Der Pfad des schattigen Exils',
        text: 'Du hast dich für die Flucht entschieden. Die Kälte deiner Furcht haftet an dir wie eine zweite Haut. Doch im Labyrinth der verlassenen Bibliotheken bist du nicht allein; die verwitterten Folianten flüstern dir vergessene Geheimnisse der Schöpfung zu. Du findest Unterschlupf in den staubigen Trümmern des Sanktuariums...',
        options: [
            { id: 'ch1_coward_return', text: 'Überwinde deine Angst, kehre um und stelle dich der Dunkelheit', next: 'chapter2_redemption' },
            { id: 'ch1_coward_hide', text: 'Vergrabe dich tiefer in den verbotenen Schriften und studiere die verbotene Magie...', next: 'chapter2_hidden' }
        ],
        flags: { coward_path: true }
    },

    // ===== KAPITEL 2 – HERO =====
    chapter2_hero: {
        id: 'chapter2_hero',
        title: 'Der siegreiche Champion',
        text: 'Malakors obsidianene Form birst in tausend funkelnde Glasscherben! Ein Schwall reiner, goldener Mneme-Energie flutet deine Adern und stärkt deinen Geist. Dein Triumph hallt durch die metaphysischen Gänge. Der Eiserne Orden des Archivs hat deine Taten registriert und blickt mit Ehrfurcht auf dich.',
        options: [
            { id: 'ch2_hero_join', text: 'Schwöre den Hütern die Treue und schütze die verbliebenen Schriften', next: 'chapter3_guardian' },
            { id: 'ch2_hero_alone', text: 'Lehne die Fesseln ihrer Dogmen ab und gehe deinen eigenen, ungebundenen Weg', next: 'chapter3_lone_wolf' }
        ],
        flags: { hero_path: true, boss_defeated_1: true },
        bossRequired: 2
    },

    // ===== KAPITEL 2 – DIPLOMAT =====
    chapter2_diplomat: {
        id: 'chapter2_diplomat',
        title: 'Der Seelenflüsterer',
        text: 'Deine Worte durchdringen den Panzer aus Lethe-Zorn. Ein trauriges Seufzen entweicht dem Boss, bevor er sich auflöst. Zum Dank überlässt er dir ein uraltes Geheimnis: die Koordinaten der versiegelten Archivkammer, in der die unberührten Erinnerungen der ersten Epoche ruhen.',
        options: [
            { id: 'ch2_diplomat_secret', text: 'Begib dich auf die Suche nach dieser geheimen Kammer der Ersten', next: 'chapter3_secrets' },
            { id: 'ch2_diplomat_share', text: 'Teile das gewonnene Geheimnis mit den misstrauischen Wächtern', next: 'chapter3_guardian' }
        ],
        flags: { diplomat_path: true, secret_known: true }
    },

    // ===== KAPITEL 2 – REDEMPTION =====
    chapter2_redemption: {
        id: 'chapter2_redemption',
        title: 'Die schmerzhafte Erlösung',
        text: 'Du bist zurückgekehrt. Der bittere Geschmack der Feigheit ist einer unbändigen Entschlossenheit gewichen. Die Wächter des Eisernen Ordens mustern dich kühl, doch sie erkennen den geläuterten Glanz in deinen Augen an. Deine Zerreißprobe steht kurz bevor.',
        options: [
            { id: 'ch2_redemption_fight', text: 'Wirf dich in den nächsten Bosskampf, um deine wiedergefundene Ehre reinzuwaschen!', next: 'chapter3_guardian' }
        ],
        flags: { redemption_path: true }
    },

    // ===== KAPITEL 2 – HIDDEN =====
    chapter2_hidden: {
        id: 'chapter2_hidden',
        title: 'Der lautlose Schattenwandler',
        text: 'Du bleibst in der Finsternis verborgen. Die Zeit im Archiv verliert jede Bedeutung, während du tiefer in die verbotene Alchemie der Lethe eintauchst. In den staubigen Regalen entzifferst du alte, verbotene Formeln, die das Wesen des Vergessens beschreiben...',
        options: [
            { id: 'ch2_hidden_study', text: 'Studiere die Schriften der Schatten und meistere die Kräfte der Lethe-Asche', next: 'chapter3_scholar' },
            { id: 'ch2_hidden_emerge', text: 'Tritt endlich aus dem schützenden Schatten und konfrontiere das Schicksal auf eigene Faust', next: 'chapter3_lone_wolf' }
        ],
        flags: { hidden_path: true }
    },

    // ===== KAPITEL 3 – GUARDIAN =====
    chapter3_guardian: {
        id: 'chapter3_guardian',
        title: 'Der Mneme-Kreuzritter',
        text: 'Du hast das goldene Wappen des Bundes angelegt. Die unermessliche Last aller menschlichen Erinnerungen drückt auf deine Schultern. Du erkennst die tragische Wahrheit: Um die Welt vor dem Einsturz zu bewahren, sperrt der Orden jede lebendige Erinnerung in kalte Vitrinen. Der wahre Feind offenbart sich...',
        options: [
            { id: 'ch3_guardian_fight', text: 'Stelle dich der heraufziehenden Flut und vernichte das Vergessen', next: 'chapter4_epic' },
            { id: 'ch3_guardian_seal', text: 'Versiegle das gesamte Archiv für immer und konserviere den Status quo in Stasis', next: 'chapter4_seal' }
        ],
        flags: { guardian_path: true, boss_defeated_2: true },
        bossRequired: 4
    },

    // ===== KAPITEL 3 – LONE WOLF =====
    chapter3_lone_wolf: {
        id: 'chapter3_lone_wolf',
        title: 'Der einsame Wegbereiter',
        text: 'Du weigerst dich, dich den Fesseln des Bundes oder dem verlockenden Flüstern der Schatten zu beugen. Die Wächter betrachten dich als Bedrohung und Ketzer, doch du trägst die Flamme der freien Mneme in dir. Deine Reise führt dich an die Grenzen der bekannten Existenz.',
        options: [
            { id: 'ch3_lone_fight', text: 'Konfrontiere den tyrannischen Orden der Wächter und erkämpfe die Freiheit des Geistes', next: 'chapter4_rebel' },
            { id: 'ch3_lone_leave', text: 'Verlasse das verfallende Archiv und wandere hinaus in die ungeschriebene Leere des Kosmos', next: 'ending_exile' }
        ],
        flags: { lone_wolf_path: true }
    },

    // ===== KAPITEL 3 – SECRETS =====
    chapter3_secrets: {
        id: 'chapter3_secrets',
        title: 'Das Allerheiligste der Ersten',
        text: 'Die verborgene Pforte schwingt auf. Vor dir erstreckt sich eine endlose, strahlende Kammer, erfüllt von flüssigem Gold – die Aethel-Mneme, die allererste, reine Erinnerung an die Schöpfung der Welt. Ein unbeschreiblicher Friede geht von ihr aus.',
        options: [
            { id: 'ch3_secrets_power', text: 'Nimm diese göttliche Macht in dich auf und werde zum alleinigen Architekten der Realität', next: 'chapter4_god' },
            { id: 'ch3_secrets_destroy', text: 'Zerstöre das goldene Becken, um den unnatürlichen Kreislauf der unendlichen Stasis zu brechen', next: 'ending_void' }
        ],
        flags: { secrets_path: true }
    },

    // ===== KAPITEL 3 – SCHOLAR =====
    chapter3_scholar: {
        id: 'chapter3_scholar',
        title: 'Der dunkle Gelehrte',
        text: 'Durch deine Studien hast du die paradoxe Natur der Realität verstanden: Mneme und Lethe sind zwei Seiten derselben Medaille. Es kann keine neue Schöpfung geben, ohne dass das Alte vergeht. Doch die Wächter weigern sich, diese Wahrheit zu akzeptieren.',
        options: [
            { id: 'ch3_scholar_teach', text: 'Kehre zum Orden zurück und versuche, die Wächter mit deinem Wissen zu bekehren', next: 'chapter4_guardian' },
            { id: 'ch3_scholar_use', text: 'Nutze die dunkle Alchemie, um die Realität nach deinen eigenen Vorstellungen neu zu schmieden', next: 'chapter4_god' }
        ],
        flags: { scholar_path: true, knowledge_gained: true }
    },

    // ===== KAPITEL 4 – EPIC =====
    chapter4_epic: {
        id: 'chapter4_epic',
        title: 'Die finale Götterdämmerung',
        text: 'Der Abgrund öffnet sich vollständig. Vor dir ragt die Verkörperung des Vergessens empor – ein riesiger, formloser Titan aus reinem Lethe-Mahlstrom. Alle verlorenen Epochen schreien in seinem Inneren nach Erlösung. Das Schicksal des gesamten Universums entscheidet sich in diesem Moment.',
        options: [
            { id: 'ch4_epic_win', text: 'Setze alles auf eine Karte, besiege das Vergessen und rette das Archiv!', next: 'ending_victory' },
            { id: 'ch4_epic_sacrifice', text: 'Opfere deinen eigenen Verstand und deine Mneme, um den Abgrund in dir selbst zu versiegeln', next: 'ending_sacrifice' }
        ],
        flags: { epic_path: true },
        bossRequired: 10
    },

    // ===== KAPITEL 4 – SEAL =====
    chapter4_seal: {
        id: 'chapter4_seal',
        title: 'Die Ewige Konservierung',
        text: 'Du hast dich entschieden, das Archiv abzuriegeln. Unter lautem Getöse schließen sich die gigantischen Steintore des Turms der Ewigkeit. Die Lethe bleibt draußen, die wertvollen Erinnerungen drinnen. Doch es ist eine Welt ohne Morgen – eine unendliche, museale Schleife.',
        options: [
            { id: 'ch4_seal_eternal', text: 'Nimm Platz auf dem Thron der Stasis und wache bis ans Ende aller Zeiten über die leblose Pracht', next: 'ending_eternal' }
        ],
        flags: { seal_path: true }
    },

    // ===== KAPITEL 4 – REBEL =====
    chapter4_rebel: {
        id: 'chapter4_rebel',
        title: 'Die Stunde des Rebellen',
        text: 'Deine Klinge kreuzt sich mit den Schwertern des Eisernen Ordens. Du führst den Aufstand der freien Geister an. Der Turm wankt, das Fundament der alten Welt bebt unter der Wucht eurer Ideale. Du stehst vor den verängstigten Wächtern.',
        options: [
            { id: 'ch4_rebel_victory', text: 'Stürze den verknöcherten Orden endgültig und befreie alle Erinnerungen in die Wildnis', next: 'ending_rebel' },
            { id: 'ch4_rebel_join', text: 'Reiße die Krone des Archivars an dich, um fortan selbst mit eiserner, gerechter Hand zu regieren', next: 'ending_tyrant' }
        ],
        flags: { rebel_path: true }
    },

    // ===== KAPITEL 4 – GOD =====
    chapter4_god: {
        id: 'chapter4_god',
        title: 'Die Erhebung zur Gottheit',
        text: 'Die ursprüngliche, goldene Energie der Schöpfung fließt durch deine Adern wie flüssiges Magma. Du spürst jeden Gedanken, jeden Herzschlag und jeden Schmerz aller Epochen, die jemals existierten. Du bist nun der absolute Herrscher über Zeit, Erinnerung und Vergessen.',
        options: [
            { id: 'ch4_god_rule', text: 'Etabliere eine unfehlbare, göttliche Herrschaft über das neu geordnete Archiv', next: 'ending_ruler' },
            { id: 'ch4_god_free', text: 'Sprenge deine eigene göttliche Form und zerstreue alle Mneme-Partikel als neuen Sternenstaub im Universum', next: 'ending_free' }
        ],
        flags: { god_path: true }
    },

    // ===== ENDEN =====
    ending_victory: {
        id: 'ending_victory',
        title: '🏆 Goldener Sieg der unvergänglichen Mneme',
        text: 'Der Titan der Lethe zerbricht in Myriaden goldener Lichtfunken. Das Archiv leuchtet in nie gekannter Pracht auf. Die Erinnerungen der Menschheit fließen harmonisch zusammen und formen eine neue, unzerstörbare Realität. Du wirst als der Ewige Heiler in die Geschichte eingehen.',
        isEnding: true,
        options: []
    },

    ending_sacrifice: {
        id: 'ending_sacrifice',
        title: '🕯️ Das Selbstopfer: Ein unbesungenes Denkmal',
        text: 'Du saugst das wütende Vergessen in deine eigene Seele auf. Langsam verblassen deine eigenen Erinnerungen – das Gesicht deiner Mutter, deine Siege, dein eigener Name... alles schmilzt dahin. Als eine leblose, leuchtende Steinstatue verbleibst du im Zentrum der Hallen. Das Archiv lebt, doch du bist fort.',
        isEnding: true,
        options: []
    },

    ending_eternal: {
        id: 'ending_eternal',
        title: '⏳ Der ewige Wächter der Stasis',
        text: 'Allein sitzt du auf dem eisigen Thron aus Buchrücken. Die Zeit verliert jede Bedeutung, schrumpft zu einem bedeutungslosen Ticken im Vakuum. Du bewegst dich nicht mehr, fühlst nichts mehr. Du bist kein Mensch mehr – du bist die lebendige Erinnerung einer toten Welt.',
        isEnding: true,
        options: []
    },

    ending_rebel: {
        id: 'ending_rebel',
        title: '⚔️ Der Befreier der ungebundenen Geister',
        text: 'Der eiserne Orden ist gestürzt. Die Tore des Archivs werden gesprengt. Wie eine gigantische Aurora Borealis ergießen sich die gefangenen Träume und Erinnerungen über den Kosmos. Die starre Struktur der Realität zerfällt, doch die Menschen erwachen und dürfen endlich wieder neu träumen.',
        isEnding: true,
        options: []
    },

    ending_tyrant: {
        id: 'ending_tyrant',
        title: '👑 Der eiserne Tyrann der Bibliotheken',
        text: 'Du hast den Thron des Archivars mit Gewalt bestiegen. Um die Stabilität der Welt zu sichern, errichtest du eine Tyrannei des Geistes. Unliebsame oder schmerzhafte Erinnerungen deiner Untertanen werden von dir eigenhändig gelöscht. Das Archiv hält stand, doch um den Preis der absoluten geistigen Freiheit.',
        isEnding: true,
        options: []
    },

    ending_ruler: {
        id: 'ending_ruler',
        title: '👑 Der Mneme-Gott: Ein Kosmos aus Gedanken',
        text: 'Als neuer Gott throns du über der Existenz. Mit einer bloßen Geste formst du Kontinente aus Träumen und löschst Galaxien aus Verbitterung aus. Die Welt gehorcht jedem deiner Gedanken. Du bist unsterblich, unbesiegbar – und einsamer als jeder Sterbliche vor dir.',
        isEnding: true,
        options: []
    },

    ending_free: {
        id: 'ending_free',
        title: '🕊️ Die Große Befreiung: Kosmische Saat',
        text: 'Du gibst deine göttliche Form auf und lässt deine Essenz explodieren. Billionen funkelnder Partikel regnen auf die öde Leere nieder. Sie säen Leben, Hoffnung und Geschichten auf fernen Planeten. Das Archiv ist nicht mehr, aber ein unendlicher, neuer Kosmos beginnt zu atmen.',
        isEnding: true,
        options: []
    },

    ending_exile: {
        id: 'ending_exile',
        title: '🌅 Das Exil des namenlosen Wanderers',
        text: 'Du wirfst deine Ausrüstung ab und schreitest durch die letzte Pforte hinaus in den Nebel der ungeschriebenen Zukunft. Ohne Vergangenheit, ohne Bestimmung und frei von der Last der Erhaltung. Die Geschichte deines Lebens beginnt auf einem leeren Blatt Papier.',
        isEnding: true,
        options: []
    },

    ending_void: {
        id: 'ending_void',
        title: '🌀 Die absolute Stille des warmen Nichts',
        text: 'Das goldene Becken der Ersten zerbricht. Die Lethe flutet jede Ecke des Archivs ohne Widerstand. Die Mauern stürzen lautlos ein, die Regale zerfallen zu Sand. Die Realität vergisst sich selbst vollständig. Du schließt die Augen und sinkst glücklich in das ewige, warme, schmerzfreie Nichts zurück.',
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