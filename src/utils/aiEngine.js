/**
 * AI Engine — Dynamic Threshold Calculation & Reorder Intelligence
 *
 * Analyzes historical distribution and inventory movement data to:
 * 1. Calculate dynamic, per-item stock thresholds
 * 2. Classify stock health (Healthy / Low / Critical / Out of Stock)
 * 3. Generate intelligent reorder recommendations with confidence scores
 */

const DEFAULT_LEAD_TIME_DAYS = 7;
const SAFETY_MULTIPLIER = 1.5;
const ANALYSIS_WINDOW_DAYS = 90; // look-back window

/**
 * Calculate a dynamic threshold for a stock item based on its distribution history.
 *
 * @param {Object} stockItem        - The stock item record
 * @param {Array}  distributions    - All distribution records
 * @param {Array}  auditLogs        - All audit log records
 * @returns {Object} analysis result
 */
export function calculateDynamicThreshold(stockItem, distributions, auditLogs) {
  // Find all approved distributions for this item
  const itemDistributions = distributions.filter(
    d => d.stockId === stockItem.id && d.status === 'approved'
  );

  const distributionCount = itemDistributions.length;
  const totalDistributed = itemDistributions.reduce((sum, d) => sum + d.quantity, 0);

  // Calculate time span from distributions
  const dates = itemDistributions
    .map(d => new Date(d.date || d.submittedAt))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a - b);

  let daySpan = ANALYSIS_WINDOW_DAYS;
  if (dates.length >= 2) {
    daySpan = Math.max(
      (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24),
      30 // minimum 30-day span to avoid spikes
    );
  }

  // Count stock-related audit events for movement frequency
  const stockAuditEvents = auditLogs.filter(
    l => l.entityId === stockItem.id && ['updated', 'distributed'].includes(l.action)
  );
  const movementFrequency = stockAuditEvents.length;

  // Consumption rates
  const avgDailyConsumption = distributionCount > 0
    ? totalDistributed / daySpan
    : stockItem.threshold / 30; // fallback: use manual threshold as proxy

  const avgWeeklyConsumption = avgDailyConsumption * 7;
  const avgMonthlyConsumption = avgDailyConsumption * 30;

  // Distribution frequency (distributions per month)
  const distributionsPerMonth = distributionCount > 0
    ? (distributionCount / daySpan) * 30
    : 1;

  // Seasonal / demand variance factor (simulate with distribution count variability)
  const demandVarianceFactor = distributionCount >= 3 ? 1.2 : 1.0;

  // Safety stock = multiplier × average weekly consumption
  const safetyStock = Math.ceil(avgWeeklyConsumption * SAFETY_MULTIPLIER);

  // Lead time demand
  const leadTimeDemand = Math.ceil(avgDailyConsumption * DEFAULT_LEAD_TIME_DAYS);

  // Dynamic threshold = lead-time demand + safety stock, adjusted for demand variance
  const dynamicThreshold = Math.max(
    Math.ceil((leadTimeDemand + safetyStock) * demandVarianceFactor),
    3 // absolute minimum threshold
  );

  // Data quality / confidence score
  let dataQuality = 50; // base
  if (distributionCount >= 1) dataQuality += 10;
  if (distributionCount >= 3) dataQuality += 10;
  if (distributionCount >= 5) dataQuality += 10;
  if (movementFrequency >= 2) dataQuality += 5;
  if (daySpan >= 30) dataQuality += 5;
  if (daySpan >= 60) dataQuality += 5;
  dataQuality = Math.min(dataQuality, 95);

  return {
    dynamicThreshold,
    avgDailyConsumption: parseFloat(avgDailyConsumption.toFixed(2)),
    avgWeeklyConsumption: parseFloat(avgWeeklyConsumption.toFixed(1)),
    avgMonthlyConsumption: parseFloat(avgMonthlyConsumption.toFixed(1)),
    distributionCount,
    totalDistributed,
    distributionsPerMonth: parseFloat(distributionsPerMonth.toFixed(1)),
    leadTimeDays: DEFAULT_LEAD_TIME_DAYS,
    leadTimeDemand,
    safetyStock,
    demandVarianceFactor,
    daySpan: Math.round(daySpan),
    movementFrequency,
    dataQuality,
  };
}

/**
 * Classify stock health based on current quantity vs dynamic threshold.
 *
 * @param {number} currentQty
 * @param {number} dynamicThreshold
 * @returns {'healthy'|'low'|'critical'|'out_of_stock'}
 */
export function classifyStockHealth(currentQty, dynamicThreshold) {
  if (currentQty === 0) return 'out_of_stock';
  if (currentQty <= dynamicThreshold * 0.3) return 'critical';
  if (currentQty <= dynamicThreshold) return 'low';
  return 'healthy';
}

/**
 * Map health status to display properties.
 */
export const HEALTH_CONFIG = {
  healthy:      { label: 'Healthy',       emoji: '🟢', badgeClass: 'badge-healthy',       color: 'var(--success)' },
  low:          { label: 'Low Stock',     emoji: '🟡', badgeClass: 'badge-low',           color: 'var(--warning)' },
  critical:     { label: 'Critical',      emoji: '🔴', badgeClass: 'badge-critical',      color: 'var(--danger)' },
  out_of_stock: { label: 'Out of Stock',  emoji: '⚫', badgeClass: 'badge-out_of_stock',  color: 'var(--gray-600)' },
};

/**
 * Generate a reorder recommendation for a stock item.
 *
 * @param {Object} stockItem - The stock item
 * @param {Object} analysis  - Result from calculateDynamicThreshold
 * @returns {Object} recommendation
 */
export function generateReorderRecommendation(stockItem, analysis) {
  const health = classifyStockHealth(stockItem.quantity, analysis.dynamicThreshold);

  // Reorder quantity: cover 30 days of demand + replenish up to threshold + safety
  const targetLevel = Math.ceil(analysis.avgMonthlyConsumption + analysis.dynamicThreshold);
  const suggestedQty = Math.max(targetLevel - stockItem.quantity, analysis.dynamicThreshold);

  const urgency = health === 'critical' || health === 'out_of_stock' ? 'urgent' : 'standard';

  // Confidence blends data quality with health severity
  let confidence = analysis.dataQuality;
  if (health === 'critical') confidence = Math.min(confidence + 5, 95);
  if (health === 'out_of_stock') confidence = Math.min(confidence + 8, 98);

  // Build human-readable reasoning
  const reasoning = buildReasoning(stockItem, analysis, health, suggestedQty);

  return {
    suggestedQty,
    confidence,
    urgency,
    health,
    reasoning,
    factors: {
      avgDailyConsumption: analysis.avgDailyConsumption,
      leadTimeDays: analysis.leadTimeDays,
      safetyStock: analysis.safetyStock,
      historicalDistributions: analysis.distributionCount,
    },
  };
}

function buildReasoning(item, analysis, health, suggestedQty) {
  const parts = [];
  parts.push(`Analysis of ${analysis.distributionCount} historical distribution(s) over ${analysis.daySpan} days shows an average daily consumption of ${analysis.avgDailyConsumption} ${item.unit.toLowerCase()}.`);

  if (analysis.distributionCount === 0) {
    parts.push(`No distribution history found; threshold estimated from category baseline.`);
  } else {
    parts.push(`Monthly consumption averages ${analysis.avgMonthlyConsumption} ${item.unit.toLowerCase()} with ${analysis.distributionsPerMonth} distribution(s)/month.`);
  }

  parts.push(`With a ${analysis.leadTimeDays}-day lead time and safety stock of ${analysis.safetyStock}, the AI-calculated threshold is ${analysis.dynamicThreshold} ${item.unit.toLowerCase()}.`);

  if (health !== 'healthy') {
    parts.push(`Current stock (${item.quantity}) is ${health === 'out_of_stock' ? 'depleted' : `below the recommended threshold`}. Suggested reorder: ${suggestedQty} ${item.unit.toLowerCase()}.`);
  }

  return parts.join(' ');
}

/**
 * Run full AI analysis on all stock items.
 *
 * @param {Array} stockItems
 * @param {Array} distributions
 * @param {Array} auditLogs
 * @returns {Array} enriched items with AI data
 */
export function analyzeAllStock(stockItems, distributions, auditLogs) {
  return stockItems
    .filter(s => s.status === 'active')
    .map(item => {
      const analysis = calculateDynamicThreshold(item, distributions, auditLogs);
      const health = classifyStockHealth(item.quantity, analysis.dynamicThreshold);
      const recommendation = health !== 'healthy'
        ? generateReorderRecommendation(item, analysis)
        : null;

      return {
        ...item,
        ai: {
          ...analysis,
          health,
          healthConfig: HEALTH_CONFIG[health],
          recommendation,
        },
      };
    });
}
