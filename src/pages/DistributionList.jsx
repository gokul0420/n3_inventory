import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { Search, Eye, Edit, Trash2, Truck, Plus } from 'lucide-react';

export default function DistributionList() {
  const { state, dispatch, addAuditLog, addNotification } = useApp();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [deleteItem, setDeleteItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  const items = state.distributions.filter(d => {
    if (statusFilter && d.status !== statusFilter) return false;
    if (search && !d.id.toLowerCase().includes(search.toLowerCase()) && !d.stockName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDelete = () => {
    dispatch({ type: 'DELETE_DISTRIBUTION', payload: deleteItem.id });
    addNotification('Distribution Deleted', `${deleteItem.id} removed`, 'info');
    setDeleteItem(null);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Distributions</h1><p className="page-subtitle">Manage stock distributions</p></div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/distributions/upload')}>Bulk Upload</button>
          <button className="btn btn-primary" onClick={() => navigate('/distributions/create')}><Plus size={16} /> New Distribution</button>
        </div>
      </div>
      <div className="filter-bar">
        <div className="search-input"><Search size={18} /><input className="form-input" placeholder="Search by ID or stock..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select className="form-select" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
        </select>
      </div>
      {items.length === 0 ? (
        <div className="card"><div className="empty-state"><Truck size={48} /><h3>No distributions found</h3><p>Create a new distribution to get started.</p></div></div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Stock Item</th><th>Qty</th><th>Recipient</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map(d => (
                <tr key={d.id}>
                  <td className="font-medium">{d.id}</td>
                  <td>{d.stockName}</td>
                  <td>{d.quantity}</td>
                  <td>{d.recipient}</td>
                  <td>{d.date}</td>
                  <td><span className={`badge badge-${d.status}`}>{d.status.charAt(0).toUpperCase() + d.status.slice(1)}</span></td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewItem(d)}><Eye size={14} /></button>
                      {(d.status === 'draft' || d.status === 'rejected') && <button className="btn btn-ghost btn-sm" onClick={() => navigate('/distributions/create', { state: { edit: d } })}><Edit size={14} /></button>}
                      {d.status === 'draft' && <button className="btn btn-ghost btn-sm" onClick={() => setDeleteItem(d)}><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Distribution — {viewItem.id}</h2><button className="modal-close" onClick={() => setViewItem(null)}>✕</button></div>
            <div className="modal-body">
              <div className="form-row"><div className="form-group"><label className="form-label">Stock Item</label><div className="text-sm">{viewItem.stockName}</div></div><div className="form-group"><label className="form-label">Quantity</label><div className="text-sm font-semibold">{viewItem.quantity}</div></div></div>
              <div className="form-row"><div className="form-group"><label className="form-label">Recipient</label><div className="text-sm">{viewItem.recipient}</div></div><div className="form-group"><label className="form-label">Date</label><div className="text-sm">{viewItem.date}</div></div></div>
              <div className="form-group"><label className="form-label">Status</label><span className={`badge badge-${viewItem.status}`}>{viewItem.status}</span></div>
              {viewItem.remarks && <div className="form-group"><label className="form-label">Remarks</label><div className="text-sm">{viewItem.remarks}</div></div>}
              {viewItem.rejectionReason && <div className="form-group"><label className="form-label">Rejection Reason</label><div className="text-sm text-danger">{viewItem.rejectionReason}</div></div>}
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setViewItem(null)}>Close</button></div>
          </div>
        </div>
      )}

      {deleteItem && (
        <div className="modal-overlay" onClick={() => setDeleteItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Confirm Delete</h2></div>
            <div className="modal-body"><p>Delete distribution <strong>{deleteItem.id}</strong>? This cannot be undone.</p></div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setDeleteItem(null)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
