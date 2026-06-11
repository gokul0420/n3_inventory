import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buildStockAvailabilityPDF, computeStockStats, computedSummary as stockSummary } from './stockReport.js';

export const REPORT_TITLES = {
  'stock-availability': 'Current Stock Availability',
  'distributed-stock': 'Distributed Stock Report',
  'pending-approval': 'Pending Approval Report',
  'approval-history': 'Approval History Report',
  'stock-movement': 'Stock Movement Ledger',
};

// ── Shared PDF scaffolding ──────────────────────────────────────────────────
function makeDoc(title) {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const ctx = { doc, W, y: 40 };
  doc.setFillColor(37, 99, 235); doc.rect(0, 0, W, 30, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont(undefined, 'bold');
  doc.text(title, 14, 19);
  doc.setFontSize(9); doc.setFont(undefined, 'normal');
  doc.text(`Mavericks Inventory  •  Generated ${new Date().toLocaleString()}`, 14, 26);
  doc.setTextColor(0, 0, 0);
  return ctx;
}
function heading(ctx, text, size = 13) {
  if (ctx.y > 255) { ctx.doc.addPage(); ctx.y = 20; }
  ctx.doc.setFontSize(size); ctx.doc.setTextColor(30, 30, 60); ctx.doc.setFont(undefined, 'bold');
  ctx.doc.text(text, 14, ctx.y); ctx.doc.setFont(undefined, 'normal'); ctx.doc.setTextColor(0, 0, 0);
  ctx.y += 7;
}
function para(ctx, text, size = 10) {
  ctx.doc.setFontSize(size); ctx.doc.setTextColor(50, 50, 50);
  ctx.doc.splitTextToSize(text, ctx.W - 28).forEach(line => {
    if (ctx.y > 280) { ctx.doc.addPage(); ctx.y = 20; } ctx.doc.text(line, 14, ctx.y); ctx.y += 5.2;
  });
  ctx.doc.setTextColor(0, 0, 0); ctx.y += 3;
}
function kpiStrip(ctx, kpis) {
  autoTable(ctx.doc, {
    startY: ctx.y, body: [kpis.map(k => String(k[1])), kpis.map(k => k[0])],
    theme: 'grid', styles: { halign: 'center', fontSize: 9 },
    didParseCell: (d) => { if (d.row.index === 0) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.textColor = [37, 99, 235]; d.cell.styles.fontSize = 13; } },
  });
  ctx.y = ctx.doc.lastAutoTable.finalY + 10;
}
function table(ctx, head, body, color = [37, 99, 235]) {
  autoTable(ctx.doc, { startY: ctx.y, head: [head], body, theme: 'striped', headStyles: { fillColor: color }, styles: { fontSize: 8 } });
  ctx.y = ctx.doc.lastAutoTable.finalY + 10;
}
function finalize(ctx) {
  const { doc, W } = ctx; const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); doc.setFontSize(8); doc.setTextColor(150);
    doc.text(`Page ${p} of ${pages}`, W - 30, doc.internal.pageSize.getHeight() - 8);
  }
  return doc;
}
const groupCount = (arr, keyFn) => arr.reduce((m, x) => { const k = keyFn(x) || '—'; m[k] = (m[k] || 0) + 1; return m; }, {});
const groupSum = (arr, keyFn, valFn) => arr.reduce((m, x) => { const k = keyFn(x) || '—'; m[k] = (m[k] || 0) + (valFn(x) || 0); return m; }, {});
const userName = (state, id) => state.users?.find(u => u.id === id)?.name || '—';

// ── Per-type stats (also used to build the AI payload) ──────────────────────
export function computeReportStats(type, state) {
  if (type === 'stock-availability') return computeStockStats(state);
  const d = state.distributions || [];
  switch (type) {
    case 'distributed-stock': {
      const byStatus = groupCount(d, x => x.status);
      const totalQty = d.reduce((s, x) => s + (x.quantity || 0), 0);
      const approved = d.filter(x => x.status === 'approved');
      return { rows: d, total: d.length, totalQty, byStatus,
        byRecipient: groupSum(d, x => x.recipient, x => x.quantity),
        byItem: groupSum(d, x => x.stockName, x => x.quantity),
        approvedQty: approved.reduce((s, x) => s + (x.quantity || 0), 0) };
    }
    case 'pending-approval': {
      const pend = d.filter(x => x.status === 'submitted');
      const now = Date.now();
      const aging = pend.map(x => ({ ...x, hours: x.submittedAt ? Math.round((now - new Date(x.submittedAt).getTime()) / 3600000) : 0 }));
      const breaches = aging.filter(x => x.hours > 48);
      return { rows: pend, aging, total: pend.length, totalQty: pend.reduce((s, x) => s + (x.quantity || 0), 0),
        byManager: groupCount(pend, x => userName(state, x.managerId)), breaches: breaches.length };
    }
    case 'approval-history': {
      const decided = d.filter(x => ['approved', 'rejected'].includes(x.status));
      const approved = decided.filter(x => x.status === 'approved').length;
      const rejected = decided.filter(x => x.status === 'rejected').length;
      return { rows: decided, total: decided.length, approved, rejected,
        rate: decided.length ? Math.round((approved / decided.length) * 100) : 0,
        byManager: groupCount(decided, x => userName(state, x.approvedBy)) };
    }
    case 'stock-movement': {
      const logs = state.auditLogs || [];
      return { rows: logs, total: logs.length,
        byAction: groupCount(logs, x => x.action),
        byEntity: groupCount(logs, x => x.entityType),
        byUser: groupCount(logs, x => x.user) };
    }
    default: return { rows: [], total: 0 };
  }
}

// Deterministic fallback summaries (used when AI summary is unavailable).
export function computedSummary(type, stats) {
  switch (type) {
    case 'stock-availability': return stockSummary(stats);
    case 'distributed-stock':
      return `This report covers ${stats.total} distribution record(s) moving ${stats.totalQty.toLocaleString()} units in total. By status: ${Object.entries(stats.byStatus).map(([k, v]) => `${v} ${k}`).join(', ')}. Approved distributions account for ${stats.approvedQty.toLocaleString()} units. The breakdowns below show the most active recipients and the most-distributed items.`;
    case 'pending-approval':
      return `There are ${stats.total} distribution request(s) awaiting approval, totalling ${stats.totalQty.toLocaleString()} units. ${stats.breaches} request(s) have breached the 48-hour SLA and should be prioritised. Requests are grouped by their assigned manager below.`;
    case 'approval-history':
      return `${stats.total} request(s) have been decided: ${stats.approved} approved and ${stats.rejected} rejected, an approval rate of ${stats.rate}%. The breakdown by approving manager is shown below.`;
    case 'stock-movement':
      return `The audit ledger contains ${stats.total} recorded event(s). Activity spans ${Object.keys(stats.byAction).length} action type(s) across ${Object.keys(stats.byEntity).length} entity type(s) and ${Object.keys(stats.byUser).length} user(s). Detailed breakdowns follow.`;
    default: return '';
  }
}

// Compact stats object sent to the AI summary function.
export function aiPayload(type, stats) {
  if (type === 'stock-availability') {
    return { totalSkus: stats.totalSkus, totalUnits: stats.totalUnits, health: stats.health,
      categoryCount: stats.categoryCount, departmentCount: stats.departmentCount,
      byCategory: Object.fromEntries(Object.entries(stats.byCat).map(([k, v]) => [k, v.units])),
      watchlist: stats.watchlist.slice(0, 10).map(w => ({ name: w.name, qty: w.qty, status: w.health, suggested: w.suggested })) };
  }
  const { rows, ...rest } = stats;          // drop the bulky raw rows
  return rest;
}

// ── Build the analytical PDF for any report type ────────────────────────────
export function buildReport(type, state, aiSummary) {
  if (type === 'stock-availability') return buildStockAvailabilityPDF(state, aiSummary);

  const ctx = makeDoc(REPORT_TITLES[type] || 'Report');
  const s = computeReportStats(type, state);
  heading(ctx, '1. Executive Summary');
  para(ctx, aiSummary || computedSummary(type, s));

  if (type === 'distributed-stock') {
    kpiStrip(ctx, [['Records', s.total], ['Total Units', s.totalQty.toLocaleString()], ['Approved Units', s.approvedQty.toLocaleString()], ['Statuses', Object.keys(s.byStatus).length]]);
    heading(ctx, '2. By Status'); table(ctx, ['Status', 'Count'], Object.entries(s.byStatus).map(([k, v]) => [k, v]));
    heading(ctx, '3. Top Recipients (by units)'); table(ctx, ['Recipient', 'Units'], Object.entries(s.byRecipient).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => [k, v]), [16, 185, 129]);
    heading(ctx, '4. Most Distributed Items (by units)'); table(ctx, ['Item', 'Units'], Object.entries(s.byItem).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => [k, v]), [99, 102, 241]);
    ctx.doc.addPage(); ctx.y = 20; heading(ctx, '5. Full Distribution List');
    table(ctx, ['ID', 'Stock', 'Qty', 'Recipient', 'Date', 'Status'], s.rows.map(r => [r.id, r.stockName, r.quantity, r.recipient, r.date, r.status]));
  } else if (type === 'pending-approval') {
    kpiStrip(ctx, [['Pending', s.total], ['Units Awaiting', s.totalQty.toLocaleString()], ['SLA Breaches', s.breaches], ['Managers', Object.keys(s.byManager).length]]);
    heading(ctx, '2. By Assigned Manager'); table(ctx, ['Manager', 'Pending Requests'], Object.entries(s.byManager).map(([k, v]) => [k, v]));
    heading(ctx, '3. Aging Analysis'); table(ctx, ['ID', 'Stock', 'Qty', 'Age (hrs)', 'SLA'], s.aging.map(r => [r.id, r.stockName, r.quantity, r.hours, r.hours > 48 ? 'BREACH' : 'OK']), [220, 38, 38]);
  } else if (type === 'approval-history') {
    kpiStrip(ctx, [['Decided', s.total], ['Approved', s.approved], ['Rejected', s.rejected], ['Approval Rate', `${s.rate}%`]]);
    heading(ctx, '2. By Approving Manager'); table(ctx, ['Manager', 'Decisions'], Object.entries(s.byManager).map(([k, v]) => [k, v]));
    heading(ctx, '3. Full Decision History'); table(ctx, ['ID', 'Stock', 'Qty', 'Status', 'Date', 'Reason'], s.rows.map(r => [r.id, r.stockName, r.quantity, r.status, r.approvedAt ? new Date(r.approvedAt).toLocaleDateString() : '-', r.rejectionReason || '-']));
  } else if (type === 'stock-movement') {
    kpiStrip(ctx, [['Events', s.total], ['Action Types', Object.keys(s.byAction).length], ['Entities', Object.keys(s.byEntity).length], ['Users', Object.keys(s.byUser).length]]);
    heading(ctx, '2. By Action'); table(ctx, ['Action', 'Count'], Object.entries(s.byAction).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v]));
    heading(ctx, '3. By User'); table(ctx, ['User', 'Events'], Object.entries(s.byUser).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v]), [16, 185, 129]);
    ctx.doc.addPage(); ctx.y = 20; heading(ctx, '4. Full Activity Ledger');
    table(ctx, ['Date', 'Entity', 'Action', 'User', 'Remarks'], s.rows.map(r => [new Date(r.date).toLocaleString(), r.entityId, r.action, r.user, r.remarks]));
  }

  return finalize(ctx);
}
