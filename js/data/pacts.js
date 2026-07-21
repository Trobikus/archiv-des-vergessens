/**
 * ============================================================
 * FILE: js/data/pacts.js – Die Finstren Pakte (v2.0)
 * ============================================================
 */

export const PACTS = {
  greedy_souls: {
    id: 'greedy_souls',
    name: 'Pakt der gierigen Seelen',
    desc: 'Ein düsteres Versprechen, das die Mneme-Partikel fließen lässt, doch materielle Schätze im Dunkeln verbergen lässt.',
    passiveText: '🪙 +100% Mneme-Partikel-Ertrag aus allen Quellen',
    curseText: '💀 -40% Relikte & Artefakte aus allen Quellen',
    modifiers: {
      particles_mult: 2.0,
      relics_mult: 0.6,
      artifacts_mult: 0.6
    }
  },
  solitary_wanderer: {
    id: 'solitary_wanderer',
    name: 'Pakt des einsamen Wandlers',
    desc: 'Deine eigenen Hände werden zu mächtigen Werkzeugen des Archivs, doch dein Bund verliert den Fokus.',
    passiveText: '✨ +150% Ertrag und Stärke bei manuellen Klicks',
    curseText: '⏳ Normale Expeditionen dauern 50% länger',
    modifiers: {
      click_mult: 2.5,
      expedition_time_mult: 1.5
    }
  },
  scourged_bodies: {
    id: 'scourged_bodies',
    name: 'Pakt der geschundenen Körper',
    desc: 'Stähle das Fleisch und schärfe den Stahl deines Helden für die Finsternis, auf Kosten deiner handwerklichen Finesse.',
    passiveText: '⚔️ +50% Angriff & Verteidigung für den Helden',
    curseText: '⚒️ -20% gewonnene Handwerks- & Schmiede-Erfahrung',
    modifiers: {
      attack_defense_mult: 1.5,
      crafting_xp_mult: 0.8
    }
  },
  ancient_folios: {
    id: 'ancient_folios',
    name: 'Pakt der uralten Folianten',
    desc: 'Trinke tief aus den Brunnen verlorenen Wissens, um blitzschnell aufzusteigen. Doch die Stärkung deines Geistes verlangt Tribut.',
    passiveText: '📚 +100% gewonnene Helden-Erfahrung',
    curseText: '🪙 Klick-Stärken-Upgrades im Spiel kosten 50% mehr',
    modifiers: {
      hero_xp_mult: 2.0,
      click_upgrade_cost_mult: 1.5
    }
  },
  ruthless_greed: {
    id: 'ruthless_greed',
    name: 'Pakt der rücksichtslosen Gier',
    desc: 'Deine Sinne spüren seltene Relikte mit unbändiger Gier auf, doch du verlierst die Ruhe beim bloßen Extrahieren.',
    passiveText: '💎 +50% Reliktjagd-Effizienz und Beutemenge',
    curseText: '💀 Manueller Klickertrag um 30% verringert',
    modifiers: {
      relic_hunt_mult: 1.5,
      click_earn_mult: 0.7
    }
  },
  shadowy_legions: {
    id: 'shadowy_legions',
    name: 'Pakt der schattenhaften Legion',
    desc: 'Rufe schattenhafte Verbündete in die heroischen Clan-Raids, während dein eigener Level-Aufstieg mühseliger wird.',
    passiveText: '⚔️ Clan-Raids dauern 50% kürzer (Schattenhafte Unterstützung)',
    curseText: '📚 Helden-Level-Aufstiege benötigen 30% mehr Erfahrung',
    modifiers: {
      clan_raid_time_mult: 0.5,
      hero_lvl_xp_req_mult: 1.3
    }
  }
};

export default PACTS;
