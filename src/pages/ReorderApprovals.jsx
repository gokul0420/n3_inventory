import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ShoppingCart, CheckCircle, XCircle, Clock, Brain, AlertTriangle, Search } from 'lucide-react';

export default function ReorderApprovals() {
  const { state, dispatch, addAuditLog, addNotification } = useApp();
  const { user } = useAuth();
  const [tab, setTab] = useState('pending');
  const [reviewItem, setReviewItem] = useState(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveModal, setApproveModal] = useState(false);
  const [search, setSearch] = useState('');

  const requests = state.reorderRequests;
  const pending = requests.filter(r => r.status === 'pending');
  const approved = requests.filter(r => r.status === 'approved');
  const rejected = requests.filter(r => r.status === 'rejected');

  const displayList = useMemo(() => {
    let list = tab === 'pending' ? pending : tab === 'approved' ? approved : rejected;
    if (search) list = list.filter(r => r.stockName.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [tab, pending, approved, rejected, search]);

  const handleApprove = () => {
    if (!reviewItem) return;
    dispatch({ type: 'UPDATE_REORDER_REQUEST', payload: { id: reviewItem.id, status: 'approved', reviewedBy: user.id, reviewedByName: user.name, reviewedAt: new Date().toISOString() }});
    addAuditLog('reorder_request', reviewItem.id, 'approved', user.name, `Approved reorder: ${reviewItem.stockName} × ${reviewItem.requestedQty}`);
    addNotification('Reorder Approved', `${reviewItem.id} for ${reviewItem.stockName} approved`, 'success');
    setApproveModal(false); setReviewItem(null);
  };

  const handleReject = () => {
    if (!reviewItem || !rejectReason.trim()) return;
    dispatch({ type: 'UPDATE_REORDER_REQUEST', payload: { id: reviewItem.id, status: 'rejected', reviewedBy: user.id, reviewedByName: user.name, reviewedAt: new Date().toISOString(), rejectionReason: rejectReason }});
    addAuditLog('reorder_request', reviewItem.id, 'rejected', user.name, rejectReason);
    addNotification('Reorder Rejected', `${reviewItem.id} for ${reviewItem.stockName} rejected`, 'danger');
    setRejectModal(false); setRejectReason(''); setReviewItem(null);
  };

  const stock = reviewItem ? state.stockItems.find(s => s.id === reviewItem.stockId) : null;

  return (
    <div className="fade-in">
      <div className="page-header"><div><h1 className="page-title">Reorder Request Approvals</h1><p className="page-subtitle">Review AI-driven reorder requests from executives</p></div></div>

      <div className="stat-grid">
        <div className="stat-card" style={{cursor:'pointer'}} onClick={()=>setTab('pending')}><div className="stat-icon yellow"><Clock size={24}/></div><div className="stat-content"><h3>{pending.length}</h3><p>Pending</p></div></div>
        <div className="stat-card" style={{cursor:'pointer'}} onClick={()=>setTab('approved')}><div className="stat-icon green"><CheckCircle size={24}/></div><div className="stat-content"><h3>{approved.length}</h3><p>Approved</p></div></div>
        <div className="stat-card" style={{cursor:'pointer'}} onClick={()=>setTab('rejected')}><div className="stat-icon red"><XCircle size={24}/></div><div className="stat-content"><h3>{rejected.length}</h3><p>Rejected</p></div></div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab==='pending'?'active':''}`} onClick={()=>setTab('pending')}>Pending ({pending.length})</button>
        <button className={`tab ${tab==='approved'?'active':''}`} onClick={()=>setTab('approved')}>Approved ({approved.length})</button>
        <button className={`tab ${tab==='rejected'?'active':''}`} onClick={()=>setTab('rejected')}>Rejected ({rejected.length})</button>
      </div>

      <div className="filter-bar"><div className="search-input"><Search size={18}/><input className="form-input" placeholder="Search by item or ID..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>

      {displayList.length === 0 ? (
        <div className="card"><div className="empty-state"><ShoppingCart size={48}/><h3>No {tab} requests</h3><p>{tab === 'pending' ? 'All reorder requests have been reviewed.' : `No ${tab} requests found.`}</p></div></div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Item</th><th>Current Stock</th><th>AI Threshold</th><th>Requested Qty</th><th>Urgency</th><th>Requested By</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>{displayList.map(r => (
              <tr key={r.id}>
                <td className="font-medium">{r.id}</td>
                <td><div className="font-medium">{r.stockName}</div></td>
                <td><span className="text-danger font-semibold">{r.currentStock}</span></td>
                <td><div className="flex items-center gap-2"><Brain size={14} style={{color:'var(--primary)',opacity:.7}}/>{r.aiThreshold}</div></td>
                <td className="font-semibold">{r.requestedQty}</td>
                <td>{r.urgency === 'urgent' ? <span className="badge badge-rejected">⚡ Urgent</span> : <span className="badge badge-info">Standard</span>}</td>
                <td>{r.requestedByName}</td>
                <td>{new Date(r.requestDate).toLocaleDateString()}</td>
                <td>
                  {r.status === 'pending' ? (
                    <button className="btn btn-primary btn-sm" onClick={()=>setReviewItem(r)}>Review</button>
                  ) : r.status === 'approved' ? (
                    <span className="badge badge-approved">✓ Approved</span>
                  ) : (
                    <span className="badge badge-rejected">✗ Rejected</span>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {reviewItem && !approveModal && !rejectModal && (
        <div className="modal-overlay" onClick={()=>setReviewItem(null)}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Review Reorder — {reviewItem.id}</h2><button className="modal-close" onClick={()=>setReviewItem(null)}>✕</button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div>
                  <h4 className="text-sm font-semibold mb-2" style={{textTransform:'uppercase',letterSpacing:'.04em',color:'var(--gray-400)'}}>Request Details</h4>
                  <div className="card" style={{background:'var(--gray-50)',border:'1px solid var(--border)'}}>
                    <div className="form-row"><div className="form-group"><label className="form-label">Item</label><div className="text-sm font-semibold">{reviewItem.stockName}</div></div><div className="form-group"><label className="form-label">Request ID</label><div className="text-sm">{reviewItem.id}</div></div></div>
                    <div className="form-row"><div className="form-group"><label className="form-label">Requested By</label><div className="text-sm">{reviewItem.requestedByName}</div></div><div className="form-group"><label className="form-label">Date</label><div className="text-sm">{new Date(reviewItem.requestDate).toLocaleString()}</div></div></div>
                    <div className="form-row"><div className="form-group"><label className="form-label">Requested Qty</label><div className="text-sm font-semibold" style={{fontSize:'1.2rem'}}>{reviewItem.requestedQty}</div></div><div className="form-group"><label className="form-label">AI Suggested Qty</label><div className="text-sm">{reviewItem.suggestedQty}</div></div></div>
                    {reviewItem.remarks && <div className="form-group"><label className="form-label">Remarks</label><div className="text-sm text-muted">{reviewItem.remarks}</div></div>}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2" style={{textTransform:'uppercase',letterSpacing:'.04em',color:'var(--gray-400)'}}>Stock & AI Analysis</h4>
                  <div className="card" style={{background:'var(--gray-50)',border:'1px solid var(--border)'}}>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Current Stock</label><div className="text-sm font-semibold text-danger" style={{fontSize:'1.2rem'}}>{stock ? stock.quantity : reviewItem.currentStock}</div></div>
                      <div className="form-group"><label className="form-label">AI Threshold</label><div className="text-sm font-semibold" style={{color:'var(--primary)',fontSize:'1.2rem'}}>{reviewItem.aiThreshold}</div></div>
                    </div>
                    <div className="form-group"><label className="form-label">Urgency</label>{reviewItem.urgency === 'urgent' ? <span className="badge badge-rejected">⚡ Urgent</span> : <span className="badge badge-info">Standard</span>}</div>
                    <div className="form-group"><label className="form-label">AI Confidence</label>
                      <div className="flex items-center gap-2"><div className="confidence-bar" style={{width:120,flex:'none'}}><div className="confidence-fill" style={{width:`${reviewItem.aiConfidence}%`,background:reviewItem.aiConfidence>70?'var(--success)':'var(--warning)'}}/></div><span className="text-sm font-medium">{reviewItem.aiConfidence}%</span></div>
                    </div>
                  </div>
                  <div className="ai-recommendation-card mt-4">
                    <div className="flex items-center gap-2 mb-2"><Brain size={16} style={{color:'var(--primary)'}}/><h4 className="text-sm font-semibold">AI Reasoning</h4></div>
                    <p className="text-sm text-muted">{reviewItem.aiReasoning}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setReviewItem(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={()=>setRejectModal(true)}><XCircle size={16}/> Reject</button>
              <button className="btn btn-success" onClick={()=>setApproveModal(true)}><CheckCircle size={16}/> Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirm */}
      {approveModal && <div className="modal-overlay" onClick={()=>setApproveModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h2 className="modal-title">Confirm Approval</h2></div>
        <div className="modal-body"><p>Approve reorder request <strong>{reviewItem?.id}</strong> for <strong>{reviewItem?.requestedQty}</strong> units of <strong>{reviewItem?.stockName}</strong>?</p><p className="text-sm text-muted mt-2">The procurement/replenishment process can proceed after approval.</p></div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setApproveModal(false)}>Cancel</button><button className="btn btn-success" onClick={handleApprove}>Approve</button></div>
      </div></div>}

      {/* Reject Modal */}
      {rejectModal && <div className="modal-overlay" onClick={()=>setRejectModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h2 className="modal-title">Reject Reorder Request</h2></div>
        <div className="modal-body"><div className="form-group"><label className="form-label">Rejection Reason *</label><textarea className="form-textarea" value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Provide reason for rejection..."/></div></div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setRejectModal(false)}>Cancel</button><button className="btn btn-danger" onClick={handleReject} disabled={!rejectReason.trim()}>Reject</button></div>
      </div></div>}
    </div>
  );
}
