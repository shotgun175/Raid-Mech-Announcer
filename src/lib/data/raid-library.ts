import type { Difficulty, Gate, Mechanic, Severity, TriggerType } from "$lib/mech-types";

// Hand-curated boss HP bar counts. Intentionally NOT sourced from Npc.json hpBars
// since those start far above the first mechanic threshold. These values place
// the simulation slider near the first real mechanic so the editor preview is useful.
export const bossHpMap: Record<string, number> = {
  "Dark Mountain Predator": 50,
  "Destroyer Lucas": 50,
  "Leader Lugaru": 50,
  "Demon Beast Commander Valtan": 160,
  "Ravaged Tyrant of Beasts": 40,
  "Incubus Morphe": 60,
  "Nightmarish Morphe": 60,
  "Covetous Devourer Vykas": 160,
  "Covetous Legion Commander Vykas": 180,
  "Saydon": 160,
  "Kakul": 140,
  "Kakul-Saydon": 180,
  "Encore-Desiring Kakul-Saydon": 77,
  "Gehenna Helkasirs": 120,
  "Ashtarot": 170,
  "Primordial Nightmare": 190,
  "Brelshaza, Monarch of Nightmares": 200,
  "Imagined Primordial Nightmare": 20,
  "Pseudospace Primordial Nightmare": 20,
  "Phantom Legion Commander Brelshaza": 250,
  "Griefbringer Maurug": 150,
  "Evolved Maurug": 30,
  "Lord of Degradation Akkan": 190,
  "Plague Legion Commander Akkan": 220,
  "Lord of Kartheon Akkan": 300,
  "Tienis": 110,
  "Celestial Sentinel": 60,
  "Prunya": 90,
  "Lauriel": 200,
  "Kaltaya, the Blooming Chaos": 120,
  "Rakathus, the Lurking Arrogance": 160,
  "Firehorn, Trampler of Earth": 160,
  "Lazaram, the Trailblazer": 200,
  "Killineza the Dark Worshipper": 180,
  "Valinak, Knight of Darkness": 180,
  "Valinak, Taboo Usurper": 180,
  "Valinak, Herald of the End": 180,
  "Thaemine the Lightqueller": 300,
  "Dark Greatsword": 40,
  "Darkness Legion Commander Thaemine": 350,
  "Thaemine Prokel": 35,
  "Thaemine, Conqueror of Stars": 350,
  "Red Doom Narkiel": 180,
  "Agris": 100,
  "Echidna": 285,
  "Covetous Master Echidna": 137,
  "Alcaone, the Twisted Venom": 86,
  "Agris, the Devouring Bog": 103,
  "Behemoth, the Storm Commander": 500,
  "Behemoth, Cruel Storm Slayer": 705,
  "Akkan, Lord of Death": 220,
  "Aegir, the Oppressor": 300,
  "Narok the Butcher": 300,
  "Thaemine, Master of Darkness": 300,
  "Infernas": 300,
  "Blossoming Fear, Naitreya": 300,
  "Mordum, the Abyssal Punisher": 500,
  "Flash of Punishment": 350,
  "Abyssal Beast, Narhash": 100,
  "Flame of Darkness, Tarkal": 300,
  "Act 4: Covetous Master Echidna": 300,
  "Brelshaza, Ember in the Ashes": 450,
  "Armoche, Sentinel of the Abyss": 450,
  "Abyss Lord Kazeros": 1000,
  "God of Death Kazeros": 777,
  "Archdemon Kazeros": 1000,
  "Death Incarnate Kazeros": 777,
  "Witch of Agony, Serca": 300,
  "Corvus Tul Rak": 300
};

export interface LibraryMechanic {
  key: string;
  name: string;
  severity: Severity;
  triggerType: TriggerType;
  hpBar?: number;
  timerSecs?: number;
  repeatSecs?: number;
  notes?: string;
  difficulties?: Difficulty[];
}

export interface LibraryGate {
  encounterKey: string;
  raid: string;
  gate: number;
  releaseOrder: number; // index from encounters.json (higher = newer)
  boss: string;
  bossType: string;
  weakness: string;
  tauntable: boolean;
  mechanics: LibraryMechanic[];
  availableDifficulties?: Difficulty[]; // omitted = ["Normal", "Hard"]
  // Per-gate HP override. Use when two gates legitimately share a boss name in
  // LOA Logs' encounters.json (e.g. "Phantom Legion Commander Brelshaza" appears
  // in both old Brelshaza G4 and Act 2: Brelshaza G2 with different bar counts)
  // and bossHpMap can't disambiguate.
  totalBars?: number;
}

const LIBRARY: LibraryGate[] = [
  // ── Valtan (releaseOrder 1) ─────────────────────────────────────────────────
  {
    encounterKey: "Valtan G1",
    raid: "Valtan",
    gate: 1,
    releaseOrder: 1,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Dark Mountain Predator",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        key: "valtan-g1-blue-wolf-split",
        name: "Blue Wolf Split",
        hpBar: 40,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Separate wolves; Golden Orb Buff holders attack Blue Wolf; use Wei sidereal for coordination. (Maxroll calls this 'Invader (Blue Wolf)'.)"
      },
      {
        key: "valtan-g1-orb-phase",
        name: "Orb Phase",
        hpBar: 30,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Consume orbs to manage critical resources; Wei sidereal applicable. Solo: collect colored orbs in alternating order, then stagger after collecting all 4."
      },
      {
        key: "valtan-g1-red-wolf-split",
        name: "Red Wolf Split",
        hpBar: 25,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Mirror of Blue Wolf split with reversed buff assignments; reallocate buffs. (Maxroll calls this 'Invader (Red Wolf)'.)"
      },
      {
        key: "valtan-g1-orb-phase-2nd",
        name: "Orb Phase (2nd)",
        hpBar: 15,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Second orb consumption phase; Wei sidereal applicable; push to finish after. Solo: same alternating-orb sequence as 1st Orb Phase."
      }
    ]
  },
  {
    encounterKey: "Valtan G2",
    raid: "Valtan",
    gate: 2,
    releaseOrder: 1,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Demon Beast Commander Valtan",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        key: "valtan-g2-armor-break",
        name: "Armor Break",
        hpBar: 160,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Use Corrosive Bomb and Destruction Bomb when Valtan charges into a wall; positioning-dependent. Solo: lead Valtan to charge at a pillar with blue orbs."
      },
      {
        key: "valtan-g2-wipe-pattern",
        name: "Wipe Pattern",
        hpBar: 130,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Heavy raid-wide wipe mechanic; use Balthorr sidereal. Solo: dodge pizza pattern and secure blue orbs beforehand."
      },
      {
        key: "valtan-g2-pillar-hug",
        name: "Pillar Hug",
        hpBar: 110,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Pillars block Yellow Zone damage; hide behind pillar or use Time Stop Potion with strict dodge timing"
      },
      {
        key: "valtan-g2-stage-break",
        name: "Stage Break",
        hpBar: 85,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Red telegraphs signal arena halving; move to opposite side from broken half"
      },
      {
        key: "valtan-g2-counter",
        name: "Counter",
        hpBar: 65,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Counter precisely ~3 seconds after Valtan's turning animation; strict timing"
      },
      {
        key: "valtan-g2-ghost-phase",
        name: "Ghost Phase",
        hpBar: 40,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Counter ghost clones to remove armor stacks and build Sidereal meter; use Thirain after all stacks removed. Hard: 6 armor stacks vs 4 in Normal."
      },
      {
        key: "valtan-g2-stage-break-2nd",
        name: "Stage Break (2nd)",
        hpBar: 35,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Arena breaks again; move to opposite safe side; spatial awareness critical"
      },
      {
        key: "valtan-g2-ghost-transition",
        name: "Ghost Transition",
        hpBar: 17,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Group up to direct Valtan's strike to one spot; use Balthorr sidereal; heavy coordination required"
      }
    ]
  },

  // ── Vykas (releaseOrder 2) ──────────────────────────────────────────────────
  {
    encounterKey: "Vykas G1",
    raid: "Vykas",
    gate: 1,
    releaseOrder: 2,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Incubus Morphe",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        key: "vykas-g1-clone-rotation",
        name: "Clone Rotation",
        hpBar: 120,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "5 players take orbs in center; 3 scout for wing count (0/1/2); rotate Purple 0→1→2 and Red 2→1→0; use Nineveh sidereal. Solo: pick up purple orb, follow wing patterns (Red Open→Half→Closed, Purple Closed→Half→Open)."
      },
      {
        key: "vykas-g1-clone-absorption",
        name: "Clone Absorption",
        hpBar: 65,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Memorize black shockwaves and block black orbs from the clone; 5 shockwaves total; use Nineveh sidereal; memory-intensive. Hard: any black orb reaching boss = wipe."
      },
      {
        key: "vykas-g1-stun-shotgun",
        name: "Stun Shotgun",
        hpBar: 60,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "V-shaped purple outline marks players; position away from center"
      },
      {
        key: "vykas-g1-multiple-shockwaves",
        name: "Multiple Shockwaves",
        hpBar: 45,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Four shockwaves in fixed pattern: stand outside → inside → inside → outside"
      }
    ]
  },
  {
    encounterKey: "Vykas G2",
    raid: "Vykas",
    gate: 2,
    releaseOrder: 2,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Covetous Devourer Vykas",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        key: "vykas-g2-swamp",
        name: "Swamp",
        hpBar: 170,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Two players marked with brown puddle; place swamp in marked area; others drop speed puddles. Solo: drop speed puddle outside, proceed to rally point."
      },
      {
        key: "vykas-g2-sword-clones",
        name: "Sword & Clones",
        hpBar: 150,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: ">70% Meter: ping sword locations; <70% Meter: ping clone overlaps; meter-dependent callouts"
      },
      {
        key: "vykas-g2-key-input",
        name: "Key Input",
        hpBar: 135,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Use north yellow orb to reduce Seduction Gauge to 0; execute key input; use Nineveh sidereal after key input. Failures trigger shield/shockwave."
      },
      {
        key: "vykas-g2-throne",
        name: "Throne",
        hpBar: 120,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Stack Seduction Puddles to max everyone's gauge to 100%. Solo: place puddle and stand on it to reach 100% gauge."
      },
      {
        key: "vykas-g2-stagger-check",
        name: "Stagger Check",
        hpBar: 102,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Use west orb + stagger OR Wei sidereal with top slime while others kill bottom. Apply Time Stop Potion before slime explosions. Solo: kill monster spawn, then stagger boss."
      },
      {
        key: "vykas-g2-swamp-2nd",
        name: "Swamp (2nd)",
        hpBar: 75,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Safe spot highlighted white on Human side; Human team calls out safe spot to Demon team"
      },
      {
        key: "vykas-g2-tentacles",
        name: "Tentacles",
        hpBar: 55,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Destroy tentacles while maintaining 70%-99% gauge using red orbs. Tentacles only destroyable by players with >70% Meter."
      },
      {
        key: "vykas-g2-last-struggle",
        name: "Last Struggle",
        hpBar: 5,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Find real Vykas, get behind and stagger before team reaches 100% gauge; use Wei sidereal. Solo: use orb to reset gauge."
      }
    ]
  },

  // ── Kakul-Saydon / Clown (releaseOrder 3) ──────────────────────────────────
  {
    encounterKey: "Clown G1",
    raid: "Clown",
    gate: 1,
    releaseOrder: 3,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Saydon",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        key: "clown-g1-break",
        name: "Break",
        hpBar: 130,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Stagger where there is no purple shield; attack the unprotected side"
      },
      {
        key: "clown-g1-heart",
        name: "Heart",
        hpBar: 110,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Ping hearts; face away from the non-heart if 3 are present; face the heart if only 1 is present. Solo: look at the odd one among three emoting clones."
      },
      {
        key: "clown-g1-simon-says",
        name: "Simon Says",
        hpBar: 85,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Mirror boss emote when it faces you; use a different emote when its back is turned"
      },
      {
        key: "clown-g1-break-2nd",
        name: "Break (2nd)",
        hpBar: 65,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Repeat stagger mechanic — attack where there is no purple shield"
      },
      {
        key: "clown-g1-roulette",
        name: "Roulette",
        hpBar: 45,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Match suit/symbol above your head with the space across 3 rounds; use Inanna sidereal. Solo: direct cards toward matching NPC symbols."
      },
      {
        key: "clown-g1-heart-2nd",
        name: "Heart (2nd)",
        hpBar: 25,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Repeat heart mechanic from x110; same logic, face the heart or away from non-heart"
      }
    ]
  },
  {
    encounterKey: "Clown G2",
    raid: "Clown",
    gate: 2,
    releaseOrder: 3,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Kakul",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        key: "clown-g2-saydon-appears",
        name: "Saydon Appears",
        hpBar: 125,
        triggerType: "hp",
        severity: "normal",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Saydon joins the fight; boss transformation phase — prepare for multi-mechanic overlap. Dodge circus balls and explosions until boss lands."
      },
      {
        key: "clown-g2-curtain",
        name: "Curtain",
        hpBar: 110,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Party splits: 2 players enter red dome, 1 player enters blue dome; handle dome mechanics separately. Solo: match your clown icon color to the corresponding safe dome."
      },
      {
        key: "clown-g2-flip",
        name: "Flip",
        hpBar: 95,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Find Kakul within 3 card flips; target 2nd/6th card initially; if unsuccessful, 4th position holds the answer. Solo: bait Saydon's hammer strikes to reveal cards."
      },
      {
        key: "clown-g2-maze",
        name: "Maze",
        hpBar: 75,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Kill matching suit enemies; coordinate via Discord or call positions by rows/columns; don't overlap"
      },
      {
        key: "clown-g2-pizza",
        name: "Pizza",
        hpBar: 55,
        triggerType: "hp",
        severity: "normal",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Watch star rotations (3 total) to determine movement direction; use Inanna sidereal"
      },
      {
        key: "clown-g2-flip-2nd",
        name: "Flip (2nd)",
        hpBar: 30,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Repeat card-finding mechanic from x95; same 2nd/6th → 4th fallback"
      }
    ]
  },
  {
    encounterKey: "Clown G3",
    raid: "Clown",
    gate: 3,
    releaseOrder: 3,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Kakul-Saydon",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        key: "clown-g3-mario-stage-1",
        name: "Mario Stage 1",
        hpBar: 155,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "First Mario player enters stage (15s portal window); vertical saws Iron Maiden mechanic follows during curtain call"
      },
      {
        key: "clown-g3-mario-stage-2",
        name: "Mario Stage 2",
        hpBar: 130,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Second Mario with hooks Iron Maiden mechanic; dodge hooks while managing curtain call"
      },
      {
        key: "clown-g3-showtime",
        name: "Showtime",
        hpBar: 90,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Group to bottom to dodge initial bullet shower; person targeted by cone stands in front of bomb. Solo: dodge explosions, aim cones at bombs, evade crosshair."
      },
      {
        key: "clown-g3-mario-stage-3",
        name: "Mario Stage 3",
        hpBar: 80,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Hooks and saws combination Iron Maiden; most complex Mario stage"
      },
      {
        key: "clown-g3-mario-stage-4",
        name: "Mario Stage 4",
        hpBar: 55,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Must pull both levers before the stagger check window opens (Iron Maiden Levers + Typing — wipe risk if missed)"
      },
      {
        key: "clown-g3-bingo",
        name: "Bingo",
        hpBar: 0,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Final Bingo phase; use Bingo-Tool to coordinate; every 3rd bomb triggers channel; fail = wipe"
      }
    ]
  },

  // ── Brelshaza (releaseOrder 4) ──────────────────────────────────────────────
  {
    encounterKey: "Brelshaza G1",
    raid: "Brelshaza",
    gate: 1,
    releaseOrder: 4,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Gehenna Helkasirs",
    bossType: "ANCIENT",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "brelshaza-g1-safe-zones",
        name: "Safe Zones",
        hpBar: 85,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Assign positions before fight; occupy your spawned safe zone immediately when it appears. Solo: occupy one safe zone while NPCs cover others."
      },
      {
        key: "brelshaza-g1-sidereal-phase",
        name: "Sidereal Phase",
        hpBar: 45,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Use Azena sidereal; complete 6 counter attacks; Hammer & Bow Split: use Thirain once both bosses are aligned. Solo: only 3 counters required."
      }
    ]
  },
  {
    encounterKey: "Brelshaza G2",
    raid: "Brelshaza",
    gate: 2,
    releaseOrder: 4,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Ashtarot",
    bossType: "ANCIENT",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "brelshaza-g2-meteors-stagger",
        name: "Meteors + Stagger",
        hpBar: 145,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "8 Meteors fall in set positions; complete typing test then stagger — all three must succeed. Solo: one meteor typing test."
      },
      {
        key: "brelshaza-g2-medusa-stagger",
        name: "Medusa + Stagger",
        hpBar: 100,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Cat's eye = look away; Round eye = look inside the AoE; stagger after resolving eye"
      },
      {
        key: "brelshaza-g2-shapes",
        name: "Shapes",
        hpBar: 43,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Destroy assigned stars, squares, and diamonds per color pattern; wrong shape = chain explosion. Solo: break one shape pair."
      },
      {
        key: "brelshaza-g2-red-blue-spears",
        name: "Red & Blue Spears",
        hpBar: 0,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Consume 6+ colored areas to complete; failure triggers healing and repeat"
      }
    ]
  },
  {
    encounterKey: "Brelshaza G3",
    raid: "Brelshaza",
    gate: 3,
    releaseOrder: 4,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Primordial Nightmare",
    bossType: "ANCIENT",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "brelshaza-g3-dream-world-1st",
        name: "Dream World (1st)",
        hpBar: 212,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Check shape, dodge projectiles, navigate safe tiles with reversed inputs, then report what you saw to the party"
      },
      {
        key: "brelshaza-g3-golden-meteor-1st",
        name: "Golden Meteor (1st)",
        hpBar: 188,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Track blue meteor order; gold meteor always at 12 o'clock; escape the zone when placed. Solo: position at map corners; nearby tiles disappear upon impact."
      },
      {
        key: "brelshaza-g3-black-hole",
        name: "Black Hole",
        hpBar: 113,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Party1 x3, Party2 x3+1; teams inside/outside collect yellow orbs, counter illusions; HM: can skip with Shandi + high DPS. Solo: collect orbs, counter/stagger clones, survive explosions."
      },
      {
        key: "brelshaza-g3-dream-world-2nd",
        name: "Dream World (2nd)",
        hpBar: 28,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Repeat shape mechanic; random inputs this time; use Inanna sidereal to cleanse"
      },
      {
        key: "brelshaza-g3-final-nightmare",
        name: "Final Nightmare",
        hpBar: 0,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Destroy final orb; avoid 3/6/9/12 o'clock cardinal positions; push damage to finish"
      }
    ]
  },
  {
    encounterKey: "Brelshaza G4",
    raid: "Brelshaza",
    gate: 4,
    releaseOrder: 4,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Phantom Legion Commander Brelshaza",
    bossType: "ANCIENT",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "brelshaza-g4-red-blue-yellow-domes-1st",
        name: "Red/Blue/Yellow Domes (1st)",
        hpBar: 170,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Color-dependent dome mechanic; lowest stagger player enters dome; collect required objects after stagger resolves. Solo: Red — stagger boss, grab pyramid buff; Blue — stagger cube, typing test, dodge laser; Yellow — destroy sphere, catch orb, stagger."
      },
      {
        key: "brelshaza-g4-red-blue-yellow-domes-2nd",
        name: "Red/Blue/Yellow Domes (2nd)",
        hpBar: 120,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Second color dome phase; cannot repeat previous color"
      },
      {
        key: "brelshaza-g4-stagger-check-1st",
        name: "Stagger Check (1st)",
        hpBar: 95,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Use Inanna sidereal (cleanse) or Wei sidereal (high stagger damage); coordinate sidereal usage"
      },
      {
        key: "brelshaza-g4-red-blue-yellow-domes-3rd",
        name: "Red/Blue/Yellow Domes (3rd)",
        hpBar: 60,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Third color dome phase"
      },
      {
        key: "brelshaza-g4-stagger-check-2nd",
        name: "Stagger Check (2nd)",
        hpBar: 20,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Final stagger check; applies 20% damage increase debuff (Hard); use remaining sidereals; push to end"
      }
    ]
  },

  // ── Kayangel (releaseOrder 5) ───────────────────────────────────────────────
  {
    encounterKey: "Kayangel G1",
    raid: "Kayangel",
    gate: 1,
    releaseOrder: 5,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Tienis",
    bossType: "HUMAN",
    weakness: "Weak to Dark",
    tauntable: true,
    mechanics: [
      {
        key: "kayangel-g1-dodge-minigame",
        name: "Dodge Minigame",
        hpBar: 55,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Arena breaks, lightning runs through map, constant pull downward. Spacebar spear toss; avoid AoE knockback; puddles after x55 stun on contact; HM: additional lightning narrows safe spots. Solo: dodge AoEs and spacebar spear without team support."
      }
    ]
  },
  {
    encounterKey: "Kayangel G2",
    raid: "Kayangel",
    gate: 2,
    releaseOrder: 5,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Prunya",
    bossType: "HUMAN",
    weakness: "Weak to Dark",
    tauntable: true,
    mechanics: [
      {
        key: "kayangel-g2-rotating-elements",
        name: "Rotating Elements",
        hpBar: 62,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Intercept orbs, rotate counterclockwise avoiding repeated directions, destroy counter-element. Solo: block orbs and destroy the strong element (no rotation needed)."
      },
      {
        key: "kayangel-g2-counter-stagger",
        name: "Counter/Stagger",
        hpBar: 42,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Counter all three mobs before boss stagger; missing any counter fails the mechanic; HM: additional counter mobs. Solo: counter one soldier, then stagger boss."
      },
      {
        key: "kayangel-g2-rings",
        name: "Rings",
        hpBar: 20,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Assign players to rings by color; failing 3 times wipes; HM: third ring requires two players splitting coverage. Solo: destroy orbs matching ring color weaknesses."
      }
    ]
  },
  {
    encounterKey: "Kayangel G3",
    raid: "Kayangel",
    gate: 3,
    releaseOrder: 5,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Lauriel",
    bossType: "HUMAN",
    weakness: "Weak to Dark",
    tauntable: true,
    mechanics: [
      {
        key: "kayangel-g3-explosions-egg-break",
        name: "Explosions / Egg Break",
        hpBar: 180,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Dodge 3 explosions then aim laser at egg for a 2-minute damage buff; HM: explosions overlap with orb collection. Solo: position near edge eggs; rotate boss to touch mirror to egg."
      },
      {
        key: "kayangel-g3-light-delivery",
        name: "Light Delivery",
        hpBar: 135,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Reflect beam through each player into boss in party order; don't stack to prevent imprisonment; HM: black puddles require angle adjustments. Solo: guide final laser toward boss instead of reflecting through teammates."
      },
      {
        key: "kayangel-g3-white-orbs-sunlight",
        name: "White Orbs / Sunlight",
        hpBar: 100,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Collect 5 white orbs for shield; black orbs stun — avoid; use Time Stop Potion if shield is missed"
      },
      {
        key: "kayangel-g3-pillars-clones",
        name: "Pillars / Clones",
        hpBar: 60,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Ping red pillars with runes then stagger the matching clone; coordinate pings clearly"
      }
    ]
  },

  // ── Akkan (releaseOrder 6) ──────────────────────────────────────────────────
  {
    encounterKey: "Akkan G1",
    raid: "Akkan",
    gate: 1,
    releaseOrder: 6,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Griefbringer Maurug",
    bossType: "OTHER",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "akkan-g1-8-tumor-orbs-spear",
        name: "8 Tumor Orbs / Spear",
        hpBar: 140,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Spears inflict percentage HP damage; time orb contact carefully to avoid overlap"
      },
      {
        key: "akkan-g1-cleanse-stagger",
        name: "Cleanse / Stagger",
        hpBar: 128,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Touching opposite-color tumor = debuff (heal reduction + DoT); two tumors = death; HM: 4 orbs, one different color marks grab position. Solo: use Sidereal: Wei to cleanse."
      },
      {
        key: "akkan-g1-orbs-grab-stagger",
        name: "Orbs / Grab / Stagger",
        hpBar: 112,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Only the different-colored orb designates grab position (HM); stagger check after grab resolves. Solo: destroy matching-color orbs or stagger boss independently."
      },
      {
        key: "akkan-g1-flood-escape",
        name: "Flood Escape",
        hpBar: 90,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Evacuation phase — wrong path = instant death (HM) vs destroyable barricade (NM); memorize route"
      },
      {
        key: "akkan-g1-stop-mobs",
        name: "Stop Mobs",
        hpBar: 75,
        triggerType: "hp",
        severity: "normal",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Kill mob waves before they reach objective; HM: must eliminate 2 large mobs instead of 1"
      },
      {
        key: "akkan-g1-inanna-stagger",
        name: "Inanna Stagger",
        hpBar: 50,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Use Inanna sidereal — converts to free DPS phase when boss stands; deploy Thirain immediately after for bonus damage before 60s timer"
      },
      {
        key: "akkan-g1-shield-bells",
        name: "Shield / Bells",
        hpBar: 20,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Break shield while managing green puddle stacks; green circles inflict 30%+ damage taken vulnerability"
      }
    ]
  },
  {
    encounterKey: "Akkan G2",
    raid: "Akkan",
    gate: 2,
    releaseOrder: 6,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Lord of Degradation Akkan",
    bossType: "OTHER",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "akkan-g2-tentacles",
        name: "Tentacles",
        hpBar: 175,
        triggerType: "hp",
        severity: "normal",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Stay away from center; destroy tentacles quickly before they charge"
      },
      {
        key: "akkan-g2-ghost",
        name: "Ghost",
        hpBar: 160,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Prevent red ghost from reaching skull; pass skull clockwise; HM: green ghost also spawns; optional Camouflage Robe for invisibility. Solo: throw skull to yellow-marked locations at 5, 7, 11, 1 o'clock."
      },
      {
        key: "akkan-g2-red-hole",
        name: "Red Hole",
        hpBar: 140,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Avoid touching red hole or ring explosions (heavy disease meter increase); dodge teleport after third explosion"
      },
      {
        key: "akkan-g2-hide",
        name: "Hide",
        hpBar: 110,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Take cover from Akkan's incoming sweep; find a valid safe position"
      },
      {
        key: "akkan-g2-red-hole-2nd",
        name: "Red Hole (2nd)",
        hpBar: 85,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Repeat red hole; use Thirain sidereal in front of boss for damage boost and extended safe window"
      },
      {
        key: "akkan-g2-ghost-2nd",
        name: "Ghost (2nd)",
        hpBar: 55,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Counter clones to build Sidereal meter ~33% per counter; HM: petrified players executed by Akkan at mechanic end. Solo: counter Akkan clones for 50% Sidereal Meter per success."
      },
      {
        key: "akkan-g2-red-hole-3rd",
        name: "Red Hole (3rd)",
        hpBar: 30,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Final red hole; same avoidance as previous instances; push damage after"
      },
      {
        key: "akkan-g2-destruction",
        name: "Destruction",
        hpBar: 0,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Use Thirain sidereal immediately; HM: counterable clones build Sidereal meter ~33% each; don't stand in Big Scythe path (instant kill)"
      }
    ]
  },
  {
    encounterKey: "Akkan G3",
    raid: "Akkan",
    gate: 3,
    releaseOrder: 6,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Plague Legion Commander Akkan",
    bossType: "OTHER",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "akkan-g3-water-park-black-mist",
        name: "Water Park / Black Mist",
        hpBar: 300,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Hard"],
        notes:
          "HM only — Giant Akkan phase; squared arena with water hazards below ledges; Akkan Smash at x235 and x135: ledge-jump or step on Worm Trap to survive; Water Park tilts arena sideways at x200"
      },
      {
        key: "akkan-g3-x-stagger",
        name: "X Stagger",
        hpBar: 200,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Intercept orange lasers, stagger boss. Disease meter fills from attacks; 5th stack = charm explosion that kills nearby players."
      },
      {
        key: "akkan-g3-line-delivery-stagger",
        name: "Line Delivery & Stagger",
        hpBar: 165,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Block/deliver lasers. Use Inanna sidereal to reduce gauge; prevent knockoff deaths during destruction phases. Solo: NPCs block orange/green lasers; you solo-manage purple laser."
      },
      {
        key: "akkan-g3-star-or-hexagon",
        name: "Star or Hexagon",
        hpBar: 140,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Rotate towers to form shape; identify star vs hexagon pattern. HM: pizza with 5 consecutive explosions — use Time Stop Potion for safety."
      },
      {
        key: "akkan-g3-plague-wave",
        name: "Plague Wave",
        hpBar: 139,
        repeatSecs: 60,
        triggerType: "hp+timer",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Persistent disease meter mechanic recurs ~every 60s through the random-gimmicks phase (3 safespots / 4 curses / skulls / slimes)"
      },
      {
        key: "akkan-g3-arena-break",
        name: "Arena Break",
        hpBar: 30,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Boss breaks arena edge; dodge frontal/side/rotating lasers; use Wei at x15 to skip final destruction"
      },
      {
        key: "akkan-g3-destruction",
        name: "Destruction",
        hpBar: 0,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Complete knockback check. Don't stand in Big Scythe path (instant kill HM); use Wei sidereal at x15+ to skip."
      }
    ]
  },

  // ── Ivory Tower (releaseOrder 7) ────────────────────────────────────────────
  {
    encounterKey: "Ivory Tower G1",
    raid: "Ivory Tower",
    gate: 1,
    releaseOrder: 7,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Kaltaya, the Blooming Chaos",
    bossType: "OTHER",
    weakness: "Weak to Fire",
    tauntable: false,
    mechanics: [
      {
        key: "ivory-tower-g1-catch-stagger",
        name: "Catch / Stagger",
        hpBar: 85,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Collect green seeds while avoiding purple ones; stagger the boss once seeds collected"
      },
      {
        key: "ivory-tower-g1-orbs-fire",
        name: "Orbs / Fire",
        hpBar: 45,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Guide the plant to destroy golden dust; attack purple orbs until x15; use Flame Grenade when DR expires (45s window) or boss becomes more dangerous"
      }
    ]
  },
  {
    encounterKey: "Ivory Tower G2",
    raid: "Ivory Tower",
    gate: 2,
    releaseOrder: 7,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Rakathus, the Lurking Arrogance",
    bossType: "OTHER",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "ivory-tower-g2-clones",
        name: "Clones",
        hpBar: 95,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Support stays center at clock positions; counter and kill clones as they appear. Solo: counter clone alone. Keep armor ≤ 4 stacks — 5 = wipe."
      },
      {
        key: "ivory-tower-g2-marathon-stagger",
        name: "Marathon / Stagger",
        hpBar: 30,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Gather at center, move to opposite side of boss, wait for flame breath, then rush in and stagger"
      }
    ]
  },
  {
    encounterKey: "Ivory Tower G3",
    raid: "Ivory Tower",
    gate: 3,
    releaseOrder: 7,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Firehorn, Trampler of Earth",
    bossType: "ANCIENT",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "ivory-tower-g3-stage-destruction-pizza",
        name: "Stage Destruction / Pizza",
        hpBar: 160,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Move to 3 positions; dodge 2 slices and mirror explosion; guide 3rd slice toward mirror; repeat clockwise. Solo: fixed position at 3 o'clock."
      },
      {
        key: "ivory-tower-g3-stagger",
        name: "Stagger",
        hpBar: 110,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Stagger boss first, then split into groups of 2 to stagger the bottom mirrors. Solo: independent mirror staggers."
      },
      {
        key: "ivory-tower-g3-mirror-counter",
        name: "Mirror Counter",
        hpBar: 60,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Use method '11223344'; counter real mirrors (red thorns) not fakes (purple thorns). Failing the stagger on time wipes."
      },
      {
        key: "ivory-tower-g3-sword-destruction",
        name: "Sword Destruction",
        hpBar: 60,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Move to 3 positions with Destruction Bomb; stagger; use weak point skills on destruction targets"
      },
      {
        key: "ivory-tower-g3-guardian-fight",
        name: "Guardian Fight",
        hpBar: 40,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Lowest DPS gets tethered; grab order is highest DD → Support → DD. Solo: kill Guardian then self-grab."
      },
      {
        key: "ivory-tower-g3-rage-phase",
        name: "Rage Phase",
        hpBar: 0,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Mirrors spawn at 3 positions; focus boss or ignore mirrors based on party's agreed strategy"
      }
    ]
  },

  // ── Thaemine (releaseOrder 8) ────────────────────────────────────────────────
  {
    encounterKey: "Thaemine G1",
    raid: "Thaemine",
    gate: 1,
    releaseOrder: 8,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Killineza the Dark Worshipper",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        key: "thaemine-g1-tentacle-destruction",
        name: "Tentacle Destruction",
        hpBar: 145,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Run to arena edge; throw bombs on tentacles then stagger the boss"
      },
      {
        key: "thaemine-g1-three-craters",
        name: "Three Craters",
        hpBar: 100,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Marked players stand in craters; same crater is targeted twice — hold position"
      },
      {
        key: "thaemine-g1-destroy-grab",
        name: "Destroy & Grab",
        hpBar: 55,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "At x3+1 on outer edge: locate red tentacle, throw bombs, get grabbed by yellow telegraph; use Balthorr if needed. Hard: + Raspberry red orbs — do NOT destroy them (both destroyed = -95% damage/-100% stagger). Solo: only one tentacle appears."
      },
      {
        key: "thaemine-g1-eye-safe-zone",
        name: "Eye Safe Zone",
        hpBar: 38,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Boss hands transform to claws; eyes indicate incoming direction; safe spot appears after two dashes. Solo: eyes move toward you rather than spreading."
      },
      {
        key: "thaemine-g1-eye-black-hole",
        name: "Eye Black Hole",
        hpBar: 35,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Hard"],
        notes:
          "Hard Mode only; spread out to avoid overlapping; track boss on minimap; counterattack when eye disappears"
      }
    ]
  },
  {
    encounterKey: "Thaemine G2",
    raid: "Thaemine",
    gate: 2,
    releaseOrder: 8,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Valinak, Knight of Darkness",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        key: "thaemine-g2-arena-break",
        name: "Arena Break",
        hpBar: 153,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Hard"],
        notes: "Hard Mode only; top or bottom arena side breaks off — reposition accordingly"
      },
      {
        key: "thaemine-g2-8-counters-run",
        name: "8 Counters & Run",
        hpBar: 135,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Counter in party order (Party 1 then Party 2); 3s window; avoid red flash counters (= wipe); use Azena after wings and shockwave. Solo: counter single orb, then boss."
      },
      {
        key: "thaemine-g2-black-or-blue-stagger",
        name: "Black or Blue Stagger",
        hpBar: 72,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Identify the swirl color around the boss; attack the opposite-colored orbs to stagger. Laser targets one player. Solo: use Hyper Awakening when available."
      },
      {
        key: "thaemine-g2-3-monster-waves",
        name: "3 Monster Waves",
        hpBar: 18,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Defeat 8 weak → 4 elite → 2 boss monsters in sequence; don't counter Wave 3 dragon; use Thirain sidereal for the dual dragon bosses (~60s window). Solo: dragons spawn at 3 and 9 o'clock."
      }
    ]
  },
  {
    encounterKey: "Thaemine G3",
    raid: "Thaemine",
    gate: 3,
    releaseOrder: 8,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Thaemine the Lightqueller",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "thaemine-g3-sword-fight-1",
        name: "Sword Fight 1",
        hpBar: 300,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Boss indicates left/right hand; players go to same side and damage sword"
      },
      {
        key: "thaemine-g3-albion",
        name: "Albion",
        hpBar: 275,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Observe patterns and walk to the shown safe spots; darkness wave avoidance"
      },
      {
        key: "thaemine-g3-sword-fight-2",
        name: "Sword Fight 2",
        hpBar: 255,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Dodge the pizza, bait boss sword to 9 o'clock then kill it. Hard: also dodge spinning tether ball rotating counter-clockwise."
      },
      {
        key: "thaemine-g3-safe-spot",
        name: "Safe Spot",
        hpBar: 225,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Puddle player goes to top; all others go to bottom. Navigate red telegraphs with inverted visibility."
      },
      {
        key: "thaemine-g3-shield-clash",
        name: "Shield & Clash",
        hpBar: 210,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Break x40 HP shield via 1st/2nd clash minigames; use Inanna sidereal for red telegraphs. Solo: single-player clash, no team coordination."
      },
      {
        key: "thaemine-g3-stage-break-clash",
        name: "Stage Break & Clash",
        hpBar: 210,
        repeatSecs: 45,
        triggerType: "hp+timer",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Alternate between 3rd/4th clashes and arena breaks every 45s through x210–x90; use Nineveh sidereal as needed; fog expands at 20/70/120s"
      },
      {
        key: "thaemine-g3-fog",
        name: "Fog",
        hpBar: 90,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Black fog reduces playfield from edges between x90–x55; DPS race to push through before fog covers arena"
      },
      {
        key: "thaemine-g3-safe-spot-2nd",
        name: "Safe Spot (2nd)",
        hpBar: 55,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Movement inverted; complete typing minigame, kill clone (solo: clone of yourself), navigate telegraphs. Normal/Solo: left-to-right typing. Hard: right-to-left inverted typing. Use Wei for ghosts."
      }
    ]
  },
  {
    encounterKey: "Thaemine G4",
    raid: "Thaemine",
    gate: 4,
    releaseOrder: 8,
    availableDifficulties: ["Hard"],
    boss: "Darkness Legion Commander Thaemine",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "thaemine-g4-red-marks",
        name: "Red Marks",
        hpBar: 315,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Hard"],
        notes:
          "Two players marked; dodge expanding explosions, position at clock positions, stagger 4 swords with tethers"
      },
      {
        key: "thaemine-g4-co-op-counter-prokel",
        name: "Co-op Counter + Prokel",
        hpBar: 280,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Hard"],
        notes: "Team splits (2 inside / 6 outside); inside defeats clone, outside staggers boss with Sidereal support"
      },
      {
        key: "thaemine-g4-tethers-clash",
        name: "Tethers + Clash",
        hpBar: 175,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Hard"],
        notes:
          "Destroy blue circles using tether overlaps; navigate sword maze; perform two consecutive Clash minigames"
      },
      {
        key: "thaemine-g4-6-counters",
        name: "6 Counters",
        hpBar: 87,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Hard"],
        notes: "Counter 6 moving swords at specific clock positions; use Sidereal to destroy stationary ones"
      },
      {
        key: "thaemine-g4-puddle-walk-crit",
        name: "Puddle Walk + Crit",
        hpBar: 63,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Hard"],
        notes:
          "Parties split left/right; run to safe zones avoiding blue puddles; use Splendid Sacred Charm after 3rd explosion. Hidden Kadan activates ~1 minute into final phase."
      }
    ]
  },

  // ── Echidna (releaseOrder 9) ────────────────────────────────────────────────
  {
    encounterKey: "Echidna G1",
    raid: "Echidna",
    gate: 1,
    releaseOrder: 9,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Red Doom Narkiel",
    bossType: "HUMAN",
    weakness: "Weak to Fire",
    tauntable: true,
    mechanics: [
      {
        key: "echidna-g1-first-encounter",
        name: "First Encounter",
        hpBar: 180,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Kill elite mobs after shield breaks; use Azena ally skill. Normal/Hard: 2 elites split between parties. Solo: 1 elite."
      },
      {
        key: "echidna-g1-run-phase",
        name: "Run Phase",
        hpBar: 162,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Timed platforming; must pass stagger check to reach boss before timer expires; use Azena when 3+ segments available"
      },
      {
        key: "echidna-g1-clone-split",
        name: "Clone Split",
        hpBar: 135,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Safe spot on odd-colored lines; 4th line shows directional counter indicator. Normal/Solo: no inter-party communication. Hard: inter-party communication required for overlapping safe spots."
      },
      {
        key: "echidna-g1-invasion",
        name: "Invasion",
        hpBar: 110,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Use Avele ally skill next to boss, then deploy follow-up within 20 seconds to clear mobs before explosions"
      },
      {
        key: "echidna-g1-mini-boss-safe-zone",
        name: "Mini Boss + Safe Zone",
        hpBar: 90,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Highest stagger party moves to mini boss (Solo: single-player stagger), use Whirlwind Grenade. Normal/Hard only: Safe Zone is sustained from x90→x50 (fans rotate, parties communicate safe positions)."
      },
      {
        key: "echidna-g1-final-phase",
        name: "Final Phase",
        hpBar: 55,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Deplete boss while avoiding red fog perimeter. HM: rotate censer debuff before 100 stacks."
      },
      {
        key: "echidna-g1-smoke-stagger",
        name: "Smoke & Stagger",
        hpBar: 50,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal", "Hard"],
        notes:
          "Identify censer color (red/black smoke); mini boss party reveals color; main party uses Avele + follow-up to remove shield; tethered player needs 5+ stacks"
      }
    ]
  },
  {
    encounterKey: "Echidna G2",
    raid: "Echidna",
    gate: 2,
    releaseOrder: 9,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Echidna",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "echidna-g2-mirror-counter",
        name: "Mirror Counter",
        hpBar: 210,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Counter the mirror showing Echidna's portrait in odd direction; NM: dodge horizontal lasers; HM: also dodge red side-shooting lasers; use Azena after stagger. Solo: blue-glowing mirror with correct portrait direction."
      },
      {
        key: "echidna-g2-huge-echidna",
        name: "Huge Echidna",
        hpBar: 137,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "3-man co-op counter (2-man NM); HM: spacebar through 2nd mirror laser; flying hearts pull toward boss; use Thar for stagger then Azena after clash"
      },
      {
        key: "echidna-g2-basement-clash",
        name: "Basement Clash",
        hpBar: 120,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Repeats at 100 and 80 HP; kill snakes at clash circles for permanent 30% buff; raid lead uses Thar at first clash; leave white snake at 79 for 2nd clash strategy"
      },
      {
        key: "echidna-g2-mirror-stagger",
        name: "Mirror Stagger",
        hpBar: 50,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Large mirror rotates; follow its back and stagger; HM: find red glow and determine rotation direction (right=clockwise, left=counterclockwise)"
      },
      {
        key: "echidna-g2-charm-chains",
        name: "Charm Chains",
        timerSecs: 300,
        triggerType: "timer",
        severity: "major",
        difficulties: ["Solo"],
        notes:
          "Solo only; ~5 minutes into the fight; two players chained — break by moving 6+ tiles apart (note: solo so the second 'player' is the boss/NPC mechanic)"
      },
      {
        key: "echidna-g2-final-struggle",
        name: "Final Struggle",
        hpBar: 0,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Hard"],
        notes:
          "HM only: Echidna grabs at 6 o'clock; counter sequence reveals Real/Fake pattern; at least 1 player must be grabbed; use Azena after successful counter"
      }
    ]
  },

  // ── Behemoth (releaseOrder 10) ───────────────────────────────────────────────
  {
    encounterKey: "Behemoth G1",
    raid: "Behemoth",
    gate: 1,
    releaseOrder: 10,
    availableDifficulties: ["Normal"],
    boss: "Behemoth, the Storm Commander",
    bossType: "ANCIENT",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "behemoth-g1-part-break-4-guardians",
        name: "Part Break + 4 Guardians",
        hpBar: 460,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal"],
        notes:
          "Damage Behemoth's body until it breaks (exposes wing/head weak points). Four guardians (Nacrasena, Yoho, Calventus, Velganos) spawn at clock positions — must kill before NPC dies."
      },
      {
        key: "behemoth-g1-twisters-group-counter",
        name: "Twisters + Group Counter",
        hpBar: 190,
        repeatSecs: 90,
        triggerType: "hp+timer",
        severity: "major",
        difficulties: ["Normal"],
        notes:
          "Spread on designated twister lines (spacebar through ropes); pattern recurs ~every 90s. Co-op counter required on the boss's second charge."
      }
    ]
  },
  {
    encounterKey: "Behemoth G2",
    raid: "Behemoth",
    gate: 2,
    releaseOrder: 10,
    availableDifficulties: ["Normal"],
    boss: "Behemoth, Cruel Storm Slayer",
    bossType: "ANCIENT",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "behemoth-g2-final-phase",
        name: "Final Phase",
        hpBar: 260,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal"],
        notes: "Boss heals and introduces new attack patterns including scratch and pizza attacks"
      },
      {
        key: "behemoth-g2-enhanced-twisters-crystals",
        name: "Enhanced Twisters + Crystals",
        hpBar: 190,
        repeatSecs: 90,
        triggerType: "hp+timer",
        severity: "major",
        difficulties: ["Normal"],
        notes:
          "10 twister lines with assigned party positions (pattern recurs ~every 90s, trickier than G1) PLUS Crystals stagger phase — careful damage management required, stop hitting after two breaks to avoid destruction reset."
      }
    ]
  },

  // ── Aegir (releaseOrder 11) ──────────────────────────────────────────────────
  {
    encounterKey: "Aegir G1",
    raid: "Aegir",
    gate: 1,
    releaseOrder: 11,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Akkan, Lord of Death",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "aegir-g1-aegir-appears-banishment",
        name: "Aegir Appears + Banishment",
        hpBar: 195,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Aegir appears and banishes players into individual realms (10s imprisonment); fight back to rejoin main arena"
      },
      {
        key: "aegir-g1-ghost-phase",
        name: "Ghost Phase",
        hpBar: 170,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Ghost phase — avoid ghost touches; coordinate counters and use sidereals to survive. Solo: 2 ghosts. Group: 4 ghosts."
      },
      {
        key: "aegir-g1-earthquake",
        name: "Earthquake",
        hpBar: 150,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Hard"],
        notes: "Hard Mode only — earthquake mechanic; dodge the shockwave and reposition"
      },
      {
        key: "aegir-g1-flame-breath-pillars",
        name: "Flame Breath / Pillars",
        hpBar: 143,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Dodge flame breath; use pillars for cover from the sweeping attack"
      },
      {
        key: "aegir-g1-shield-break-valtan",
        name: "Shield Break + Valtan",
        hpBar: 115,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Break Aegir's shield; Valtan's ghost assists — coordinate destruction skills. Solo: counter the Valtan Ghost, then use an ally skill."
      },
      {
        key: "aegir-g1-aegir-attack",
        name: "Aegir Attack",
        hpBar: 85,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Dodge Aegir's red telegraphed attacks; maintain positioning for next mechanic"
      },
      {
        key: "aegir-g1-aegir-s-arm-guard",
        name: "Aegir's Arm + Guard",
        hpBar: 60,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Guard against Aegir's arm sweeps; timing-sensitive — mistimed guard = knockback. Solo: DPS the arm, guard the swing, locate Akkan, use Thar ally skill, complete stagger."
      },
      {
        key: "aegir-g1-final-stagger",
        name: "Final Stagger",
        hpBar: 30,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Final stagger check to finish the gate; deploy remaining sidereals here. Solo: use immunity skills against the blue earthquake."
      }
    ]
  },
  {
    encounterKey: "Aegir G2",
    raid: "Aegir",
    gate: 2,
    releaseOrder: 11,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Aegir, the Oppressor",
    bossType: "ANCIENT",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "aegir-g2-1st-heart-armor-break",
        name: "1st Heart + Armor Break",
        hpBar: 260,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Destroy Aegir's heart to proceed, then Armor Break opens immediately after. Normal: Party 1 at 12→3, Party 2 at 6→9 rotation. Hard: 3 positions with counter → auto-attack → stagger sequence; supports place golden target puddle at right corners. Solo: stand in safe area while lasers rotate clockwise."
      },
      {
        key: "aegir-g2-distorted-space-1st",
        name: "Distorted Space (1st)",
        hpBar: 250,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Navigate distorted space (wall at ~50s); correct path required. NM: 7 debuff stacks reduces HP to 1. HM: 5 stacks."
      },
      {
        key: "aegir-g2-2nd-heart-armor-break",
        name: "2nd Heart + Armor Break",
        hpBar: 165,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Second Heart (repeat burst DPS — can be skipped if damage was pushed), then Armor Break window. Solo: remove Aegir's shield, destroy heart within 80s using ally skills. Hard: supports place golden target puddle at right corners."
      },
      {
        key: "aegir-g2-distorted-space-2nd",
        name: "Distorted Space (2nd)",
        hpBar: 153,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Second distorted space; routes may differ from 1st — stay alert"
      },
      {
        key: "aegir-g2-stage-break",
        name: "Stage Break",
        hpBar: 95,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Arena stage breaks; reposition to surviving platform. Solo: use Ealyn ally skill at dialogue trigger, dodge feet spawns."
      },
      {
        key: "aegir-g2-final-struggle",
        name: "Final Struggle",
        timerSecs: 50,
        repeatSecs: 50,
        triggerType: "timer",
        severity: "wipe",
        difficulties: ["Hard"],
        notes: "HM only; guard every 50s and 90s enrage timer caps the fight — must kill before enrage or wipe"
      }
    ]
  },

  // ── Act 2: Brelshaza (releaseOrder 12) ──────────────────────────────────────
  {
    encounterKey: "Act 2: Brelshaza G1",
    raid: "Act 2: Brelshaza",
    gate: 1,
    releaseOrder: 12,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Narok the Butcher",
    bossType: "ANCIENT",
    weakness: "Weak to Lightning",
    tauntable: false,
    mechanics: [
      {
        key: "act-2-brelshaza-g1-armor-destruction",
        name: "Armor Destruction",
        hpBar: 300,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Use Corrosive Bomb and Weak Point destruction skills to break Narok's armor stacks (x300–x241)"
      },
      {
        key: "act-2-brelshaza-g1-ice-wall",
        name: "Ice Wall",
        hpBar: 240,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes: "Bait Narok's laser toward the ice wall to destroy it; coordinate positioning across the arena"
      },
      {
        key: "act-2-brelshaza-g1-laser-dodge",
        name: "Laser Dodge",
        hpBar: 215,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes: "Post-Ice Wall (~70s delay): dodge follow-up laser sweep"
      },
      {
        key: "act-2-brelshaza-g1-perfect-guard-time-attack-1st",
        name: "Perfect Guard + Time Attack (1st)",
        hpBar: 180,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Perfect guard sequence; 60s timer activates — break shield before time expires. Solo: use Sidereal:Jederico."
      },
      {
        key: "act-2-brelshaza-g1-chase-stagger",
        name: "Chase + Stagger",
        hpBar: 120,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Chase Narok and break the barrier. Normal/Solo: 3 perfect guards then stagger check. Hard: party splits; 4 objects spawn, block the 2 real lasers; stagger Narok twice to complete."
      },
      {
        key: "act-2-brelshaza-g1-perfect-guard-time-attack-2nd",
        name: "Perfect Guard + Time Attack (2nd)",
        hpBar: 60,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Repeat perfect guard and time attack from x180; second run tends to be faster-paced"
      }
    ]
  },
  {
    encounterKey: "Act 2: Brelshaza G2",
    raid: "Act 2: Brelshaza",
    gate: 2,
    releaseOrder: 12,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    // LOA Logs reports the P1 boss name first; P2 ("Phantom Manifester Brelshaza")
    // appears later but the sticky gate match keeps us bound through the transition.
    boss: "Phantom Legion Commander Brelshaza",
    totalBars: 420,
    bossType: "DEMONIC",
    weakness: "Weak to Lightning",
    tauntable: false,
    mechanics: [
      {
        key: "act-2-brelshaza-g2-colors-stagger",
        name: "Colors Stagger",
        hpBar: 335,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Stagger clones then boss. Normal/Solo: no color callout required. Hard: two rings — Party 1 at 3x+1 calls outer colors in order, Party 2 calls inner circle colors."
      },
      {
        key: "act-2-brelshaza-g2-crystal-break",
        name: "Crystal Break",
        hpBar: 280,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal", "Hard"],
        notes:
          "Ice Field & Crystal Break: white vs purple IQ test + typing test; marked players spawn crystals at 6 o'clock; use Azena (4 bars) or Nineveh (3 bars)."
      },
      {
        key: "act-2-brelshaza-g2-clockwise-orbs-solo",
        name: "Clockwise Orbs",
        hpBar: 185,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo"],
        notes:
          "Solo: scythes spawn and rotate clockwise around the arena - dodge them. Two sets, then cutscene and brief freeze, then rush to boss center for stagger check."
      },
      {
        key: "act-2-brelshaza-g2-clockwise-orbs",
        name: "Clockwise Orbs",
        hpBar: 145,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal", "Hard"],
        notes: "Rotate clockwise destroying orbs at 3x or 3x+1 positions; avoid AoEs; HM: dodge scythes as well"
      },
      {
        key: "act-2-brelshaza-g2-typing-stagger-p3",
        name: "Typing + Stagger (P3)",
        hpBar: 100,
        repeatSecs: 240,
        triggerType: "hp+timer",
        severity: "wipe",
        difficulties: ["Normal", "Hard"],
        notes:
          "Phase 3 begins; move to correct position, complete typing test, identify real clone, stagger boss. Freeze AoE recurs every ~240s - guard before yellow reaches end; failure = freeze + teleport + wave + typing test again."
      },
      {
        key: "act-2-brelshaza-g2-scythes-solo",
        name: "Scythes",
        hpBar: 80,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo"],
        notes:
          "Solo: small red telegraphs spawn; the last two on opposite axes indicate the beam axis. A plus-sign telegraph follows - dodge into the safe slice before the wide beam fires."
      }
    ]
  },

  // ── Act 3: Mordum (releaseOrder 13) ─────────────────────────────────────────
  {
    encounterKey: "Act 3: Mordum G1",
    raid: "Act 3: Mordum",
    gate: 1,
    releaseOrder: 13,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Thaemine, Master of Darkness",
    bossType: "HUMAN",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "act-3-mordum-g1-retaliation",
        name: "Retaliation",
        hpBar: 300,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "DPS Thaemine to trigger his retaliation, then execute a Just Guard"
      },
      {
        key: "act-3-mordum-g1-memory-stagger",
        name: "Memory & Stagger",
        hpBar: 270,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Dodge red line explosions in reverse order (4→3→2→1; Solo: 3 lines), then complete stagger checks"
      },
      {
        key: "act-3-mordum-g1-dragon-transition",
        name: "Dragon Transition",
        hpBar: 250,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Portal escape required immediately after stagger phase"
      },
      {
        key: "act-3-mordum-g1-hidden-kharmine",
        name: "Hidden Kharmine",
        hpBar: 210,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Counter on the 2nd slam, then activate Kharmine sidereal when text box appears. Solo: no puddle placement."
      },
      {
        key: "act-3-mordum-g1-thaemine-transition",
        name: "Thaemine Transition",
        hpBar: 150,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal", "Hard"],
        notes:
          "Red telegraph surrounds arena; dodge blue lines, stand in pizza safe spot, wait for fog before dashing inside"
      },
      {
        key: "act-3-mordum-g1-quick-just-guard",
        name: "Quick! Just Guard",
        hpBar: 75,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes:
          "Boss glows white and disappears in a direction; just-guard sequence — precise timing against fast attack chains"
      },
      {
        key: "act-3-mordum-g1-shrouded-attacks",
        name: "Shrouded Attacks",
        hpBar: 50,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Aerial dragon Azakiel joins; aerial attacks followed by Just Guard when the dragon approaches. Solo: use Sidereal: Azakiel."
      }
    ]
  },
  {
    encounterKey: "Act 3: Mordum G2",
    raid: "Act 3: Mordum",
    gate: 2,
    releaseOrder: 13,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Blossoming Fear, Naitreya",
    bossType: "OTHER",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        key: "act-3-mordum-g2-alberhastic-phase",
        name: "Alberhastic Phase",
        hpBar: 300,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Alberhastic joins; passive infection/poison stacks throughout x300–x235 window (stacks last 60s)"
      },
      {
        key: "act-3-mordum-g2-shield-memory-solo",
        name: "Shield Memory",
        hpBar: 235,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo"],
        notes:
          "Solo: dialogue + boss centers; yellow or white shield surrounds you. Memorize 4 in/out safe spots (always In/Out/In/Out or Out/In/Out/In), then complete stagger check. Failure triggers Makoko buff (auto-wipe if already active)."
      },
      {
        key: "act-3-mordum-g2-alberhastic-memory",
        name: "Alberhastic Memory",
        hpBar: 235,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal", "Hard"],
        notes:
          "Memorize Alberhastic's color sequence and burst the shield. Normal: all players share same shield color. Hard: 4 Yellow + 4 White shields split by party (P1 Yellow, P2 White)."
      },
      {
        key: "act-3-mordum-g2-clone-stagger-solo",
        name: "Clone Stagger Check",
        hpBar: 105,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo"],
        notes:
          "Solo: boss jumps and disappears - move to center (outside not safe). 4 clones spawn; 2 fire targeted telegraphs - wait for lock-on then dodge. Boss reappears in middle for stagger check (Whirlwind grenade helps). Cutscene transitions to final phase."
      },
      {
        key: "act-3-mordum-g2-illusion-clone-velga-pizza",
        name: "Illusion Clone + Velga Pizza",
        hpBar: 105,
        repeatSecs: 90,
        triggerType: "hp+timer",
        severity: "wipe",
        difficulties: ["Normal", "Hard"],
        notes:
          "Identify the real clone vs illusion (gold puddle marker), then attack the real one. Velganos final phase pizza recurs every ~90s. Normal: 5-tile spread. Hard: 3 random black tiles that change direction. DPS race - Team Meter rises throughout."
      }
    ]
  },
  {
    encounterKey: "Act 3: Mordum G3",
    raid: "Act 3: Mordum",
    gate: 3,
    releaseOrder: 13,
    availableDifficulties: ["Solo", "Normal", "Hard"],
    boss: "Mordum, the Abyssal Punisher",
    bossType: "ANCIENT",
    weakness: "Weak to Earth",
    tauntable: false,
    mechanics: [
      {
        key: "act-3-mordum-g3-twister-1",
        name: "Twister #1",
        hpBar: 475,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "First twister; stay ahead of the pattern, don't cut corners"
      },
      {
        key: "act-3-mordum-g3-twister-2",
        name: "Twister #2",
        hpBar: 450,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes: "Second twister; coordinate position with party"
      },
      {
        key: "act-3-mordum-g3-laser-chase",
        name: "Laser Chase",
        hpBar: 425,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes: "Rotating laser chases players; stay ahead of the pattern, don't cut corners"
      },
      {
        key: "act-3-mordum-g3-color-pizza-orbs-solo",
        name: "Color Pizza + Orbs",
        hpBar: 400,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo"],
        notes:
          "Solo: boss smashes ground 4 times. 2 rotating orbs fire periodic laser bursts (electrocute on hit). On each smash a blue or red pizza slice spawns - stand on the slice matching your color icon (wrong color = damage)."
      },
      {
        key: "act-3-mordum-g3-twister-3",
        name: "Twister #3",
        hpBar: 400,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes: "Third twister; continues the chase pattern"
      },
      {
        key: "act-3-mordum-g3-1st-break-duel",
        name: "1st Break Duel",
        hpBar: 375,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "First Break Duel; stagger boss, move to minimap spot with 1 dot, perform 2 Just Guards (Solo) or partner duel"
      },
      {
        key: "act-3-mordum-g3-dome-smash",
        name: "Dome Smash",
        hpBar: 320,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Dodge lightning from dome, then enter it before the smash"
      },
      {
        key: "act-3-mordum-g3-supernova-1",
        name: "Supernova #1",
        hpBar: 300,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "Wait for all 3 attack animations, then counter (HM: Dance mechanic precedes)"
      },
      {
        key: "act-3-mordum-g3-anvil-just-guard",
        name: "Anvil Just Guard",
        hpBar: 275,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Hard"],
        notes: "Just guard the anvil slam; precise timing — mistimed guard = large damage or knockback"
      },
      {
        key: "act-3-mordum-g3-2nd-break-duel",
        name: "2nd Break Duel",
        hpBar: 250,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Second Break Duel; stagger boss, move to minimap spot with 2 dots, perform 3 Just Guards (Solo) or partner duel"
      },
      {
        key: "act-3-mordum-g3-shield-disruption",
        name: "Shield Disruption",
        hpBar: 200,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Hard"],
        notes: "Color-matching shield disruption; coordinate color assignments across the party"
      },
      {
        key: "act-3-mordum-g3-charged-field-1",
        name: "Charged Field #1",
        hpBar: 180,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo", "Normal", "Hard"],
        notes: "First charged field: match your color to floor slices and move across the arena"
      },
      {
        key: "act-3-mordum-g3-hammer-split-bastion",
        name: "Hammer Split/Bastion",
        hpBar: 160,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Hard"],
        notes: "Hammer Split (NM) or Bastion (HM); HM requires entering Bastion before hammer strike"
      },
      {
        key: "act-3-mordum-g3-charged-field-2",
        name: "Charged Field #2",
        hpBar: 125,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes: "Second charged field; same pattern as the first — match color, traverse arena"
      },
      {
        key: "act-3-mordum-g3-3rd-break-duel",
        name: "3rd Break Duel",
        hpBar: 120,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Third Break Duel; move to minimap spot with 3 dots, perform 3 Just Guards (Solo). HM adds Dance/Supernova sequence."
      },
      {
        key: "act-3-mordum-g3-4th-break-duel",
        name: "4th Break Duel",
        hpBar: 75,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Solo", "Normal", "Hard"],
        notes:
          "Fourth and final Break Duel (~1:40 after 3rd break in Solo); use Hidden Balthor or complete Just Guards with Shandi for damage"
      },
      {
        key: "act-3-mordum-g3-final-counter-solo",
        name: "Final Counter",
        hpBar: 70,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Solo"],
        notes:
          "Solo: boss charges a lethal attack and glows blue - counter to interrupt. Same pattern as x300; failure deals heavy damage."
      },
      {
        key: "act-3-mordum-g3-last-stand-bastion",
        name: "Last Stand/Bastion",
        hpBar: 0,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Hard"],
        notes: "Last Stand (NM) or Bastion (HM); HM only — sphere color matching; survive to win"
      }
    ]
  },

  // ── Act 4: Armoche (releaseOrder 16) ────────────────────────────────────────
  {
    encounterKey: "Act 4: Armoche G1",
    raid: "Act 4: Armoche",
    gate: 1,
    releaseOrder: 16,
    availableDifficulties: ["Normal", "Hard"],
    boss: "Act 4: Covetous Master Echidna",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "act-4-armoche-g1-spotlight",
        name: "Spotlight",
        hpBar: 285,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal", "Hard"],
        notes: "Bait clone to edge of arena; dodge away from clone after positioning"
      },
      {
        key: "act-4-armoche-g1-shadow-clones",
        name: "Shadow Clones",
        hpBar: 240,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes:
          "Follow the large Echidna shadow. Normal: 2 clones walk toward each other → go to opposite side. Hard: 2 jumping clones = same side; 2 walking clones = opposite side; match weapon/action."
      },
      {
        key: "act-4-armoche-g1-jump-rope",
        name: "Jump Rope",
        hpBar: 220,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Hard"],
        notes: "Marked players get rectangle snake attacks; spacebar through rope patterns (jump rope)"
      },
      {
        key: "act-4-armoche-g1-shield-destruction",
        name: "Shield Destruction",
        hpBar: 150,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes:
          "Use Nineveh+recast to deplete large shield; 1 flower pickup = 1 stack removal. Maxroll calls this the 'Jump Rope' phase (shield depletion race)."
      },
      {
        key: "act-4-armoche-g1-brelshaza-invasion",
        name: "Brelshaza Invasion",
        hpBar: 30,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes:
          "Use Wei for extra stagger/damage during Brelshaza phase; 3-bar recommended. (Maxroll calls this 'DPS & Stagger'.)"
      }
    ]
  },
  {
    encounterKey: "Act 4: Armoche G2",
    raid: "Act 4: Armoche",
    gate: 2,
    releaseOrder: 16,
    availableDifficulties: ["Normal", "Hard"],
    boss: "Armoche, Sentinel of the Abyss",
    bossType: "ANCIENT",
    weakness: "Weak to Fire",
    tauntable: false,
    mechanics: [
      {
        key: "act-4-armoche-g2-shield-throw",
        name: "Shield Throw",
        hpBar: 420,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes:
          "Pick up golden shield (G key) and throw (Q key) to remove armor stacks; cleanse bleed stacks at blue orbs. If this drags on, deaths stack and the fight can reset."
      },
      {
        key: "act-4-armoche-g2-wind-stagger",
        name: "Wind Stagger",
        hpBar: 360,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes: "Use Balthorr sidereal; stagger + dodge 3 attacks → move downward avoiding soldiers → destroy rock wall"
      },
      {
        key: "act-4-armoche-g2-sentinel-rush",
        name: "Sentinel Rush",
        hpBar: 290,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes:
          "Party assignment: 1=Left 2=Right; destroy yellow statues in order 4→3→2→1; ignore red statues; co-op counter after. (Maxroll calls this 'Statue Safespot'.)"
      },
      {
        key: "act-4-armoche-g2-combo-guards",
        name: "Combo Guards",
        hpBar: 240,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal", "Hard"],
        notes:
          "Use Thirain sidereal; gather at bottom; just guard patterns (Shield/Slash/Stab/Slam/Spin) while inflicting destruction. (Maxroll calls this 'Guard Destruction' — fails if Armoche reaches arena bottom.)"
      },
      {
        key: "act-4-armoche-g2-armadillo",
        name: "Armadillo",
        hpBar: 160,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes: "Avoid red circle (instant death); use Balthorr during red line attacks for extra stagger"
      },
      {
        key: "act-4-armoche-g2-body-slam",
        name: "Body Slam",
        hpBar: 120,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes:
          "Spacebar jump rope; press A when knocked up; use Azena sidereal to destroy crater wall; sand tornado persists after. (Maxroll calls this 'Crater'.)"
      },
      {
        key: "act-4-armoche-g2-pillars",
        name: "Pillars",
        hpBar: 60,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal", "Hard"],
        notes:
          "Place 3 Volcano puddles away from pillars; hide behind a pillar to survive; Hyper Awakening or Time Stop if needed. (Maxroll calls this '3x Volcano'.)"
      }
    ]
  },

  // ── Final Act: Kazeros (releaseOrder 17) ────────────────────────────────────
  {
    encounterKey: "Final Act: Kazeros G1",
    raid: "Final Act: Kazeros",
    gate: 1,
    releaseOrder: 17,
    availableDifficulties: ["Normal", "Hard"],
    boss: "Abyss Lord Kazeros",
    bossType: "HUMAN",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "final-act-kazeros-g1-orb-grab",
        name: "Orb Grab",
        hpBar: 900,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes: "Use Nineveh+recast when shield spawns; save Shandi for DPS window"
      },
      {
        key: "final-act-kazeros-g1-prokel",
        name: "Prokel",
        hpBar: 700,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal", "Hard"],
        notes:
          "All players separated into individual realms — fight Kazeros 1v1 until Prokel dies. (Maxroll calls this 'Team Stagger', ~40s phase.)"
      },
      {
        key: "final-act-kazeros-g1-clash",
        name: "Clash",
        hpBar: 660,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes:
          "Find the correct clone; front/back indicators reveal the real Kazeros. Normal: press Q to clash. Hard: press QWER to clash."
      },
      {
        key: "final-act-kazeros-g1-cracks-shield",
        name: "Cracks & Shield",
        hpBar: 500,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal", "Hard"],
        notes:
          "Use Nineveh+recast to break shield; team meter builds → consecutive special attacks. (Maxroll calls this 'Shield Safespots'.)"
      },
      {
        key: "final-act-kazeros-g1-hidden-wei-clash",
        name: "Hidden Wei Clash",
        hpBar: 380,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes: "Use Hidden Wei when Kazeros reappears at 12 o'clock for damage window"
      },
      {
        key: "final-act-kazeros-g1-kazeros-guard",
        name: "Kazeros Guard",
        hpBar: 100,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal", "Hard"],
        notes: "3 waffle attacks → safe zone appears; survive to win. (Maxroll calls this 'Orb Guard'.)"
      }
    ]
  },
  {
    encounterKey: "Final Act: Kazeros G2-1",
    raid: "Final Act: Kazeros",
    gate: 21,
    releaseOrder: 17,
    availableDifficulties: ["Normal", "Hard"],
    boss: "Archdemon Kazeros",
    bossType: "HUMAN",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "final-act-kazeros-g21-forced-clash",
        name: "Forced Clash",
        hpBar: 950,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes: "First mechanic of G2; standard clash"
      },
      {
        key: "final-act-kazeros-g21-colosseum",
        name: "Colosseum",
        hpBar: 900,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal", "Hard"],
        notes:
          "Sequence 1 at x900: Stun Clouds → Crater Destruction (wipe trigger) → Black Hole → Earthquake Stagger — chained together."
      },
      {
        key: "final-act-kazeros-g21-stagger-break",
        name: "Stagger Break",
        hpBar: 750,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes: "Sequence 2 begins; use Kadan or Shandi for flying rock DPS check"
      },
      {
        key: "final-act-kazeros-g21-red-blade",
        name: "Red Blade",
        hpBar: 600,
        triggerType: "hp",
        severity: "normal",
        difficulties: ["Normal", "Hard"],
        notes: "Distinguish knock-up vs grab puddle circles; supports shield/DR throughout"
      },
      {
        key: "final-act-kazeros-g21-giant-rock",
        name: "Giant Rock",
        hpBar: 550,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes: "Co-op counter after grapple mechanic resolves"
      }
    ]
  },
  {
    encounterKey: "Final Act: Kazeros G2-2",
    raid: "Final Act: Kazeros",
    gate: 22,
    releaseOrder: 17,
    availableDifficulties: ["Normal", "Hard"],
    boss: "God of Death Kazeros",
    bossType: "HUMAN",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "final-act-kazeros-g22-angry-birds",
        name: "Angry Birds",
        timerSecs: 180,
        repeatSecs: 180,
        triggerType: "timer",
        severity: "normal",
        difficulties: ["Normal", "Hard"],
        notes: "Repeating periodic mechanic throughout phase"
      },
      {
        key: "final-act-kazeros-g22-kazeros-says",
        name: "Kazeros Says",
        hpBar: 620,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes: "Sequence 3 (desert phase) begins — most demanding mechanics. (Maxroll calls this 'Word Command'.)"
      },
      {
        key: "final-act-kazeros-g22-time-attack",
        name: "Time Attack",
        hpBar: 500,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal", "Hard"],
        notes:
          "Twin Sword phase; Deep Cuts debuff stacks to 5 → healing immunity; use Inanna to cleanse, recast at ~3s remaining. 50s timer."
      },
      {
        key: "final-act-kazeros-g22-destiny",
        name: "Destiny",
        hpBar: 310,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes:
          "Hidden Kadan activates after co-op counter during 8-player split guard; Dark Grenade must stay on boss. (Maxroll calls this 'Stagger Check'.)"
      },
      {
        key: "final-act-kazeros-g22-kazeros-says-2",
        name: "Kazeros Says",
        hpBar: 160,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard"],
        notes: "Final sequence — push to end. (Maxroll calls this 'Word Command'.)"
      }
    ]
  },
  {
    encounterKey: "Final Act: Kazeros G2-3",
    raid: "Final Act: Kazeros",
    gate: 23,
    releaseOrder: 17,
    availableDifficulties: ["Normal", "Hard"],
    boss: "Death Incarnate Kazeros",
    bossType: "HUMAN",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "final-act-kazeros-g23-spotlight",
        name: "Spotlight",
        timerSecs: 150,
        repeatSecs: 150,
        triggerType: "timer",
        severity: "normal",
        difficulties: ["Normal", "Hard"],
        notes: "Periodic spotlight — bait to edge and dodge away"
      },
      {
        key: "final-act-kazeros-g23-final-time-attack",
        name: "Final Time Attack",
        hpBar: 525,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal", "Hard"],
        notes: "3-cone DPS check; use Kadan on middle cone, hyperawaken left/right cones. 40s timer."
      },
      {
        key: "final-act-kazeros-g23-sacrifice",
        name: "Sacrifice",
        hpBar: 350,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal", "Hard"],
        notes: "Wipe if DPS is insufficient across the 3 cones"
      },
      {
        key: "final-act-kazeros-g23-fake-wipe",
        name: "Fake Wipe",
        hpBar: 175,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal", "Hard"],
        notes: "Not an actual wipe — survive through the animation and keep pushing. (Maxroll calls this 'Revival'.)"
      }
    ]
  },

  // ── Serca (releaseOrder 18) ──────────────────────────────────────────────────
  {
    encounterKey: "Serca G1",
    raid: "Serca",
    gate: 1,
    releaseOrder: 18,
    availableDifficulties: ["Normal", "Hard", "Nightmare"],
    boss: "Witch of Agony, Serca",
    bossType: "HUMAN",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        key: "serca-g1-laser-traps",
        name: "Laser & Traps",
        hpBar: 270,
        repeatSecs: 60,
        triggerType: "hp+timer",
        severity: "major",
        difficulties: ["Normal", "Hard", "Nightmare"],
        notes:
          "Arena narrows to 8x8; yellow squares with spinning saws move top-to-bottom; spacebar through ropes; bleed debuff stacks on spiked tiles. Repeats every 60s through x270-x200."
      },
      {
        key: "serca-g1-spike-guard",
        name: "Spike Guard",
        hpBar: 240,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard", "Nightmare"],
        notes:
          "Two safe spots at 5&11 or 1&7 o'clock; 4 guard sequences required; counter types: S Counter, Nail Counter, Circle Counter"
      },
      {
        key: "serca-g1-spiked-walls",
        name: "Spiked Walls",
        hpBar: 200,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard", "Nightmare"],
        notes:
          "Spiked wall traps move inward — dodge the traps. Hard/Nightmare: additional checkered yellow spiked squares spawn alongside the walls."
      },
      {
        key: "serca-g1-bomb-bingo",
        name: "Bomb Bingo",
        hpBar: 175,
        repeatSecs: 70,
        triggerType: "hp+timer",
        severity: "major",
        difficulties: ["Normal", "Hard", "Nightmare"],
        notes:
          "Bombs explode in cross patterns; identify non-overlapping safe tiles. Nightmare: timed bomb on target — separate from allies before 5s or deal large damage."
      },
      {
        key: "serca-g1-survival-run",
        name: "Survival Run",
        hpBar: 105,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard", "Nightmare"],
        notes:
          "P1+P2 start at 11 o'clock, P3+P4 at 5 o'clock; clockwise tile traversal; brawl phase grants +50% DMG for 10s. Hard/Nightmare: avoid bombs that spawn and explode on the field."
      },
      {
        key: "serca-g1-safe-zone",
        name: "Safe Zone",
        hpBar: 100,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard", "Nightmare"],
        notes: "Safe zone window between Survival Run and Maiden Bingo — reposition for the final phase"
      },
      {
        key: "serca-g1-maiden-bingo",
        name: "Maiden Bingo",
        hpBar: 100,
        repeatSecs: 60,
        triggerType: "hp+timer",
        severity: "major",
        difficulties: ["Normal", "Hard", "Nightmare"],
        notes:
          "Arena narrows to 4x4; counter Serca when she appears. Hard/Nightmare: bombs spawn during safe zone. Guard variants: Slow Hammer, Fast Hammer, Broom, Scythe, Wheel."
      }
    ]
  },
  {
    encounterKey: "Serca G2",
    raid: "Serca",
    gate: 2,
    releaseOrder: 18,
    availableDifficulties: ["Normal", "Hard", "Nightmare"],
    boss: "Corvus Tul Rak",
    bossType: "ANCIENT",
    weakness: "Weak to Light",
    tauntable: false,
    mechanics: [
      {
        key: "serca-g2-wing-prediction",
        name: "Wing Prediction",
        hpBar: 285,
        repeatSecs: 30,
        triggerType: "hp+timer",
        severity: "major",
        difficulties: ["Normal", "Hard", "Nightmare"],
        notes:
          "Stay opposite of the wing swipe. Normal/Hard: spacebar on red flash. Nightmare: count 2 wing flaps → spacebar after gray pulse. (Maxroll calls this '1st Detection'.)"
      },
      {
        key: "serca-g2-veiled-stagger",
        name: "Veiled Stagger",
        hpBar: 240,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard", "Nightmare"],
        notes:
          "Find real clone: attacks = fake, no attacks = real; raised sword = −1 clock position, lowered sword = +1 clock position. (Maxroll calls this 'Find the Clone 1'.)"
      },
      {
        key: "serca-g2-guard-drain",
        name: "Guard Drain",
        hpBar: 190,
        triggerType: "hp",
        severity: "wipe",
        difficulties: ["Normal", "Hard", "Nightmare"],
        notes:
          "Sequence: In → Out → 2 Guards → Frontal (dodge) → Counter → Guard; completing this allows crafting the Shadow Skill battle item. (Maxroll calls this 'Guard/Counter Sequence'.)"
      },
      {
        key: "serca-g2-find-corvuth",
        name: "Find Corvuth",
        hpBar: 120,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard", "Nightmare"],
        notes:
          "Scout clones at x3 & x3+1 positions; sword cursor/red outline = fake; dodge while standing still during red AoE at 20s & 10s marks. (Maxroll calls this 'Find the Clone 2', 30s DPS check.)"
      },
      {
        key: "serca-g2-stagger-helping-pattern",
        name: "Stagger Helping Pattern",
        timerSecs: 510,
        triggerType: "timer",
        severity: "normal",
        difficulties: ["Normal", "Hard", "Nightmare"],
        notes: "Timer-based stagger window; fire when boss is staggerable"
      },
      {
        key: "serca-g2-pizza-prediction",
        name: "Pizza Prediction",
        hpBar: 60,
        triggerType: "hp",
        severity: "major",
        difficulties: ["Normal", "Hard", "Nightmare"],
        notes:
          "Remember Pac-Man order and stagger boss. Normal/Hard: spacebar on red flash. Nightmare: count 2 wing flaps then spacebar. (Maxroll calls this 'Triangle Detection'.)"
      }
    ]
  }
];

function makeMechanics(raw: LibraryMechanic[], prefix: string): Mechanic[] {
  return raw.map((m, i) => ({
    id: `${prefix}-${i}-${Date.now()}`,
    key: m.key,
    origin: "library" as const,
    userEdited: false,
    name: m.name,
    severity: m.severity,
    triggerType: m.triggerType,
    hpBar: m.hpBar ?? null,
    timerSecs: m.timerSecs ?? null,
    repeatSecs: m.repeatSecs ?? null,
    phase: null,
    ttsEnabled: true,
    ttsText: m.name,
    notes: m.notes ?? "",
    difficulties: m.difficulties?.length ? m.difficulties : undefined
  }));
}

export function buildLibraryGate(entry: LibraryGate): Gate {
  const slug = entry.encounterKey.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id: `lib-${slug}-${Date.now()}`,
    raid: entry.raid,
    gate: entry.gate,
    boss: entry.boss,
    bossType: entry.bossType,
    weakness: entry.weakness,
    tauntable: entry.tauntable,
    totalBars: entry.totalBars ?? bossHpMap[entry.boss] ?? 300,
    mechanics: makeMechanics(entry.mechanics, slug)
  };
}

/** Unique raid names sorted newest → oldest */
export const sortedRaidNames: string[] = [
  ...new Set([...LIBRARY].sort((a, b) => b.releaseOrder - a.releaseOrder).map((g) => g.raid))
];

/** All library entries grouped by raid name, gates sorted by gate number */
export const libraryByRaid: Record<string, LibraryGate[]> = Object.fromEntries(
  Object.entries(
    LIBRARY.reduce(
      (acc, g) => {
        (acc[g.raid] ??= []).push(g);
        return acc;
      },
      {} as Record<string, LibraryGate[]>
    )
  ).map(([raid, gates]) => [raid, [...gates].sort((a, b) => a.gate - b.gate)])
);

/** Check if a gate (by encounterKey) is already in the user's raid list */
export function isImported(raids: Gate[], encounterKey: string): boolean {
  const entry = LIBRARY.find((g) => g.encounterKey === encounterKey);
  if (!entry) return false;
  return raids.some((r) => r.raid === entry.raid && r.gate === entry.gate);
}

function stableGate(entry: LibraryGate): Gate {
  const slug = entry.encounterKey.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id: `default-${slug}`,
    raid: entry.raid,
    gate: entry.gate,
    boss: entry.boss,
    bossType: entry.bossType,
    weakness: entry.weakness,
    tauntable: entry.tauntable,
    totalBars: entry.totalBars ?? bossHpMap[entry.boss] ?? 300,
    mechanics: entry.mechanics.map((m, i) => ({
      id: `default-${slug}-m${i}`,
      key: m.key,
      origin: "library" as const,
      userEdited: false,
      name: m.name,
      severity: m.severity,
      triggerType: m.triggerType,
      hpBar: m.hpBar ?? null,
      timerSecs: m.timerSecs ?? null,
      repeatSecs: m.repeatSecs ?? null,
      phase: null,
      ttsEnabled: true,
      ttsText: m.name,
      notes: m.notes ?? "",
      difficulties: m.difficulties?.length ? m.difficulties : undefined
    }))
  };
}

/** 3 newest raids, oldest-first in array so sidebar .reverse() shows newest at top */
export function buildDefaultRaids(): Gate[] {
  const newest3 = sortedRaidNames.slice(0, 3).reverse(); // oldest→newest order
  return newest3.flatMap((raidName) =>
    LIBRARY.filter((g) => g.raid === raidName)
      .sort((a, b) => a.gate - b.gate)
      .map(stableGate)
  );
}

export { LIBRARY };

// Module-load assertion: catches the maintainer mistake of pasting a mech and
// forgetting to give it a unique key. Throws at app startup, not at runtime
// during reconciliation, so failures surface during dev rather than in prod.
(function assertUniqueLibraryKeys() {
  const seen = new Map<string, string>();
  for (const gate of LIBRARY) {
    for (const mech of gate.mechanics) {
      const prior = seen.get(mech.key);
      if (prior) {
        throw new Error(
          `[raid-library] Duplicate mech key "${mech.key}" in "${prior}" and "${gate.encounterKey}". ` +
            `Library keys must be unique across all gates.`
        );
      }
      seen.set(mech.key, gate.encounterKey);
    }
  }
})();
