export type Vals = Record<string, number>;

export type Field = {
  id: string;
  label: string;
  unit?: string;
  def: number;
  min?: number;
  max?: number;
  step?: number;
  /** present for dropdowns: [value, label] */
  options?: [number, string][];
};

export type Mat = { n: string; q: number; u: string; p: number; note?: string };
export type CalcOut = { summary: string; hours: number; mats: Mat[] };

export type ToolDef = {
  name: string;
  why: string;
  /** what else the tool is good for, shown to build trust */
  later: string;
  /** reference retail price used for sample pricing and the "typical retail" columns */
  base: number;
  when?: (v: Vals) => boolean;
};

export type Step = { title: string; text: string };

export type ProjectDef = {
  slug: string;
  label: string;
  group: string;
  blurb: string;
  /** national contractor labor rate, $/hr */
  rate: number;
  /** minimum job charge a contractor would apply, $ */
  min: number;
  inputs: Field[];
  calc: (v: Vals) => CalcOut;
  tools: ToolDef[];
  steps: Step[];
  safety: { title: string; text: string };
};

/** What the browser is allowed to see about a project (no functions). */
export type PublicProject = Pick<ProjectDef, "slug" | "label" | "group" | "blurb" | "inputs" | "steps" | "safety">;

export type StorePrice = {
  store: string;
  price: number;
  url: string;
  source: "live" | "catalog" | "sample";
  affiliate: boolean;
};

export type ToolResult = {
  name: string;
  why: string;
  later: string;
  owned: boolean;
  stores: StorePrice[];
  bestIdx: number;
  best: number;
  reference: { label: string; price: number }[];
  refLow: number;
};

export type CalcResult = {
  slug: string;
  label: string;
  summary: string;
  region: { name: string; m: number; l: number; valid: boolean };
  rate: number;
  hours: number;
  mats: (Mat & { unit: number; total: number; url: string })[];
  matTotal: number;
  laborCost: number;
  markup: number;
  contractor: number;
  tools: ToolResult[];
  toolsCost: number;
  toolsRef: number;
  diy: number;
  saved: number;
  savedPct: number;
};
