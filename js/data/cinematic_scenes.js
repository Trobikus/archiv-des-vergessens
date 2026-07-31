// ============================================================
// FILE: data/cinematic_scenes.js – Cinematic Scene Definitions
// ============================================================
// Used by DialogUI + StoryUI for full-screen atmospheric cutscenes.
// Each scene defines visual mood, particle theme, letterbox style
// and optional background gradient / vignette intensity.
// ============================================================

export const CINEMATIC_SCENES = {
  // ---------- ARCHIVE / THERON ----------
  'archive-halls': {
    id: 'archive-halls',
    name: 'Die sterbenden Hallen',
    name_en: 'The Dying Halls',
    description: 'Unendlich hohe schwebende Buchregale, Wasserfälle aus flüssiger Tinte, Asche-Schnee und rotierende Licht-Astrolabien.',
    particleTheme: 'aethel-gold',
    letterbox: true,
    vignette: 'heavy',
    background: 'radial-gradient(ellipse at 50% 20%, rgba(197,160,89,0.12) 0%, rgba(8,8,12,0.95) 55%, #050507 100%)',
    glowColor: 'var(--color-primary)',
    textStyle: 'italic',
    ambientClass: 'scene-archive-halls'
  },

  // ---------- MIRA / SHADOW NICHE ----------
  'shadow-niche': {
    id: 'shadow-niche',
    name: 'Nische der Schattenschmugglerin',
    name_en: 'Shadow Smuggler\'s Niche',
    description: 'Enge Nische zwischen umgestürzten Regalen, schwache Laterne, purpurne Lethe-Schwaden am Boden.',
    particleTheme: 'lethe-purple',
    letterbox: true,
    vignette: 'medium',
    background: 'radial-gradient(ellipse at 30% 70%, rgba(100,30,180,0.18) 0%, rgba(12,8,18,0.96) 60%, #050507 100%)',
    glowColor: '#b432ff',
    textStyle: 'italic',
    ambientClass: 'scene-shadow-niche'
  },

  // ---------- ELARA / IRON GATES ----------
  'iron-gates': {
    id: 'iron-gates',
    name: 'Die eisernen Pforten',
    name_en: 'The Iron Gates',
    description: 'Monumentale eiserne Tore, kaltes Metall, Fackellicht und der ferne Donner der Lethe-Kreaturen.',
    particleTheme: 'iron-sparks',
    letterbox: true,
    vignette: 'heavy',
    background: 'radial-gradient(ellipse at 50% 40%, rgba(120,130,150,0.15) 0%, rgba(10,10,14,0.97) 55%, #050507 100%)',
    glowColor: '#a9b3c0',
    textStyle: 'normal',
    ambientClass: 'scene-iron-gates'
  },

  // ---------- NYX / VOID WHISPER ----------
  'void-whisper': {
    id: 'void-whisper',
    name: 'Das Flüstern der Leere',
    name_en: 'The Whisper of the Void',
    description: 'Flüssiger Schatten, warme schwarze Dunkelheit, sanfte purpurne Nebelschwaden – tröstend und bedrohlich zugleich.',
    particleTheme: 'void-smoke',
    letterbox: true,
    vignette: 'extreme',
    background: 'radial-gradient(ellipse at 50% 50%, rgba(60,20,100,0.25) 0%, rgba(5,3,12,0.98) 50%, #020203 100%)',
    glowColor: '#9b30ff',
    textStyle: 'italic',
    ambientClass: 'scene-void-whisper'
  },

  // ---------- PROLOGUE / ASH FIELD ----------
  'ash-field': {
    id: 'ash-field',
    name: 'Das Feld der Asche',
    name_en: 'The Field of Ash',
    description: 'Endloses weißes Aschefeld unter einem schwarzen Abgrund. Brennende Pergamentseiten fliegen wie Kometen. Der Turm der Ewigkeit ragt in der Ferne.',
    particleTheme: 'ash-snow',
    letterbox: true,
    vignette: 'extreme',
    background: 'radial-gradient(ellipse at 50% 80%, rgba(180,180,190,0.08) 0%, rgba(8,8,10,0.97) 45%, #030304 100%)',
    glowColor: '#c5a059',
    textStyle: 'italic',
    ambientClass: 'scene-ash-field'
  },

  // ---------- MALAKOR / ASH GARDEN ----------
  'ash-garden': {
    id: 'ash-garden',
    name: 'Der Asche-Garten',
    name_en: 'The Ash Garden',
    description: 'Garten aus zerbrochenem Glas und verwelkten Erinnerungen. Obsidian-Ritter mit goldenem Uhrwerk und Sternenlicht-Schwert.',
    particleTheme: 'glass-shards',
    letterbox: true,
    vignette: 'heavy',
    background: 'radial-gradient(ellipse at 50% 30%, rgba(197,160,89,0.1) 0%, rgba(20,10,5,0.9) 40%, #050507 100%)',
    glowColor: '#d4af37',
    textStyle: 'italic',
    ambientClass: 'scene-ash-garden'
  },

  // ---------- EYE OF THE ARCHIVE (Confrontation) ----------
  'eye-of-archive': {
    id: 'eye-of-archive',
    name: 'Das Auge des Archivs',
    name_en: 'The Eye of the Archive',
    description: 'Monumentale Plattform über dem Aethel-Core. Theron, Nyx, Elara und Mira stehen im Kreis. Goldene und purpurne Partikel kämpfen um die Vorherrschaft.',
    particleTheme: 'duality',
    letterbox: true,
    vignette: 'heavy',
    background: 'radial-gradient(ellipse at 50% 60%, rgba(197,160,89,0.15) 0%, rgba(80,30,140,0.12) 40%, rgba(5,5,8,0.98) 75%)',
    glowColor: 'var(--color-primary)',
    textStyle: 'italic',
    ambientClass: 'scene-eye-of-archive'
  }
};

/**
 * Holt eine Szene nach ID. Fallback auf archive-halls.
 * @param {string} id
 * @returns {Object}
 */
export function getCinematicScene(id) {
  return CINEMATIC_SCENES[id] || CINEMATIC_SCENES['archive-halls'];
}

export default CINEMATIC_SCENES;
