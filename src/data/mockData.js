export const users = [
  { id: 1, name: 'Gokul Krishna', email: 'gokulkrishna0420@gmail.com', password: 'gokul123', role: 'executive', avatar: 'GK', status: 'active' },
  { id: 2, name: 'Varsha Prasanna', email: 'varshaprasanna@gmail.com', password: 'varsha123', role: 'manager', avatar: 'VP', status: 'active' },
  { id: 3, name: 'Bala Aditya', email: 'balaaditya@gmail.com', password: 'bala123', role: 'admin', avatar: 'BA', status: 'active' },
  { id: 4, employeeId: '12345', name: 'Test Employee', email: 'abc@gmail.com', password: 'abc12345', role: 'employee', avatar: 'TE', status: 'active' },
];

// Employee allocation statuses:
// pending_approval → approved / rejected → accepted / employee_rejected → received / not_received
export const employeeAllocations = [
  { id: 'EMP-A001', stockId: 'STK001', stockName: 'Laptop Dell Latitude 5540', quantity: 1, employeeId: '12345', employeeEmail: 'abc@gmail.com', employeeName: 'Test Employee', purpose: 'Laptop allocated for project work', status: 'approved', createdBy: 1, createdAt: '2026-05-20T09:00:00', approvedBy: 2, approvedAt: '2026-05-21T10:00:00', rejectionReason: null, acceptedAt: null, employeeRejectionReason: null, collectionLocation: 'Warehouse A', receivedAt: null },
  { id: 'EMP-A002', stockId: 'STK005', stockName: 'Wireless Mouse Logitech M720', quantity: 2, employeeId: '12345', employeeEmail: 'abc@gmail.com', employeeName: 'Test Employee', purpose: 'Peripherals for new setup', status: 'pending_approval', createdBy: 1, createdAt: '2026-05-24T14:00:00', approvedBy: null, approvedAt: null, rejectionReason: null, acceptedAt: null, employeeRejectionReason: null, collectionLocation: 'HQ Store', receivedAt: null },
];

const categories = ['Merchandise', 'IT Equipment', 'Apparel', 'Accessories', 'Electronics'];
const locations = ['Hexavarsity Store', 'STG Warehouse', 'Central Store'];

export const stockItems = [
  { id: 'STK001', code: 'STK001', name: 'Laptop Dell Latitude 5540', category: 'Electronics', location: 'Warehouse A', quantity: 45, threshold: 10, unit: 'Units', status: 'active', createdAt: '2026-03-15', updatedAt: '2026-04-28' },
  { id: 'STK002', code: 'STK002', name: 'Office Chair Ergonomic Pro', category: 'Furniture', location: 'Warehouse B', quantity: 8, threshold: 15, unit: 'Units', status: 'active', createdAt: '2026-03-15', updatedAt: '2026-04-20' },
  { id: 'STK003', code: 'STK003', name: 'A4 Paper (80 GSM)', category: 'Stationery', location: 'HQ Store', quantity: 200, threshold: 50, unit: 'Reams', status: 'active', createdAt: '2026-03-16', updatedAt: '2026-05-01' },
  { id: 'STK004', code: 'STK004', name: 'Safety Helmet Type-II', category: 'Safety Equipment', location: 'Warehouse A', quantity: 5, threshold: 20, unit: 'Units', status: 'active', createdAt: '2026-03-18', updatedAt: '2026-04-30' },
  { id: 'STK005', code: 'STK005', name: 'Wireless Mouse Logitech M720', category: 'IT Hardware', location: 'HQ Store', quantity: 120, threshold: 30, unit: 'Units', status: 'active', createdAt: '2026-03-20', updatedAt: '2026-04-25' },
  { id: 'STK006', code: 'STK006', name: 'Floor Cleaner (5L)', category: 'Cleaning Supplies', location: 'Warehouse B', quantity: 3, threshold: 10, unit: 'Bottles', status: 'active', createdAt: '2026-03-22', updatedAt: '2026-04-15' },
  { id: 'STK007', code: 'STK007', name: 'Monitor 27" 4K Dell', category: 'Electronics', location: 'Warehouse A', quantity: 30, threshold: 8, unit: 'Units', status: 'active', createdAt: '2026-03-25', updatedAt: '2026-05-02' },
  { id: 'STK008', code: 'STK008', name: 'Standing Desk Frame', category: 'Furniture', location: 'Warehouse A', quantity: 12, threshold: 5, unit: 'Units', status: 'active', createdAt: '2026-04-01', updatedAt: '2026-04-28' },
  { id: 'STK009', code: 'STK009', name: 'Printer Toner HP 26A', category: 'Stationery', location: 'HQ Store', quantity: 4, threshold: 8, unit: 'Cartridges', status: 'active', createdAt: '2026-04-05', updatedAt: '2026-04-30' },
  { id: 'STK010', code: 'STK010', name: 'Fire Extinguisher ABC Type', category: 'Safety Equipment', location: 'Warehouse B', quantity: 18, threshold: 5, unit: 'Units', status: 'active', createdAt: '2026-04-10', updatedAt: '2026-05-01' },
  { id: 'STK011', code: 'STK011', name: 'USB-C Hub Multiport', category: 'IT Hardware', location: 'HQ Store', quantity: 2, threshold: 15, unit: 'Units', status: 'active', createdAt: '2026-04-12', updatedAt: '2026-04-29' },
  { id: 'STK012', code: 'STK012', name: 'Hand Sanitizer (500ml)', category: 'Cleaning Supplies', location: 'HQ Store', quantity: 50, threshold: 20, unit: 'Bottles', status: 'active', createdAt: '2026-04-15', updatedAt: '2026-05-01' },
];

export const distributions = [
  { id: 'DST001', stockId: 'STK001', stockName: 'Laptop Dell Latitude 5540', quantity: 5, recipient: 'Branch Office Delhi', date: '2026-04-25', status: 'approved', remarks: 'Quarterly refresh', submittedBy: 1, submittedAt: '2026-04-25', approvedBy: 2, approvedAt: '2026-04-26' },
  { id: 'DST002', stockId: 'STK003', stockName: 'A4 Paper (80 GSM)', quantity: 30, recipient: 'Branch Office Mumbai', date: '2026-04-28', status: 'submitted', remarks: 'Monthly supplies', submittedBy: 1, submittedAt: '2026-04-28', approvedBy: null, approvedAt: null },
  { id: 'DST003', stockId: 'STK005', stockName: 'Wireless Mouse Logitech M720', quantity: 15, recipient: 'HQ Store', date: '2026-04-29', status: 'draft', remarks: '', submittedBy: 1, submittedAt: null, approvedBy: null, approvedAt: null },
  { id: 'DST004', stockId: 'STK002', stockName: 'Office Chair Ergonomic Pro', quantity: 3, recipient: 'Branch Office Delhi', date: '2026-04-30', status: 'rejected', remarks: 'Insufficient stock for this quantity', submittedBy: 1, submittedAt: '2026-04-30', approvedBy: 2, approvedAt: '2026-05-01', rejectionReason: 'Stock below safety threshold. Reduce quantity to 2.' },
  { id: 'DST005', stockId: 'STK007', stockName: 'Monitor 27" 4K Dell', quantity: 10, recipient: 'Warehouse B', date: '2026-05-01', status: 'submitted', remarks: 'Branch setup', submittedBy: 1, submittedAt: '2026-05-01', approvedBy: null, approvedAt: null },
  { id: 'DST006', stockId: 'STK004', stockName: 'Safety Helmet Type-II', quantity: 2, recipient: 'Warehouse A', date: '2026-05-02', status: 'draft', remarks: '', submittedBy: 1, submittedAt: null, approvedBy: null, approvedAt: null },
  // Additional historical distributions for AI analysis
  { id: 'DST007', stockId: 'STK002', stockName: 'Office Chair Ergonomic Pro', quantity: 4, recipient: 'Branch Office Mumbai', date: '2026-03-15', status: 'approved', remarks: 'Office expansion', submittedBy: 1, submittedAt: '2026-03-15', approvedBy: 2, approvedAt: '2026-03-16' },
  { id: 'DST008', stockId: 'STK004', stockName: 'Safety Helmet Type-II', quantity: 8, recipient: 'Warehouse B', date: '2026-03-20', status: 'approved', remarks: 'Site safety requirement', submittedBy: 1, submittedAt: '2026-03-20', approvedBy: 2, approvedAt: '2026-03-21' },
  { id: 'DST009', stockId: 'STK006', stockName: 'Floor Cleaner (5L)', quantity: 5, recipient: 'HQ Store', date: '2026-03-25', status: 'approved', remarks: 'Monthly cleaning supplies', submittedBy: 1, submittedAt: '2026-03-25', approvedBy: 2, approvedAt: '2026-03-26' },
  { id: 'DST010', stockId: 'STK009', stockName: 'Printer Toner HP 26A', quantity: 3, recipient: 'Branch Office Delhi', date: '2026-04-01', status: 'approved', remarks: 'Printer maintenance', submittedBy: 1, submittedAt: '2026-04-01', approvedBy: 2, approvedAt: '2026-04-02' },
  { id: 'DST011', stockId: 'STK011', stockName: 'USB-C Hub Multiport', quantity: 6, recipient: 'HQ Store', date: '2026-04-05', status: 'approved', remarks: 'IT equipment refresh', submittedBy: 1, submittedAt: '2026-04-05', approvedBy: 2, approvedAt: '2026-04-06' },
  { id: 'DST012', stockId: 'STK001', stockName: 'Laptop Dell Latitude 5540', quantity: 8, recipient: 'Branch Office Mumbai', date: '2026-03-28', status: 'approved', remarks: 'New hire onboarding', submittedBy: 1, submittedAt: '2026-03-28', approvedBy: 2, approvedAt: '2026-03-29' },
  { id: 'DST013', stockId: 'STK004', stockName: 'Safety Helmet Type-II', quantity: 5, recipient: 'Branch Office Delhi', date: '2026-04-10', status: 'approved', remarks: 'Safety compliance', submittedBy: 1, submittedAt: '2026-04-10', approvedBy: 2, approvedAt: '2026-04-11' },
  { id: 'DST014', stockId: 'STK006', stockName: 'Floor Cleaner (5L)', quantity: 4, recipient: 'Warehouse A', date: '2026-04-18', status: 'approved', remarks: 'Restocking', submittedBy: 1, submittedAt: '2026-04-18', approvedBy: 2, approvedAt: '2026-04-19' },
  { id: 'DST015', stockId: 'STK009', stockName: 'Printer Toner HP 26A', quantity: 2, recipient: 'HQ Store', date: '2026-04-22', status: 'approved', remarks: 'Emergency replacement', submittedBy: 1, submittedAt: '2026-04-22', approvedBy: 2, approvedAt: '2026-04-23' },
  { id: 'DST016', stockId: 'STK011', stockName: 'USB-C Hub Multiport', quantity: 4, recipient: 'Branch Office Mumbai', date: '2026-04-28', status: 'approved', remarks: 'IT provisioning', submittedBy: 1, submittedAt: '2026-04-28', approvedBy: 2, approvedAt: '2026-04-29' },
];

export const reorderRequests = [
  { id: 'ROR-001', stockId: 'STK002', stockName: 'Office Chair Ergonomic Pro', currentStock: 8, aiThreshold: 12, suggestedQty: 20, requestedQty: 20, status: 'pending', requestedBy: 1, requestedByName: 'Gokul Krishna', requestDate: '2026-05-28T10:00:00', remarks: 'Stock running low, AI recommends immediate reorder', aiReasoning: 'Based on 2 approved distributions totaling 7 units over 46 days, with avg daily consumption of 0.15 units and 7-day lead time.', aiConfidence: 75, urgency: 'standard', reviewedBy: null, reviewedByName: null, reviewedAt: null, rejectionReason: null },
  { id: 'ROR-002', stockId: 'STK011', stockName: 'USB-C Hub Multiport', currentStock: 2, aiThreshold: 8, suggestedQty: 15, requestedQty: 15, status: 'approved', requestedBy: 1, requestedByName: 'Gokul Krishna', requestDate: '2026-05-25T14:30:00', remarks: 'Critically low — urgent procurement needed', aiReasoning: 'Based on 2 approved distributions totaling 10 units over 23 days, with avg daily consumption of 0.43 units. Critical stock level.', aiConfidence: 82, urgency: 'urgent', reviewedBy: 2, reviewedByName: 'Varsha Prasanna', reviewedAt: '2026-05-26T09:15:00', rejectionReason: null },
];

export const auditLogs = [
  { id: 1, entityType: 'distribution', entityId: 'DST001', action: 'created', user: 'Gokul Krishna', date: '2026-04-25T09:00:00', remarks: 'Distribution created' },
  { id: 2, entityType: 'distribution', entityId: 'DST001', action: 'submitted', user: 'Gokul Krishna', date: '2026-04-25T09:05:00', remarks: 'Submitted for approval' },
  { id: 3, entityType: 'distribution', entityId: 'DST001', action: 'approved', user: 'Varsha Prasanna', date: '2026-04-26T10:30:00', remarks: 'Approved - stock sufficient' },
  { id: 4, entityType: 'distribution', entityId: 'DST004', action: 'created', user: 'Gokul Krishna', date: '2026-04-30T08:00:00', remarks: 'Distribution created' },
  { id: 5, entityType: 'distribution', entityId: 'DST004', action: 'submitted', user: 'Gokul Krishna', date: '2026-04-30T08:10:00', remarks: 'Submitted for approval' },
  { id: 6, entityType: 'distribution', entityId: 'DST004', action: 'rejected', user: 'Varsha Prasanna', date: '2026-05-01T11:00:00', remarks: 'Stock below safety threshold. Reduce quantity to 2.' },
  { id: 7, entityType: 'stock', entityId: 'STK001', action: 'created', user: 'Gokul Krishna', date: '2026-03-15T09:00:00', remarks: 'Stock master created via upload' },
  { id: 8, entityType: 'stock', entityId: 'STK001', action: 'updated', user: 'Gokul Krishna', date: '2026-04-28T14:00:00', remarks: 'Quantity updated after distribution' },
];

export const notifications = [
  { id: 1, title: 'Distribution Approved', message: 'DST001 has been approved by Varsha Prasanna', time: '2 hours ago', read: false, type: 'success' },
  { id: 2, title: 'Low Stock Alert', message: 'USB-C Hub Multiport is critically low (2 units)', time: '3 hours ago', read: false, type: 'warning' },
  { id: 3, title: 'Distribution Rejected', message: 'DST004 was rejected - see remarks', time: '1 day ago', read: true, type: 'danger' },
  { id: 4, title: 'New Stock Uploaded', message: '12 items uploaded to stock master', time: '2 days ago', read: true, type: 'info' },
];

export const consumptionData = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 3, 3 + i);
  return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), consumed: Math.floor(Math.random() * 8) + 1, restocked: i % 7 === 0 ? Math.floor(Math.random() * 20) + 10 : 0 };
});

export const approvalConfig = { type: 'single', slaHours: 48, escalationEnabled: true, roles: [{ from: 'executive', to: 'manager' }] };
export const systemSettings = {
  thresholdRules: [
    { category: 'Electronics', threshold: 10 }, { category: 'Furniture', threshold: 5 },
    { category: 'Stationery', threshold: 50 }, { category: 'Safety Equipment', threshold: 20 },
    { category: 'Cleaning Supplies', threshold: 10 }, { category: 'IT Hardware', threshold: 15 },
  ],
  features: { aiSuggestions: true, bulkUpload: true, excelExport: true, pdfExport: true },
};

export { categories, locations };
