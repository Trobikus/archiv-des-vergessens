// ============================================================
// FILE: js/data/bosses.js – Boss-Daten
// ============================================================
import { CONFIG } from './config.js';

export const BOSS_NAMES = [
    'Verlorener Schatten', 'Gedankenwandler', 'Nebelkreatur', 'Staubgeist',
    'Fragment der Erinnerung', 'Phantom des Archivs', 'Rastloser Wächter', 'Dunkles Echo'
];

export const CHAPTER_BOSSES = [
    { name: 'Rastloses Echo von Eldoria', items: ['Bruchstück der Gläsernen Ära'] },
    { name: 'Malakor, der gefallene Erste (Obsidiantitan)', items: ['Sternenlicht-Klinge des Hüters'] },
    { name: 'Schattenreiter der Seelenfluten', items: ['Seelenfänger-Amulett'] },
    { name: 'Aurelia, das schweigende Meer (Kristallträne)', items: ['Ring der unendlichen Gezeiten'] },
    { name: 'Eisernes Abwehrprogramm Alpha', items: ['Schattenstahl-Klinge'] },
    { name: 'Goliath-7, Die kybernetische Dämmerung', items: ['Rostplatte der Techno-Endzeit'] },
    { name: 'Der Namenlose Archivar', items: ['Zerrissenes Foliantenblatt'] },
    { name: 'Nyx, Herrin des sanften Vergessens', items: ['Dunkler Reif des Nichts'] },
    { name: 'Der Archivar der Ersten Dynastie', items: ['Inschrift-Schwert des Ur-Zirkels'] },
    { name: 'Die Chronistin des Schmerzes', items: ['Gewebte Chronisten-Robe'] },
    { name: 'Wächter der reinen Aethel-Mneme', items: ['Lichtbringer-Amulett'] },
    { name: 'Der Erinnerungssammler von Valanis', items: ['Reif der Ewigen Reue'] },
    { name: 'Der Erste Mnemoniker', items: ['Urahnen-Klinge der Ersten'] },
    { name: 'Die Urerinnerung des Kosmos', items: ['Sterne-Garnierte Ur-Plattenrüstung'] },
    { name: 'Der Ewige Wächter der Stasis', items: ['Amulett der Stillstehenden Zeit'] },
    { name: 'Die Unendliche Leere', items: ['Band der ewigen Stille'] },
    { name: 'Der Große Architekt des Archivs', items: ['Entwurfs-Klinge der Realität'] },
    { name: 'Die Gestalterin des Schicksalsfadens', items: ['Schicksalsweber-Gewand'] },
    { name: 'Der Vergessene Gott (Urahn des Glaubens)', items: ['Heilige Klinge der Götterdämmerung', 'Urmacht-Brustplatte'] },
    { name: 'Die Letzte Mneme (Krone der Schöpfung)', items: ['Krone des Kollektiven Bewusstseins'] }
];

export function generateStoryBosses() {
    const bosses = [];
    let globalId = 1;
    const maxChapters = CONFIG.STORY?.MAX_CHAPTERS || 10;
    const fightsPerChapter = CONFIG.STORY?.FIGHTS_PER_CHAPTER || 10;
    for (let chap = 1; chap <= maxChapters; chap++) {
        const baseHp = 40 * Math.pow(1.6, chap - 1);
        const baseAtk = 6 * Math.pow(1.4, chap - 1);
        const baseDef = 2 * Math.pow(1.4, chap - 1);

        for (let fight = 1; fight <= fightsPerChapter; fight++) {
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