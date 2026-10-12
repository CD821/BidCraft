import assert from "node:assert/strict";
import test from "node:test";
import {
  groupProposalLines,
  lineCosts,
  normalizeProfitPct,
  projectTotals,
} from "../src/lib/calc.js";

const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} != ${expected}`);

const project = (patch = {}) => ({
  lines: [{ qty: 1, materialCostMode: "flat", materialFlat: 100 }],
  overheadPct: 0,
  profitPct: 20,
  taxMode: "none",
  taxPct: 0,
  ...patch,
});

test("legacy estimates keep per-unit Other costs and markup totals", () => {
  const totals = projectTotals(project({
    lines: [{
      qty: 10, wastePct: 10, materialUnit: 10,
      laborHoursUnit: 0.2, laborRate: 30, otherUnit: 2,
    }],
    overheadPct: 10, profitPct: 15, taxMode: "total", taxPct: 8.25,
  }));
  close(totals.material, 110);
  close(totals.labor, 60);
  close(totals.other, 20);
  close(totals.direct, 190);
  close(totals.preTax, 240.35);
  close(totals.total, 260.178875);
});

test("20% markup and 20% margin produce distinct selling prices", () => {
  const markup = projectTotals(project({ profitMode: "markup" }));
  const margin = projectTotals(project({ profitMode: "margin" }));
  close(markup.preTax, 120);
  close(markup.profitMargin, 1 / 6);
  close(margin.preTax, 125);
  close(margin.profit, 25);
  close(margin.profitMargin, 0.2);
});

test("margin includes overhead in cost and excludes sales tax", () => {
  const totals = projectTotals(project({
    overheadPct: 10, profitMode: "margin", taxMode: "total", taxPct: 10,
  }));
  close(totals.loadedCost, 110);
  close(totals.preTax, 137.5);
  close(totals.profit, 27.5);
  close(totals.tax, 13.75);
  close(totals.total, 151.25);
  close(totals.profitMargin, 0.2);
  close(totals.grossMargin, 37.5 / 137.5);

  const materialTax = projectTotals(project({
    overheadPct: 10, profitMode: "margin", taxMode: "material", taxPct: 10,
  }));
  close(materialTax.tax, 10);
  close(materialTax.total, 147.5);
});

test("flat Other costs are charged once while per-unit costs follow quantity", () => {
  const line = { qty: 10, wastePct: 50, otherUnit: 2, otherFlat: 75 };
  close(lineCosts(line).other, 20);
  close(lineCosts({ ...line, otherCostMode: "flat" }).other, 75);
  close(lineCosts({ ...line, qty: 20 }).other, 40);
  close(lineCosts({ ...line, qty: 20, otherCostMode: "flat" }).other, 75);
  close(lineCosts({ ...line, qty: 0, otherCostMode: "flat" }).other, 75);
});

test("margin limits prevent zero division and negative selling prices", () => {
  assert.equal(normalizeProfitPct(100, "margin"), 99.99);
  assert.equal(normalizeProfitPct(150, "margin"), 99.99);
  assert.equal(normalizeProfitPct(-10, "margin"), 0);
  assert.equal(normalizeProfitPct(Infinity, "margin"), 0);
  assert.equal(normalizeProfitPct(150, "markup"), 150);
  for (const profitPct of [0, 99.99, 100, 150, -10, Infinity]) {
    const totals = projectTotals(project({ profitMode: "margin", profitPct }));
    assert.ok(Number.isFinite(totals.total));
    assert.ok(totals.total >= totals.loadedCost);
  }
  const empty = projectTotals(project({ lines: [], profitMode: "margin" }));
  assert.equal(empty.total, 0);
  assert.equal(empty.profitMargin, 0);
});

test("saved pricing selections survive reload and flow into proposal totals", () => {
  const saved = JSON.parse(JSON.stringify(project({
    profitMode: "margin",
    lines: [
      { trade: "Framing", qty: 10, otherCostMode: "flat", otherFlat: 75, otherUnit: 2 },
      { trade: "Painting", qty: 5, otherCostMode: "unit", otherUnit: 5 },
    ],
  })));
  const totals = projectTotals(saved);
  close(totals.other, 100);
  close(totals.total, 125);
  const groups = groupProposalLines(saved, totals);
  close(groups[0].rows[0].sellTotal, 93.75);
  close(groups[1].rows[0].sellTotal, 31.25);
});
