import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ShoppingCart, Clock, CheckCircle, XCircle, Search, Eye } from 'lucide-react';

export default function ReorderRequests() {
  const { state } = useApp();
  const { user } = useAuth();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [viewItem, setViewItem] = useState(null);

  const myRequests = state.reorderRequests.filter(r => r.requestedBy === user.id);
  const pending = myRequests.filter(r => r.status === 'pending');
  const approved = myRequests.filter(r => r.status === 'approved');
  const rejected = myRequests.filter(r => r.status === 'rejected');

  const displayList = useMemo(() => {
    let list = tab === 'all' ? myRequests : tab === 'pending' ? pending : tab === 'approved' ? approved : rejected;
    if (search) list = list.filter(r => r.stockName.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()));
    return list.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
  }, [tab, myRequests, pending, approved, rejected, search]);

  return (
    <div className="fade-in">
      <div className="page-header"><div><h1 className="page-title">My Reorder Requests</h1><p className="page-subtitle">Track your submitted reorder requests and their approval status</p></div></div>

      <div className="stat-grid">
        <div className="stat-card" style={{cursor:'pointer'}} onClick={()=>setTab('all')}><div className="stat-icon blue"><ShoppingCart size={24}/></div><div className="stat-content"><h3>{myRequests.length}</h3><p>Total Requests</p></div></div>
        <div className="stat-card" style={{cursor:'pointer'}} onClick={()=>setTab('pending')}><div className="stat-icon yellow"><Clock size={24}/></div><div className="stat-content"><h3>{pending.length}</h3><p>Pending</p></div></div>
        <div className="stat-card" style={{cursor:'pointer'}} onClick={()=>setTab('approved')}><div className="stat-icon green"><CheckCircle size={24}/></div><div className="stat-content"><h3>{approved.length}</h3><p>Approved</p></div></div>
        <div className="stat-card" style={{cursor:'pointer'}} onClick={()=>setTab('rejected')}><div className="stat-icon red"><XCircle size={24}/></div><div className="stat-content"><h3>{rejected.length}</h3><p>Rejected</p></div></div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab==='all'?'active':''}`} onClick={()=>setTab('all')}>All ({myRequests.length})</button>
        <button className={`tab ${tab==='pending'?'active':''}`} onClick={()=>setTab('pending')}>Pending ({pending.length})</button>
        <button className={`tab ${tab==='approved'?'active':''}`} onClick={()=>setTab('approved')}>Approved ({approved.length})</button>
        <button className={`tab ${tab==='rejected'?'active':''}`} onClick={()=>setTab('rejected')}>Rejected ({rejected.length})</button>
      </div>

      <div className="filter-bar"><div className="search-input"><Search size={18}/><input className="form-input" placeholder="Search requests..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>

      {displayList.length === 0 ? (
        <div className="card"><div className="empty-state"><ShoppingCart size={48}/><h3>No requests found</h3><p>Place reorder requests from the AI Stock Intelligence page.</p></div></div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Item</th><th>Qty</th><th>AI Threshold</th><th>Urgency</th><th>Status</th><th>Date</th><th>Manager Feedback</th><th>Action</th></tr></thead>
            <tbody>{displayList.map(r => (
              <tr key={r.id}>
                <td className="font-medium">{r.id}</td>
                <td>{r.stockName}</td>
                <td className="font-semibold">{r.requestedQty}</td>
                <td>{r.aiThreshold}</td>
                <td>{r.urgency === 'urgent' ? <span className="badge badge-rejected">⚡ Urgent</span> : <span className="badge badge-info">Standard</span>}</td>
                <td><span className={`badge badge-${r.status === 'pending' ? 'warning' : r.status}`}>{r.status === 'pending' ? '⏳ Pending' : r.status === 'approved' ? '✓ Approved' : '✗ Rejected'}</span></td>
                <td>{new Date(r.requestDate).toLocaleDateString()}</td>
                <td>{r.status === 'rejected' ? <span className="text-danger text-sm">{r.rejectionReason}</span> : r.status === 'approved' ? <span className="text-success text-sm">Approved by {r.reviewedByName}</span> : <span className="text-muted text-sm">Awaiting review</span>}</td>
                <td><button className="btn btn-ghost btn-sm" onClick={()=>setViewItem(r)}><Eye size={14}/> View</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {viewItem && (
        <div className="modal-overlay" onClick={()=>setViewItem(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Request Details — {viewItem.id}</h2><button className="modal-close" onClick={()=>setViewItem(null)}>✕</button></div>
            <div className="modal-body">
              <div className="form-row"><div className="form-group"><label className="form-label">Item</label><div className="text-sm font-semibold">{viewItem.stockName}</div></div><div className="form-group"><label className="form-label">Status</label><span className={`badge badge-${viewItem.status === 'pending' ? 'warning' : viewItem.status}`}>{viewItem.status}</span></div></div>
              <div className="form-row"><div className="form-group"><label className="form-label">Requested Qty</label><div className="text-sm font-semibold">{viewItem.requestedQty}</div></div><div className="form-group"><label className="form-label">AI Suggested Qty</label><div className="text-sm">{viewItem.suggestedQty}</div></div></div>
              <div className="form-row"><div className="form-group"><label className="form-label">Current Stock (at request)</label><div className="text-sm">{viewItem.currentStock}</div></div><div className="form-group"><label className="form-label">AI Threshold</label><div className="text-sm" style={{color:'var(--primary)'}}>{viewItem.aiThreshold}</div></div></div>
              <div className="form-group"><label className="form-label">AI Confidence</label><div className="flex items-center gap-2"><div className="confidence-bar" style={{width:120}}><div className="confidence-fill" style={{width:`${viewItem.aiConfidence}%`,background:viewItem.aiConfidence>70?'var(--success)':'var(--warning)'}}/></div><span className="text-sm">{viewItem.aiConfidence}%</span></div></div>
              {viewItem.remarks && <div className="form-group"><label className="form-label">Your Remarks</label><div className="text-sm text-muted">{viewItem.remarks}</div></div>}
              <hr style={{border:'none',borderTop:'1px solid var(--border)',margin:'16px 0'}}/>
              {viewItem.status === 'approved' && <div className="form-group"><label className="form-label">Approved By</label><div className="text-sm text-success">{viewItem.reviewedByName} on {new Date(viewItem.reviewedAt).toLocaleString()}</div></div>}
              {viewItem.status === 'rejected' && <>
                <div className="form-group"><label className="form-label">Rejected By</label><div className="text-sm">{viewItem.reviewedByName} on {new Date(viewItem.reviewedAt).toLocaleString()}</div></div>
                <div className="form-group"><label className="form-label">Rejection Reason</label><div className="text-sm text-danger">{viewItem.rejectionReason}</div></div>
              </>}
              {viewItem.status === 'pending' && <div className="alloc-status-info"><p className="text-sm text-muted">This request is awaiting manager review.</p></div>}
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setViewItem(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
