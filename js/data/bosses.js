// ============================================================
// FILE: js/data/bosses.js – Boss-Daten
// ============================================================
export const BOSS_NAMES = [
    'Verlorener Schatten', 'Gedankenwandler', 'Nebelkreatur', 'Staubgeist',
    'Fragment der Erinnerung', 'Phantom des Archivs', 'Rastloser Wächter', 'Dunkles Echo'
];

export const CHAPTER_BOSSES = [
    { name: 'Wächter der Vergessenheit', items: ['Staubige Klinge'] },
    { name: 'Echo der Stille', items: ['Flickwerk-Rüstung'] },
    { name: 'Schatten der Erinnerung', items: ['Amulett der Dämmerung'] },
    { name: 'Stimme des Nebels', items: ['Ring der Einkehr'] },
    { name: 'Hüter der Schatten', items: ['Schattenklinge'] },
    { name: 'Wächter des Abgrunds', items: ['Abgrundplatte'] },
    { name: 'Der Namenlose', items: ['Amulett der Namenlosen'] },
    { name: 'Die Leere', items: ['Ring der Leere'] },
    { name: 'Archivar der Ersten', items: ['Archiv-Klinge'] },
    { name: 'Die Chronistin', items: ['Chronisten-Robe'] },
    { name: 'Wächter der Mneme', items: ['Mneme-Amulett'] },
    { name: 'Der Erinnerungshüter', items: ['Ring der Erinnerung'] },
    { name: 'Der Erste Mneme', items: ['Klinge der Ersten'] },
    { name: 'Die Urerinnerung', items: ['Ur-Rüstung'] },
    { name: 'Der Ewige', items: ['Amulett der Ewigkeit'] },
    { name: 'Die Unendliche', items: ['Ring der Unendlichkeit'] },
    { name: 'Der Architekt', items: ['Architekten-Klinge'] },
    { name: 'Die Gestalterin', items: ['Gestalter-Robe'] },
    { name: 'Der Vergessene Gott', items: ['Gott-Klinge', 'Gott-Rüstung'] },
    { name: 'Die Letzte Mneme', items: ['Mneme-Krone'] }
];

export function generateStoryBosses() {
    const bosses = [];
    let globalId = 1;
    for (let chap = 1; chap <= 10; chap++) {
        const baseHp = 40 * Math.pow(1.6, chap - 1);
        const baseAtk = 6 * Math.pow(1.4, chap - 1);
        const baseDef = 2 * Math.pow(1.4, chap - 1);

        for (let fight = 1; fight <= 10; fight++) {
            const isMidBoss = fight === 5;
            const isEndBoss = fight === 10;
            let name = BOSS_NAMES[(chap + fight) % BOSS_NAMES.length] + ' ' + ['I', 'II', 'III', 'IV'][fight % 4];
            let items = [];

            if (isMidBoss) {
                name = CHAPTER_BOSSES[(chap - 1) * 2].name;
                items = CHAPTER_BOSSES[(chap - 1) * 2].items;
            } else if (isEndBoss) {
                name = CHAPTER_BOSSES[(chap - 1) * 2 + 1].name;
                items = CHAPTER_BOSSES[(chap - 1) * 2 + 1].items;
            }

            const multiplier = 1 + (fight * 0.1);
            bosses.push({
                id: globalId++,
                name,
                chapter: chap,
                hp: Math.floor(baseHp * multiplier * (isEndBoss ? 2 : (isMidBoss ? 1.5 : 1))),
                attack: Math.floor(baseAtk * multiplier * (isEndBoss ? 1.5 : (isMidBoss ? 1.2 : 1))),
                defense: Math.floor(baseDef * multiplier * (isEndBoss ? 1.5 : (isMidBoss ? 1.2 : 1))),
                reward: {
                    exp: Math.floor(20 * chap * multiplier * (isEndBoss ? 3 : 1)),
                    items
                }
            });
        }
    }
    return bosses;
}