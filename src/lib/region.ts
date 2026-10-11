/**
 * Regional price index. This is an ILLUSTRATIVE table so the app works out of the box.
 * Before launch, replace it with a ZIP-level dataset (BLS wage data plus a materials cost
 * index from a licensed provider). Shape to keep: { name, m: materials multiplier, l: labor multiplier }.
 */
export type Region = { name: string; m: number; l: number; valid: boolean };

/** [first 3 ZIP digits from, to, name, materials x, labor x] */
const METROS: [number, number, string, number, number][] = [
  [100, 102, "New York City area", 1.12, 1.45], [900, 908, "Los Angeles area", 1.12, 1.38],
  [940, 941, "San Francisco Bay area", 1.18, 1.55], [606, 608, "Chicago area", 1.05, 1.28],
  [21, 22, "Boston area", 1.10, 1.35], [980, 981, "Seattle area", 1.10, 1.30],
  [372, 372, "Nashville area", 0.97, 0.98], [377, 379, "Knoxville area", 0.95, 0.92],
  [770, 772, "Houston area", 0.95, 0.92], [331, 332, "Miami area", 1.02, 1.00],
  [750, 752, "Dallas area", 0.97, 0.95], [303, 303, "Atlanta area", 0.98, 0.95],
  [802, 802, "Denver area", 1.05, 1.10], [850, 850, "Phoenix area", 1.00, 0.98],
  [191, 191, "Philadelphia area", 1.06, 1.30], [200, 205, "Washington DC area", 1.05, 1.12]
];

const FIRST_DIGIT: Record<string, [string, number, number]> = {
  "0": ["Northeast", 1.08, 1.25], "1": ["New York / Pennsylvania", 1.10, 1.30],
  "2": ["Mid-Atlantic", 1.02, 1.05], "3": ["Southeast", 0.96, 0.90],
  "4": ["Ohio Valley", 0.97, 0.92], "5": ["Upper Midwest", 0.98, 0.95],
  "6": ["Central Plains", 0.98, 0.97], "7": ["South Central", 0.95, 0.90],
  "8": ["Mountain West", 1.02, 1.02], "9": ["Pacific", 1.14, 1.35]
};

export function region(zip: string): Region {
  if (!/^\d{5}$/.test(zip)) return { name: "National average", m: 1, l: 1, valid: false };
  const p = parseInt(zip.slice(0, 3), 10);
  for (const r of METROS) if (p >= r[0] && p <= r[1]) return { name: r[2], m: r[3], l: r[4], valid: true };
  const f = FIRST_DIGIT[zip[0]];
  return { name: `${f[0]} region`, m: f[1], l: f[2], valid: true };
}
