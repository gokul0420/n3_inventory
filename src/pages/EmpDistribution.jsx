import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Users, Send, Download, Upload, Package, Search, ArrowLeft, CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { downloadTemplate as dlTemplate } from '../utils/templateGenerator.js';

export default function EmpDistribution() {
  const { state, dispatch, addAuditLog, addNotification } = useApp();
  const { user } = useAuth();
  const [view, setView] = useState('overview'); // overview | single | bulk
  const fileRef = useRef();

  // Single distribution state
  const [empId, setEmpId] = useState('');
  const [empLookup, setEmpLookup] = useState(null);
  const [empError, setEmpError] = useState('');
  const [stockId, setStockId] = useState('');
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [purpose, setPurpose] = useState('');
  const [receivingLocation, setReceivingLocation] = useState('');
  const [expectedBy, setExpectedBy] = useState('');
  const [submitModal, setSubmitModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Bulk state
  const [dragover, setDragover] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Products are scoped to the executive's department (admins see all).
  const activeStocks = state.stockItems.filter(s =>
    s.status === 'active' && (user.role === 'admin' || s.departmentId === user.departmentId)
  );
  // Look up an employee from the live profile list (Supabase), by Employee ID.
  const findEmployee = (id) => state.users.find(u => u.role === 'employee' && String(u.employeeId || '') === String(id).trim());
  const selectedStock = activeStocks.find(s => s.id === stockId);
  const postQty = selectedStock ? selectedStock.quantity - Number(quantity || 0) : null;
  const filteredStocks = activeStocks.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()));

  const lookupEmployee = (id) => {
    setEmpId(id);
    setEmpError('');
    setEmpLookup(null);
    if (id.trim().length >= 1) {
      const found = findEmployee(id);
      if (found) setEmpLookup(found);
      else setEmpError('No employee found with this ID.');
    }
  };

  const handleSingleSubmit = () => {
    if (!empLookup || !stockId || !quantity || postQty < 0) return;
    const allocId = `EMP-${Date.now().toString(36).toUpperCase()}`;
    const alloc = {
      id: allocId, stockId, stockName: selectedStock.name, quantity: Number(quantity),
      employeeId: empLookup.employeeId, employeeEmail: empLookup.email, employeeName: empLookup.name,
      purpose: purpose || '', status: 'pending_approval',
      createdBy: user.id, createdAt: new Date().toISOString(),
      // Route to the creating executive's assigned manager + tag department.
      managerId: user.managerId || null, departmentId: user.departmentId || null,
      approvedBy: null, approvedAt: null, rejectionReason: null,
      acceptedAt: null, employeeRejectionReason: null,
      collectionLocation: receivingLocation.trim() || selectedStock.location,
      expectedBy: expectedBy || null, receivedAt: null,
    };
    dispatch({ type: 'ADD_EMPLOYEE_ALLOCATION', payload: alloc });
    addAuditLog('employee_allocation', allocId, 'created', user.name, `Employee distribution to ${empLookup.name}`);
    addNotification('Employee Distribution Created', `${allocId} submitted for approval`, 'info');
    setSubmitModal(false);
    setSuccessMsg(`Allocation ${allocId} created and sent for manager approval.`);
    // Reset form
    setEmpId(''); setEmpLookup(null); setStockId(''); setSearch(''); setQuantity(''); setPurpose(''); setReceivingLocation(''); setExpectedBy('');
  };

  // Bulk
  const downloadTemplate = () => dlTemplate('employee_distribution');

  const processFile = async (file) => {
    setUploading(true);
    await new Promise(r => setTimeout(r, 800));
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const valid = [], errors = [];
      rows.forEach((row, i) => {
        const errs = [];
        const emp = findEmployee(String(row['Employee ID'] || ''));
        const stock = activeStocks.find(s => s.name === row['Item Name'] || s.code === row['Item Name']);
        if (!emp) errs.push('Employee ID not found');
        if (emp && row['Employee Email'] && emp.email !== row['Employee Email']) errs.push('Email mismatch');
        if (!stock) errs.push('Item not found in stock');
        if (!row['Quantity'] || isNaN(row['Quantity']) || Number(row['Quantity']) <= 0) errs.push('Valid quantity required');
        if (stock && Number(row['Quantity']) > stock.quantity) errs.push(`Exceeds available stock (${stock.quantity})`);
        if (errs.length) { errors.push({ row: i + 2, data: row, errors: errs }); }
        else {
          const allocId = `EMP-${Date.now().toString(36).toUpperCase()}-${i}`;
          valid.push({
            id: allocId, stockId: stock.id, stockName: stock.name, quantity: Number(row['Quantity']),
            employeeId: emp.employeeId, employeeEmail: emp.email, employeeName: emp.name,
            purpose: row['Purpose / Remarks'] || '', status: 'pending_approval',
            createdBy: user.id, createdAt: new Date().toISOString(),
            managerId: user.managerId || null, departmentId: user.departmentId || null,
            approvedBy: null, approvedAt: null, rejectionReason: null,
            acceptedAt: null, employeeRejectionReason: null,
            collectionLocation: (row['Receiving Location'] || '').toString().trim() || stock.location,
            expectedBy: row['Expected By'] || null, receivedAt: null,
          });
        }
      });
      valid.forEach(v => {
        dispatch({ type: 'ADD_EMPLOYEE_ALLOCATION', payload: v });
        addAuditLog('employee_allocation', v.id, 'created', user.name, `Bulk: ${v.employeeName}`);
      });
      if (valid.length) addNotification('Bulk Employee Distribution', `${valid.length} allocations created`, 'success');
      setBulkResults({ valid, errors, total: rows.length });
    } catch (e) { addNotification('Upload Failed', e.message, 'danger'); }
    setUploading(false);
  };

  const downloadErrors = () => {
    const ws = XLSX.utils.json_to_sheet(bulkResults.errors.map(e => ({ Row: e.row, ...e.data, Errors: e.errors.join('; ') })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Errors'); XLSX.writeFile(wb, 'emp_distribution_errors.xlsx');
  };

  // Inventory overview
  if (view === 'overview') {
    const pendingCount = state.employeeAllocations.filter(a => a.status === 'pending_approval').length;
    const approvedCount = state.employeeAllocations.filter(a => a.status === 'approved' || a.status === 'accepted' || a.status === 'received').length;
    return (
      <div className="fade-in">
        <div className="page-header">
          <div><h1 className="page-title">Distribution to Employee</h1><p className="page-subtitle">Allocate inventory items to employees</p></div>
          <div className="page-actions">
            <button className="btn btn-secondary" onClick={() => setView('bulk')}><FileSpreadsheet size={16} /> Bulk Distribution</button>
            <button className="btn btn-primary" onClick={() => setView('single')}><Users size={16} /> Single Distribution</button>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-card"><div className="stat-icon blue"><Package size={24} /></div><div className="stat-content"><h3>{activeStocks.length}</h3><p>Available Items</p></div></div>
          <div className="stat-card"><div className="stat-icon yellow"><AlertTriangle size={24} /></div><div className="stat-content"><h3>{pendingCount}</h3><p>Pending Approval</p></div></div>
          <div className="stat-card"><div className="stat-icon green"><CheckCircle size={24} /></div><div className="stat-content"><h3>{approvedCount}</h3><p>Approved Allocations</p></div></div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Inventory Overview</span></div>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead><tr><th>Code</th><th>Item Name</th><th>Category</th><th>Location</th><th>Available Qty</th><th>Unit</th><th>Status</th></tr></thead>
              <tbody>
                {activeStocks.map(s => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.code}</td><td>{s.name}</td><td>{s.category}</td><td>{s.location}</td>
                    <td><span className={`font-semibold ${s.quantity <= s.threshold ? 'text-danger' : ''}`}>{s.quantity}</span></td>
                    <td>{s.unit}</td>
                    <td><span className={`badge ${s.quantity <= s.threshold ? 'badge-warning' : 'badge-active'}`}>{s.quantity <= s.threshold ? 'Low' : 'In Stock'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Bulk view
  if (view === 'bulk') {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <button className="btn btn-ghost" onClick={() => { setView('overview'); setBulkResults(null); }}><ArrowLeft size={16} /> Back</button>
            <h1 className="page-title mt-2">Bulk Employee Distribution</h1>
            <p className="page-subtitle">Upload multiple employee allocations via Excel</p>
          </div>
          <button className="btn btn-secondary" onClick={downloadTemplate}><Download size={16} /> Download Template</button>
        </div>

        {!bulkResults ? (
          <div className="card">
            <div className={`upload-zone ${dragover ? 'dragover' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragover(true); }}
              onDragLeave={() => setDragover(false)}
              onDrop={e => { e.preventDefault(); setDragover(false); processFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current?.click()}>
              {uploading ? <><div className="spinner" style={{ margin: '0 auto 16px' }} /><p>Processing allocations...</p></> :
                <><Upload size={48} /><p>Drag & drop or <span className="upload-cta">browse</span></p><p className="text-xs text-muted mt-2">Supports .xlsx and .xls files</p></>}
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={e => processFile(e.target.files[0])} style={{ display: 'none' }} />
            <div className="signup-info mt-4">
              <p><strong>Template columns:</strong> Employee ID, Employee Email, Item Name, Quantity, Purpose / Remarks</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="stat-grid">
              <div className="stat-card"><div className="stat-icon blue"><span style={{ fontSize: '1.2rem' }}>📊</span></div><div className="stat-content"><h3>{bulkResults.total}</h3><p>Total Rows</p></div></div>
              <div className="stat-card"><div className="stat-icon green"><span style={{ fontSize: '1.2rem' }}>✅</span></div><div className="stat-content"><h3>{bulkResults.valid.length}</h3><p>Created</p></div></div>
              <div className="stat-card"><div className="stat-icon red"><span style={{ fontSize: '1.2rem' }}>❌</span></div><div className="stat-content"><h3>{bulkResults.errors.length}</h3><p>Errors</p></div></div>
            </div>
            {bulkResults.errors.length > 0 && (
              <div className="card">
                <div className="card-header"><span className="card-title">Validation Errors</span><button className="btn btn-secondary btn-sm" onClick={downloadErrors}><Download size={14} /> Download</button></div>
                <div className="table-container" style={{ border: 'none' }}>
                  <table className="data-table">
                    <thead><tr><th>Row</th><th>Employee ID</th><th>Item</th><th>Errors</th></tr></thead>
                    <tbody>{bulkResults.errors.map((e, i) => (
                      <tr key={i}><td>{e.row}</td><td>{e.data['Employee ID']}</td><td className="text-sm">{e.data['Item Name']}</td><td className="text-danger text-sm">{e.errors.join(', ')}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}
            <button className="btn btn-primary mt-4" onClick={() => setBulkResults(null)}>Upload Another</button>
          </div>
        )}
      </div>
    );
  }

  // Single distribution form
  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <button className="btn btn-ghost" onClick={() => { setView('overview'); setSuccessMsg(''); }}><ArrowLeft size={16} /> Back</button>
          <h1 className="page-title mt-2">Single Employee Distribution</h1>
          <p className="page-subtitle">Allocate an inventory item to an employee</p>
        </div>
      </div>

      {successMsg && (
        <div className="card mb-4" style={{ background: 'var(--success-light)', borderColor: '#a7f3d0' }}>
          <div className="flex items-center gap-3">
            <CheckCircle size={24} style={{ color: 'var(--success)' }} />
            <div>
              <div className="font-semibold" style={{ color: 'var(--success)' }}>Success!</div>
              <div className="text-sm">{successMsg}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title mb-4">Allocation Details</h3>

          <div className="form-group">
            <label className="form-label">Employee ID *</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type="text" placeholder="Enter Employee ID (e.g., 12345)" value={empId} onChange={e => lookupEmployee(e.target.value)} />
            </div>
            {empError && <div className="form-error">{empError}</div>}
            {empLookup && (
              <div className="emp-lookup-result mt-2">
                <div className="flex items-center gap-2">
                  <div className="user-avatar" style={{ width: 28, height: 28, fontSize: '.75rem' }}>{empLookup.avatar}</div>
                  <div>
                    <div className="text-sm font-medium">{empLookup.name}</div>
                    <div className="text-xs text-muted">{empLookup.email}</div>
                  </div>
                  <CheckCircle size={16} style={{ color: 'var(--success)', marginLeft: 'auto' }} />
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Item Name *</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" placeholder="Search stock item..." value={selectedStock ? `${selectedStock.code} — ${selectedStock.name}` : search} onChange={e => { setSearch(e.target.value); setStockId(''); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} />
              {showDropdown && !stockId && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', maxHeight: 200, overflowY: 'auto', zIndex: 10 }}>
                  {filteredStocks.map(s => (
                    <div key={s.id} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '.85rem' }}
                      onClick={() => { setStockId(s.id); setShowDropdown(false); setSearch(''); }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <strong>{s.code}</strong> — {s.name} <span className="text-muted">({s.quantity} {s.unit})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedStock && <div className="form-group"><label className="form-label">Available Quantity</label><input className="form-input" readOnly value={`${selectedStock.quantity} ${selectedStock.unit} — ${selectedStock.location}`} /></div>}

          <div className="form-group">
            <label className="form-label">Quantity *</label>
            <input className="form-input" type="number" min="1" max={selectedStock?.quantity} value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Enter quantity" />
          </div>

          <div className="form-group">
            <label className="form-label">Receiving / Collection Location *</label>
            <input className="form-input" value={receivingLocation} onChange={e => setReceivingLocation(e.target.value)} placeholder={selectedStock ? `e.g., ${selectedStock.location}` : 'Where the employee collects the item'} />
            <span className="text-xs text-muted">Shown to the employee after they accept the allocation.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Expected By (collection date)</label>
            <input className="form-input" type="date" value={expectedBy} onChange={e => setExpectedBy(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Purpose / Remarks</label>
            <textarea className="form-textarea" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g., Laptop allocated for project work" />
          </div>

          <button className="btn btn-primary w-full" onClick={() => setSubmitModal(true)}
            disabled={!empLookup || !stockId || !quantity || postQty < 0 || !receivingLocation.trim()}
            style={{ justifyContent: 'center' }}>
            <Send size={16} /> Submit for Manager Approval
          </button>
        </div>

        <div>
          {selectedStock && (
            <div className="card mb-4">
              <h3 className="card-title mb-4">Stock Impact Preview</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="flex justify-between"><span className="text-sm text-muted">Current Stock</span><span className="font-semibold">{selectedStock.quantity} {selectedStock.unit}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted">Allocation Qty</span><span className="font-semibold text-danger">-{quantity || 0}</span></div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
                <div className="flex justify-between"><span className="text-sm font-medium">Post-Allocation</span><span className={`font-semibold ${postQty < 0 ? 'text-danger' : postQty <= selectedStock.threshold ? 'text-danger' : 'text-success'}`}>{postQty} {selectedStock.unit}</span></div>
                {postQty < 0 && <div className="text-sm text-danger">⚠ Insufficient stock for this quantity</div>}
                {postQty >= 0 && postQty <= selectedStock.threshold && <div className="text-sm" style={{ color: 'var(--warning)' }}>⚠ Stock will fall below threshold</div>}
              </div>
            </div>
          )}

          {empLookup && (
            <div className="card">
              <h3 className="card-title mb-4">Employee Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="flex justify-between"><span className="text-sm text-muted">Name</span><span className="font-medium">{empLookup.name}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted">Employee ID</span><span className="font-medium">{empLookup.employeeId}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted">Email</span><span className="font-medium">{empLookup.email}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted">Status</span><span className={`badge badge-${empLookup.status}`}>{empLookup.status}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {submitModal && (
        <div className="modal-overlay" onClick={() => setSubmitModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Confirm Submission</h2></div>
            <div className="modal-body">
              <p>Submit this allocation for manager approval?</p>
              <div className="mt-4" style={{ background: 'var(--gray-50)', padding: 16, borderRadius: 'var(--radius)', fontSize: '.85rem' }}>
                <div className="flex justify-between mb-2"><span className="text-muted">Employee</span><span className="font-medium">{empLookup?.name} ({empLookup?.employeeId})</span></div>
                <div className="flex justify-between mb-2"><span className="text-muted">Item</span><span className="font-medium">{selectedStock?.name}</span></div>
                <div className="flex justify-between mb-2"><span className="text-muted">Quantity</span><span className="font-medium">{quantity}</span></div>
                {purpose && <div className="flex justify-between"><span className="text-muted">Purpose</span><span className="font-medium">{purpose}</span></div>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSubmitModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSingleSubmit}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
