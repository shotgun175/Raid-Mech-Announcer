import type { Gate, Mechanic, Severity, TriggerType } from "$lib/mech-types";
import { bossHpMap } from "$lib/constants/encounters";

interface LibraryMechanic {
  name: string;
  severity: Severity;
  triggerType: TriggerType;
  hpBar?: number;
  timerSecs?: number;
  repeatSecs?: number;
  notes?: string;
}

interface LibraryGate {
  encounterKey: string;
  raid: string;
  gate: number;
  releaseOrder: number; // index from encounters.json (higher = newer)
  boss: string;
  bossType: string;
  weakness: string;
  tauntable: boolean;
  mechanics: LibraryMechanic[];
}

const LIBRARY: LibraryGate[] = [
  // ── Valtan (releaseOrder 1) ─────────────────────────────────────────────────
  {
    encounterKey: "Valtan G1",
    raid: "Valtan",
    gate: 1,
    releaseOrder: 1,
    boss: "Dark Mountain Predator",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        name: "Blue Wolf Split",
        hpBar: 40,
        triggerType: "hp",
        severity: "major",
        notes: "Separate wolves; Golden Orb Buff holders attack Blue Wolf; use Wei sidereal for coordination"
      },
      {
        name: "Orb Phase",
        hpBar: 30,
        triggerType: "hp",
        severity: "major",
        notes: "Consume orbs to manage critical resources; Wei sidereal applicable"
      },
      {
        name: "Red Wolf Split",
        hpBar: 25,
        triggerType: "hp",
        severity: "major",
        notes: "Mirror of Blue Wolf split with reversed buff assignments; reallocate buffs"
      },
      {
        name: "Orb Phase (2nd)",
        hpBar: 15,
        triggerType: "hp",
        severity: "major",
        notes: "Second orb consumption phase; Wei sidereal applicable; push to finish after"
      }
    ]
  },
  {
    encounterKey: "Valtan G2",
    raid: "Valtan",
    gate: 2,
    releaseOrder: 1,
    boss: "Demon Beast Commander Valtan",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        name: "Armor Break",
        hpBar: 160,
        triggerType: "hp",
        severity: "major",
        notes: "Use Corrosive Bomb and Destruction Bomb when Valtan charges into a wall; positioning-dependent"
      },
      {
        name: "Wipe Pattern",
        hpBar: 130,
        triggerType: "hp",
        severity: "wipe",
        notes: "Heavy raid-wide wipe mechanic; use Balthorr sidereal"
      },
      {
        name: "Pillar Hug",
        hpBar: 110,
        triggerType: "hp",
        severity: "major",
        notes: "Pillars block Yellow Zone damage; hide behind pillar or use Time Stop Potion with strict dodge timing"
      },
      {
        name: "Stage Break",
        hpBar: 85,
        triggerType: "hp",
        severity: "major",
        notes: "Red telegraphs signal arena halving; move to opposite side from broken half"
      },
      {
        name: "Counter",
        hpBar: 65,
        triggerType: "hp",
        severity: "normal",
        notes: "Counter precisely ~3 seconds after Valtan's turning animation; strict timing"
      },
      {
        name: "Ghost Phase",
        hpBar: 40,
        triggerType: "hp",
        severity: "major",
        notes:
          "Counter ghost clones to remove armor stacks and build Sidereal meter; use Thirain after all stacks removed"
      },
      {
        name: "Stage Break (2nd)",
        hpBar: 35,
        triggerType: "hp",
        severity: "major",
        notes: "Arena breaks again; move to opposite safe side; spatial awareness critical"
      },
      {
        name: "Ghost Transition",
        hpBar: 17,
        triggerType: "hp",
        severity: "wipe",
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
    boss: "Incubus Morphe",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        name: "Clone Rotation",
        hpBar: 120,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "5 players take orbs in center; 3 scout for wing count (0/1/2); rotate Purple 0→1→2 and Red 2→1→0; use Nineveh sidereal"
      },
      {
        name: "Clone Absorption",
        hpBar: 65,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Memorize black shockwaves and block black orbs from the clone; 5 shockwaves total; use Nineveh sidereal; memory-intensive"
      }
    ]
  },
  {
    encounterKey: "Vykas G2",
    raid: "Vykas",
    gate: 2,
    releaseOrder: 2,
    boss: "Covetous Devourer Vykas",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        name: "Swamp",
        hpBar: 170,
        triggerType: "hp",
        severity: "major",
        notes:
          "Place brown swamp in marked area; run swamp away from spot; group up at marked location for coordination"
      },
      {
        name: "Sword & Clones",
        hpBar: 150,
        triggerType: "hp",
        severity: "major",
        notes: ">70% Meter: ping sword locations; <70% Meter: ping clone overlaps; meter-dependent callouts"
      },
      {
        name: "Key Input",
        hpBar: 135,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Use north yellow orb to reduce Seduction Gauge to 0; execute key input; use Nineveh sidereal after key input"
      },
      {
        name: "Throne",
        hpBar: 120,
        triggerType: "hp",
        severity: "major",
        notes: "Stack Seduction Puddles together; build Seduction Gauge to 100%; gauge accumulation phase"
      },
      {
        name: "Stagger Check",
        hpBar: 102,
        triggerType: "hp",
        severity: "major",
        notes: "Two methods: west orb + stagger OR Wei sidereal with top slime while others kill bottom"
      },
      {
        name: "Swamp (2nd)",
        hpBar: 75,
        triggerType: "hp",
        severity: "major",
        notes: "Safe spot highlighted white on Human side; Human team calls out safe spot to Demon team"
      },
      {
        name: "Tentacles",
        hpBar: 55,
        triggerType: "hp",
        severity: "major",
        notes: "Red orbs increase Seduction Gauge; tentacles only destroyable by players with >70% Meter"
      },
      {
        name: "Last Struggle",
        hpBar: 2,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Consume yellow orb at ~x10 to hit 0 Seduction Gauge; at x2 find real Vykas, get behind and stagger; use Wei sidereal"
      }
    ]
  },

  // ── Kakul-Saydon / Clown (releaseOrder 3) ──────────────────────────────────
  {
    encounterKey: "Clown G1",
    raid: "Clown",
    gate: 1,
    releaseOrder: 3,
    boss: "Saydon",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        name: "Break",
        hpBar: 130,
        triggerType: "hp",
        severity: "major",
        notes: "Stagger where there is no purple shield; attack the unprotected side"
      },
      {
        name: "Heart",
        hpBar: 110,
        triggerType: "hp",
        severity: "major",
        notes: "Ping hearts; face away from the non-heart if 3 are present; face the heart if only 1 is present"
      },
      {
        name: "Simon Says",
        hpBar: 85,
        triggerType: "hp",
        severity: "major",
        notes: "Mirror boss emote when it faces you; use a different emote when its back is turned"
      },
      {
        name: "Break (2nd)",
        hpBar: 65,
        triggerType: "hp",
        severity: "major",
        notes: "Repeat stagger mechanic — attack where there is no purple shield"
      },
      {
        name: "Roulette",
        hpBar: 45,
        triggerType: "hp",
        severity: "wipe",
        notes: "Match suit/symbol above your head with the space across 3 rounds; use Inanna sidereal"
      },
      {
        name: "Heart (2nd)",
        hpBar: 25,
        triggerType: "hp",
        severity: "major",
        notes: "Repeat heart mechanic from x110; same logic, face the heart or away from non-heart"
      }
    ]
  },
  {
    encounterKey: "Clown G2",
    raid: "Clown",
    gate: 2,
    releaseOrder: 3,
    boss: "Kakul",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        name: "Saydon Arrives",
        hpBar: 125,
        triggerType: "hp",
        severity: "normal",
        notes: "Saydon joins the fight; boss transformation phase — prepare for multi-mechanic overlap"
      },
      {
        name: "Curtain",
        hpBar: 110,
        triggerType: "hp",
        severity: "major",
        notes: "Party splits: 2 players enter red dome, 1 player enters blue dome; handle dome mechanics separately"
      },
      {
        name: "Flip",
        hpBar: 95,
        triggerType: "hp",
        severity: "wipe",
        notes: "Target 2nd/6th card initially; if unsuccessful, 4th position holds the answer"
      },
      {
        name: "Maze",
        hpBar: 75,
        triggerType: "hp",
        severity: "wipe",
        notes: "Coordinate via Discord or call positions by rows/columns; don't overlap"
      },
      {
        name: "Pizza",
        hpBar: 55,
        triggerType: "hp",
        severity: "major",
        notes: "Watch star rotation across 3 patterns; use Inanna sidereal"
      },
      {
        name: "Flip (2nd)",
        hpBar: 30,
        triggerType: "hp",
        severity: "wipe",
        notes: "Repeat card-finding mechanic from x95; same 2nd/6th → 4th fallback"
      }
    ]
  },
  {
    encounterKey: "Clown G3",
    raid: "Clown",
    gate: 3,
    releaseOrder: 3,
    boss: "Kakul-Saydon",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        name: "1st Mario + Curtain Call",
        hpBar: 155,
        triggerType: "hp",
        severity: "major",
        notes: "First Mario player enters stage; vertical saws mechanic follows during curtain call"
      },
      {
        name: "2nd Mario + Curtain Call",
        hpBar: 130,
        triggerType: "hp",
        severity: "major",
        notes: "Second Mario with hooks mechanic; dodge hooks while managing curtain call"
      },
      {
        name: "Showtime",
        hpBar: 90,
        triggerType: "hp",
        severity: "wipe",
        notes: "Group to bottom to dodge initial bullet shower; person targeted by cone stands in front of bomb"
      },
      {
        name: "3rd Mario + Curtain Call",
        hpBar: 80,
        triggerType: "hp",
        severity: "major",
        notes: "Hooks and saws combination; most complex Mario stage"
      },
      {
        name: "4th Mario + Curtain Call",
        hpBar: 55,
        triggerType: "hp",
        severity: "major",
        notes: "Must pull both levers before the stagger check window opens"
      },
      {
        name: "Bingo",
        hpBar: 0,
        triggerType: "hp",
        severity: "wipe",
        notes: "Final Bingo phase; use Bingo-Tool to coordinate; fail = wipe"
      }
    ]
  },

  // ── Brelshaza (releaseOrder 4) ──────────────────────────────────────────────
  {
    encounterKey: "Brelshaza G1",
    raid: "Brelshaza",
    gate: 1,
    releaseOrder: 4,
    boss: "Gehenna Helkasirs",
    bossType: "ANCIENT",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Safe Zones",
        hpBar: 85,
        triggerType: "hp",
        severity: "major",
        notes: "Assign positions before fight; occupy your spawned safe zone immediately when it appears"
      },
      {
        name: "Sidereal Phase",
        hpBar: 45,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Use Azena sidereal; complete 6 counter attacks; Hammer & Bow Split: use Thirain once both bosses are aligned"
      }
    ]
  },
  {
    encounterKey: "Brelshaza G2",
    raid: "Brelshaza",
    gate: 2,
    releaseOrder: 4,
    boss: "Ashtarot",
    bossType: "ANCIENT",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Meteors + Stagger",
        hpBar: 145,
        triggerType: "hp",
        severity: "wipe",
        notes: "Party positions spawn meteors; initiate typing test then stagger — all three must succeed"
      },
      {
        name: "Medusa + Stagger",
        hpBar: 100,
        triggerType: "hp",
        severity: "major",
        notes: "Cat's eye = look away; Round eye = look inside the AoE; stagger after resolving eye"
      },
      {
        name: "Shapes",
        hpBar: 43,
        triggerType: "hp",
        severity: "wipe",
        notes: "Destroy assigned stars, squares, and diamonds per color pattern; wrong shape = chain explosion"
      },
      {
        name: "Red & Blue Spears",
        hpBar: 0,
        triggerType: "hp",
        severity: "wipe",
        notes: "Consume all 6 colored marks correctly to finish the gate; wrong order wipes"
      }
    ]
  },
  {
    encounterKey: "Brelshaza G3",
    raid: "Brelshaza",
    gate: 3,
    releaseOrder: 4,
    boss: "Primordial Nightmare",
    bossType: "ANCIENT",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Dream World (1st)",
        hpBar: 212,
        triggerType: "hp",
        severity: "wipe",
        notes: "Check shape, dodge projectiles, navigate 3 safe areas, then report what you saw to the party"
      },
      {
        name: "Golden Meteor (1st)",
        hpBar: 188,
        triggerType: "hp",
        severity: "major",
        notes: "Track blue meteor order; gold meteor always at 12 o'clock; escape the zone when placed"
      },
      {
        name: "Black Hole",
        hpBar: 113,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Avoid center tiles; collect yellow orbs; counter at pinged locations; HM: can skip with Shandi + high DPS"
      },
      {
        name: "Dream World (2nd)",
        hpBar: 28,
        triggerType: "hp",
        severity: "wipe",
        notes: "Repeat shape mechanic; random inputs this time; use Inanna sidereal to cleanse"
      },
      {
        name: "Final Nightmare",
        hpBar: 25,
        triggerType: "hp",
        severity: "major",
        notes: "Avoid 3/6/9/12 o'clock cardinal positions; push damage to finish"
      }
    ]
  },
  {
    encounterKey: "Brelshaza G4",
    raid: "Brelshaza",
    gate: 4,
    releaseOrder: 4,
    boss: "Phantom Legion Commander Brelshaza",
    bossType: "ANCIENT",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Red/Blue/Yellow Domes (1st)",
        hpBar: 170,
        triggerType: "hp",
        severity: "wipe",
        notes: "Lowest stagger player enters dome; collect required objects after stagger resolves"
      },
      {
        name: "Stagger Check (1st)",
        hpBar: 95,
        triggerType: "hp",
        severity: "wipe",
        notes: "Use Inanna sidereal (cleanse) or Wei sidereal (high stagger damage); coordinate sidereal usage"
      },
      {
        name: "Red/Blue/Yellow Domes (2nd)",
        hpBar: 60,
        triggerType: "hp",
        severity: "wipe",
        notes: "Repeat color dome mechanic from x170; same rules apply"
      },
      {
        name: "Stagger Check (2nd)",
        hpBar: 20,
        triggerType: "hp",
        severity: "wipe",
        notes: "Final stagger check; use remaining sidereals; push to end"
      }
    ]
  },

  // ── Kayangel (releaseOrder 5) ───────────────────────────────────────────────
  {
    encounterKey: "Kayangel G1",
    raid: "Kayangel",
    gate: 1,
    releaseOrder: 5,
    boss: "Tienis",
    bossType: "HUMAN",
    weakness: "Weak to Dark",
    tauntable: true,
    mechanics: [
      {
        name: "Dodge Minigame",
        hpBar: 55,
        triggerType: "hp",
        severity: "major",
        notes:
          "Watch for spear toss; avoid AoE knockback; puddles after x55 stun on contact; HM: additional lightning narrows safe spots"
      }
    ]
  },
  {
    encounterKey: "Kayangel G2",
    raid: "Kayangel",
    gate: 2,
    releaseOrder: 5,
    boss: "Prunya",
    bossType: "HUMAN",
    weakness: "Weak to Dark",
    tauntable: true,
    mechanics: [
      {
        name: "Rotating Elements",
        hpBar: 62,
        triggerType: "hp",
        severity: "major",
        notes: "Intercept orbs, rotate counterclockwise avoiding repeated directions, destroy counter-element"
      },
      {
        name: "Counter/Stagger",
        hpBar: 42,
        triggerType: "hp",
        severity: "major",
        notes:
          "Counter all three mobs before boss stagger; missing any counter fails the mechanic; HM: additional counter mobs"
      },
      {
        name: "Rings",
        hpBar: 20,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Assign players to rings by color; failing 3 times wipes; HM: third ring requires two players splitting coverage"
      }
    ]
  },
  {
    encounterKey: "Kayangel G3",
    raid: "Kayangel",
    gate: 3,
    releaseOrder: 5,
    boss: "Lauriel",
    bossType: "HUMAN",
    weakness: "Weak to Dark",
    tauntable: true,
    mechanics: [
      {
        name: "Explosions / Egg Break",
        hpBar: 180,
        triggerType: "hp",
        severity: "major",
        notes:
          "Dodge 3 explosions then aim laser at egg for a 2-minute damage buff; HM: explosions overlap with orb collection"
      },
      {
        name: "Light Delivery",
        hpBar: 135,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Reflect beam through each player into boss in party order; don't stack to prevent imprisonment; HM: black puddles require angle adjustments"
      },
      {
        name: "White Orbs / Sunlight",
        hpBar: 100,
        triggerType: "hp",
        severity: "major",
        notes: "Collect 5 white orbs for shield; black orbs stun — avoid; use Time Stop Potion if shield is missed"
      },
      {
        name: "Pillars / Clones",
        hpBar: 60,
        triggerType: "hp",
        severity: "major",
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
    boss: "Griefbringer Maurug",
    bossType: "OTHER",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "8 Tumor Orbs / Spear",
        hpBar: 140,
        triggerType: "hp",
        severity: "major",
        notes: "Spears inflict percentage HP damage; time orb contact carefully to avoid overlap"
      },
      {
        name: "Cleanse / Stagger",
        hpBar: 128,
        triggerType: "hp",
        severity: "major",
        notes:
          "Touching opposite-color tumor = debuff (heal reduction + DoT); two tumors = death; HM: 4 orbs, one different color marks grab position"
      },
      {
        name: "Orbs / Grab / Stagger",
        hpBar: 112,
        triggerType: "hp",
        severity: "wipe",
        notes: "Only the different-colored orb designates grab position (HM); stagger check after grab resolves"
      },
      {
        name: "Flood Escape",
        hpBar: 90,
        triggerType: "hp",
        severity: "wipe",
        notes: "Evacuation phase — wrong path = instant death (HM) vs destroyable barricade (NM); memorize route"
      },
      {
        name: "Stop Mobs",
        hpBar: 75,
        triggerType: "hp",
        severity: "major",
        notes: "Kill mob waves before they reach objective; HM: must eliminate 2 large mobs instead of 1"
      },
      {
        name: "Inanna Stagger",
        hpBar: 50,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Use Inanna sidereal — converts to free DPS phase when boss stands; deploy Thirain immediately after for bonus damage before 60s timer"
      },
      {
        name: "Shield / Bells",
        hpBar: 20,
        triggerType: "hp",
        severity: "major",
        notes: "Green circles inflict 30%+ damage taken vulnerability; time movement carefully around bell triggers"
      }
    ]
  },
  {
    encounterKey: "Akkan G2",
    raid: "Akkan",
    gate: 2,
    releaseOrder: 6,
    boss: "Lord of Degradation Akkan",
    bossType: "OTHER",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Tentacles",
        hpBar: 175,
        triggerType: "hp",
        severity: "major",
        notes: "Stay away from center; destroy tentacles quickly before they charge"
      },
      {
        name: "Ghost",
        hpBar: 160,
        triggerType: "hp",
        severity: "major",
        notes:
          "Prevent red ghost from reaching skull; pass skull clockwise; HM: green ghost also spawns; optional Camouflage Robe for invisibility"
      },
      {
        name: "Red Hole",
        hpBar: 140,
        triggerType: "hp",
        severity: "major",
        notes:
          "Avoid touching red hole or ring explosions (heavy disease meter increase); dodge teleport after third explosion"
      },
      {
        name: "Hide",
        hpBar: 110,
        triggerType: "hp",
        severity: "major",
        notes: "Take cover from Akkan's incoming sweep; find a valid safe position"
      },
      {
        name: "Red Hole (2nd)",
        hpBar: 85,
        triggerType: "hp",
        severity: "major",
        notes: "Repeat red hole; use Thirain sidereal in front of boss for damage boost and extended safe window"
      },
      {
        name: "Ghost (2nd)",
        hpBar: 55,
        triggerType: "hp",
        severity: "major",
        notes:
          "Counter clones to build Sidereal meter ~33% per counter; HM: petrified players executed by Akkan at mechanic end"
      },
      {
        name: "Red Hole (3rd)",
        hpBar: 30,
        triggerType: "hp",
        severity: "major",
        notes: "Final red hole; same avoidance as previous instances; push damage after"
      },
      {
        name: "Destruction",
        hpBar: 0,
        triggerType: "hp",
        severity: "wipe",
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
    boss: "Plague Legion Commander Akkan",
    bossType: "OTHER",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "X Stagger",
        hpBar: 200,
        triggerType: "hp",
        severity: "major",
        notes:
          "Disease meter fills from boss attacks; 5th stack = charm effect causing explosion that kills nearby players"
      },
      {
        name: "Line Delivery & Stagger",
        hpBar: 165,
        triggerType: "hp",
        severity: "wipe",
        notes: "Use Inanna sidereal to reduce gauge; prevent knockoff deaths during destruction phases"
      },
      {
        name: "Star or Hexagon",
        hpBar: 140,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Identify star vs hexagon pattern; HM: pizza with 5 consecutive explosions — use Time Stop Potion for safety"
      },
      {
        name: "Plague Wave",
        hpBar: 139,
        repeatSecs: 60,
        triggerType: "hp+timer",
        severity: "major",
        notes: "Persistent disease meter mechanic repeats every 60s; manage stacks continuously"
      },
      {
        name: "Arena Break",
        hpBar: 30,
        triggerType: "hp",
        severity: "major",
        notes:
          "HM: Giant Akkan phase; Smash attacks at x235/x135 — ledge-jump or step on Worm Trap; Water Park platform tilting; use Wei at x15 to skip final destruction"
      },
      {
        name: "Destruction",
        hpBar: 0,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Don't stand in Big Scythe path (instant kill HM); use Wei sidereal at x15+ to skip this final destruction check"
      }
    ]
  },

  // ── Ivory Tower (releaseOrder 7) ────────────────────────────────────────────
  {
    encounterKey: "Ivory Tower G1",
    raid: "Ivory Tower",
    gate: 1,
    releaseOrder: 7,
    boss: "Kaltaya, the Blooming Chaos",
    bossType: "OTHER",
    weakness: "Weak to Fire",
    tauntable: false,
    mechanics: [
      {
        name: "Catch / Stagger",
        hpBar: 85,
        triggerType: "hp",
        severity: "major",
        notes: "Collect green seeds while avoiding purple ones; stagger the boss once seeds collected"
      },
      {
        name: "Orbs / Fire",
        hpBar: 45,
        triggerType: "hp",
        severity: "wipe",
        notes: "Guide the plant to destroy golden dust; attack purple orbs until x15; use Flame Grenade when ready"
      }
    ]
  },
  {
    encounterKey: "Ivory Tower G2",
    raid: "Ivory Tower",
    gate: 2,
    releaseOrder: 7,
    boss: "Rakathus, the Lurking Arrogance",
    bossType: "OTHER",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Clones",
        hpBar: 95,
        triggerType: "hp",
        severity: "major",
        notes: "Support stays center at clock positions; counter and kill clones as they appear"
      },
      {
        name: "Marathon / Stagger",
        hpBar: 30,
        triggerType: "hp",
        severity: "wipe",
        notes: "Gather at center, move to opposite side of boss, wait for flame breath, then rush in and stagger"
      }
    ]
  },
  {
    encounterKey: "Ivory Tower G3",
    raid: "Ivory Tower",
    gate: 3,
    releaseOrder: 7,
    boss: "Firehorn, Trampler of Earth",
    bossType: "ANCIENT",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Pizza",
        hpBar: 160,
        triggerType: "hp",
        severity: "major",
        notes:
          "Move to 3 positions; dodge 2 slices and mirror explosion; guide 3rd slice toward mirror; repeat clockwise"
      },
      {
        name: "Stagger",
        hpBar: 160,
        triggerType: "hp",
        severity: "major",
        notes: "Stagger boss first, then split into groups of 2 to stagger the bottom mirrors"
      },
      {
        name: "Mirror Counter",
        hpBar: 110,
        triggerType: "hp",
        severity: "wipe",
        notes: "Use method '11223344'; counter real mirrors (red thorns) not fakes (purple thorns)"
      },
      {
        name: "Sword Destruction",
        hpBar: 60,
        triggerType: "hp",
        severity: "wipe",
        notes: "Move to 3 positions with Destruction Bomb; stagger; use weak point skills on destruction targets"
      },
      {
        name: "Guardian Fight",
        hpBar: 60,
        triggerType: "hp",
        severity: "wipe",
        notes: "Lowest DPS gets tethered; grab order is highest DD → Support → DD"
      },
      {
        name: "Rage Phase",
        hpBar: 40,
        triggerType: "hp",
        severity: "major",
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
    boss: "Killineza the Dark Worshipper",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        name: "Tentacle Destruction",
        hpBar: 145,
        triggerType: "hp",
        severity: "major",
        notes: "Run to arena edge; throw bombs on tentacles then stagger the boss"
      },
      {
        name: "Three Craters",
        hpBar: 100,
        triggerType: "hp",
        severity: "major",
        notes: "Marked players stand in craters; same crater is targeted twice — hold position"
      },
      {
        name: "Destroy & Grab",
        hpBar: 55,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Use Balthorr sidereal if needed; at x3+1 on outer edge locate red tentacle, throw bombs, get grabbed by yellow telegraph"
      },
      {
        name: "Eye Safe Zone",
        hpBar: 38,
        triggerType: "hp",
        severity: "major",
        notes: "Boss hands transform to claws; eyes indicate incoming direction; safe spot appears after two dashes"
      },
      {
        name: "Eye Black Hole (HM)",
        hpBar: 35,
        triggerType: "hp",
        severity: "major",
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
    boss: "Valinak, Knight of Darkness",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        name: "Arena Break (HM)",
        hpBar: 153,
        triggerType: "hp",
        severity: "normal",
        notes: "Hard Mode only; top or bottom arena side breaks off — reposition accordingly"
      },
      {
        name: "8 Counters & Run",
        hpBar: 135,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Counter in party order (Party 1 then Party 2); avoid red flash counters; use Azena after wings and shockwave"
      },
      {
        name: "Black or Blue Stagger",
        hpBar: 72,
        triggerType: "hp",
        severity: "major",
        notes: "Identify the swirl color around the boss; attack the opposite-colored orbs to stagger"
      },
      {
        name: "3 Monster Waves",
        hpBar: 18,
        triggerType: "hp",
        severity: "wipe",
        notes: "Defeat 8 weak → 4 elite → 2 boss monsters in sequence; use Thirain sidereal for the dual dragon bosses"
      }
    ]
  },
  {
    encounterKey: "Thaemine G3",
    raid: "Thaemine",
    gate: 3,
    releaseOrder: 8,
    boss: "Thaemine the Lightqueller",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Sword Fight 1",
        hpBar: 300,
        triggerType: "hp",
        severity: "major",
        notes: "Match the direction of boss's raised hand"
      },
      {
        name: "Albion",
        hpBar: 275,
        triggerType: "hp",
        severity: "major",
        notes: "Observe patterns and walk to the shown safe spots"
      },
      {
        name: "Sword Fight 2",
        hpBar: 255,
        triggerType: "hp",
        severity: "major",
        notes: "Dodge the pizza, bait boss sword to 9 o'clock then kill it"
      },
      {
        name: "Safe Spot",
        hpBar: 225,
        triggerType: "hp",
        severity: "major",
        notes: "Puddle player goes to top; all others go to bottom"
      },
      {
        name: "Shield & Clash",
        hpBar: 210,
        triggerType: "hp",
        severity: "wipe",
        notes: "Assign 5 players for clash; use Inanna sidereal for red telegraphs; burst through 40 HP shield"
      },
      {
        name: "Stage Break & Clash",
        hpBar: 210,
        repeatSecs: 45,
        triggerType: "hp+timer",
        severity: "wipe",
        notes: "Every 45s stage breaks and clashes repeat; use Nineveh sidereal as needed; fog expands at 20/70/120s"
      },
      {
        name: "Fog",
        hpBar: 90,
        triggerType: "hp",
        severity: "major",
        notes: "Black fog spreads from edges; push DPS to reach x55 HP quickly before fog covers arena"
      },
      {
        name: "Safe Spot (2nd)",
        hpBar: 55,
        triggerType: "hp",
        severity: "wipe",
        notes: "Movement is inverted; complete typing minigame; use Wei sidereal for ghosts if needed"
      }
    ]
  },
  {
    encounterKey: "Thaemine G4",
    raid: "Thaemine",
    gate: 4,
    releaseOrder: 8,
    boss: "Darkness Legion Commander Thaemine",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Stagger Check",
        hpBar: 320,
        triggerType: "hp",
        severity: "major",
        notes: "Place markers, dodge four red attack variations, stagger statue, and aim tethers"
      },
      {
        name: "Expert Destroyer",
        hpBar: 280,
        triggerType: "hp",
        severity: "wipe",
        notes: "Two DPS enter blue orb and kill clone/stagger sword; others spacebar wall then stagger"
      },
      {
        name: "Phase 2 Transition",
        hpBar: 220,
        triggerType: "hp",
        severity: "major",
        notes:
          "Phase 2 starts; use Shandi sidereal for Tethers & Clash; eliminate blue circles, gather yellow orb, run bottom, complete maze"
      }
    ]
  },

  // ── Echidna (releaseOrder 9) ────────────────────────────────────────────────
  {
    encounterKey: "Echidna G1",
    raid: "Echidna",
    gate: 1,
    releaseOrder: 9,
    boss: "Red Doom Narkiel",
    bossType: "HUMAN",
    weakness: "Weak to Fire",
    tauntable: true,
    mechanics: [
      {
        name: "First Encounter",
        hpBar: 180,
        triggerType: "hp",
        severity: "major",
        notes: "Kill elite mobs with Azena ally skill after shield breaks; both parties attack their separate elites"
      },
      {
        name: "Run Phase",
        hpBar: 162,
        triggerType: "hp",
        severity: "major",
        notes:
          "Timed platforming; must pass stagger check to reach boss before timer expires; use Azena when 3+ segments available"
      },
      {
        name: "Clone Split",
        hpBar: 135,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Safe spot on odd-colored lines; 4th line shows directional counter indicator; HM: inter-party communication for overlapping lines"
      },
      {
        name: "Invasion",
        hpBar: 110,
        triggerType: "hp",
        severity: "major",
        notes:
          "Use Avele ally skill next to boss, then deploy follow-up within 20 seconds to clear mobs before explosions"
      },
      {
        name: "Mini Boss",
        hpBar: 90,
        triggerType: "hp",
        severity: "major",
        notes: "Highest stagger party moves to mini boss; use Whirlwind Grenade (Bound)"
      },
      {
        name: "Smoke & Stagger",
        hpBar: 50,
        triggerType: "hp",
        severity: "wipe",
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
    boss: "Echidna",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Mirror Counter",
        hpBar: 210,
        triggerType: "hp",
        severity: "major",
        notes:
          "Counter the mirror showing Echidna's portrait in odd direction; NM: dodge horizontal lasers; HM: also dodge red side-shooting lasers; use Azena after stagger"
      },
      {
        name: "Huge Echidna",
        hpBar: 137,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "3-man co-op counter (2-man NM); HM: spacebar through 2nd mirror laser; flying hearts pull toward boss; use Thar for stagger then Azena after clash"
      },
      {
        name: "Basement Clash",
        hpBar: 120,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Repeats at 100 and 80 HP; kill snakes at clash circles for permanent 30% buff; raid lead uses Thar at first clash; leave white snake at 79 for 2nd clash strategy"
      },
      {
        name: "Mirror Stagger",
        hpBar: 50,
        triggerType: "hp",
        severity: "major",
        notes:
          "Large mirror rotates; follow its back and stagger; HM: find red glow and determine rotation direction (right=clockwise, left=counterclockwise)"
      },
      {
        name: "Final Struggle",
        hpBar: 0,
        triggerType: "hp",
        severity: "wipe",
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
    boss: "Behemoth, the Storm Commander",
    bossType: "ANCIENT",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "4 Guardians",
        hpBar: 460,
        triggerType: "hp",
        severity: "major",
        notes:
          "Four guardians spawn at clock positions (Nacrasena, Yoho, Calventus, Velganos); coordinate spread positions"
      },
      {
        name: "Twisters",
        hpBar: 460,
        repeatSecs: 90,
        triggerType: "hp+timer",
        severity: "normal",
        notes: "Spread on designated twister lines; manage timing between hits; repeats every 90s throughout the fight"
      },
      {
        name: "Group Counter/Stagger",
        hpBar: 190,
        triggerType: "hp",
        severity: "major",
        notes: "Co-op counter required on the second charge; HM differs from NM — coordinate timing"
      }
    ]
  },
  {
    encounterKey: "Behemoth G2",
    raid: "Behemoth",
    gate: 2,
    releaseOrder: 10,
    boss: "Behemoth, Cruel Storm Slayer",
    bossType: "ANCIENT",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Enhanced Twisters",
        hpBar: 700,
        repeatSecs: 90,
        triggerType: "hp+timer",
        severity: "normal",
        notes: "Assigned party positions with individual roles; repeats every 90s — trickier than G1 version"
      },
      {
        name: "Crystals",
        hpBar: 190,
        triggerType: "hp",
        severity: "major",
        notes:
          "Stagger phase; careful damage management required — stop hitting after two breaks to avoid destruction reset"
      }
    ]
  },

  // ── Aegir (releaseOrder 11) ──────────────────────────────────────────────────
  {
    encounterKey: "Aegir G1",
    raid: "Aegir",
    gate: 1,
    releaseOrder: 11,
    boss: "Akkan, Lord of Death",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Aegir Appears + Banishment",
        hpBar: 195,
        triggerType: "hp",
        severity: "major",
        notes: "Aegir appears and banishes players into individual realms; fight back to rejoin main arena"
      },
      {
        name: "Ghost Phase",
        hpBar: 170,
        triggerType: "hp",
        severity: "wipe",
        notes: "Ghost phase — avoid ghost touches; coordinate counters and use sidereals to survive"
      },
      {
        name: "Earthquake (HM)",
        hpBar: 150,
        triggerType: "hp",
        severity: "normal",
        notes: "Hard Mode only — earthquake mechanic; dodge the shockwave and reposition"
      },
      {
        name: "Flame Breath / Pillars",
        hpBar: 143,
        triggerType: "hp",
        severity: "major",
        notes: "Dodge flame breath; use pillars for cover from the sweeping attack"
      },
      {
        name: "Shield Break + Valtan",
        hpBar: 115,
        triggerType: "hp",
        severity: "major",
        notes: "Break Aegir's shield; Valtan's ghost assists — coordinate destruction skills"
      },
      {
        name: "Aegir Attack",
        hpBar: 85,
        triggerType: "hp",
        severity: "normal",
        notes: "Dodge Aegir's red telegraphed attacks; maintain positioning for next mechanic"
      },
      {
        name: "Aegir's Arm + Guard",
        hpBar: 60,
        triggerType: "hp",
        severity: "major",
        notes: "Guard against Aegir's arm sweeps; timing-sensitive — mistimed guard = knockback"
      },
      {
        name: "Final Stagger",
        hpBar: 30,
        triggerType: "hp",
        severity: "wipe",
        notes: "Final stagger check to finish the gate; deploy remaining sidereals here"
      }
    ]
  },
  {
    encounterKey: "Aegir G2",
    raid: "Aegir",
    gate: 2,
    releaseOrder: 11,
    boss: "Aegir, the Oppressor",
    bossType: "ANCIENT",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "1st Heart",
        hpBar: 260,
        triggerType: "hp",
        severity: "wipe",
        notes: "First Heart mechanic; destroy Aegir's heart to proceed; coordinate burst DPS window"
      },
      {
        name: "Armor Break (1st)",
        hpBar: 260,
        triggerType: "hp",
        severity: "major",
        notes: "Break Aegir's armor with destruction skills; opens after 1st Heart resolves"
      },
      {
        name: "Distorted Space (1st)",
        hpBar: 250,
        triggerType: "hp",
        severity: "wipe",
        notes: "Navigate distorted space; correct path or instant wipe; memorize safe routes"
      },
      {
        name: "2nd Heart",
        hpBar: 165,
        triggerType: "hp",
        severity: "wipe",
        notes: "Second Heart; same mechanic — repeat burst DPS on heart"
      },
      {
        name: "Armor Break (2nd)",
        hpBar: 165,
        triggerType: "hp",
        severity: "major",
        notes: "Second armor break window; follow same pattern as 1st"
      },
      {
        name: "Distorted Space (2nd)",
        hpBar: 153,
        triggerType: "hp",
        severity: "wipe",
        notes: "Second distorted space; routes may differ from 1st — stay alert"
      },
      {
        name: "Stage Break",
        hpBar: 95,
        triggerType: "hp",
        severity: "wipe",
        notes: "Arena stage breaks; reposition to surviving platform and push DPS"
      },
      {
        name: "Final Struggle (HM)",
        timerSecs: 50,
        repeatSecs: 50,
        triggerType: "timer",
        severity: "wipe",
        notes: "HM only; timer-based enrage every 50s; must kill before timer expires or wipe"
      }
    ]
  },

  // ── Act 2: Brelshaza (releaseOrder 12) ──────────────────────────────────────
  {
    encounterKey: "Act 2: Brelshaza G1",
    raid: "Act 2: Brelshaza",
    gate: 1,
    releaseOrder: 12,
    boss: "Narok the Butcher",
    bossType: "ANCIENT",
    weakness: "Weak to Lightning",
    tauntable: false,
    mechanics: [
      {
        name: "Armor Destruction",
        hpBar: 290,
        triggerType: "hp",
        severity: "major",
        notes: "Use Corrosive Bomb and destruction skills to break Narok's armor stacks"
      },
      {
        name: "Ice Wall",
        hpBar: 240,
        triggerType: "hp",
        severity: "wipe",
        notes: "Bait Narok's laser toward the ice wall to destroy it; coordinate positioning across the arena"
      },
      {
        name: "Perfect Guard + Time Attack (1st)",
        hpBar: 180,
        triggerType: "hp",
        severity: "wipe",
        notes: "Perfect guard sequence; 60s timer activates — break shield before time expires"
      },
      {
        name: "Chase + Stagger",
        hpBar: 120,
        triggerType: "hp",
        severity: "major",
        notes: "Chase Narok and break the barrier; stagger check follows"
      },
      {
        name: "Perfect Guard + Time Attack (2nd)",
        hpBar: 60,
        triggerType: "hp",
        severity: "wipe",
        notes: "Repeat perfect guard and time attack from x180; second run tends to be faster-paced"
      }
    ]
  },
  {
    encounterKey: "Act 2: Brelshaza G2",
    raid: "Act 2: Brelshaza",
    gate: 2,
    releaseOrder: 12,
    boss: "Phantom Manifester Brelshaza",
    bossType: "DEMONIC",
    weakness: "Weak to Lightning",
    tauntable: false,
    mechanics: [
      {
        name: "Colors Stagger",
        hpBar: 335,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "HM: two rings — Party 1 calls colors in order, Party 2 calls inner circle colors; stagger clones then boss"
      },
      {
        name: "Crystal Break",
        hpBar: 280,
        triggerType: "hp",
        severity: "major",
        notes:
          "White vs purple IQ test + typing test; marked players spawn crystals at 6 o'clock; use Azena (4 bars) or Nineveh (3 bars)"
      },
      {
        name: "Clockwise Orbs",
        hpBar: 145,
        triggerType: "hp",
        severity: "wipe",
        notes: "Rotate clockwise destroying orbs at 3x or 3x+1 positions; avoid AoEs; HM: dodge scythes as well"
      },
      {
        name: "Typing + Stagger (P3)",
        hpBar: 100,
        triggerType: "hp",
        severity: "wipe",
        notes: "Phase 3 begins; move to correct position, complete typing test, identify real clone, stagger boss"
      },
      {
        name: "Freeze AoE (P3)",
        hpBar: 100,
        repeatSecs: 240,
        triggerType: "hp+timer",
        severity: "major",
        notes:
          "Boss charges with hands — guard before yellow reaches end; failure = freeze + teleport + wave + typing test again"
      }
    ]
  },

  // ── Act 3: Mordum (releaseOrder 13) ─────────────────────────────────────────
  {
    encounterKey: "Act 3: Mordum G1",
    raid: "Act 3: Mordum",
    gate: 1,
    releaseOrder: 13,
    boss: "Thaemine, Master of Darkness",
    bossType: "HUMAN",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Shadow Realm Stagger",
        hpBar: 270,
        triggerType: "hp",
        severity: "major",
        notes: "Enter shadow realm; stagger check with coordination — miss it and the mechanic resets"
      },
      {
        name: "Hidden Kharmine",
        hpBar: 210,
        triggerType: "hp",
        severity: "major",
        notes: "Kharmine appears for co-op counter; coordinate timing with party"
      },
      {
        name: "Quick! Just Guard",
        hpBar: 75,
        triggerType: "hp",
        severity: "major",
        notes: "Retaliation just-guard sequence; precise timing required against fast attack chains"
      },
      {
        name: "Shrouded Attacks",
        hpBar: 50,
        triggerType: "hp",
        severity: "major",
        notes: "Aerial dragon Azakiel joins; watch for incoming strikes from above while fighting Thaemine"
      }
    ]
  },
  {
    encounterKey: "Act 3: Mordum G2",
    raid: "Act 3: Mordum",
    gate: 2,
    releaseOrder: 13,
    boss: "Blossoming Fear, Naitreya",
    bossType: "OTHER",
    weakness: "No Weakness",
    tauntable: true,
    mechanics: [
      {
        name: "Alberhastic Phase",
        hpBar: 300,
        triggerType: "hp",
        severity: "normal",
        notes: "Alberhastic joins; avoid stacking infection from boss attacks (x300–x235 window)"
      },
      {
        name: "Alberhastic Memory",
        hpBar: 235,
        triggerType: "hp",
        severity: "major",
        notes: "Color shield mechanic; memorize Alberhastic's color sequence to break the shield"
      },
      {
        name: "Illusion Clone",
        hpBar: 105,
        triggerType: "hp",
        severity: "major",
        notes: "Identify the real clone vs illusion using the gold puddle marker; attack the real one"
      },
      {
        name: "Velga Pizza",
        hpBar: 105,
        repeatSecs: 90,
        triggerType: "hp+timer",
        severity: "normal",
        notes: "Velganos pizza pattern repeats every 90s; dodge the correct slice and avoid re-overlap"
      }
    ]
  },
  {
    encounterKey: "Act 3: Mordum G3",
    raid: "Act 3: Mordum",
    gate: 3,
    releaseOrder: 13,
    boss: "Mordum, the Abyssal Punisher",
    bossType: "ANCIENT",
    weakness: "Weak to Earth",
    tauntable: false,
    mechanics: [
      {
        name: "Laser Chase",
        hpBar: 425,
        triggerType: "hp",
        severity: "major",
        notes: "Rotating laser chases players; stay ahead of the pattern, don't cut corners"
      },
      {
        name: "1st Break Duel",
        hpBar: 375,
        triggerType: "hp",
        severity: "major",
        notes: "First Break Duel; twisters active throughout the fight — coordinate with your designated partner"
      },
      {
        name: "Shattered Orb",
        hpBar: 325,
        triggerType: "hp",
        severity: "major",
        notes: "Shattered Orb spawns; position correctly to intercept or dodge orb fragments"
      },
      {
        name: "Supernova",
        hpBar: 300,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Raid-wide supernova wipe; must survive via safe zone or mechanic resolution (HM: Dance mechanic precedes)"
      },
      {
        name: "Anvil Just Guard",
        hpBar: 275,
        triggerType: "hp",
        severity: "major",
        notes: "Just guard the anvil slam; precise timing — mistimed guard = large damage or knockback"
      },
      {
        name: "2nd Break Duel",
        hpBar: 250,
        triggerType: "hp",
        severity: "major",
        notes: "Second Break Duel; same mechanic as 1st — coordinate partner duel while managing twisters"
      },
      {
        name: "Shield Disruption",
        hpBar: 200,
        triggerType: "hp",
        severity: "major",
        notes: "Color-matching shield disruption; coordinate color assignments across the party"
      },
      {
        name: "Charged Field",
        hpBar: 180,
        triggerType: "hp",
        severity: "major",
        notes: "Charged field activates; avoid or clear the field quickly before it expands"
      },
      {
        name: "Hammer Split/Bastion",
        hpBar: 160,
        triggerType: "hp",
        severity: "wipe",
        notes: "Hammer Split (NM) or Bastion (HM); HM requires entering Bastion before hammer strike"
      },
      {
        name: "3rd Break Duel",
        hpBar: 120,
        triggerType: "hp",
        severity: "major",
        notes: "Third Break Duel; HM adds Dance/Supernova sequence — complete quickly to avoid DPS check"
      },
      {
        name: "4th Break Duel",
        hpBar: 75,
        triggerType: "hp",
        severity: "major",
        notes: "Fourth and final Break Duel; push damage after for Last Stand"
      },
      {
        name: "Last Stand/Bastion",
        hpBar: 0,
        triggerType: "hp",
        severity: "wipe",
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
    boss: "Act 4: Covetous Master Echidna",
    bossType: "DEMONIC",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Spotlight",
        hpBar: 285,
        triggerType: "hp",
        severity: "major",
        notes: "Bait clone to edge of arena; dodge away from clone after positioning"
      },
      {
        name: "Shadow Dance",
        hpBar: 240,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "NM: 2 clones toward each other = opposite side; HM: follow the large Echidna shadow, match weapon/action"
      },
      {
        name: "Snake Dodge",
        hpBar: 220,
        triggerType: "hp",
        severity: "major",
        notes: "HM: marked players get rectangle snake attacks; spacebar through rope patterns (jump rope)"
      },
      {
        name: "Shield Destruction",
        hpBar: 150,
        triggerType: "hp",
        severity: "wipe",
        notes: "Use Nineveh+recast to deplete large shield; 1 flower pickup = 1 stack removal"
      },
      {
        name: "Brelshaza Invasion",
        hpBar: 30,
        triggerType: "hp",
        severity: "major",
        notes: "Use Wei for extra stagger/damage during Brelshaza phase; 3-bar recommended"
      }
    ]
  },
  {
    encounterKey: "Act 4: Armoche G2",
    raid: "Act 4: Armoche",
    gate: 2,
    releaseOrder: 16,
    boss: "Armoche, Sentinel of the Abyss",
    bossType: "ANCIENT",
    weakness: "Weak to Fire",
    tauntable: false,
    mechanics: [
      {
        name: "Billiard",
        hpBar: 420,
        triggerType: "hp",
        severity: "major",
        notes:
          "Pick up golden shield (G key) and throw (Q key) to remove armor stacks; cleanse bleed stacks at blue orbs"
      },
      {
        name: "Wind Stagger",
        hpBar: 360,
        triggerType: "hp",
        severity: "major",
        notes: "Use Balthorr sidereal; stagger + dodge 3 attacks → move downward avoiding soldiers → destroy rock wall"
      },
      {
        name: "Sentinel Rush",
        hpBar: 290,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Party assignment: 1=Left 2=Right; destroy yellow statues in order 4→3→2→1; ignore red statues; co-op counter after"
      },
      {
        name: "Combo Guards",
        hpBar: 240,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Use Thirain sidereal; gather at bottom; just guard patterns (Shield/Slash/Stab/Slam/Spin) while inflicting destruction"
      },
      {
        name: "Shield Wall",
        hpBar: 160,
        triggerType: "hp",
        severity: "major",
        notes: "Avoid red circle (instant death); use Balthorr during red line attacks for extra stagger"
      },
      {
        name: "Body Slam",
        hpBar: 110,
        triggerType: "hp",
        severity: "major",
        notes:
          "Spacebar jump rope; press A when knocked up; use Azena sidereal to destroy crater wall; sand tornado persists after"
      },
      {
        name: "Pillars",
        hpBar: 70,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Place 3 Volcano puddles away from pillars; hide behind a pillar to survive; Hyper Awakening or Time Stop if needed"
      }
    ]
  },

  // ── Final Act: Kazeros (releaseOrder 17) ────────────────────────────────────
  {
    encounterKey: "Final Act: Kazeros G1",
    raid: "Final Act: Kazeros",
    gate: 1,
    releaseOrder: 17,
    boss: "Abyss Lord Kazeros",
    bossType: "HUMAN",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Shield Debuff",
        hpBar: 900,
        triggerType: "hp",
        severity: "major",
        notes: "Use Nineveh+recast when shield spawns; save Shandi for DPS window"
      },
      {
        name: "Prokel",
        hpBar: 700,
        triggerType: "hp",
        severity: "major",
        notes: "All players separated into individual realms — fight Kazeros 1v1 until Prokel dies"
      },
      {
        name: "Clash",
        hpBar: 660,
        triggerType: "hp",
        severity: "normal",
        notes: "Find the correct clone; front/back indicators reveal the real Kazeros"
      },
      {
        name: "Cracks & Shield",
        hpBar: 500,
        triggerType: "hp",
        severity: "major",
        notes: "Use Nineveh+recast to break shield; team meter builds → consecutive special attacks"
      },
      {
        name: "Hidden Wei Clash",
        hpBar: 380,
        triggerType: "hp",
        severity: "normal",
        notes: "Use Hidden Wei when Kazeros reappears at 12 o'clock for damage window"
      },
      {
        name: "Kazeros Guard",
        hpBar: 100,
        triggerType: "hp",
        severity: "major",
        notes: "3 waffle attacks → safe zone appears; survive to win"
      }
    ]
  },
  {
    encounterKey: "Final Act: Kazeros G2-1",
    raid: "Final Act: Kazeros",
    gate: 21,
    releaseOrder: 17,
    boss: "Archdemon Kazeros",
    bossType: "HUMAN",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Forced Clash",
        hpBar: 950,
        triggerType: "hp",
        severity: "normal",
        notes: "First mechanic of G2; standard clash"
      },
      {
        name: "Colosseum",
        hpBar: 900,
        triggerType: "hp",
        severity: "major",
        notes: "Sequence 1: stun clouds → crater destruction → black hole → earthquake stagger"
      },
      {
        name: "Stagger Break",
        hpBar: 750,
        triggerType: "hp",
        severity: "major",
        notes: "Sequence 2 begins; use Kadan or Shandi for flying rock DPS check"
      },
      {
        name: "Red Blade",
        hpBar: 600,
        triggerType: "hp",
        severity: "normal",
        notes: "Distinguish knock-up vs grab puddle circles; supports shield/DR throughout"
      },
      {
        name: "Giant Rock",
        hpBar: 550,
        triggerType: "hp",
        severity: "major",
        notes: "Co-op counter after grapple mechanic resolves"
      }
    ]
  },
  {
    encounterKey: "Final Act: Kazeros G2-2",
    raid: "Final Act: Kazeros",
    gate: 22,
    releaseOrder: 17,
    boss: "God of Death Kazeros",
    bossType: "HUMAN",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Angry Birds",
        timerSecs: 180,
        repeatSecs: 180,
        triggerType: "timer",
        severity: "normal",
        notes: "Repeating periodic mechanic throughout phase"
      },
      {
        name: "Kazeros Says",
        hpBar: 620,
        triggerType: "hp",
        severity: "major",
        notes: "Sequence 3 (desert phase) begins — most demanding mechanics"
      },
      {
        name: "Time Attack",
        hpBar: 500,
        triggerType: "hp",
        severity: "wipe",
        notes:
          "Twin Sword phase; Deep Cuts debuff stacks to 5 → healing immunity; use Inanna to cleanse, recast at ~3s remaining"
      },
      {
        name: "Destiny",
        hpBar: 310,
        triggerType: "hp",
        severity: "major",
        notes: "Hidden Kadan activates after co-op counter during 8-player split guard; Dark Grenade must stay on boss"
      },
      { name: "Kazeros Says", hpBar: 160, triggerType: "hp", severity: "major", notes: "Final sequence — push to end" }
    ]
  },
  {
    encounterKey: "Final Act: Kazeros G2-3",
    raid: "Final Act: Kazeros",
    gate: 23,
    releaseOrder: 17,
    boss: "Death Incarnate Kazeros",
    bossType: "HUMAN",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Spotlight",
        timerSecs: 150,
        repeatSecs: 150,
        triggerType: "timer",
        severity: "normal",
        notes: "Periodic spotlight — bait to edge and dodge away"
      },
      {
        name: "Final Time Attack",
        hpBar: 525,
        triggerType: "hp",
        severity: "wipe",
        notes: "3-cone DPS check; use Kadan on middle cone, hyperawaken left/right cones"
      },
      {
        name: "Sacrifice",
        hpBar: 350,
        triggerType: "hp",
        severity: "wipe",
        notes: "Wipe if DPS is insufficient across the 3 cones"
      },
      {
        name: "Fake Wipe",
        hpBar: 175,
        triggerType: "hp",
        severity: "wipe",
        notes: "Not an actual wipe — survive through the animation and keep pushing"
      }
    ]
  },

  // ── Serca (releaseOrder 18) ──────────────────────────────────────────────────
  {
    encounterKey: "Serca G1",
    raid: "Serca",
    gate: 1,
    releaseOrder: 18,
    boss: "Witch of Agony, Serca",
    bossType: "HUMAN",
    weakness: "No Weakness",
    tauntable: false,
    mechanics: [
      {
        name: "Saws & Spikes",
        hpBar: 270,
        repeatSecs: 60,
        triggerType: "hp+timer",
        severity: "major",
        notes:
          "Arena narrows to 8×8; yellow squares with spinning saws move top-to-bottom; spacebar through ropes; bleed debuff stacks on spiked tiles"
      },
      {
        name: "Nail Just Guard",
        hpBar: 240,
        triggerType: "hp",
        severity: "major",
        notes:
          "Two safe spots at 5&11 or 1&7 o'clock; 4 guard sequences required; counter types: S Counter, Nail Counter, Circle Counter"
      },
      {
        name: "Moral Walls",
        hpBar: 195,
        triggerType: "hp",
        severity: "normal",
        notes: "Spiked wall traps on ground marked as yellow squares; walls move inward — dodge the traps"
      },
      {
        name: "Bomberman",
        hpBar: 175,
        repeatSecs: 70,
        triggerType: "hp+timer",
        severity: "major",
        notes:
          "Bombs explode in cross patterns; identify non-overlapping safe tiles; NM: timed bomb on target explodes after 5s damaging nearby players"
      },
      {
        name: "Survival Run",
        hpBar: 105,
        triggerType: "hp",
        severity: "major",
        notes:
          "P1+P2 start at 11 o'clock, P3+P4 at 5 o'clock; clockwise tile traversal; brawl phase grants +50% DMG for 10s"
      },
      {
        name: "Flame Maiden",
        hpBar: 90,
        repeatSecs: 60,
        triggerType: "hp+timer",
        severity: "wipe",
        notes:
          "Arena narrows to 4×4; counter Serca when she appears; HM/NM: bombs spawn during safe zone; guard variants: Slow Hammer, Fast Hammer, Broom, Scythe, Wheel"
      }
    ]
  },
  {
    encounterKey: "Serca G2",
    raid: "Serca",
    gate: 2,
    releaseOrder: 18,
    boss: "Corvus Tul Rak",
    bossType: "ANCIENT",
    weakness: "Weak to Light",
    tauntable: false,
    mechanics: [
      {
        name: "Wing Prediction",
        hpBar: 285,
        repeatSecs: 30,
        triggerType: "hp+timer",
        severity: "major",
        notes:
          "Spacebar on red flash; stay opposite of the wing swipe; NM: count 2 wing flaps → spacebar after gray pulse"
      },
      {
        name: "Veiled Stagger",
        hpBar: 240,
        triggerType: "hp",
        severity: "major",
        notes:
          "Find real clone: attacks = fake, no attacks = real; raised sword = −1 clock position, lowered sword = +1 clock position"
      },
      {
        name: "Guard Drain",
        hpBar: 195,
        triggerType: "hp",
        severity: "major",
        notes:
          "Sequence: In → Out → 2 Guards → Frontal (dodge) → Counter → Guard; completing this allows crafting the Shadow Skill battle item"
      },
      {
        name: "Find Corvuth",
        hpBar: 120,
        triggerType: "hp",
        severity: "normal",
        notes:
          "Scout clones at x3 & x3+1 positions; sword cursor/red outline = fake; dodge while standing still during red AoE at 20s & 10s marks"
      },
      {
        name: "Stagger Helping Pattern",
        timerSecs: 510,
        triggerType: "timer",
        severity: "normal",
        notes: "Timer-based stagger window; fire when boss is staggerable"
      },
      {
        name: "Pizza Prediction",
        hpBar: 60,
        triggerType: "hp",
        severity: "major",
        notes: "Spacebar on red flash; remember Pac-Man order and stagger boss; NM: count 2 wing flaps then spacebar"
      }
    ]
  }
];

function makeMechanics(raw: LibraryMechanic[], prefix: string): Mechanic[] {
  return raw.map((m, i) => ({
    id: `${prefix}-${i}-${Date.now()}`,
    name: m.name,
    severity: m.severity,
    triggerType: m.triggerType,
    hpBar: m.hpBar ?? null,
    timerSecs: m.timerSecs ?? null,
    repeatSecs: m.repeatSecs ?? null,
    phase: null,
    ttsEnabled: true,
    ttsText: m.name,
    notes: m.notes ?? ""
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
    totalBars: bossHpMap[entry.boss] ?? 300,
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

/** Get the gate ID for an already-imported library entry, or null */
export function importedId(raids: Gate[], encounterKey: string): string | null {
  const entry = LIBRARY.find((g) => g.encounterKey === encounterKey);
  if (!entry) return null;
  return raids.find((r) => r.raid === entry.raid && r.gate === entry.gate)?.id ?? null;
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
    totalBars: bossHpMap[entry.boss] ?? 300,
    mechanics: entry.mechanics.map((m, i) => ({
      id: `default-${slug}-m${i}`,
      name: m.name,
      severity: m.severity,
      triggerType: m.triggerType,
      hpBar: m.hpBar ?? null,
      timerSecs: m.timerSecs ?? null,
      repeatSecs: m.repeatSecs ?? null,
      phase: null,
      ttsEnabled: true,
      ttsText: m.name,
      notes: m.notes ?? ""
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
export type { LibraryGate };
