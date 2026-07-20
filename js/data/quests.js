// ============================================================
// FILE: js/data/quests.js – Haupt- & Tagesmissionen
// ============================================================
export const MAIN_QUESTS_DATA = [
    { id: 'q1', text: 'Klicke auf "Extrahieren" bis du 10 Partikel hast', target: 10, rewardText: '15 Partikel', reward: { particles: 15 } },
    { id: 'q2', text: 'Rekrutiere deinen ersten Mneme-Sammler (kostet 10)', target: 1, rewardText: '20 Partikel', reward: { particles: 20 } },
    { id: 'q3', text: 'Sende ein Mitglied auf Expedition (Klick auf Tabelle)', target: 1, rewardText: '5 Relikte', reward: { relics: 5 } },
    { id: 'q4', text: 'Besiege den ersten Boss (Story & Bosse)', target: 1, rewardText: '50 Partikel & 1 Artefakt', reward: { particles: 50, artifacts: 1 } },
    { id: 'q5', text: 'Rüste einen Gegenstand aus (Mein Held)', target: 1, rewardText: '30 Partikel', reward: { particles: 30 } },
    { id: 'q6', text: 'Verbessere deine Klick-Stärke (Hauptbildschirm)', target: 1, rewardText: '30 Partikel', reward: { particles: 30 } },
    { id: 'q7', text: 'Schmiede dein erstes Artefakt (Artefakt-Schmiede)', target: 1, rewardText: '10 Erinnerungsstaub', reward: { memoryDust: 10 } },
    { id: 'q8', text: 'Erreiche Kapitel 2 in der Story', target: 10, rewardText: '100 Partikel, 10 Relikte', reward: { particles: 100, relics: 10 } },
    { id: 'q9', text: 'Führe erfolgreich eine Relikt-Jagd durch', target: 20, rewardText: '15 Relikte', reward: { relics: 15 } },
    { id: 'q10', text: 'Rekrutiere 5 Mitglieder für den Bund', target: 5, rewardText: '200 Partikel', reward: { particles: 200 } },
    { id: 'q11', text: 'Erreiche Stufe 10 mit deinem Helden', target: 10, rewardText: '50 Staub', reward: { memoryDust: 50 } },
    { id: 'q12', text: 'Werte einen Ausrüstungsgegenstand auf (Schmiede)', target: 2, rewardText: '30 Staub', reward: { memoryDust: 30 } },
    { id: 'q13', text: 'Schließe 25 Expeditionen ab', target: 25, rewardText: '25 Relikte', reward: { relics: 25 } },
    { id: 'q14', text: 'Erreiche Kapitel 3 in der Story', target: 20, rewardText: '300 Partikel, 5 Artefakte', reward: { particles: 300, artifacts: 5 } },
    { id: 'q15', text: 'Sammle 1000 Partikel (Insgesamt)', target: 1000, rewardText: 'Prestige-Vorbereitung: 10 Artefakte', reward: { artifacts: 10 } }
];

export const DAILY_QUESTS_DATA = [
    { id: 'daily_1', text: 'Extrahiere 50x manuell', target: 50, key: 'gatherClicks', rewardText: '100 Partikel', reward: { particles: 100 } },
    { id: 'daily_2', text: 'Schließe 5 Expeditionen ab', target: 5, key: 'expeditions', rewardText: '15 Relikte', reward: { relics: 15 } },
    { id: 'daily_3', text: 'Schmiede 3 Gegenstände', target: 3, key: 'craftedItems', rewardText: '2 Artefakte', reward: { artifacts: 2 } }
];