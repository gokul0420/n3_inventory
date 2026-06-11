import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Save, Send, ArrowLeft } from 'lucide-react';

export default function CreateDistribution() {
  const { state, dispatch, addAuditLog, addNotification } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.edit;

  const [stockId, setStockId] = useState(editData?.stockId || '');
  const [quantity, setQuantity] = useState(editData?.quantity || '');
  const [recipient, setRecipient] = useState(editData?.recipient || '');
  const [date, setDate] = useState(editData?.date || new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState(editData?.remarks || '');
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitModal, setSubmitModal] = useState(false);

  // Department scoping: executives/managers only see their department's
  // products; admins see everything.
  const activeStocks = state.stockItems.filter(s =>
    s.status === 'active' && (user.role === 'admin' || s.departmentId === user.departmentId)
  );
  const selectedStock = activeStocks.find(s => s.id === stockId);
  const postQty = selectedStock ? selectedStock.quantity - Number(quantity || 0) : null;
  const filteredStocks = activeStocks.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()));

  const save = (status) => {
    const id = editData?.id || `DST${String(state.distributions.length + 1).padStart(3, '0')}`;
    const entry = { id, stockId, stockName: selectedStock?.name, quantity: Number(quantity), recipient, date, status, remarks, submittedBy: user.id, submittedAt: status === 'submitted' ? new Date().toISOString() : null, approvedBy: null, approvedAt: null,
      // Route the request to the executive's assigned manager + tag department.
      departmentId: user.departmentId || selectedStock?.departmentId || null,
      managerId: user.managerId || null };
    if (editData) dispatch({ type: 'UPDATE_DISTRIBUTION', payload: entry });
    else dispatch({ type: 'ADD_DISTRIBUTION', payload: entry });
    addAuditLog('distribution', id, status === 'submitted' ? 'submitted' : 'created', user.name, remarks || `Distribution ${status}`);
    addNotification(status === 'submitted' ? 'Distribution Submitted' : 'Draft Saved', `${id} ${status}`, status === 'submitted' ? 'info' : 'success');
    navigate('/distributions');
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><button className="btn btn-ghost" onClick={() => navigate('/distributions')}><ArrowLeft size={16} /> Back</button><h1 className="page-title mt-2">{editData ? 'Edit Distribution' : 'Create Distribution'}</h1></div>
      </div>
      <div className="grid-2">
        <div className="card">
          <h3 className="card-title mb-4">Distribution Details</h3>
          <div className="form-group">
            <label className="form-label">Stock Item *</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" placeholder="Search stock item..." value={selectedStock ? `${selectedStock.code} — ${selectedStock.name}` : search} onChange={e => { setSearch(e.target.value); setStockId(''); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} />
              {showDropdown && !stockId && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', maxHeight: 200, overflowY: 'auto', zIndex: 10 }}>
                  {filteredStocks.map(s => (
                    <div key={s.id} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '.85rem' }} onClick={() => { setStockId(s.id); setShowDropdown(false); setSearch(''); }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <strong>{s.code}</strong> — {s.name} <span className="text-muted">({s.quantity} {s.unit})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {selectedStock && <div className="form-group"><label className="form-label">Available Quantity</label><input className="form-input" readOnly value={`${selectedStock.quantity} ${selectedStock.unit}`} /></div>}
          <div className="form-group"><label className="form-label">Quantity to Distribute *</label><input className="form-input" type="number" min="1" max={selectedStock?.quantity} value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Enter quantity" /></div>
          <div className="form-group"><label className="form-label">Recipient / Location *</label><input className="form-input" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Enter recipient or location" /></div>
          <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Remarks</label><textarea className="form-textarea" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional remarks..." /></div>
          <div className="flex gap-3 mt-4">
            <button className="btn btn-secondary" onClick={() => save('draft')} disabled={!stockId || !quantity || !recipient}><Save size={16} /> Save as Draft</button>
            <button className="btn btn-primary" onClick={() => setSubmitModal(true)} disabled={!stockId || !quantity || !recipient || postQty < 0}><Send size={16} /> Submit for Approval</button>
          </div>
        </div>
        <div>
          {selectedStock && (
            <div className="card">
              <h3 className="card-title mb-4">Impact Preview</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="flex justify-between"><span className="text-sm text-muted">Current Stock</span><span className="font-semibold">{selectedStock.quantity} {selectedStock.unit}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted">Distribution Qty</span><span className="font-semibold text-danger">-{quantity || 0}</span></div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
                <div className="flex justify-between"><span className="text-sm font-medium">Post-Distribution</span><span className={`font-semibold ${postQty < 0 ? 'text-danger' : postQty <= selectedStock.threshold ? 'text-danger' : 'text-success'}`}>{postQty} {selectedStock.unit}</span></div>
                {postQty < 0 && <div className="text-sm text-danger">⚠ Insufficient stock for this quantity</div>}
                {postQty >= 0 && postQty <= selectedStock.threshold && <div className="text-sm" style={{ color: 'var(--warning)' }}>⚠ Stock will fall below threshold</div>}
              </div>
            </div>
          )}
        </div>
      </div>
      {submitModal && (
        <div className="modal-overlay" onClick={() => setSubmitModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Confirm Submission</h2></div>
            <div className="modal-body"><p>Submit this distribution for manager approval? This action cannot be undone.</p></div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setSubmitModal(false)}>Cancel</button><button className="btn btn-primary" onClick={() => { setSubmitModal(false); save('submitted'); }}>Submit</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
