import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { CalcResult, ProjectDef } from "./types";

const usd = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd0 = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const MAP: Record<string, string> = { "–": "-", "—": "-", "‘": "'", "’": "'", "“": '"', "”": '"' };
/** Standard PDF fonts only cover WinAnsi, so replace anything outside it. */
const clean = (s: string) => s.replace(/[^\x20-\x7E -ÿ]/g, (m) => MAP[m] ?? "?");

export async function buildGuidePdf(r: CalcResult, p: ProjectDef): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const PW = 612, PH = 792, M = 54, TW = PW - M * 2;
  let page: PDFPage = doc.addPage([PW, PH]);
  let y = PH - M;

  const ensure = (h: number) => {
    if (y - h < M) { page = doc.addPage([PW, PH]); y = PH - M; }
  };
  const gap = (n = 8) => { y -= n; };
  const wrap = (s: string, f: PDFFont, size: number, width: number): string[] => {
    const words = clean(s).split(/\s+/); const lines: string[] = []; let cur = "";
    for (const w of words) {
      const next = cur ? cur + " " + w : w;
      if (f.widthOfTextAtSize(next, size) > width && cur) { lines.push(cur); cur = w; } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  const para = (s: string, size = 10.5, x = M, f: PDFFont = font) => {
    for (const ln of wrap(s, f, size, PW - M - x)) {
      ensure(size + 4);
      page.drawText(ln, { x, y: y - size, size, font: f, color: rgb(0.1, 0.13, 0.17) });
      y -= size + 4;
    }
  };
  const h1 = (s: string) => { ensure(40); page.drawText(clean(s), { x: M, y: y - 24, size: 24, font: bold }); y -= 34; };
  const h2 = (s: string) => {
    gap(10); ensure(30);
    page.drawRectangle({ x: M, y: y - 4, width: TW, height: 2, color: rgb(0.95, 0.72, 0.02) });
    y -= 8; page.drawText(clean(s), { x: M, y: y - 14, size: 14, font: bold }); y -= 24;
  };
  const row = (cols: { t: string; x: number; right?: boolean; b?: boolean }[]) => {
    ensure(16);
    for (const c of cols) {
      const f = c.b ? bold : font, txt = clean(c.t);
      const w = f.widthOfTextAtSize(txt, 9.5);
      page.drawText(txt, { x: c.right ? c.x - w : c.x, y: y - 10, size: 9.5, font: f, color: rgb(0.1, 0.13, 0.17) });
    }
    y -= 15;
  };

  h1(`${r.label} Project Guide`);
  para(r.summary, 12, M, bold);
  para(`Priced for ${r.region.name}. Estimates for planning, not a quote. Check local permit and licensing rules before you start.`, 9.5);

  h2("Your savings");
  row([{ t: "DIY cost (materials + tools)", x: M }, { t: usd0(r.diy), x: PW - M, right: true, b: true }]);
  row([{ t: "Contractor estimate for your area", x: M }, { t: usd0(r.contractor), x: PW - M, right: true, b: true }]);
  row([{ t: "You keep", x: M, b: true }, { t: `${usd0(r.saved)} (${r.savedPct}%)`, x: PW - M, right: true, b: true }]);
  para(`Contractor figure includes ${usd0(r.laborCost)} of labor at about ${usd0(r.rate)}/hr and ${usd0(r.markup)} of material markup.`, 9);

  h2("Safety and permits");
  para(`${p.safety.title}. ${p.safety.text}`);

  h2("Materials list");
  row([{ t: "Item", x: M, b: true }, { t: "Qty", x: 400, right: true, b: true }, { t: "Each", x: 470, right: true, b: true }, { t: "Total", x: PW - M, right: true, b: true }]);
  for (const m of r.mats) {
    const name = wrap(m.n, font, 9.5, 300)[0] ?? m.n;
    row([{ t: name, x: M }, { t: `${m.q} ${m.u}`, x: 400, right: true }, { t: usd(m.unit), x: 470, right: true }, { t: usd(m.total), x: PW - M, right: true }]);
  }
  row([{ t: "Materials total", x: M, b: true }, { t: usd(r.matTotal), x: PW - M, right: true, b: true }]);

  h2("Tools you need");
  for (const t of r.tools) {
    para(`${t.name} - ${t.why}. Best price ${usd(t.best)} (${t.stores[t.bestIdx].store}).`, 10, M, bold);
    para(`Use it again for: ${t.later}.`, 9.5, M + 12);
    gap(2);
  }

  h2("Start to finish");
  p.steps.forEach((s, i) => {
    para(`${i + 1}. ${s.title}`, 11, M, bold);
    para(s.text, 10.5, M + 14);
    gap(4);
  });

  h2("Need a person?");
  para("Troubleshooting call plans are available from your project page after checkout. Your purchase receipt has the details.");
  para("This guide is general information and does not replace local code, manufacturer instructions or a licensed professional.", 9);

  return Buffer.from(await doc.save());
}
