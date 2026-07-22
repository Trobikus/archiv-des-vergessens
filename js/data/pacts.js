/**
 * ============================================================
 * FILE: js/data/pacts.js – Die Finstren Pakte (v2.0)
 * ============================================================
 */

export const PACTS = {
  greedy_souls: {
    id: 'greedy_souls',
    name: 'Pakt der gierigen Seelen',
    name_en: 'Pact of Greedy Souls',
    desc: 'Ein düsteres Versprechen, das die Mneme-Partikel fließen lässt, doch materielle Schätze im Dunkeln verbergen lässt.',
    desc_en: 'A dark promise that lets Mneme particles flow, but hides material treasures in the dark.',
    passiveText: '🪙 +100% Mneme-Partikel-Ertrag aus allen Quellen',
    passiveText_en: '🪙 +100% Mneme Particle yield from all sources',
    curseText: '💀 -40% Relikte & Artefakte aus allen Quellen',
    curseText_en: '💀 -40% Relics & Artifacts from all sources',
    modifiers: {
      particles_mult: 2.0,
      relics_mult: 0.6,
      artifacts_mult: 0.6
    }
  },
  solitary_wanderer: {
    id: 'solitary_wanderer',
    name: 'Pakt des einsamen Wandlers',
    name_en: 'Pact of the Solitary Wanderer',
    desc: 'Deine eigenen Hände werden zu mächtigen Werkzeugen des Archivs, doch dein Bund verliert den Fokus.',
    desc_en: 'Your own hands become powerful tools of the Archive, but your covenant loses focus.',
    passiveText: '✨ +150% Ertrag und Stärke bei manuellen Klicks',
    passiveText_en: '✨ +150% Yield and strength of manual clicks',
    curseText: '⏳ Normale Expeditionen dauern 50% länger',
    curseText_en: '⏳ Normal expeditions take 50% longer',
    modifiers: {
      click_mult: 2.5,
      expedition_time_mult: 1.5
    }
  },
  scourged_bodies: {
    id: 'scourged_bodies',
    name: 'Pakt der geschundenen Körper',
    name_en: 'Pact of Scourged Bodies',
    desc: 'Stähle das Fleisch und schärfe den Stahl deines Helden für die Finsternis, auf Kosten deiner handwerklichen Finesse.',
    desc_en: 'Steel the flesh and sharpen the steel of your hero for the darkness, at the cost of your crafting finesse.',
    passiveText: '⚔️ +50% Angriff & Verteidigung für den Helden',
    passiveText_en: '⚔️ +50% Attack & Defense for the hero',
    curseText: '⚒️ -20% gewonnene Handwerks- & Schmiede-Erfahrung',
    curseText_en: '⚒️ -20% Crafting & Smithing experience gained',
    modifiers: {
      attack_defense_mult: 1.5,
      crafting_xp_mult: 0.8
    }
  },
  ancient_folios: {
    id: 'ancient_folios',
    name: 'Pakt der uralten Folianten',
    name_en: 'Pact of Ancient Folios',
    desc: 'Trinke tief aus den Brunnen verlorenen Wissens, um blitzschnell aufzusteigen. Doch die Stärkung deines Geistes verlangt Tribut.',
    desc_en: 'Drink deep from the wells of lost knowledge to level up rapidly. But strengthening your mind demands a toll.',
    passiveText: '📚 +100% gewonnene Helden-Erfahrung',
    passiveText_en: '📚 +100% Hero Experience gained',
    curseText: '🪙 Klick-Stärken-Upgrades im Spiel kosten 50% mehr',
    curseText_en: '🪙 Click power upgrades cost 50% more',
    modifiers: {
      hero_xp_mult: 2.0,
      click_upgrade_cost_mult: 1.5
    }
  },
  ruthless_greed: {
    id: 'ruthless_greed',
    name: 'Pakt der rücksichtslosen Gier',
    name_en: 'Pact of Ruthless Greed',
    desc: 'Deine Sinne spüren seltene Relikte mit unbändiger Gier auf, doch du verlierst die Ruhe beim bloßen Extrahieren.',
    desc_en: 'Your senses detect rare relics with wild greed, but you lose peace of mind during simple extraction.',
    passiveText: '💎 +50% Reliktjagd-Effizienz und Beutemenge',
    passiveText_en: '💎 +50% Relic Hunt efficiency and loot quantity',
    curseText: '💀 Manueller Klickertrag um 30% verringert',
    curseText_en: '💀 Manual click yield reduced by 30%',
    modifiers: {
      relic_hunt_mult: 1.5,
      click_earn_mult: 0.7
    }
  },
  shadowy_legions: {
    id: 'shadowy_legions',
    name: 'Pakt der schattenhaften Legion',
    name_en: 'Pact of Shadowy Legions',
    desc: 'Rufe schattenhafte Verbündete in die heroischen Clan-Raids, während dein eigener Level-Aufstieg mühseliger wird.',
    desc_en: 'Summon shadowy allies into heroic Clan Raids, while your own leveling becomes more arduous.',
    passiveText: '⚔️ Clan-Raids dauern 50% kürzer (Schattenhafte Unterstützung)',
    passiveText_en: '⚔️ Clan Raids take 50% less time (Shadowy assistance)',
    curseText: '📚 Helden-Level-Aufstiege benötigen 30% mehr Erfahrung',
    curseText_en: '📚 Hero level-ups require 30% more experience',
    modifiers: {
      clan_raid_time_mult: 0.5,
      hero_lvl_xp_req_mult: 1.3
    }
  }
};

export default PACTS;
