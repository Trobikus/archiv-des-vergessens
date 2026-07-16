// --- START OF FILE data/codex_entries.js ---

export const CODEX_ENTRIES = {
    // ===== BOSSE =====
    'lost_shadow': {
        id: 'lost_shadow',
        category: 'bosses',
        title: 'Der Verlorene Schatten',
        icon: '👤',
        unlocked: false,
        description: 'Der erste Wächter des Archivs. Ein Wesen aus reiner Vergessenheit, das die Erinnerungen der Verlorenen in sich trägt.',
        lore: 'Einige sagen, der Verlorene Schatten sei der erste Hüter gewesen, der seinen eigenen Namen vergaß. Andere glauben, er sei aus der Sehnsucht der Sterblichen entstanden, etwas zu vergessen, das zu schmerzhaft war.',
        stats: { hp: 40, attack: 6, defense: 2 }
    },

    'memory_phantom': {
        id: 'memory_phantom',
        category: 'bosses',
        title: 'Das Phantom der Erinnerung',
        icon: '👻',
        unlocked: false,
        description: 'Ein Wesen, das aus den schönsten Erinnerungen der Welt geformt wurde – und nun nach ihrer Zerstörung dürstet.',
        lore: 'Das Phantom war einst die Erinnerung eines großen Königs. Seine Liebe, seine Trauer, seine Siege – alles wurde in dieses Wesen gegossen. Nun ist es wahnsinnig geworden.',
        stats: { hp: 80, attack: 12, defense: 4 }
    },

    'shadow_guardian': {
        id: 'shadow_guardian',
        category: 'bosses',
        title: 'Der Schattenwächter',
        icon: '⚔️',
        unlocked: false,
        description: 'Ein gewaltiger Krieger, der die Pforten der Vergangenheit bewacht.',
        lore: 'Die Schattenwächter wurden von den ursprünglichen Mneme erschaffen, um die Siegel zu schützen. Sie sind unsterblich – bis ihr Zweck erfüllt ist.',
        stats: { hp: 150, attack: 20, defense: 8 }
    },

    'ancient_one': {
        id: 'ancient_one',
        category: 'bosses',
        title: 'Der Uralte',
        icon: '🧙',
        unlocked: false,
        description: 'Ein Wesen, das älter ist als das Archiv selbst. Es erinnert sich an die Zeit vor der Zeit.',
        lore: 'Der Uralte war der erste, der die Mneme fand. Er hütete sie Jahrtausende lang. Nun ist er verwirrt – und gefährlich.',
        stats: { hp: 300, attack: 35, defense: 15 }
    },

    'nyx': {
        id: 'nyx',
        category: 'bosses',
        title: 'Nyx – Das Vergessen',
        icon: '🌑',
        unlocked: false,
        description: 'Die Verkörperung des Vergessens. Sie ist das, was bleibt, wenn alle Erinnerungen verblassen.',
        lore: 'Nyx war einst eine Mneme-Hüterin. Sie opferte sich selbst, um das Archiv zu retten – und wurde zur Dunkelheit, die sie bekämpfen wollte.',
        stats: { hp: 500, attack: 50, defense: 25 }
    },

    // ===== ORTE =====
    'archive_hall': {
        id: 'archive_hall',
        category: 'locations',
        title: 'Die große Halle des Archivs',
        icon: '🏛️',
        unlocked: false,
        description: 'Der zentrale Ort des Archivs. Hier werden die Mneme-Partikel gesammelt und sortiert.',
        lore: 'Erbaut aus dem Stein der ersten Erinnerungen. Jede Säule trägt die Geschichte eines vergessenen Volkes.'
    },

    'forgotten_chamber': {
        id: 'forgotten_chamber',
        category: 'locations',
        title: 'Die vergessene Kammer',
        icon: '🚪',
        unlocked: false,
        description: 'Ein verborgener Raum unter dem Archiv. Hier liegen die ältesten Geheimnisse.',
        lore: 'Nur wenige haben die Kammer betreten. Diejenigen, die zurückkehrten, sprachen von einem Licht, das stärker war als die Sonne.'
    },

    // ===== ITEMS =====
    'mneme_crown': {
        id: 'mneme_crown',
        category: 'items',
        title: 'Die Mneme-Krone',
        icon: '👑',
        unlocked: false,
        description: 'Eine Krone aus reinen Mneme-Partikeln. Sie verleiht die Macht über alle Erinnerungen.',
        lore: 'Die Krone wurde von den ersten Hütern geschmiedet, um die Mneme zu bündeln. Sie ist sowohl Segen als auch Fluch.'
    },

    'ancient_blade': {
        id: 'ancient_blade',
        category: 'items',
        title: 'Die uralte Klinge',
        icon: '🗡️',
        unlocked: false,
        description: 'Eine Klinge aus vergessenem Stahl, die die Erinnerung ihrer Opfer in sich aufnimmt.',
        lore: 'Die Klinge wurde im Herzen der ersten Mneme geschmiedet. Jeder Schlag hinterlässt eine Narbe in der Geschichte.'
    },

    // ===== LORE =====
    'origin_of_mneme': {
        id: 'origin_of_mneme',
        category: 'lore',
        title: 'Die Ursprünge der Mneme',
        icon: '📜',
        unlocked: false,
        description: 'Die Mneme sind die Fragmente der ersten Erinnerung – geboren aus dem ersten Gedanken der ersten Existenz.',
        lore: 'Als der erste Mensch den ersten Gedanken dachte, entstand die erste Mneme. Seitdem wächst das Archiv mit jeder Erinnerung, die jemals gemacht wurde.'
    },

    'the_great_forgetting': {
        id: 'the_great_forgetting',
        category: 'lore',
        title: 'Das Große Vergessen',
        icon: '🌫️',
        unlocked: false,
        description: 'Ein Ereignis, das beinahe alle Erinnerungen der Welt auslöschte. Nur das Archiv überlebte.',
        lore: 'Vor Äonen versuchte ein Wesen, das als "Der Leere" bekannt war, alle Mneme zu vernichten. Es scheiterte – aber der Schaden war immens.'
    },

    'the_covenant': {
        id: 'the_covenant',
        category: 'lore',
        title: 'Der Bund der Hüter',
        icon: '🤝',
        unlocked: false,
        description: 'Ein uralter Pakt zwischen den ersten Hütern, das Archiv für immer zu bewachen.',
        lore: 'Der Bund wurde in einer Zeit geschlossen, als die Welt noch jung war. Die Hüter schworen, die Erinnerungen zu schützen – koste es, was es wolle.'
    },

    // ===== ENDEN =====
    'ending_victory': {
        id: 'ending_victory',
        category: 'endings',
        title: '🏆 Sieg des Lichts',
        icon: '⭐',
        unlocked: false,
        description: 'Das Gute Ende. Du hast das Vergessen besiegt und das Archiv wiederhergestellt.'
    },

    'ending_sacrifice': {
        id: 'ending_sacrifice',
        category: 'endings',
        title: '🕯️ Das Opfer',
        icon: '🕯️',
        unlocked: false,
        description: 'Das tragische Ende. Du opferst dich für das Archiv – und wirst zur Legende.'
    }
};

// Hilfsfunktion: Eintrag nach ID suchen
export function getCodexEntry(id) {
    return CODEX_ENTRIES[id] || null;
}

// Hilfsfunktion: Alle Einträge einer Kategorie
export function getCodexEntriesByCategory(category) {
    return Object.values(CODEX_ENTRIES).filter(e => e.category === category);
}