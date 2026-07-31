// ============================================================
// FILE: data/cinematic_assets.js – Cinematic Asset Catalog
// ============================================================
// Zentrale Definition aller visuellen & auditiven Bausteine
// für Cutscenes (DialogUI, StoryBranchUI, Boss-Dialoge).
// Keine echten Bilddateien nötig – alles CSS/Canvas-parametrisiert.
// ============================================================

/**
 * PARTICLE THEMES
 * Parameter für prozedurale Overlay-Partikel während Cutscenes.
 * density: 0–1, speed: relative, colors: CSS rgba strings
 */
export const PARTICLE_THEMES = {
  'aethel-gold': {
    id: 'aethel-gold',
    label: 'Aethel-Gold',
    density: 0.55,
    speed: 0.45,
    waveAmp: 0.4,
    types: ['ember', 'dust', 'rune'],
    colors: {
      ember: 'rgba(255, 223, 100, 0.95)',
      dust: 'rgba(230, 190, 110, 0.75)',
      rune: 'rgba(197, 160, 89, 0.55)',
      glow: 'rgba(212, 175, 55, 0.35)'
    },
    motion: 'dignified', // langsam, geradlinig
    blend: 'screen'
  },

  'lethe-purple': {
    id: 'lethe-purple',
    label: 'Lethe-Purpur',
    density: 0.7,
    speed: 1.15,
    waveAmp: 2.2,
    types: ['smoke', 'dust', 'ember'],
    colors: {
      smoke: 'rgba(100, 30, 180, 0.55)',
      dust: 'rgba(140, 80, 240, 0.7)',
      ember: 'rgba(180, 50, 255, 0.9)',
      glow: 'rgba(130, 0, 255, 0.3)'
    },
    motion: 'organic', // rauchig, unruhig
    blend: 'screen'
  },

  'iron-sparks': {
    id: 'iron-sparks',
    label: 'Eisensplitter',
    density: 0.4,
    speed: 0.9,
    waveAmp: 0.6,
    types: ['spark', 'dust', 'ember'],
    colors: {
      spark: 'rgba(200, 210, 230, 0.95)',
      dust: 'rgba(140, 150, 165, 0.6)',
      ember: 'rgba(255, 160, 80, 0.7)',
      glow: 'rgba(160, 170, 190, 0.25)'
    },
    motion: 'metallic', // kurze Funken, kalt
    blend: 'screen'
  },

  'void-smoke': {
    id: 'void-smoke',
    label: 'Leerenrauch',
    density: 0.85,
    speed: 0.55,
    waveAmp: 2.8,
    types: ['smoke', 'orb', 'dust'],
    colors: {
      smoke: 'rgba(40, 10, 70, 0.7)',
      orb: 'rgba(155, 48, 255, 0.45)',
      dust: 'rgba(80, 20, 120, 0.5)',
      glow: 'rgba(90, 20, 150, 0.35)'
    },
    motion: 'void', // langsam, erdrückend, weich
    blend: 'screen'
  },

  'ash-snow': {
    id: 'ash-snow',
    label: 'Asche-Schnee',
    density: 0.75,
    speed: 0.35,
    waveAmp: 1.2,
    types: ['ash', 'ember', 'dust'],
    colors: {
      ash: 'rgba(210, 210, 220, 0.7)',
      ember: 'rgba(255, 200, 120, 0.55)',
      dust: 'rgba(169, 169, 179, 0.5)',
      glow: 'rgba(180, 180, 190, 0.2)'
    },
    motion: 'fall', // fallend, leicht driftend
    blend: 'screen'
  },

  'glass-shards': {
    id: 'glass-shards',
    label: 'Glassplitter',
    density: 0.5,
    speed: 0.7,
    waveAmp: 0.9,
    types: ['shard', 'ember', 'dust'],
    colors: {
      shard: 'rgba(220, 230, 255, 0.85)',
      ember: 'rgba(255, 215, 100, 0.8)',
      dust: 'rgba(180, 160, 100, 0.45)',
      glow: 'rgba(212, 175, 55, 0.3)'
    },
    motion: 'shatter', // kurze, scharfe Bewegungen
    blend: 'screen'
  },

  duality: {
    id: 'duality',
    label: 'Dualität (Gold/Purpur)',
    density: 0.65,
    speed: 0.6,
    waveAmp: 1.5,
    types: ['ember', 'smoke', 'dust'],
    colors: {
      ember: 'rgba(255, 223, 100, 0.9)',
      smoke: 'rgba(140, 50, 220, 0.7)',
      dust: 'rgba(197, 160, 89, 0.5)',
      glow: 'rgba(180, 120, 180, 0.3)'
    },
    motion: 'dual', // zwei Strömungen, die sich kreuzen
    blend: 'screen'
  }
};

/**
 * AMBIENT LAYERS
 * CSS-/Overlay-Layer über dem Cutscene-Hintergrund.
 */
export const AMBIENT_LAYERS = {
  fog_gold: {
    id: 'fog_gold',
    type: 'gradient',
    css: 'radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.08) 0%, transparent 55%)',
    opacity: 0.9,
    animation: 'ambientPulse 8s ease-in-out infinite alternate'
  },
  fog_purple: {
    id: 'fog_purple',
    type: 'gradient',
    css: 'radial-gradient(ellipse at 40% 70%, rgba(100,30,180,0.12) 0%, transparent 50%)',
    opacity: 1,
    animation: 'ambientPulse 6s ease-in-out infinite alternate'
  },
  fog_void: {
    id: 'fog_void',
    type: 'gradient',
    css: 'radial-gradient(ellipse at 50% 50%, rgba(60,20,100,0.2) 0%, transparent 45%)',
    opacity: 1,
    animation: 'voidPulse 5s ease-in-out infinite alternate'
  },
  ash_rain: {
    id: 'ash_rain',
    type: 'pattern',
    css: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
    size: '28px 28px',
    opacity: 0.18,
    animation: 'ashFall 25s linear infinite'
  },
  iron_haze: {
    id: 'iron_haze',
    type: 'gradient',
    css: 'radial-gradient(ellipse at 50% 40%, rgba(120,130,150,0.1) 0%, transparent 50%)',
    opacity: 0.85,
    animation: null
  },
  duality_split: {
    id: 'duality_split',
    type: 'multi',
    layers: [
      'radial-gradient(circle at 30% 40%, rgba(197,160,89,0.1) 0%, transparent 40%)',
      'radial-gradient(circle at 70% 60%, rgba(140,40,200,0.1) 0%, transparent 40%)'
    ],
    opacity: 1,
    animation: null
  },
  vignette_soft: {
    id: 'vignette_soft',
    type: 'vignette',
    strength: 'medium'
  },
  vignette_hard: {
    id: 'vignette_hard',
    type: 'vignette',
    strength: 'heavy'
  },
  vignette_extreme: {
    id: 'vignette_extreme',
    type: 'vignette',
    strength: 'extreme'
  }
};

/**
 * AUDIO CUES (Platzhalter – Pfade für spätere Audio-Integration)
 * format: relative zu public/ oder absolute URL
 */
export const AUDIO_CUES = {
  ambient_archive: {
    id: 'ambient_archive',
    label: 'Archiv-Hall',
    src: null, // z.B. 'audio/cinematic/archive_ambient.ogg'
    loop: true,
    volume: 0.35,
    fadeIn: 1.2,
    fadeOut: 0.8
  },
  ambient_void: {
    id: 'ambient_void',
    label: 'Leeren-Flüstern',
    src: null,
    loop: true,
    volume: 0.3,
    fadeIn: 1.5,
    fadeOut: 1.0
  },
  ambient_ash: {
    id: 'ambient_ash',
    label: 'Asche-Wind',
    src: null,
    loop: true,
    volume: 0.28,
    fadeIn: 1.0,
    fadeOut: 0.7
  },
  ambient_iron: {
    id: 'ambient_iron',
    label: 'Metall-Echo',
    src: null,
    loop: true,
    volume: 0.32,
    fadeIn: 0.8,
    fadeOut: 0.6
  },
  ambient_shadow: {
    id: 'ambient_shadow',
    label: 'Schatten-Nische',
    src: null,
    loop: true,
    volume: 0.3,
    fadeIn: 1.0,
    fadeOut: 0.8
  },
  sting_choice: {
    id: 'sting_choice',
    label: 'Entscheidungs-Sting',
    src: null,
    loop: false,
    volume: 0.45,
    fadeIn: 0,
    fadeOut: 0.3
  },
  sting_reveal: {
    id: 'sting_reveal',
    label: 'Enthüllung',
    src: null,
    loop: false,
    volume: 0.5,
    fadeIn: 0,
    fadeOut: 0.4
  },
  sting_ending: {
    id: 'sting_ending',
    label: 'Ende erreicht',
    src: null,
    loop: false,
    volume: 0.55,
    fadeIn: 0.2,
    fadeOut: 1.0
  }
};

/**
 * PORTRAIT / SPEAKER ASSETS
 * Emoji + optionale Bildpfade + Glow-Farbe pro Charakter
 */
export const CINEMATIC_PORTRAITS = {
  theron: {
    id: 'theron',
    emoji: '📜',
    image: null, // z.B. 'portraits/theron.webp'
    glow: '#c5a059',
    name: 'Archivar Theron',
    name_en: 'Archivist Theron'
  },
  mira: {
    id: 'mira',
    emoji: '⚗️',
    image: null,
    glow: '#b432ff',
    name: 'Händlerin Mira',
    name_en: 'Merchant Mira'
  },
  elara: {
    id: 'elara',
    emoji: '🛡️',
    image: null,
    glow: '#a9b3c0',
    name: 'Wächterin Elara',
    name_en: 'Guardian Elara'
  },
  nyx: {
    id: 'nyx',
    emoji: '🌑',
    image: null,
    glow: '#9b30ff',
    name: 'Nyx',
    name_en: 'Nyx'
  },
  malakor: {
    id: 'malakor',
    emoji: '⚔️',
    image: null,
    glow: '#d4af37',
    name: 'Malakor, der Erste',
    name_en: 'Malakor, the First'
  },
  player: {
    id: 'player',
    emoji: '✨',
    image: null,
    glow: 'var(--color-primary)',
    name: 'Du',
    name_en: 'You'
  },
  narrator: {
    id: 'narrator',
    emoji: '🕯️',
    image: null,
    glow: '#c5a059',
    name: 'Chronik',
    name_en: 'Chronicle'
  }
};

/**
 * TRANSITIONS
 * Ein-/Ausblend- und Letterbox-Verhalten
 */
export const CINEMATIC_TRANSITIONS = {
  fade: {
    id: 'fade',
    enterMs: 800,
    exitMs: 500,
    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    letterbox: true,
    letterboxMs: 1000
  },
  hard_cut: {
    id: 'hard_cut',
    enterMs: 0,
    exitMs: 0,
    easing: 'linear',
    letterbox: true,
    letterboxMs: 400
  },
  dissolve: {
    id: 'dissolve',
    enterMs: 1200,
    exitMs: 900,
    easing: 'ease-in-out',
    letterbox: true,
    letterboxMs: 1200
  },
  dramatic: {
    id: 'dramatic',
    enterMs: 1400,
    exitMs: 1000,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    letterbox: true,
    letterboxMs: 1400
  }
};

/**
 * SCENE → ASSET BINDINGS
 * Verknüpft Scene-IDs mit konkreten Asset-Bundles.
 */
export const SCENE_ASSET_BINDINGS = {
  'archive-halls': {
    particleTheme: 'aethel-gold',
    ambient: ['fog_gold', 'vignette_hard'],
    audio: 'ambient_archive',
    portraitDefault: 'theron',
    transition: 'fade',
    textAlign: 'left'
  },
  'shadow-niche': {
    particleTheme: 'lethe-purple',
    ambient: ['fog_purple', 'vignette_soft'],
    audio: 'ambient_shadow',
    portraitDefault: 'mira',
    transition: 'fade',
    textAlign: 'left'
  },
  'iron-gates': {
    particleTheme: 'iron-sparks',
    ambient: ['iron_haze', 'vignette_hard'],
    audio: 'ambient_iron',
    portraitDefault: 'elara',
    transition: 'fade',
    textAlign: 'center'
  },
  'void-whisper': {
    particleTheme: 'void-smoke',
    ambient: ['fog_void', 'vignette_extreme'],
    audio: 'ambient_void',
    portraitDefault: 'nyx',
    transition: 'dissolve',
    textAlign: 'left'
  },
  'ash-field': {
    particleTheme: 'ash-snow',
    ambient: ['ash_rain', 'vignette_extreme'],
    audio: 'ambient_ash',
    portraitDefault: 'narrator',
    transition: 'dramatic',
    textAlign: 'left'
  },
  'ash-garden': {
    particleTheme: 'glass-shards',
    ambient: ['fog_gold', 'vignette_hard'],
    audio: 'ambient_ash',
    portraitDefault: 'malakor',
    transition: 'dramatic',
    textAlign: 'left'
  },
  'eye-of-archive': {
    particleTheme: 'duality',
    ambient: ['duality_split', 'vignette_hard'],
    audio: 'ambient_archive',
    portraitDefault: 'narrator',
    transition: 'dramatic',
    textAlign: 'left'
  }
};

// ---- Helpers ----

export function getParticleTheme(id) {
  return PARTICLE_THEMES[id] || PARTICLE_THEMES['aethel-gold'];
}

export function getAmbientLayer(id) {
  return AMBIENT_LAYERS[id] || null;
}

export function getAudioCue(id) {
  return AUDIO_CUES[id] || null;
}

export function getPortrait(id) {
  return CINEMATIC_PORTRAITS[id] || CINEMATIC_PORTRAITS.narrator;
}

export function getTransition(id) {
  return CINEMATIC_TRANSITIONS[id] || CINEMATIC_TRANSITIONS.fade;
}

/**
 * Liefert das komplette Asset-Bundle für eine Scene-ID.
 * @param {string} sceneId
 * @returns {Object}
 */
export function getSceneAssets(sceneId) {
  const binding = SCENE_ASSET_BINDINGS[sceneId] || SCENE_ASSET_BINDINGS['archive-halls'];
  return {
    particleTheme: getParticleTheme(binding.particleTheme),
    ambient: (binding.ambient || []).map(getAmbientLayer).filter(Boolean),
    audio: getAudioCue(binding.audio),
    portrait: getPortrait(binding.portraitDefault),
    transition: getTransition(binding.transition),
    textAlign: binding.textAlign || 'left'
  };
}

export default {
  PARTICLE_THEMES,
  AMBIENT_LAYERS,
  AUDIO_CUES,
  CINEMATIC_PORTRAITS,
  CINEMATIC_TRANSITIONS,
  SCENE_ASSET_BINDINGS,
  getParticleTheme,
  getAmbientLayer,
  getAudioCue,
  getPortrait,
  getTransition,
  getSceneAssets
};
