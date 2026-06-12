import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ClipboardCheck, CheckCircle, XCircle, Eye, Clock, Users, ArrowLeft, Package, AlertTriangle } from 'lucide-react';

const statusLabels = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  accepted: 'Accepted',
  employee_rejected: 'Emp. Rejected',
  received: 'Received',
  not_received: 'Not Received',
};

export default function EmpApprovalDashboard() {
  const { state, dispatch, addAuditLog, addNotification } = useApp();
  const { user } = useAuth();
  const [detailItem, setDetailItem] = useState(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveModal, setApproveModal] = useState(false);
  const [filter, setFilter] = useState('pending_approval');

  // A manager only sees allocations routed to them; admins see all.
  const allAllocations = state.employeeAllocations.filter(a =>
    user.role === 'admin' || a.managerId === user.id
  );
  const pending = allAllocations.filter(a => a.status === 'pending_approval');
  const filtered = filter === 'all' ? allAllocations : allAllocations.filter(a => a.status === filter);

  const handleApprove = (alloc) => {
    const stock = state.stockItems.find(s => s.id === alloc.stockId);
    if (stock) {
      dispatch({ type: 'UPDATE_STOCK', payload: { id: stock.id, quantity: stock.quantity - alloc.quantity } });
    }
    dispatch({ type: 'UPDATE_EMPLOYEE_ALLOCATION', payload: { id: alloc.id, status: 'approved', approvedBy: user.id, approvedAt: new Date().toISOString() } });
    addAuditLog('employee_allocation', alloc.id, 'approved', user.name, `Approved allocation for ${alloc.employeeName}`);
    addNotification('Employee Allocation Approved', `${alloc.id} for ${alloc.employeeName} approved`, 'success');
    setApproveModal(false);
    setDetailItem(null);
  };

  const handleReject = (alloc) => {
    if (!rejectReason.trim()) return;
    dispatch({ type: 'UPDATE_EMPLOYEE_ALLOCATION', payload: { id: alloc.id, status: 'rejected', approvedBy: user.id, approvedAt: new Date().toISOString(), rejectionReason: rejectReason } });
    addAuditLog('employee_allocation', alloc.id, 'rejected', user.name, rejectReason);
    addNotification('Employee Allocation Rejected', `${alloc.id} rejected`, 'danger');
    setRejectModal(false);
    setRejectReason('');
    setDetailItem(null);
  };

  // Detail view
  if (detailItem) {
    const alloc = allAllocations.find(a => a.id === detailItem);
    if (!alloc) return null;
    const stock = state.stockItems.find(s => s.id === alloc.stockId);
    const postQty = stock ? stock.quantity - alloc.quantity : 0;

    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <button className="btn btn-ghost" onClick={() => setDetailItem(null)}><ArrowLeft size={16} /> Back</button>
            <h1 className="page-title mt-2">Review — {alloc.id}</h1>
          </div>
          {alloc.status === 'pending_approval' && (
            <div className="page-actions">
              <button className="btn btn-danger" onClick={() => setRejectModal(true)}><XCircle size={16} /> Reject</button>
              <button className="btn btn-success" onClick={() => setApproveModal(true)}><CheckCircle size={16} /> Approve</button>
            </div>
          )}
        </div>

        <div className="grid-2">
          <div className="card">
            <h3 className="card-title mb-4">Allocation Details</h3>
            <div className="form-row"><div className="form-group"><label className="form-label">Allocation ID</label><div className="text-sm font-semibold">{alloc.id}</div></div><div className="form-group"><label className="form-label">Status</label><span className={`badge badge-${alloc.status}`}>{statusLabels[alloc.status]}</span></div></div>
            <div className="form-group"><label className="form-label">Item</label><div className="text-sm">{alloc.stockName}</div></div>
            <div className="form-row"><div className="form-group"><label className="form-label">Quantity</label><div className="text-sm font-semibold">{alloc.quantity}</div></div><div className="form-group"><label className="form-label">Collection Location</label><div className="text-sm">{alloc.collectionLocation}</div></div></div>
            {alloc.purpose && <div className="form-group"><label className="form-label">Purpose</label><div className="text-sm">{alloc.purpose}</div></div>}
            <div className="form-group"><label className="form-label">Created</label><div className="text-sm">{new Date(alloc.createdAt).toLocaleString()}</div></div>
            {alloc.rejectionReason && <div className="form-group"><label className="form-label">Rejection Reason</label><div className="text-sm text-danger">{alloc.rejectionReason}</div></div>}
          </div>

          <div>
            <div className="card mb-4">
              <h3 className="card-title mb-4">Employee Information</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="flex justify-between"><span className="text-sm text-muted">Name</span><span className="font-medium">{alloc.employeeName}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted">Employee ID</span><span className="font-medium">{alloc.employeeId}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted">Email</span><span className="font-medium">{alloc.employeeEmail}</span></div>
              </div>
            </div>

            {stock && alloc.status === 'pending_approval' && (
              <div className="card">
                <h3 className="card-title mb-4">Stock Impact Preview</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="flex justify-between"><span className="text-sm text-muted">Current Stock</span><span className="font-semibold">{stock.quantity} {stock.unit}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-muted">Allocation</span><span className="font-semibold text-danger">−{alloc.quantity}</span></div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
                  <div className="flex justify-between"><span className="text-sm font-medium">Post-Allocation</span><span className={`font-semibold ${postQty <= stock.threshold ? 'text-danger' : 'text-success'}`}>{postQty} {stock.unit}</span></div>
                  {postQty <= stock.threshold && <div className="badge badge-warning" style={{ alignSelf: 'flex-start' }}>Below threshold ({stock.threshold})</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {approveModal && (
          <div className="modal-overlay" onClick={() => setApproveModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h2 className="modal-title">Confirm Approval</h2></div>
              <div className="modal-body"><p>Approve allocation <strong>{alloc.id}</strong> for <strong>{alloc.employeeName}</strong>? Stock will be deducted immediately.</p></div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setApproveModal(false)}>Cancel</button>
                <button className="btn btn-success" onClick={() => handleApprove(alloc)}>Approve</button>
              </div>
            </div>
          </div>
        )}

        {rejectModal && (
          <div className="modal-overlay" onClick={() => setRejectModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h2 className="modal-title">Reject Allocation</h2></div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Rejection Reason *</label>
                  <textarea className="form-textarea" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Provide reason for rejection..." />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setRejectModal(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleReject(alloc)} disabled={!rejectReason.trim()}>Reject</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Employee Distribution Approval</h1><p className="page-subtitle">Review and approve employee inventory allocations</p></div>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><div className="stat-icon blue"><ClipboardCheck size={24} /></div><div className="stat-content"><h3>{pending.length}</h3><p>Pending Approval</p></div></div>
        <div className="stat-card"><div className="stat-icon green"><CheckCircle size={24} /></div><div className="stat-content"><h3>{allAllocations.filter(a => a.status === 'approved').length}</h3><p>Approved</p></div></div>
        <div className="stat-card"><div className="stat-icon red"><XCircle size={24} /></div><div className="stat-content"><h3>{allAllocations.filter(a => a.status === 'rejected').length}</h3><p>Rejected</p></div></div>
      </div>

      <div className="filter-bar">
        <select className="form-select" style={{ width: 200 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><div className="empty-state"><ClipboardCheck size={48} /><h3>No allocations found</h3><p>{filter === 'pending_approval' ? 'No pending employee allocations to review.' : 'No allocations with this status.'}</p></div></div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Employee</th><th>Emp ID</th><th>Item</th><th>Qty</th><th>Purpose</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td className="font-medium">{a.id}</td>
                  <td>{a.employeeName}</td>
                  <td>{a.employeeId}</td>
                  <td>{a.stockName}</td>
                  <td>{a.quantity}</td>
                  <td className="text-sm truncate" style={{ maxWidth: 200 }}>{a.purpose || '-'}</td>
                  <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td><span className={`badge badge-${a.status}`}>{statusLabels[a.status]}</span></td>
                  <td><button className="btn btn-primary btn-sm" onClick={() => setDetailItem(a.id)}><Eye size={14} /> Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
