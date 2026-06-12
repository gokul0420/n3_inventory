/**
 * Centralized Excel Template Generator
 * 
 * Generates structured, validation-friendly Excel templates for all
 * bulk upload modules in the Mavericks Inventory application.
 * 
 * Each template includes:
 *  - A "Data" sheet with headers and sample rows
 *  - An "Instructions" sheet with field descriptions, rules, and examples
 *  - Column widths and formatting for readability
 */
import * as XLSX from 'xlsx';

// ──────────────────────────────────────────────
// Template Definitions
// ──────────────────────────────────────────────

export const TEMPLATES = {
  stock_upload: {
    id: 'stock_upload',
    name: 'Stock Upload Template',
    filename: 'stock_upload_template.xlsx',
    module: 'Stock Master',
    description: 'Bulk upload new stock items into the inventory master list.',
    usedIn: 'Executive Dashboard → Inventory → Upload Stock',
    whenToUse: 'When you need to add multiple new stock items to the system at once, instead of creating them individually.',
    columns: [
      { header: 'Stock Code', key: 'Stock Code', width: 14, required: true, description: 'Unique stock code (e.g., HEX005). Must not already exist in the system.', example: 'HEX005' },
      { header: 'Stock Name', key: 'Stock Name', width: 30, required: true, description: 'Full descriptive name of the product.', example: 'Coffee Mug' },
      { header: 'Department', key: 'Department', width: 18, required: true, description: 'Department this product belongs to. Must match an existing department name exactly (e.g., Hexavarsity, STG).', example: 'Hexavarsity' },
      { header: 'Category', key: 'Category', width: 18, required: true, description: 'Item category, e.g. Merchandise, IT Equipment, Apparel, Accessories, Electronics.', example: 'Merchandise' },
      { header: 'Location', key: 'Location', width: 22, required: false, description: 'Storage location, e.g. Hexavarsity Store, STG Warehouse, Central Store. Defaults to "Central Store" if empty.', example: 'Hexavarsity Store' },
      { header: 'Quantity', key: 'Quantity', width: 12, required: true, description: 'Initial stock quantity. Must be a positive whole number.', example: '100' },
      { header: 'Threshold', key: 'Threshold', width: 12, required: false, description: 'Low-stock alert threshold. Defaults to 10 if empty.', example: '20' },
      { header: 'Unit', key: 'Unit', width: 12, required: false, description: 'Unit of measurement. Defaults to "Units" if empty.', example: 'Units' },
    ],
    sampleRows: [
      ['HEX005', 'Notebook', 'Hexavarsity', 'Merchandise', 'Hexavarsity Store', 120, 20, 'Units'],
      ['STG005', 'USB-C Charger', 'STG', 'IT Equipment', 'STG Warehouse', 60, 15, 'Units'],
    ],
  },

  bulk_distribution: {
    id: 'bulk_distribution',
    name: 'Bulk Distribution Template',
    filename: 'bulk_distribution_template.xlsx',
    module: 'Distribution Management',
    description: 'Bulk create distribution requests for stock items to various locations/recipients.',
    usedIn: 'Executive Dashboard → Distribution → Distributions → Bulk Upload',
    whenToUse: 'When you need to create multiple distribution orders at once (e.g., monthly supply dispatch to multiple branches).',
    columns: [
      { header: 'Stock Code', key: 'Stock Code', width: 14, required: true, description: 'Existing stock code from the inventory (e.g., STK001). Must match a code in Stock Master.', example: 'STK001' },
      { header: 'Quantity', key: 'Quantity', width: 12, required: true, description: 'Number of units to distribute. Must be a positive number and not exceed available stock.', example: '5' },
      { header: 'Recipient', key: 'Recipient', width: 26, required: true, description: 'Recipient location or department name (e.g., Branch Office Delhi, Warehouse B).', example: 'Branch Office Delhi' },
      { header: 'Date', key: 'Date', width: 14, required: false, description: 'Distribution date in YYYY-MM-DD format. Defaults to today if empty.', example: '2026-05-01' },
      { header: 'Remarks', key: 'Remarks', width: 30, required: false, description: 'Optional notes about the distribution (e.g., purpose, project code).', example: 'Quarterly refresh' },
    ],
    sampleRows: [
      ['STK001', 5, 'Branch Office Delhi', '2026-05-01', 'Quarterly refresh'],
      ['STK003', 30, 'Branch Office Mumbai', '2026-05-01', 'Monthly supplies'],
      ['STK005', 10, 'HQ Store', '2026-05-01', 'New employee setup'],
    ],
  },

  employee_distribution: {
    id: 'employee_distribution',
    name: 'Employee Distribution Template',
    filename: 'employee_distribution_template.xlsx',
    module: 'Employee Distribution',
    description: 'Bulk allocate inventory items to individual employees for personal use.',
    usedIn: 'Executive Dashboard → Distribution → Emp. Distribution → Bulk Distribution',
    whenToUse: 'When you need to allocate items to multiple employees at once (e.g., onboarding batch, project equipment distribution).',
    columns: [
      { header: 'Employee ID', key: 'Employee ID', width: 14, required: true, description: 'The employee\'s unique ID number. Must match a registered employee in the system.', example: '12345' },
      { header: 'Employee Email', key: 'Employee Email', width: 26, required: true, description: 'Employee\'s registered email address. Must match the email on file for the given Employee ID.', example: 'abc@gmail.com' },
      { header: 'Item Name', key: 'Item Name', width: 32, required: true, description: 'Full name or stock code of the inventory item. Must match an item in Stock Master.', example: 'Laptop Dell Latitude 5540' },
      { header: 'Quantity', key: 'Quantity', width: 10, required: true, description: 'Number of units to allocate. Must be a positive number and not exceed available stock.', example: '1' },
      { header: 'Receiving Location', key: 'Receiving Location', width: 22, required: false, description: 'Where the employee collects the item. Defaults to the stock location if left blank.', example: 'Hexavarsity Store' },
      { header: 'Expected By', key: 'Expected By', width: 14, required: false, description: 'Expected collection date (YYYY-MM-DD). Optional.', example: '2026-06-20' },
      { header: 'Purpose / Remarks', key: 'Purpose / Remarks', width: 34, required: false, description: 'Reason for allocation (e.g., project assignment, replacement, new joinee setup).', example: 'Laptop for project work' },
    ],
    sampleRows: [
      ['1920', 'anu12@gmail.com', 'Coffee Mug', 1, 'Hexavarsity Store', '2026-06-20', 'Welcome kit'],
      ['1920', 'anu12@gmail.com', 'T-Shirt', 2, 'Hexavarsity Store', '', 'Team merch'],
    ],
  },

  bulk_stock_update: {
    id: 'bulk_stock_update',
    name: 'Bulk Stock Update Template',
    filename: 'bulk_stock_update_template.xlsx',
    module: 'Stock Master',
    description: 'Bulk update quantities and details of existing stock items.',
    usedIn: 'Executive Dashboard → Inventory → Stock Master (future enhancement)',
    whenToUse: 'When you need to update stock quantities after physical audit, restock, or correction of multiple items.',
    columns: [
      { header: 'Stock Code', key: 'Stock Code', width: 14, required: true, description: 'Existing stock code to update. Must match a code in Stock Master.', example: 'STK001' },
      { header: 'New Quantity', key: 'New Quantity', width: 14, required: true, description: 'Updated stock quantity after audit/restock. Must be a positive whole number.', example: '50' },
      { header: 'Location', key: 'Location', width: 22, required: false, description: 'Updated storage location. Leave empty to keep current location unchanged.', example: 'Warehouse A' },
      { header: 'Threshold', key: 'Threshold', width: 12, required: false, description: 'Updated low-stock threshold. Leave empty to keep current threshold.', example: '15' },
      { header: 'Reason', key: 'Reason', width: 30, required: true, description: 'Reason for the update (e.g., Physical audit, Restock, Correction, Transfer).', example: 'Physical audit reconciliation' },
    ],
    sampleRows: [
      ['STK001', 50, 'Warehouse A', 15, 'Physical audit reconciliation'],
      ['STK003', 250, '', '', 'Restock from vendor'],
      ['STK006', 20, 'Warehouse B', 10, 'New batch received'],
    ],
  },
};

// ──────────────────────────────────────────────
// Generator Functions
// ──────────────────────────────────────────────

/**
 * Generate a styled Excel workbook for a given template definition.
 * Includes a "Data" sheet (headers + sample rows) and an "Instructions" sheet.
 */
export function generateTemplate(templateId, overrides = {}) {
  const tmpl = TEMPLATES[templateId];
  if (!tmpl) throw new Error(`Unknown template: ${templateId}`);

  const wb = XLSX.utils.book_new();

  // ── Data Sheet ──
  const headers = tmpl.columns.map(c => c.header);
  // Callers may supply department-specific sample rows.
  const sampleRows = overrides.sampleRows && overrides.sampleRows.length ? overrides.sampleRows : tmpl.sampleRows;
  const dataRows = [headers, ...sampleRows];
  const wsData = XLSX.utils.aoa_to_sheet(dataRows);

  // Set column widths
  wsData['!cols'] = tmpl.columns.map(c => ({ wch: c.width }));

  XLSX.utils.book_append_sheet(wb, wsData, 'Data');

  // ── Instructions Sheet ──
  const instrRows = [
    [`📋 ${tmpl.name} — Instructions`],
    [],
    ['Module:', tmpl.module],
    ['Description:', tmpl.description],
    ['Used In:', tmpl.usedIn],
    ['When To Use:', tmpl.whenToUse],
    [],
    ['COLUMN REFERENCE'],
    ['Column Name', 'Required', 'Description', 'Example'],
  ];

  tmpl.columns.forEach(col => {
    instrRows.push([
      col.header,
      col.required ? 'YES ✱' : 'Optional',
      col.description,
      col.example,
    ]);
  });

  instrRows.push([], ['IMPORTANT RULES:']);
  instrRows.push(['1. Do not modify or delete the header row (Row 1 in the Data sheet).']);
  instrRows.push(['2. Sample rows are provided for reference — replace them with your actual data.']);
  instrRows.push(['3. Fields marked "YES ✱" are mandatory. Rows missing mandatory fields will be rejected.']);
  instrRows.push(['4. Dates must be in YYYY-MM-DD format (e.g., 2026-05-01).']);
  instrRows.push(['5. Numeric fields (Quantity, Threshold) must contain only numbers — no text, commas, or symbols.']);
  instrRows.push(['6. Stock Codes and Employee IDs must match existing records in the system.']);
  instrRows.push(['7. Quantity values must not exceed available stock for distribution/allocation templates.']);
  instrRows.push(['8. Save the file as .xlsx format before uploading. .xls and .csv may cause issues.']);

  const wsInstr = XLSX.utils.aoa_to_sheet(instrRows);
  wsInstr['!cols'] = [{ wch: 24 }, { wch: 12 }, { wch: 60 }, { wch: 30 }];

  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');

  return wb;
}

/**
 * Generate and download a template as an Excel file.
 */
export function downloadTemplate(templateId, overrides = {}) {
  const tmpl = TEMPLATES[templateId];
  const wb = generateTemplate(templateId, overrides);
  XLSX.writeFile(wb, overrides.filename || tmpl.filename);
}

/**
 * Get all template definitions as an array.
 */
export function getAllTemplates() {
  return Object.values(TEMPLATES);
}
