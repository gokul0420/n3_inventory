import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Package, CheckCircle, XCircle, MapPin, Box, Clock, Eye, ThumbsUp, ThumbsDown } from 'lucide-react';

const statusLabels = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  accepted: 'Accepted',
  employee_rejected: 'Emp. Rejected',
  received: 'Received',
  not_received: 'Not Received',
};

const statusDescriptions = {
  pending_approval: 'Waiting for manager approval. You will be notified once approved.',
  approved: 'This allocation has been approved. Please accept or reject it.',
  rejected: 'This allocation was rejected by the manager.',
  accepted: 'You have accepted this allocation. Please collect the item and confirm receipt.',
  employee_rejected: 'You have rejected this allocation.',
  received: 'Item received successfully. This allocation is complete.',
  not_received: 'You reported this item as not received.',
};

export default function EmployeeAllocations() {
  const { state, dispatch, addAuditLog, addNotification } = useApp();
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const [detailItem, setDetailItem] = useState(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmModal, setConfirmModal] = useState(null); // 'accept' | 'received' | 'not_received'

  const myAllocations = state.employeeAllocations.filter(a => a.employeeId === user?.employeeId);
  const filtered = filter === 'all' ? myAllocations : myAllocations.filter(a => a.status === filter);

  const handleAccept = (alloc) => {
    dispatch({ type: 'UPDATE_EMPLOYEE_ALLOCATION', payload: { id: alloc.id, status: 'accepted', acceptedAt: new Date().toISOString() } });
    addAuditLog('employee_allocation', alloc.id, 'accepted', user.name, 'Employee accepted allocation');
    addNotification('Allocation Accepted', `You accepted ${alloc.stockName}`, 'success');
    setConfirmModal(null);
  };

  const handleReject = (alloc) => {
    dispatch({ type: 'UPDATE_EMPLOYEE_ALLOCATION', payload: { id: alloc.id, status: 'employee_rejected', employeeRejectionReason: rejectReason || 'No reason provided' } });
    addAuditLog('employee_allocation', alloc.id, 'employee_rejected', user.name, rejectReason || 'Employee rejected');
    addNotification('Allocation Rejected', `You rejected ${alloc.stockName}`, 'info');
    setRejectModal(false);
    setRejectReason('');
  };

  const handleReceived = (alloc) => {
    dispatch({ type: 'UPDATE_EMPLOYEE_ALLOCATION', payload: { id: alloc.id, status: 'received', receivedAt: new Date().toISOString() } });
    addAuditLog('employee_allocation', alloc.id, 'received', user.name, 'Employee confirmed receipt');
    addNotification('Item Received', `${alloc.stockName} marked as received`, 'success');
    setConfirmModal(null);
  };

  const handleNotReceived = (alloc) => {
    dispatch({ type: 'UPDATE_EMPLOYEE_ALLOCATION', payload: { id: alloc.id, status: 'not_received' } });
    addAuditLog('employee_allocation', alloc.id, 'not_received', user.name, 'Employee reported item not received');
    addNotification('Item Not Received', `${alloc.stockName} marked as not received`, 'warning');
    setConfirmModal(null);
  };

  // Detail view
  if (detailItem) {
    const alloc = myAllocations.find(a => a.id === detailItem);
    if (!alloc) { setDetailItem(null); return null; }

    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <button className="btn btn-ghost" onClick={() => setDetailItem(null)}>← Back to Allocations</button>
            <h1 className="page-title mt-2">{alloc.stockName}</h1>
            <p className="page-subtitle">Allocation {alloc.id}</p>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <h3 className="card-title mb-4">Allocation Details</h3>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Allocation ID</label><div className="text-sm font-semibold">{alloc.id}</div></div>
              <div className="form-group"><label className="form-label">Status</label><span className={`badge badge-${alloc.status}`}>{statusLabels[alloc.status]}</span></div>
            </div>
            <div className="form-group"><label className="form-label">Item Name</label><div className="text-sm font-medium">{alloc.stockName}</div></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Quantity</label><div className="text-sm font-semibold">{alloc.quantity}</div></div>
              <div className="form-group"><label className="form-label">Allocated Date</label><div className="text-sm">{new Date(alloc.createdAt).toLocaleDateString()}</div></div>
            </div>
            {alloc.expectedBy && <div className="form-group"><label className="form-label">Expected By</label><div className="text-sm font-medium">{new Date(alloc.expectedBy).toLocaleDateString()}</div></div>}
            {alloc.purpose && <div className="form-group"><label className="form-label">Purpose / Remarks</label><div className="text-sm">{alloc.purpose}</div></div>}
            {alloc.rejectionReason && <div className="form-group"><label className="form-label">Manager Rejection Reason</label><div className="text-sm text-danger">{alloc.rejectionReason}</div></div>}
            {alloc.employeeRejectionReason && <div className="form-group"><label className="form-label">Your Rejection Reason</label><div className="text-sm text-danger">{alloc.employeeRejectionReason}</div></div>}

            <div className="alloc-status-info mt-4">
              <div className="text-sm text-muted">{statusDescriptions[alloc.status]}</div>
            </div>
          </div>

          <div>
            {/* Collection Location — only shown after acceptance or if approved */}
            {(alloc.status === 'accepted' || alloc.status === 'received') && (
              <div className="card mb-4 collection-location-card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="stat-icon green"><MapPin size={24} /></div>
                  <div>
                    <h3 className="card-title">Collection Location</h3>
                    <p className="text-sm text-muted">Please collect your item from:</p>
                  </div>
                </div>
                <div className="collection-location-badge">
                  <MapPin size={18} />
                  <span>{alloc.collectionLocation}</span>
                </div>
                {alloc.expectedBy && <div className="text-sm text-muted mt-2"><Clock size={14} style={{ display:'inline', verticalAlign:'middle' }} /> Expected by {new Date(alloc.expectedBy).toLocaleDateString()}</div>}
              </div>
            )}

            {/* Action buttons based on status */}
            {alloc.status === 'approved' && (
              <div className="card">
                <h3 className="card-title mb-4">Your Response</h3>
                <p className="text-sm text-muted mb-4">This allocation has been approved by management. Would you like to accept or reject it?</p>
                <div className="flex gap-3">
                  <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setRejectModal(true)}><ThumbsDown size={16} /> Reject</button>
                  <button className="btn btn-success" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmModal('accept')}><ThumbsUp size={16} /> Accept</button>
                </div>
              </div>
            )}

            {alloc.status === 'accepted' && (
              <div className="card">
                <h3 className="card-title mb-4">Confirm Receipt</h3>
                <p className="text-sm text-muted mb-4">Have you collected the item from <strong>{alloc.collectionLocation}</strong>?</p>
                <div className="flex gap-3">
                  <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmModal('not_received')}><XCircle size={16} /> Not Received</button>
                  <button className="btn btn-success" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmModal('received')}><CheckCircle size={16} /> Received</button>
                </div>
              </div>
            )}

            {alloc.status === 'received' && (
              <div className="card" style={{ background: 'var(--success-light)', borderColor: '#a7f3d0' }}>
                <div className="flex items-center gap-3">
                  <CheckCircle size={24} style={{ color: 'var(--success)' }} />
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--success)' }}>Completed</div>
                    <div className="text-sm">Item received on {new Date(alloc.receivedAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}

            {alloc.status === 'pending_approval' && (
              <div className="card" style={{ background: 'var(--warning-light)', borderColor: '#fde68a' }}>
                <div className="flex items-center gap-3">
                  <Clock size={24} style={{ color: 'var(--warning)' }} />
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--warning)' }}>Awaiting Approval</div>
                    <div className="text-sm">This allocation is pending manager approval.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Accept confirmation */}
        {confirmModal === 'accept' && (
          <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h2 className="modal-title">Accept Allocation</h2></div>
              <div className="modal-body"><p>Accept <strong>{alloc.stockName}</strong> (Qty: {alloc.quantity})? The collection location will be revealed after acceptance.</p></div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setConfirmModal(null)}>Cancel</button>
                <button className="btn btn-success" onClick={() => handleAccept(alloc)}>Accept</button>
              </div>
            </div>
          </div>
        )}

        {/* Received confirmation */}
        {confirmModal === 'received' && (
          <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h2 className="modal-title">Confirm Receipt</h2></div>
              <div className="modal-body"><p>Confirm that you have received <strong>{alloc.stockName}</strong> (Qty: {alloc.quantity}) from <strong>{alloc.collectionLocation}</strong>?</p></div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setConfirmModal(null)}>Cancel</button>
                <button className="btn btn-success" onClick={() => handleReceived(alloc)}>Confirm Received</button>
              </div>
            </div>
          </div>
        )}

        {/* Not received confirmation */}
        {confirmModal === 'not_received' && (
          <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h2 className="modal-title">Report Not Received</h2></div>
              <div className="modal-body"><p>Report that you have <strong>not received</strong> <strong>{alloc.stockName}</strong>? This will be flagged for review.</p></div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setConfirmModal(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleNotReceived(alloc)}>Not Received</button>
              </div>
            </div>
          </div>
        )}

        {/* Reject modal */}
        {rejectModal && (
          <div className="modal-overlay" onClick={() => setRejectModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h2 className="modal-title">Reject Allocation</h2></div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Rejection Reason (Optional)</label>
                  <textarea className="form-textarea" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejecting this allocation..." />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setRejectModal(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleReject(alloc)}>Reject</button>
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
        <div><h1 className="page-title">My Allocations</h1><p className="page-subtitle">View and manage your inventory allocations</p></div>
      </div>

      <div className="filter-bar">
        <select className="form-select" style={{ width: 200 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Allocations</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved — Action Required</option>
          <option value="accepted">Accepted — Collect Item</option>
          <option value="received">Received / Completed</option>
          <option value="rejected">Rejected</option>
          <option value="employee_rejected">My Rejections</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><div className="empty-state"><Box size={48} /><h3>No allocations found</h3><p>No allocations match the current filter.</p></div></div>
      ) : (
        <div className="alloc-card-grid">
          {filtered.map(alloc => (
            <div key={alloc.id} className={`alloc-card ${alloc.status === 'approved' ? 'alloc-card-action' : ''}`} onClick={() => setDetailItem(alloc.id)}>
              <div className="alloc-card-header">
                <span className="text-xs text-muted">{alloc.id}</span>
                <span className={`badge badge-${alloc.status}`}>{statusLabels[alloc.status]}</span>
              </div>
              <h4 className="alloc-card-title">{alloc.stockName}</h4>
              <div className="alloc-card-meta">
                <span>Qty: <strong>{alloc.quantity}</strong></span>
                <span>{new Date(alloc.createdAt).toLocaleDateString()}</span>
              </div>
              {alloc.purpose && <p className="alloc-card-purpose">{alloc.purpose}</p>}
              <div className="alloc-card-footer">
                {alloc.status === 'approved' && <span className="alloc-card-cta"><ThumbsUp size={14} /> Action Required</span>}
                {alloc.status === 'accepted' && <span className="alloc-card-cta" style={{ color: 'var(--info)' }}><MapPin size={14} /> Collect Item</span>}
                {alloc.status === 'received' && <span style={{ color: 'var(--success)', fontSize: '.8rem' }}><CheckCircle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Completed</span>}
                <Eye size={16} style={{ color: 'var(--gray-400)', marginLeft: 'auto' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
