import type { Field, ProjectDef, PublicProject, ToolDef, Vals } from "./types";

/**
 * All project data lives here: inputs, quantity formulas, labor hours, tools and steps.
 * Coverage rates are standard trade rules of thumb. Have a licensed contractor review the
 * formulas for your market before you advertise exact savings numbers.
 */
const c = Math.ceil;
const t = (name: string, why: string, base: number, later: string, when?: (v: Vals) => boolean): ToolDef => ({ name, why, base, later, when });

const L: Field = { id: "length", label: "Room length", unit: "ft", def: 14, min: 1, max: 80, step: 0.5 };
const W: Field = { id: "width", label: "Room width", unit: "ft", def: 12, min: 1, max: 80, step: 0.5 };
const H: Field = { id: "height", label: "Ceiling height", unit: "ft", def: 8, min: 6, max: 20, step: 0.5 };
const DOORS: Field = { id: "doors", label: "Doors in the walls", def: 1, min: 0, max: 20, step: 1 };
const WINDOWS: Field = { id: "windows", label: "Windows in the walls", def: 2, min: 0, max: 30, step: 1 };
const wallArea = (v: Vals) => Math.max(0, 2 * (v.length + v.width) * v.height - v.doors * 21 - v.windows * 15);
const slopeFactor = (pitch: number) => Math.sqrt(1 + (pitch / 12) ** 2);

const TAPE = t("Tape measure, 25 ft", "Layout and cuts", 12, "Every project you will ever measure");
const GLASSES = t("Safety glasses", "Protects your eyes from chips and dust", 8, "Any cutting, sanding or drilling job");
const KNEE = t("Knee pads", "Hours on your knees", 19, "Tile, gardening, plumbing under sinks");
const LEVEL4 = t("4-ft level", "Keeps work plumb and level", 32, "Hanging cabinets, shelves, doors and appliances");
const DRILL = t("Cordless drill with driver bits", "Drives screws and drills holes", 89, "Shelves, furniture, decks, fences and most future repairs");
const CHALK = t("Chalk line", "Snaps straight layout lines", 11, "Layout for flooring, tile, siding and shelving");
const HARNESS = t("Roof harness, rope and anchor kit", "Fall protection on any roof", 119, "Any work above 6 feet, gutters, chimney and siding");
const N95 = t("N95 respirators, 10 pack", "Sanding and demolition dust", 16, "Sanding, demo, attic and garage cleanup");
const HAMMER_DRILL = t("Hammer drill with masonry bits", "Anchors into concrete", 109, "Anchoring to brick or concrete, fence posts, railings");

const drywallTools: ToolDef[] = [
  t("Drywall T-square, 48 in", "Marks straight cut lines", 24, "Cutting plywood, paneling and countertop laminate"),
  t("Utility knife with spare blades", "Scores and snaps board", 10, "Opening boxes, cutting carpet, trimming weatherstrip"),
  DRILL,
  t("Taping knife set, 6 / 10 / 12 in", "Applies and feathers compound", 32, "Patching holes, skim coats, scraping old paint"),
  t("Mud pan", "Holds compound while you work", 13, "Any future patch or texture repair"),
  t("Pole sander", "Smooths dried coats without a ladder", 26, "Smoothing walls before paint, ceiling touch-ups"),
  t("Drywall saw", "Cuts outlet boxes and small openings", 11, "Access holes, patching around pipes and wires"),
  t("Stud finder", "Locates framing for screws", 27, "Hanging TVs, shelves, cabinets and curtain rods safely"),
  N95
];

const tileTools: ToolDef[] = [
  t("Notched trowel set", "Spreads thinset at the right depth", 14, "Any future tile or backsplash repair"),
  t("Tile spacers and leveling clips", "Keeps joints even and tile flat", 29, "Backsplashes, floors and shower walls"),
  t("Rubber grout float", "Packs grout into joints", 9, "Re-grouting any tile in the house"),
  t("Wet tile saw", "Cuts tile cleanly (often rented)", 119, "Pavers, stone, brick and patio projects"),
  t("Mixing paddle for drill", "Mixes thinset and grout evenly", 12, "Mixing paint, mortar and joint compound")
];

export const PROJECTS: ProjectDef[] = [
  {
    slug: "roofing", label: "Roofing", group: "Exterior", blurb: "Asphalt shingle roof on a simple gable", rate: 60, min: 1800,
    inputs: [
      { id: "length", label: "House length (along the ridge)", unit: "ft", def: 40, min: 10, max: 120, step: 1 },
      { id: "width", label: "House width (eave to eave)", unit: "ft", def: 28, min: 10, max: 60, step: 1 },
      { id: "pitch", label: "Roof pitch", def: 6, options: [[4, "4/12 (low)"], [6, "6/12 (common)"], [8, "8/12 (steep)"], [10, "10/12 (very steep)"], [12, "12/12 (extreme)"]] },
      { id: "waste", label: "Waste allowance", def: 10, options: [[10, "10% (simple gable)"], [15, "15% (hips, valleys, cut-up)"]] }
    ],
    calc(v) {
      const s = slopeFactor(v.pitch);
      const eave = v.length + 2, rafter = ((v.width + 2) / 2) * s;
      const area = eave * (v.width + 2) * s, sq = area / 100;
      const rake = 2 * rafter;
      return {
        summary: `${Math.round(area)} sq ft of roof (${sq.toFixed(1)} squares), ${v.pitch}/12 pitch`,
        hours: sq * 2.2,
        mats: [
          { n: "Architectural shingles, bundle (33 sq ft)", q: c(sq * 3 * (1 + v.waste / 100)), u: "bundles", p: 36, note: "3 bundles per square plus waste" },
          { n: "Synthetic underlayment, 10-square roll", q: c(sq * 1.1 / 10), u: "rolls", p: 85 },
          { n: "Ice and water shield, 200 sq ft roll", q: c((eave * 2 * 3) / 200), u: "rolls", p: 95, note: "3 ft along both eaves" },
          { n: "Drip edge, 10 ft", q: c((eave * 2 + rake * 2) / 10), u: "pieces", p: 9.5 },
          { n: "Starter strip shingles", q: c((eave * 2) / 105), u: "bundles", p: 35 },
          { n: "Ridge cap shingles", q: c(eave / 33), u: "bundles", p: 52 },
          { n: "1-3/4 in roofing nails", q: c(sq * 2.5), u: "lb", p: 3.8 },
          { n: "Pipe boot flashing", q: 3, u: "pieces", p: 14, note: "Replace every plumbing vent boot" },
          { n: "Roof cement, 10 oz tube", q: 2, u: "tubes", p: 7.5 }
        ]
      };
    },
    tools: [
      t("Roofing nailer, coil (with compressor)", "Drives nails fast and consistently (often rented)", 149, "Siding, fencing, sheathing and decks"),
      HARNESS,
      t("Roofing hammer and hatchet", "Hand nailing, trimming and tear-off", 28, "General carpentry and demolition"),
      t("Tear-off shovel", "Strips old shingles", 38, "Moving gravel and mulch, scraping decks"),
      t("Hook-blade utility knife", "Cuts shingles", 12, "Cutting roofing felt, vinyl, linoleum"),
      t("Extension ladder, 28 ft", "Safe access to the roof edge", 289, "Gutters, siding, painting, tree trimming"),
      CHALK, TAPE
    ],
    safety: { title: "Falls are the biggest danger", text: "Do not do a roof steeper than 8/12, taller than one story, or alone. Wear a harness tied to a roof anchor, work in dry weather, and keep clear of power lines. Most areas require a permit. Hire a pro if the deck is soft or rotted." },
    steps: [
      { title: "Permit, weather and plan", text: "Check permit rules and your shingle layer limit. Pick three dry days and order materials delivered to the roof edge." },
      { title: "Set up safety", text: "Place the ladder 3 ft above the eave, tie it off, and anchor your harness before stepping on the roof." },
      { title: "Tear off the old roof", text: "Strip shingles and underlayment down to the deck. Dispose of debris in a dumpster." },
      { title: "Inspect and repair the deck", text: "Replace any soft, rotted or delaminated sheathing and nail down loose boards." },
      { title: "Drip edge and ice and water", text: "Nail drip edge on the eaves, then self-stick membrane along the first 3 ft of the eaves and in valleys." },
      { title: "Underlayment", text: "Roll synthetic underlayment from the eave up, overlapping per the manufacturer's lines." },
      { title: "Starter strip and shingles", text: "Start at the eave with the starter strip, then nail courses with the offsets in the shingle instructions." },
      { title: "Flash penetrations", text: "Replace pipe boots and seal around vents. Follow the shingle maker's nail pattern." },
      { title: "Ridge cap and cleanup", text: "Cap the ridge, then sweep the yard with a magnetic roller to collect nails." }
    ]
  },
  {
    slug: "metal-roofing", label: "Metal Roofing", group: "Exterior", blurb: "Exposed-fastener metal panels on a gable roof", rate: 65, min: 2500,
    inputs: [
      { id: "length", label: "House length (along the ridge)", unit: "ft", def: 40, min: 10, max: 120, step: 1 },
      { id: "width", label: "House width (eave to eave)", unit: "ft", def: 28, min: 10, max: 60, step: 1 },
      { id: "pitch", label: "Roof pitch", def: 4, options: [[3, "3/12 (minimum for most panels)"], [4, "4/12"], [6, "6/12"], [8, "8/12"]] }
    ],
    calc(v) {
      const s = slopeFactor(v.pitch);
      const rafter = ((v.width + 2) / 2) * s, len = c(rafter);
      const perSide = c((v.length + 2) / 3), panels = perSide * 2;
      const area = panels * 3 * len;
      return {
        summary: `${panels} panels at ${len} ft long (${Math.round(area)} sq ft), ${v.pitch}/12 pitch`,
        hours: area * 0.02,
        mats: [
          { n: `Metal roofing panel, 36 in cover × ${len} ft`, q: panels, u: "panels", p: 3 * len * 2.9, note: "Priced per panel at about $2.90 per sq ft" },
          { n: "Metal roofing screws with washers, 250 pack", q: c((area * 0.9) / 250), u: "packs", p: 24 },
          { n: "Synthetic underlayment, 10-square roll", q: c((area * 1.1) / 1000), u: "rolls", p: 85 },
          { n: "Ridge cap, 10 ft", q: c((v.length + 2) / 10), u: "pieces", p: 24 },
          { n: "Eave drip trim, 10 ft", q: c((2 * (v.length + 2)) / 10), u: "pieces", p: 11 },
          { n: "Gable rake trim, 10 ft", q: c((4 * rafter) / 10), u: "pieces", p: 12 },
          { n: "Foam closure strips, 3 ft", q: c((2 * (v.length + 2)) / 3), u: "pieces", p: 2.5 },
          { n: "Butyl sealant tape", q: c(v.length / 50), u: "rolls", p: 9 }
        ]
      };
    },
    tools: [
      t("Aviation snips, left / right / straight set", "Cuts panels and trim", 36, "Gutters, flashing, ducts and sheet metal"),
      DRILL,
      t("Hex nut driver bit set", "Drives roofing screws without stripping", 19, "Any hex-head screw, decks and sheds"),
      HARNESS,
      CHALK,
      t("Magnetic sweeper", "Picks up metal shavings that cause rust spots", 24, "Cleaning up nails and screws in the garage and yard"),
      TAPE
    ],
    safety: { title: "Slippery and sharp", text: "Metal panels are slick when dry and worse with dew. Use a harness, wear gloves for the sharp edges, and never walk on panels without grip. Confirm fastener pattern and wind rating with the panel maker and your local code. Most areas require a permit." },
    steps: [
      { title: "Permit and panel order", text: "Confirm code, wind rating and panel length. Order panels cut to length and trim sized to your roof." },
      { title: "Prep the deck", text: "Remove old roofing if required, repair the deck, and roll out underlayment." },
      { title: "Install eave trim", text: "Set drip trim at the eaves and rake edges before panels." },
      { title: "Square the first panel", text: "Measure from the gable and check square. Every later panel follows this one." },
      { title: "Fasten to the pattern", text: "Drive screws into flat sections at the spacing the manufacturer lists, snug but not crushing the washer." },
      { title: "Overlap and seal", text: "Seal the side laps with butyl tape and keep the lap lined up from eave to ridge." },
      { title: "Cut for trim and penetrations", text: "Cut panels with snips or a nibbler, never an abrasive blade, which burns the coating." },
      { title: "Ridge cap and closures", text: "Set foam closure strips and fasten the ridge cap through the panel ribs." },
      { title: "Finish and clean", text: "Sweep away metal shavings so they do not rust the surface." }
    ]
  },
  {
    slug: "bathroom-remodel", label: "Bathroom Remodel", group: "Remodel", blurb: "Tile the floor and shower walls, set the vanity and toilet", rate: 70, min: 3000,
    inputs: [
      { id: "length", label: "Bathroom length", unit: "ft", def: 8, min: 3, max: 30, step: 0.5 },
      { id: "width", label: "Bathroom width", unit: "ft", def: 5, min: 3, max: 30, step: 0.5 },
      { id: "wallTile", label: "Shower wall tile area", unit: "sq ft", def: 90, min: 0, max: 400, step: 1 },
      { id: "vanity", label: "Vanity width", def: 36, options: [[30, "30 in"], [36, "36 in"], [48, "48 in"], [60, "60 in"]] },
      { id: "toilet", label: "Replace the toilet", def: 1, options: [[0, "No"], [1, "Yes"]] }
    ],
    calc(v) {
      const floor = v.length * v.width, wall = v.wallTile, tile = floor + wall;
      const vanityPrice: Record<number, number> = { 30: 330, 36: 420, 48: 620, 60: 780 };
      return {
        summary: `${Math.round(floor)} sq ft floor, ${Math.round(wall)} sq ft shower walls, ${v.vanity} in vanity`,
        hours: floor * 0.15 + wall * 0.25 + 4 + (v.toilet ? 1.5 : 0) + 6,
        mats: [
          { n: "Floor tile", q: c(floor * 1.1), u: "sq ft", p: 4.5, note: "10% waste included" },
          { n: "Shower wall tile", q: wall > 0 ? c(wall * 1.1) : 0, u: "sq ft", p: 5 },
          { n: "Cement backer board, 3 × 5 ft", q: wall > 0 ? c((wall * 1.1) / 15) : 0, u: "sheets", p: 13.5 },
          { n: "Liquid waterproofing membrane, 1 gal", q: wall > 0 ? c(wall / 50) : 0, u: "gal", p: 58, note: "Two coats over backer board and seams" },
          { n: "Thinset mortar, 50 lb bag", q: c(tile / 90), u: "bags", p: 27 },
          { n: "Grout, 10 lb bag", q: c(tile / 100), u: "bags", p: 20 },
          { n: "Vanity with top", q: 1, u: "each", p: vanityPrice[v.vanity] ?? 420 },
          { n: "Vanity faucet", q: 1, u: "each", p: 95 },
          { n: "P-trap and supply line kit", q: 1, u: "kit", p: 26 },
          { n: "Toilet, round or elongated", q: v.toilet, u: "each", p: 210 },
          { n: "Wax ring and bolt kit", q: v.toilet, u: "kit", p: 9 },
          { n: "Silicone caulk", q: 2, u: "tubes", p: 7 }
        ]
      };
    },
    tools: [...tileTools,
      t("Oscillating multi-tool", "Flush cuts and demo", 59, "Trim, flooring cuts, grout removal"),
      t("Pry bar set", "Removes old fixtures and baseboard", 21, "Demo and framing repairs"),
      t("Basin wrench", "Reaches faucet nuts under the sink", 18, "Every future faucet swap"),
      KNEE, GLASSES
    ],
    safety: { title: "Waterproofing is where bathrooms fail", text: "Follow the membrane maker's cure times and flood-test the shower pan before tiling. Moving plumbing or wiring needs a licensed pro and a permit in most areas. In older homes, test for lead paint and asbestos in old flooring before demolition. Vent the fan to the outdoors." },
    steps: [
      { title: "Plan and permit", text: "Draw the layout, choose fixtures, and check permit needs, especially if plumbing or wiring moves." },
      { title: "Shut off water and remove fixtures", text: "Close the supply, drain lines, and remove toilet, vanity and old tile." },
      { title: "Inspect the subfloor and walls", text: "Replace any soft or stained wood and fix leaks before covering." },
      { title: "Install backer board", text: "Screw cement board to studs with taped seams in the shower area." },
      { title: "Waterproof and test", text: "Apply the membrane in two coats, let it cure fully, and flood-test the pan." },
      { title: "Set tile", text: "Dry-lay a layout, then set wall tile and floor tile with the right trowel and spacers." },
      { title: "Grout and seal", text: "Grout after the thinset cures, wipe clean, then seal if required." },
      { title: "Install vanity and faucet", text: "Level the vanity, connect supply and drain, and test for leaks." },
      { title: "Set the toilet", text: "Seat the wax ring, tighten bolts evenly, and check for rocking." },
      { title: "Caulk and final test", text: "Caulk the joints, run all fixtures, and check for leaks over 24 hours." }
    ]
  },
  {
    slug: "kitchen-remodel", label: "Kitchen Remodel", group: "Remodel", blurb: "Cabinets, countertop, backsplash, sink and flooring", rate: 65, min: 3500,
    inputs: [
      { id: "length", label: "Kitchen length", unit: "ft", def: 12, min: 5, max: 40, step: 0.5 },
      { id: "width", label: "Kitchen width", unit: "ft", def: 10, min: 5, max: 40, step: 0.5 },
      { id: "base", label: "Base cabinet run", unit: "linear ft", def: 14, min: 0, max: 60, step: 0.5 },
      { id: "wall", label: "Wall cabinet run", unit: "linear ft", def: 10, min: 0, max: 60, step: 0.5 },
      { id: "counter", label: "Countertop area", unit: "sq ft", def: 36, min: 0, max: 150, step: 1 },
      { id: "backsplash", label: "Backsplash area", unit: "sq ft", def: 30, min: 0, max: 100, step: 1 },
      { id: "sink", label: "Replace sink and faucet", def: 1, options: [[0, "No"], [1, "Yes"]] }
    ],
    calc(v) {
      const floor = v.length * v.width;
      return {
        summary: `${v.base} ft base and ${v.wall} ft wall cabinets, ${v.counter} sq ft counter, ${Math.round(floor)} sq ft floor`,
        hours: v.base * 1.2 + v.wall * 1.0 + v.counter * 0.35 + v.backsplash * 0.25 + floor * 0.035 + (v.sink ? 3 : 0) + 8,
        mats: [
          { n: "Stock base cabinets", q: c(v.base), u: "linear ft", p: 185 },
          { n: "Stock wall cabinets", q: c(v.wall), u: "linear ft", p: 135 },
          { n: "Laminate countertop", q: c(v.counter), u: "sq ft", p: 32 },
          { n: "Backsplash tile", q: v.backsplash > 0 ? c(v.backsplash * 1.1) : 0, u: "sq ft", p: 7.5 },
          { n: "Thinset mortar, 50 lb bag", q: v.backsplash > 0 ? c(v.backsplash / 90) : 0, u: "bags", p: 27 },
          { n: "Grout, 10 lb bag", q: v.backsplash > 0 ? c(v.backsplash / 100) : 0, u: "bags", p: 20 },
          { n: "Click-lock plank flooring, 20 sq ft box", q: c((floor * 1.1) / 20), u: "boxes", p: 44 },
          { n: "Cabinet pulls and knobs", q: c((v.base + v.wall) / 1.5), u: "pieces", p: 4.5 },
          { n: "Cabinet screws and shims", q: 1, u: "set", p: 17 },
          { n: "Stainless kitchen sink", q: v.sink, u: "each", p: 185 },
          { n: "Kitchen faucet", q: v.sink, u: "each", p: 120 },
          { n: "Braided supply lines", q: v.sink * 2, u: "lines", p: 9.5 },
          { n: "Silicone caulk", q: 2, u: "tubes", p: 7 }
        ]
      };
    },
    tools: [
      LEVEL4, DRILL,
      t("Stud finder", "Locates framing for wall cabinets", 27, "Hanging TVs, shelves and curtain rods safely"),
      t("Cabinet clamps, pair", "Holds cabinets together while you screw", 24, "Glue-ups and woodworking"),
      t("Jigsaw", "Cuts the sink opening and scribes countertops", 59, "Curved cuts and trim work"),
      t("Hole saw kit", "Cuts holes for plumbing and faucets", 29, "Door hardware, pipes and wiring runs"),
      t("Basin wrench", "Reaches faucet nuts under the sink", 18, "Every future faucet swap"),
      t("Pry bar set", "Removes old cabinets and trim", 21, "Demo and framing repairs"),
      TAPE
    ],
    safety: { title: "Water, power and gas", text: "Shut off water and power before demo and know where gas lines run. Moving outlets, gas lines or plumbing needs a licensed pro and permit in most areas. Countertops are heavy, so work with a second person. Old cabinets may carry lead paint." },
    steps: [
      { title: "Measure and plan the layout", text: "Draw the room, mark windows and utilities, and order cabinets and countertops early because lead times are long." },
      { title: "Demolish carefully", text: "Disconnect plumbing and power, then remove cabinets, counters and flooring." },
      { title: "Handle rough-in work", text: "Hire licensed pros for any gas, electrical or plumbing changes and get inspections." },
      { title: "Install flooring first", text: "Lay the floor before base cabinets if you are replacing it." },
      { title: "Hang the upper cabinets", text: "Mark a level line, find studs, and screw upper cabinets to the wall." },
      { title: "Set the base cabinets", text: "Shim to level, clamp neighboring cabinets together, and screw to studs." },
      { title: "Install the countertop", text: "Scribe the back edge, cut the sink opening, and secure from below." },
      { title: "Install sink and faucet", text: "Seal the sink, connect supply and drain, and test for leaks." },
      { title: "Tile the backsplash", text: "Set tile with thinset, grout after curing, and caulk the counter edge." },
      { title: "Add hardware and final touches", text: "Install pulls, adjust doors, and caulk gaps." }
    ]
  },
  {
    slug: "basement-remodel", label: "Basement Remodel", group: "Remodel", blurb: "Frame, insulate, drywall and floor a basement room", rate: 60, min: 4000,
    inputs: [
      { id: "length", label: "Basement length", unit: "ft", def: 30, min: 8, max: 100, step: 0.5 },
      { id: "width", label: "Basement width", unit: "ft", def: 20, min: 8, max: 60, step: 0.5 },
      { id: "height", label: "Ceiling height", unit: "ft", def: 8, min: 7, max: 12, step: 0.5 },
      { id: "ceiling", label: "Ceiling", def: 1, options: [[0, "Leave exposed"], [1, "Drywall ceiling"]] }
    ],
    calc(v) {
      const perim = 2 * (v.length + v.width), wallA = perim * v.height, floor = v.length * v.width;
      const ceilA = v.ceiling ? floor : 0, board = wallA + ceilA, studs = c(perim * 0.75) + 8;
      return {
        summary: `${Math.round(floor)} sq ft basement, ${Math.round(perim)} ft of exterior wall`,
        hours: perim * 0.4 + wallA * 0.02 + board * 0.045 + floor * 0.06 + board * 0.03,
        mats: [
          { n: "2 × 4 stud, 92-5/8 in", q: studs, u: "studs", p: 3.9 },
          { n: "Pressure-treated 2 × 4 × 8 ft bottom plate", q: c(perim / 8), u: "boards", p: 6.9 },
          { n: "2 × 4 × 8 ft top plates", q: c((perim * 2) / 8), u: "boards", p: 4.2 },
          { n: "Concrete anchors, 25 pack", q: c((perim / 2 + 1) / 25), u: "packs", p: 22 },
          { n: "16d framing nails, 5 lb box", q: c(studs / 40), u: "boxes", p: 15 },
          { n: "Rigid foam board, 1.5 in, 4 × 8 ft", q: c((wallA * 1.05) / 32), u: "sheets", p: 34, note: "Foam against the masonry wall resists moisture" },
          { n: "Foam sealant can", q: c(perim / 50), u: "cans", p: 8 },
          { n: "1/2-in drywall sheet, 4 × 8 ft", q: c((board * 1.1) / 32), u: "sheets", p: 15.5 },
          { n: "1-1/4-in drywall screws", q: Math.max(1, c(board * 0.006)), u: "lb", p: 4.2 },
          { n: "All-purpose joint compound, 4.5 gal", q: c(board / 450), u: "buckets", p: 17 },
          { n: "Paper joint tape, 250 ft", q: c((board * 0.37) / 250), u: "rolls", p: 5.5 },
          { n: "Dimpled subfloor panel, 2 × 2 ft", q: c((floor * 1.05) / 4), u: "panels", p: 5.5 },
          { n: "Click-lock plank flooring, 20 sq ft box", q: c((floor * 1.08) / 20), u: "boxes", p: 44 },
          { n: "Primer, 1 gal", q: c(board / 300), u: "gal", p: 28 },
          { n: "Interior paint, 1 gal", q: c((board * 2) / 350), u: "gal", p: 36 },
          { n: "Baseboard trim, 8 ft", q: c(perim / 8), u: "pieces", p: 9 }
        ]
      };
    },
    tools: [HAMMER_DRILL, t("Circular saw, 7-1/4 in", "Cuts studs and plates", 89, "Decking, plywood, lumber and most building projects"),
      t("Framing hammer, 20 oz", "Drives 16d nails", 32, "Decks, sheds, fences and general carpentry"), LEVEL4, CHALK,
      t("Taping knife set, 6 / 10 / 12 in", "Finishes drywall seams", 32, "Patching holes, skim coats, scraping old paint"),
      t("Pole sander", "Smooths dried compound", 26, "Smoothing walls before paint"),
      t("Moisture meter", "Checks walls and floors for dampness", 29, "Decks, firewood, leaks and flooring"), N95, TAPE],
    safety: { title: "Moisture, egress and permits", text: "Fix any water problem before building. Test for radon. A room used for sleeping needs an egress window. Electrical, plumbing and heating changes need permits and often a licensed pro. Keep the panel, shutoffs and cleanouts accessible. Test old pipe wrap and floor tile for asbestos before disturbing them." },
    steps: [
      { title: "Test for moisture and radon", text: "Tape plastic to the floor and wall for 48 hours and look for condensation. Fix leaks and drainage first." },
      { title: "Permit and plan", text: "Check egress, ceiling height and access to utilities. Draw the layout." },
      { title: "Frame the walls", text: "Anchor a treated bottom plate to the slab, then build and raise stud walls." },
      { title: "Insulate", text: "Install foam board against the foundation and seal the gaps with foam sealant." },
      { title: "Rough-in electrical and plumbing", text: "Hire licensed pros and schedule the rough-in inspection." },
      { title: "Hang drywall", text: "Hang the ceiling first, then walls, with screws at the proper spacing." },
      { title: "Tape and finish", text: "Three coats of compound with drying time between each, then sand." },
      { title: "Lay the floor system", text: "Install dimpled panels, then click-lock planks with an expansion gap." },
      { title: "Prime, paint and trim", text: "Prime, paint two coats, and install baseboard." }
    ]
  },
  {
    slug: "electrical", label: "Electrical", group: "Electrical", blurb: "Replace outlets, GFCIs and switches", rate: 90, min: 200,
    inputs: [
      { id: "outlets", label: "Standard outlets", def: 6, min: 0, max: 60, step: 1 },
      { id: "gfci", label: "GFCI outlets", def: 2, min: 0, max: 20, step: 1 },
      { id: "switches", label: "Single-pole switches", def: 3, min: 0, max: 40, step: 1 }
    ],
    calc(v) {
      const n = v.outlets + v.gfci + v.switches;
      return {
        summary: `${v.outlets} outlets, ${v.gfci} GFCI, ${v.switches} switches`,
        hours: n ? v.outlets * 0.4 + v.gfci * 0.7 + v.switches * 0.4 + 0.5 : 0,
        mats: [
          { n: "15A tamper-resistant outlet", q: v.outlets, u: "outlets", p: 1.7 },
          { n: "15A GFCI outlet, tamper-resistant", q: v.gfci, u: "outlets", p: 19 },
          { n: "15A single-pole switch", q: v.switches, u: "switches", p: 2.4 },
          { n: "Wall plate", q: n, u: "plates", p: 0.95 },
          { n: "Wire connectors, assorted", q: n ? 1 : 0, u: "pack", p: 6 },
          { n: "Electrical tape", q: n ? 1 : 0, u: "roll", p: 3 }
        ]
      };
    },
    tools: [
      t("Non-contact voltage tester", "Confirms a wire is dead before you touch it", 16, "Swapping light fixtures, fans and plugs safely"),
      t("Plug-in outlet tester", "Checks wiring after the swap", 12, "Checking outlets in any room or home you buy"),
      t("Wire stripper and cutter, 10-18 AWG", "Clean strips without nicking copper", 15, "Light fixtures, thermostats, doorbells and speakers"),
      t("Insulated screwdriver set", "Terminal screws and plates", 22, "Fixtures, appliances and electronics"),
      t("Needle-nose pliers", "Bends wire loops for terminals", 14, "Wire work and small repairs"),
      t("Headlamp", "Light inside dark boxes", 16, "Attics, crawl spaces, under sinks, power outages")
    ],
    safety: { title: "Power off, then test", text: "Turn off the breaker and confirm every wire is dead with a tester. If you find aluminum wiring, cloth-covered wire or knob-and-tube, stop and call a licensed electrician. Many areas require a permit or a licensed electrician for electrical work." },
    steps: [
      { title: "Turn off the breaker", text: "Label the panel so no one switches it back on." },
      { title: "Test every wire", text: "Check each device and wire with a voltage tester before touching." },
      { title: "Photograph the wiring", text: "A clear photo shows which wire goes where." },
      { title: "Remove the old device", text: "Unscrew the plate and device and pull it forward gently." },
      { title: "Connect the new device", text: "Ground to green, neutral white to silver, hot black to brass. On a GFCI use the LINE terminals for incoming power." },
      { title: "Mount and close", text: "Fold wires back, screw the device in, and fit the plate." },
      { title: "Restore power and test", text: "Check with an outlet tester and press the GFCI test button." }
    ]
  },
  {
    slug: "plumbing", label: "Plumbing", group: "Plumbing", blurb: "Run new PEX supply lines to fixtures", rate: 95, min: 250,
    inputs: [
      { id: "length", label: "Total pipe run", unit: "ft", def: 30, min: 3, max: 300, step: 1 },
      { id: "fixtures", label: "Fixtures to connect", def: 2, min: 1, max: 12, step: 1 }
    ],
    calc(v) {
      const elbows = v.fixtures * 2 + 2, tees = v.fixtures;
      return {
        summary: `${v.length} ft of PEX serving ${v.fixtures} fixture${v.fixtures > 1 ? "s" : ""}`,
        hours: v.length * 0.2 + v.fixtures * 1.25,
        mats: [
          { n: "1/2-in PEX-B tubing", q: c(v.length * 1.1), u: "ft", p: 0.65, note: "10% extra for bends and trimming" },
          { n: "1/2-in PEX elbows", q: elbows, u: "pieces", p: 1.6 },
          { n: "1/2-in PEX tees", q: tees, u: "pieces", p: 2.1 },
          { n: "Copper crimp rings, 25 pack", q: c((tees * 3 + elbows * 2 + 4) / 25), u: "packs", p: 9.5, note: "One ring per pipe end" },
          { n: "Quarter-turn shutoff valve", q: v.fixtures, u: "valves", p: 9.5 },
          { n: "Braided supply line", q: v.fixtures, u: "lines", p: 9.5 },
          { n: "Push-to-connect transition coupling", q: 2, u: "pieces", p: 13.5, note: "Joins PEX to existing copper" },
          { n: "PEX pipe clips, 10 pack", q: c(v.length / 2.67 / 10), u: "packs", p: 6.5, note: "One support about every 32 in" },
          { n: "PTFE thread tape", q: 1, u: "roll", p: 2.5 }
        ]
      };
    },
    tools: [
      t("PEX crimp tool, 1/2 in", "Squeezes the copper rings that seal each joint", 42, "Future repairs, water heater swaps, outdoor spigots"),
      t("Crimp ring go / no-go gauge", "Confirms every crimp is correct", 9, "Checking every future PEX joint"),
      t("PEX tubing cutter", "Square, clean cuts", 12, "Any later PEX repair or addition"),
      t("Copper tubing cutter", "Cuts existing copper for the tie-in", 17, "Replacing old copper, fixing leaks, adding a valve"),
      t("Adjustable wrenches, set of 2", "Valves and supply lines", 26, "Faucets, toilets, disposals, bikes and cars"),
      t("Deburring tool", "Smooths cut copper ends", 9, "Every copper pipe cut"),
      t("Bucket and shop towels", "Catches water when you drain lines", 14, "Drain jobs, cleanup, car and yard work")
    ],
    safety: { title: "Permit and code", text: "Many areas require a permit and inspection for new water lines, and some limit who may do the work. PEX is restricted in a few localities. Check before you cut." },
    steps: [
      { title: "Check code and permit", text: "Confirm PEX is allowed and whether an inspection is required." },
      { title: "Shut off and drain", text: "Close the main, open the lowest and highest faucets, and drain the lines." },
      { title: "Plan the route", text: "Mark the path, avoid sharp bends, and keep lines away from heat." },
      { title: "Run the tubing", text: "Cut to length and lay the trunk with gentle curves." },
      { title: "Make each connection", text: "Slide on a ring, insert the fitting, crimp, and check with the gauge." },
      { title: "Tie into existing copper", text: "Cut cleanly, deburr, and push on the transition coupling." },
      { title: "Fit valves and supply lines", text: "Install a shutoff at every fixture." },
      { title: "Test for leaks", text: "Open the main slowly and inspect every joint for 24 hours before closing walls." }
    ]
  },
  {
    slug: "drywall", label: "Drywall", group: "Remodel", blurb: "Hang, tape and finish drywall", rate: 55, min: 350,
    inputs: [L, W, H, DOORS, WINDOWS,
      { id: "corners", label: "Outside corners", def: 4, min: 0, max: 40, step: 1 },
      { id: "scope", label: "Scope", def: 1, options: [[1, "Walls only"], [2, "Walls and ceiling"]] }],
    calc(v) {
      const area = wallArea(v) + (v.scope === 2 ? v.length * v.width : 0);
      return {
        summary: `${v.length} × ${v.width} ft room, ${v.height} ft ceilings, ${Math.round(area)} sq ft of board`,
        hours: area * 0.045,
        mats: [
          { n: "1/2-in drywall sheet, 4 × 8 ft", q: c((area * 1.1) / 32), u: "sheets", p: 15.5, note: "32 sq ft each, 10% waste included" },
          { n: "1-1/4-in drywall screws", q: Math.max(1, c(area * 0.006)), u: "lb", p: 4.2, note: "About 6 lb per 1,000 sq ft" },
          { n: "All-purpose joint compound, 4.5 gal", q: c(area / 450), u: "buckets", p: 17, note: "One bucket covers about 450 sq ft over three coats" },
          { n: "Paper joint tape, 250 ft", q: c((area * 0.37) / 250), u: "rolls", p: 5.5 },
          { n: "Metal corner bead, 8 ft", q: v.corners * c(v.height / 8), u: "pieces", p: 3.6 },
          { n: "Sanding screens, 120 grit", q: c(area / 400), u: "packs", p: 9 }
        ]
      };
    },
    tools: drywallTools,
    safety: { title: "Test before you demo", text: "In homes built before 1980, joint compound and textured ceilings can contain asbestos. Test a sample before sanding or removing anything." },
    steps: [
      { title: "Check the walls", text: "Look for water stains, loose framing and old textured ceilings before you buy board." },
      { title: "Plan the sheet layout", text: "Hang ceilings first, then walls. Offset seams so they land on different studs." },
      { title: "Cut and fit", text: "Score the face paper, snap, and cut openings for boxes and windows." },
      { title: "Hang the board", text: "Screws every 12 in on ceilings and 16 in on walls, set just under the paper." },
      { title: "Tape and first coat", text: "Embed tape in compound and cover every screw dimple." },
      { title: "Second and third coats", text: "Each coat wider than the last, with a full day to dry between coats." },
      { title: "Sand and prime", text: "A light pass with 120 to 150 grit, then prime before paint." }
    ]
  },
  {
    slug: "flooring", label: "Flooring", group: "Remodel", blurb: "Floating laminate or vinyl plank", rate: 50, min: 400,
    inputs: [L, W,
      { id: "extra", label: "Closets and alcoves", unit: "sq ft", def: 0, min: 0, max: 500, step: 1 },
      { id: "doors", label: "Doorway transitions", def: 1, min: 0, max: 20, step: 1 },
      { id: "waste", label: "Waste allowance", def: 10, options: [[7, "7% (simple layout)"], [10, "10% (typical)"], [15, "15% (diagonal or many cuts)"]] }],
    calc(v) {
      const area = v.length * v.width + v.extra, perim = 2 * (v.length + v.width);
      return {
        summary: `${Math.round(area)} sq ft of floor, ${v.waste}% waste`,
        hours: area * 0.035,
        mats: [
          { n: "Click-lock plank flooring, 20 sq ft box", q: c((area * (1 + v.waste / 100)) / 20), u: "boxes", p: 44, note: "Waste allowance included" },
          { n: "Foam underlayment, 100 sq ft roll", q: c(area / 100), u: "rolls", p: 38 },
          { n: "Transition strip", q: v.doors, u: "pieces", p: 19 },
          { n: "Quarter round trim, 8 ft", q: c(perim / 8), u: "pieces", p: 6.5, note: "Covers the expansion gap along the walls" }
        ]
      };
    },
    tools: [
      t("Installation kit: tapping block, pull bar, spacers", "Closes seams without damaging edges", 19, "Any later plank or laminate repair"),
      t("Miter saw, 10 in", "Cuts planks and trim cleanly (often rented)", 149, "Trim, baseboard, crown, deck boards and picture frames"),
      t("Jamb saw", "Undercuts door casing so planks slide under", 24, "Tile and hardwood installs, door casing repairs"),
      TAPE,
      t("Utility knife", "Trims underlayment", 10, "Opening boxes, cutting carpet, trimming weatherstrip"),
      KNEE, GLASSES
    ],
    safety: { title: "Check the subfloor", text: "Floating floors need a subfloor that is flat to about 3/16 in over 10 ft. Fix low spots before you start, and test concrete for moisture." },
    steps: [
      { title: "Let the planks acclimate", text: "Leave boxes flat in the room for 48 hours." },
      { title: "Prep the subfloor", text: "Remove baseboard, sweep, and flatten high and low spots." },
      { title: "Roll out underlayment", text: "Butt the seams and tape them. Do not overlap." },
      { title: "Plan the first row", text: "Measure so the last row is at least 2 in wide. Trim the first row if needed." },
      { title: "Lay the first row", text: "Keep a 1/4 in gap at every wall using spacers." },
      { title: "Continue row by row", text: "Stagger end joints at least 6 in apart and tap seams tight." },
      { title: "Cut around doors", text: "Undercut casing with a jamb saw so planks slide beneath." },
      { title: "Finish the edges", text: "Install transitions and trim, then remove the spacers." }
    ]
  }
];

export const getProject = (slug: string) => PROJECTS.find((p) => p.slug === slug);

export const toPublic = (p: ProjectDef): PublicProject => ({
  slug: p.slug, label: p.label, group: p.group, blurb: p.blurb, inputs: p.inputs, steps: p.steps, safety: p.safety
});

/** Clamp and validate untrusted input against the project's field definitions. */
export function sanitizeVals(p: ProjectDef, raw: unknown): Vals {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Vals = {};
  for (const f of p.inputs) {
    let n = Number(src[f.id]);
    if (!Number.isFinite(n)) n = f.def;
    if (f.options) n = f.options.some((o) => o[0] === n) ? n : f.def;
    else n = Math.min(f.max ?? Infinity, Math.max(f.min ?? -Infinity, n));
    out[f.id] = n;
  }
  return out;
}
