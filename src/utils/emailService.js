import emailjs from '@emailjs/browser';

const CONFIG_KEY = 'mavericks_email_config';

export function getEmailConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { enabled: false, serviceId: '', templateId: '', publicKey: '' };
    return JSON.parse(raw);
  } catch {
    return { enabled: false, serviceId: '', templateId: '', publicKey: '' };
  }
}

export function saveEmailConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

/**
 * Send a critical stock alert email to an executive.
 * @param {Object} executive  - User object { name, email }
 * @param {Object} stockItem  - Stock item enriched with .ai.dynamicThreshold
 * @param {'critical'|'out_of_stock'} health
 */
export async function sendCriticalStockAlert(executive, stockItem, health) {
  const config = getEmailConfig();
  if (!config.enabled || !config.serviceId || !config.templateId || !config.publicKey) {
    return { success: false, reason: 'not_configured' };
  }

  const templateParams = {
    to_email: executive.email,
    to_name: executive.name,
    item_name: stockItem.name,
    item_code: stockItem.code || stockItem.id,
    item_quantity: stockItem.quantity,
    item_unit: stockItem.unit,
    item_location: stockItem.location,
    item_category: stockItem.category,
    item_threshold: stockItem.ai?.dynamicThreshold ?? stockItem.threshold,
    health_status: health === 'out_of_stock' ? 'Out of Stock' : 'Critical',
    health_emoji: health === 'out_of_stock' ? '⚫' : '🔴',
    app_url: window.location.origin,
    sent_at: new Date().toLocaleString(),
  };

  try {
    await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
    return { success: true };
  } catch (err) {
    console.error('[EmailService] send failed:', err);
    return { success: false, reason: err?.text || err?.message || 'unknown' };
  }
}

/**
 * Notify an employee that an item has been allocated to them and is ready to collect.
 * Reuses the same EmailJS template (maps allocation info onto the template fields).
 * @param {Object} alloc - employee allocation record
 */
export async function sendAllocationEmail(alloc) {
  const config = getEmailConfig();
  if (!config.enabled || !config.serviceId || !config.templateId || !config.publicKey) {
    return { success: false, reason: 'not_configured' };
  }
  if (!alloc.employeeEmail) return { success: false, reason: 'no_email' };

  const templateParams = {
    to_email: alloc.employeeEmail,
    to_name: alloc.employeeName || 'Employee',
    item_name: alloc.stockName,
    item_code: alloc.id,
    item_quantity: alloc.quantity,
    item_unit: 'Units',
    item_location: alloc.collectionLocation || '—',
    item_category: 'Employee Allocation',
    item_threshold: alloc.expectedBy ? `Collect by ${new Date(alloc.expectedBy).toLocaleDateString()}` : 'At your earliest convenience',
    health_status: 'Assigned to You — Please Collect',
    health_emoji: '📦',
    app_url: window.location.origin,
    sent_at: new Date().toLocaleString(),
  };

  try {
    await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
    return { success: true };
  } catch (err) {
    console.error('[EmailService] allocation send failed:', err);
    return { success: false, reason: err?.text || err?.message || 'unknown' };
  }
}

/**
 * Send a test email so admins can verify their EmailJS setup.
 */
export async function sendTestEmail(toEmail, toName) {
  const config = getEmailConfig();
  if (!config.serviceId || !config.templateId || !config.publicKey) {
    return { success: false, reason: 'Missing Service ID, Template ID, or Public Key.' };
  }

  try {
    await emailjs.send(
      config.serviceId,
      config.templateId,
      {
        to_email: toEmail,
        to_name: toName,
        item_name: 'Safety Helmet Type-II (TEST)',
        item_code: 'STK004',
        item_quantity: 2,
        item_unit: 'Units',
        item_location: 'Warehouse A',
        item_category: 'Safety Equipment',
        item_threshold: 10,
        health_status: 'Critical',
        health_emoji: '🔴',
        app_url: window.location.origin,
        sent_at: new Date().toLocaleString(),
      },
      config.publicKey
    );
    return { success: true };
  } catch (err) {
    return { success: false, reason: err?.text || err?.message || 'Send failed.' };
  }
}
