export const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const number = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

export function materialMode(line) {
  return line.materialCostMode || "unit";
}

export function laborMode(line) {
  return line.laborCostMode || "hourly";
}

export function lineCosts(line) {
  const qty = Number(line.qty) || 0;
  const waste = Number(line.wastePct) || 0;
  const purchaseQty = qty * (1 + waste / 100);
  const currentMaterialMode = materialMode(line);
  const currentLaborMode = laborMode(line);
  const material =
    currentMaterialMode === "flat"
      ? Number(line.materialFlat) || 0
      : purchaseQty * (Number(line.materialUnit) || 0);
  const laborHours = qty * (Number(line.laborHoursUnit) || 0);
  const hourlyLabor =
    currentLaborMode === "hourly"
      ? laborHours * (Number(line.laborRate) || 0)
      : 0;
  const labor =
    currentLaborMode === "flat"
      ? Number(line.laborFlat) || 0
      : currentLaborMode === "unit"
        ? qty * (Number(line.laborUnit) || 0)
        : hourlyLabor;
  const other = qty * (Number(line.otherUnit) || 0);

  return {
    qty,
    purchaseQty,
    material,
    laborHours: currentLaborMode === "hourly" ? laborHours : 0,
    hourlyLabor,
    labor,
    other,
    direct: material + labor + other,
  };
}

export function projectTotals(project) {
  const lines = project.lines.map((line) => ({
    ...line,
    costs: lineCosts(line),
  }));
  const direct = lines.reduce((sum, line) => sum + line.costs.direct, 0);
  const material = lines.reduce((sum, line) => sum + line.costs.material, 0);
  const labor = lines.reduce((sum, line) => sum + line.costs.labor, 0);
  const laborHours = lines.reduce(
    (sum, line) => sum + line.costs.laborHours,
    0,
  );
  const hourlyLabor = lines.reduce(
    (sum, line) => sum + line.costs.hourlyLabor,
    0,
  );
  const other = lines.reduce((sum, line) => sum + line.costs.other, 0);
  const overhead = direct * ((Number(project.overheadPct) || 0) / 100);
  const loadedCost = direct + overhead;
  const profit = loadedCost * ((Number(project.profitPct) || 0) / 100);
  const preTax = loadedCost + profit;
  const taxRate = (Number(project.taxPct) || 0) / 100;
  const tax =
    project.taxMode === "total"
      ? preTax * taxRate
      : project.taxMode === "material"
        ? material * taxRate
        : 0;
  const total = preTax + tax;
  const grossMargin = preTax ? (preTax - direct) / preTax : 0;
  const sellMultiplier = direct ? preTax / direct : 0;

  return {
    lines,
    direct,
    material,
    labor,
    laborHours,
    hourlyLabor,
    other,
    overhead,
    loadedCost,
    profit,
    preTax,
    tax,
    total,
    grossMargin,
    sellMultiplier,
  };
}

export function aggregateMaterials(project) {
  const groups = new Map();

  for (const line of project.lines) {
    const costs = lineCosts(line);
    if (!costs.material && !costs.purchaseQty) continue;
    const key = `${line.item.trim().toLowerCase()}|${line.unit}`;
    const current = groups.get(key) || {
      item: line.item,
      trade: line.trade,
      unit: line.unit,
      quantity: 0,
      cost: 0,
    };
    current.quantity += costs.purchaseQty;
    current.cost += costs.material;
    groups.set(key, current);
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.trade.localeCompare(b.trade) || a.item.localeCompare(b.item),
  );
}

export function groupProposalLines(project, totals) {
  const groups = new Map();

  for (const line of totals.lines) {
    const trade = line.trade || "General";
    const rows = groups.get(trade) || [];
    rows.push({
      ...line,
      sellTotal: line.costs.direct * totals.sellMultiplier,
    });
    groups.set(trade, rows);
  }

  return Array.from(groups.entries()).map(([trade, rows]) => ({
    trade,
    rows,
  }));
}
