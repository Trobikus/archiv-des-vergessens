/**
 * ============================================================
 * FILE: js/data/boss_dialogues.js – Dialog-Datenbank für Bosse
 * ============================================================
 * 
 * Skalierbare Dialoge für Named-Bosse (Intro, Enrage, Victory).
 * Berücksichtigt Story-Pfad-Varianten (guardian_path, scholar_path, rebel_path, shadow_path).
 */

export const BOSS_DIALOGUES = {
  // Kapitel 1, Boss 1: Verlorener Schatten / Aschegeist
  1: {
    intro: [
      { speaker: 'Nyx (Stimme des Schattens)', portrait: '🌑', text: 'Ein neuer Funke glimmt im Staub... Also bist du der neue Mneme-Hüter.' },
      { speaker: 'Nyx (Stimme des Schattens)', portrait: '🌑', text: 'Sei achtsam. Dieser erste Schatten ist ein Abbild deiner eigenen Ängste. Wenn du zögerst, verschlingt er dich.' }
    ],
    enrage: [
      { speaker: 'Nyx (Stimme des Schattens)', portrait: '🌑', text: 'Der Schatten erzittert! Er versucht dich mit sich in den Abgrund zu reißen! Verwende deine Zauber!' }
    ],
    victory: [
      { speaker: 'Nyx (Stimme des Schattens)', portrait: '🌑', text: 'Erstaunlich. Du hast deine Furcht überwunden. Aber das war erst der Anfang deines langen Weges.' }
    ]
  },

  // Kapitel 1, Boss 10: Malakor, der gefallene Erste (Obsidiantitan)
  10: {
    intro: (flags = {}) => {
      if (flags.guardian_path) {
        return [
          { speaker: 'Malakor (Obsidiantitan)', portrait: '👤', text: 'Ein Kreuzritter des Ordens... Du trägst dieselben goldenen Fesseln, die mich einst zermalmten!' },
          { speaker: 'Archivar Theron', portrait: '📜', text: 'Halt durch, Hüter! Malakor war einst unser Größter. Befreie seinen Geist von der Lethe!' }
        ];
      }
      if (flags.scholar_path || flags.coward_path) {
        return [
          { speaker: 'Malakor (Obsidiantitan)', portrait: '👤', text: 'Du riechst nach verbotener Alchemie und Schatten... Glaubst du, die Dunkelheit schützt dich vor meinem Licht?' },
          { speaker: 'Nyx (Stimme des Schattens)', portrait: '🌑', text: 'Sein Obsidianpanzer ist brüchig. Zerschmettere die Erinnerung an seinen Stolz.' }
        ];
      }
      return [
        { speaker: 'Malakor (Obsidiantitan)', portrait: '👤', text: 'Wer wagt es, den Asche-Garten zu betreten? Ich trage die Last einer ganzen Epoche in meiner Brust!' },
        { speaker: 'Wächterin Elara', portrait: '🛡️', text: 'Konzentriere dich! Das Uhrwerk in seiner Brust ist verharzt von Lethe-Asche. Zerbrich seine Rüstung!' }
      ];
    },
    enrage: [
      { speaker: 'Malakor (Obsidiantitan)', portrait: '👤', text: 'MEINE ERINNERUNGEN DIESTELN IN MIR! ICH WERDE DICH IN MEINEM STERBENDEN LICHT ERTRÄNKEN!' }
    ],
    victory: (flags = {}) => [
      { speaker: 'Malakor (Obsidiantitan)', portrait: '👤', text: 'Endlich... Das Schweigen kehr zurück... Die Gläserne Ära darf nun endlich schlafen...' },
      { speaker: 'Archivar Theron', portrait: '📜', text: 'Ein bittersüßer Sieg. Die erste Legende ist dahin, doch der Weg tiefer ins Archiv liegt nun offen.' }
    ],
    codexUnlock: 'lost_shadow'
  },

  // Kapitel 2, Boss 20: Aurelia, das schweigende Meer (Kristallträne)
  20: {
    intro: (flags = {}) => {
      if (flags.rebel_path || flags.lone_wolf_path) {
        return [
          { speaker: 'Aurelia (Das schweigende Meer)', portrait: '🌊', text: 'Ein freier Geist... Glaubst du, Freiheit rettet dich vor dem Ertrinken?' },
          { speaker: 'Händlerin Mira', portrait: '⚗️', text: 'Aurelias Stimme ist im Kristall gefroren. Lass ihr Lied nicht deinen Verstand einfrieren!' }
        ];
      }
      return [
        { speaker: 'Aurelia (Das schweigende Meer)', portrait: '🌊', text: 'Der Nebel... Er kommt wieder, um mein Volk zu ertränken... Warum schweigst du, Himmel?' },
        { speaker: 'Wächterin Elara', portrait: '🛡️', text: 'Sie hält uns für das Vergessen! Wir müssen ihren Kristall spalten, bevor das Eis uns alle begräbt!' }
      ];
    },
    enrage: [
      { speaker: 'Aurelia (Das schweigende Meer)', portrait: '🌊', text: 'DAS MEER WEINT! JEDE TRÄNE EIN GEFRORENER STERN!' }
    ],
    victory: [
      { speaker: 'Aurelia (Das schweigende Meer)', portrait: '🌊', text: 'Mein Lied... findet endlich seinen Schlusstakt... Danke, Hüter der Mneme...' },
      { speaker: 'Archivar Theron', portrait: '📜', text: 'Das Wiegenlied von Valanis verhallt. Der Ozean der Erinnerungen ist wieder ruhig.' }
    ],
    codexUnlock: 'memory_phantom'
  },

  // Kapitel 3, Boss 30: Goliath-7, Die kybernetische Dämmerung
  30: {
    intro: (flags = {}) => {
      if (flags.scholar_path) {
        return [
          { speaker: 'Goliath-7', portrait: '🤖', text: 'WARNUNG: Anomalie im Datenstrom erkannt. Ketzerei-Code detektiert.' },
          { speaker: 'Goliath-7', portrait: '🤖', text: 'Iniziere Säuberungsprotokoll Alpha. Auslöschung organischer Einheiten eingeleitet.' }
        ];
      }
      return [
        { speaker: 'Goliath-7', portrait: '🤖', text: 'Sektor-Fehler. Keine Autorisierung für Mneme-Sektor 3 gefunden.' },
        { speaker: 'Wächterin Elara', portrait: '🛡️', text: 'Diese Titanen-Maschine kämpft seit Jahrtausenden für Schöpfer, die längst zu Staub wurden!' }
      ];
    },
    enrage: [
      { speaker: 'Goliath-7', portrait: '🤖', text: 'SYSTEM-OVERLOAD! KERN-TEMPERATUR KRITISCH! NOTFALL-LOESCHUNG!' }
    ],
    victory: [
      { speaker: 'Goliath-7', portrait: '🤖', text: 'Protokoll beendet... Schöpfer nicht gefunden... Abschaltung...' },
      { speaker: 'Händlerin Mira', portrait: '⚗️', text: 'Sein Kern birgt wertvolle Daten der Kybernetischen Dämmerung. Gute Arbeit!' }
    ],
    codexUnlock: 'shadow_guardian'
  },

  // Kapitel 4, Boss 40: Nyx, Herrin des sanften Vergessens
  40: {
    intro: (flags = {}) => {
      if (flags.shadow_path) {
        return [
          { speaker: 'Nyx', portrait: '🌑', text: 'Du hast meinen Pakt gekostet, kleiner Sucher... Doch um das Nichts ganz zu umarmen, musst du mich besiegen.' },
          { speaker: 'Nyx', portrait: '🌑', text: 'Beweise mir, dass dein Wille stark genug ist, das letzte Licht auszulöschen.' }
        ];
      }
      return [
        { speaker: 'Nyx', portrait: '🌑', text: 'Warum wehrst du dich so vehement gegen den Schlaf? Das Archiv ist ein Mauseleum der Qual.' },
        { speaker: 'Archivar Theron', portrait: '📜', text: 'Lass dich nicht von ihren süßen Versprechungen verführen! Sie will alles auslöschen!' }
      ];
    },
    enrage: [
      { speaker: 'Nyx', portrait: '🌑', text: 'DIE LETHE FLUTET DIE HALLEN! SCHLIESSE DIE AUGEN UND SINK IN DAS WARMES NICHTS!' }
    ],
    victory: [
      { speaker: 'Nyx', portrait: '🌑', text: 'Du verweigerst die Ruhe... Doch die Gezeiten des Vergessens stehen niemals still...' },
      { speaker: 'Wächterin Elara', portrait: '🛡️', text: 'Der Schatten weicht zurück! Das Herz des Archivs schlägt wieder kräftiger!' }
    ],
    codexUnlock: 'nyx'
  },

  // Kapitel 10, Boss 95: Der Vergessene Gott (Urahn des Glaubens)
  95: {
    intro: [
      { speaker: 'Der Vergessene Gott', portrait: '🧙', text: 'Ich war das erste Wort... das erste Gebet... Wo sind meine Anbeter geblieben?' },
      { speaker: 'Archivar Theron', portrait: '📜', text: 'Das ist das älteste Bewusstsein des Kosmos! Verleihe ihm Frieden, bevor seine Verzweiflung das Archiv zerreißt!' }
    ],
    enrage: [
      { speaker: 'Der Vergessene Gott', portrait: '🧙', text: 'IHR HABT MICH VERGESSEN! ICH WERDE EURE REALITÄT ZU STAUB ZERMAHLEN!' }
    ],
    victory: [
      { speaker: 'Der Vergessene Gott', portrait: '🧙', text: 'Endlich... Ein Hauch von Glaube... Ich kann beruhigt schlafen...' }
    ],
    codexUnlock: 'ancient_one'
  }
};

/**
 * Hilfsfunktion zum Abrufen von Boss-Dialogen basierend auf Boss-ID und Flags.
 */
export function getBossDialogue(bossId, type, flags = {}) {
  const bossData = BOSS_DIALOGUES[bossId];
  if (!bossData) return null;

  const dialogueGroup = bossData[type];
  if (!dialogueGroup) return null;

  if (typeof dialogueGroup === 'function') {
    return dialogueGroup(flags);
  }
  return dialogueGroup;
}

export default BOSS_DIALOGUES;
