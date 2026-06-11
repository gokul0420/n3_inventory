import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { analyzeAllStock } from './aiEngine.js';

// ── Compute all analytics from app state ────────────────────────────────────
export function computeStockStats(state) {
  const items = analyzeAllStock(state.stockItems, state.distributions, state.auditLogs);
  const deptName = (id) => (state.departments || []).find(d => d.id === id)?.name || 'Unassigned';

  const totalSkus = items.length;
  const totalUnits = items.reduce((s, i) => s + (i.quantity || 0), 0);

  const health = { healthy: 0, low: 0, critical: 0, out_of_stock: 0 };
  items.forEach(i => { health[i.ai.health] = (health[i.ai.health] || 0) + 1; });

  // Category breakdown
  const byCat = {};
  items.forEach(i => {
    const c = i.category || 'Uncategorized';
    byCat[c] = byCat[c] || { skus: 0, units: 0 };
    byCat[c].skus++; byCat[c].units += i.quantity || 0;
  });

  // Department breakdown
  const byDept = {};
  items.forEach(i => {
    const d = deptName(i.departmentId);
    byDept[d] = byDept[d] || { skus: 0, units: 0 };
    byDept[d].skus++; byDept[d].units += i.quantity || 0;
  });

  // Watchlist: low / critical / out, with suggested reorder
  const watchlist = items
    .filter(i => i.ai.health !== 'healthy')
    .map(i => ({
      code: i.code, name: i.name, dept: deptName(i.departmentId),
      qty: i.quantity, threshold: i.ai.dynamicThreshold ?? i.threshold,
      health: i.ai.health, suggested: i.ai.recommendation?.suggestedQty ?? null,
    }))
    .sort((a, b) => rank(a.health) - rank(b.health));

  const topStocked = [...items].sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  return { items, totalSkus, totalUnits, health, byCat, byDept, watchlist, topStocked, deptName,
    categoryCount: Object.keys(byCat).length, departmentCount: Object.keys(byDept).length };
}

const rank = (h) => ({ out_of_stock: 0, critical: 1, low: 2, healthy: 3 }[h] ?? 9);
const healthLabel = (h) => ({ out_of_stock: 'Out of Stock', critical: 'Critical', low: 'Low', healthy: 'Healthy' }[h] || h);

// Deterministic fallback summary when the AI summary isn't available.
export function computedSummary(stats) {
  const atRisk = stats.health.low + stats.health.critical + stats.health.out_of_stock;
  const pct = stats.totalSkus ? Math.round((atRisk / stats.totalSkus) * 100) : 0;
  const topCat = Object.entries(stats.byCat).sort((a, b) => b[1].units - a[1].units)[0];
  return [
    `This report covers ${stats.totalSkus} active stock items totalling ${stats.totalUnits.toLocaleString()} units across ${stats.categoryCount} categories and ${stats.departmentCount} departments.`,
    `Stock health analysis (AI-classified) shows ${stats.health.healthy} healthy, ${stats.health.low} low, ${stats.health.critical} critical, and ${stats.health.out_of_stock} out-of-stock items — meaning ${atRisk} item(s) (${pct}%) need attention.`,
    topCat ? `The largest category by volume is "${topCat[0]}" with ${topCat[1].units.toLocaleString()} units across ${topCat[1].skus} item(s).` : '',
    atRisk > 0
      ? `Immediate action is recommended for the ${stats.health.critical + stats.health.out_of_stock} critical/out-of-stock item(s) listed in the watchlist, with suggested reorder quantities provided.`
      : `All items are currently above their AI-calculated thresholds; no immediate reordering is required.`,
  ].filter(Boolean).join(' ');
}

// ── Build the multi-page PDF ────────────────────────────────────────────────
export function buildStockAvailabilityPDF(state, aiSummary) {
  const stats = computeStockStats(state);
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleString();
  let y = 0;

  const heading = (text, size = 13) => {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(size); doc.setTextColor(30, 30, 60); doc.setFont(undefined, 'bold');
    doc.text(text, 14, y); doc.setFont(undefined, 'normal'); doc.setTextColor(0, 0, 0);
    y += 7;
  };
  const para = (text, size = 10) => {
    doc.setFontSize(size); doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(text, W - 28);
    lines.forEach(line => { if (y > 280) { doc.addPage(); y = 20; } doc.text(line, 14, y); y += 5.2; });
    doc.setTextColor(0, 0, 0); y += 3;
  };

  // ── Cover header ──
  doc.setFillColor(37, 99, 235); doc.rect(0, 0, W, 30, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont(undefined, 'bold');
  doc.text('Stock Availability Report', 14, 19);
  doc.setFontSize(9); doc.setFont(undefined, 'normal');
  doc.text(`Mavericks Inventory  •  Generated ${now}`, 14, 26);
  doc.setTextColor(0, 0, 0);
  y = 40;

  // ── Executive Summary ──
  heading('1. Executive Summary');
  para(aiSummary || computedSummary(stats));

  // KPI strip
  const kpis = [
    ['Total SKUs', String(stats.totalSkus)],
    ['Total Units', stats.totalUnits.toLocaleString()],
    ['Categories', String(stats.categoryCount)],
    ['Departments', String(stats.departmentCount)],
    ['Healthy', String(stats.health.healthy)],
    ['Need Attention', String(stats.health.low + stats.health.critical + stats.health.out_of_stock)],
  ];
  autoTable(doc, {
    startY: y, body: [kpis.map(k => k[1]), kpis.map(k => k[0])],
    theme: 'grid', styles: { halign: 'center', fontSize: 9 },
    bodyStyles: { fontSize: 10 },
    didParseCell: (d) => { if (d.row.index === 0) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.textColor = [37, 99, 235]; d.cell.styles.fontSize = 13; } },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Stock Health Analysis ──
  heading('2. Stock Health Analysis');
  para('Each item is classified by the AI engine against its dynamically-calculated threshold (based on consumption history and lead time). "Critical" means stock has fallen to 30% or less of the threshold.');
  autoTable(doc, {
    startY: y, head: [['Health Status', 'Items', '% of Inventory']],
    body: ['healthy', 'low', 'critical', 'out_of_stock'].map(h => [
      healthLabel(h), stats.health[h], stats.totalSkus ? `${Math.round((stats.health[h] / stats.totalSkus) * 100)}%` : '0%',
    ]),
    theme: 'striped', headStyles: { fillColor: [37, 99, 235] }, styles: { fontSize: 9 },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Category Breakdown ──
  heading('3. Category Breakdown');
  autoTable(doc, {
    startY: y, head: [['Category', 'SKUs', 'Total Units']],
    body: Object.entries(stats.byCat).sort((a, b) => b[1].units - a[1].units).map(([c, v]) => [c, v.skus, v.units.toLocaleString()]),
    theme: 'striped', headStyles: { fillColor: [16, 185, 129] }, styles: { fontSize: 9 },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Department Breakdown ──
  heading('4. Department Breakdown');
  autoTable(doc, {
    startY: y, head: [['Department', 'SKUs', 'Total Units']],
    body: Object.entries(stats.byDept).sort((a, b) => b[1].units - a[1].units).map(([d, v]) => [d, v.skus, v.units.toLocaleString()]),
    theme: 'striped', headStyles: { fillColor: [99, 102, 241] }, styles: { fontSize: 9 },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Watchlist ──
  heading('5. Reorder Watchlist (Low / Critical / Out of Stock)');
  if (stats.watchlist.length === 0) {
    para('No items currently require attention — all stock is above its AI threshold.');
  } else {
    autoTable(doc, {
      startY: y, head: [['Code', 'Name', 'Dept', 'Qty', 'Threshold', 'Status', 'Suggested Reorder']],
      body: stats.watchlist.map(w => [w.code, w.name, w.dept, w.qty, w.threshold, healthLabel(w.health), w.suggested ?? '—']),
      theme: 'striped', headStyles: { fillColor: [220, 38, 38] }, styles: { fontSize: 8 },
      didParseCell: (d) => {
        if (d.section === 'body' && d.column.index === 5) {
          const v = d.cell.raw;
          if (v === 'Critical' || v === 'Out of Stock') d.cell.styles.textColor = [220, 38, 38];
          else if (v === 'Low') d.cell.styles.textColor = [202, 138, 4];
        }
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ── Full inventory ──
  doc.addPage(); y = 20;
  heading('6. Full Inventory Detail');
  autoTable(doc, {
    startY: y, head: [['Code', 'Name', 'Category', 'Location', 'Qty', 'Threshold', 'Status']],
    body: stats.items.map(i => [i.code, i.name, i.category, i.location, i.quantity, i.ai.dynamicThreshold ?? i.threshold, healthLabel(i.ai.health)]),
    theme: 'grid', headStyles: { fillColor: [37, 99, 235] }, styles: { fontSize: 8 },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Recommendations ──
  heading('7. Recommendations');
  const recs = [];
  if (stats.health.critical + stats.health.out_of_stock > 0)
    recs.push(`Reorder the ${stats.health.critical + stats.health.out_of_stock} critical/out-of-stock item(s) immediately using the suggested quantities in Section 5.`);
  if (stats.health.low > 0)
    recs.push(`Monitor the ${stats.health.low} low-stock item(s) and plan replenishment within the next cycle.`);
  const emptyDepts = Object.entries(stats.byDept).filter(([, v]) => v.skus === 0);
  if (emptyDepts.length) recs.push(`Some departments have no products mapped — review department assignments.`);
  recs.push('Schedule this report periodically to track stock-health trends over time.');
  recs.forEach((r, i) => para(`${i + 1}. ${r}`));

  // Footer page numbers
  const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); doc.setFontSize(8); doc.setTextColor(150);
    doc.text(`Page ${p} of ${pages}`, W - 30, doc.internal.pageSize.getHeight() - 8);
  }
  return doc;
}
