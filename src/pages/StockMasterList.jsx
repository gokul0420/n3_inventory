import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Search, Filter, Eye, Edit, Trash2, Package } from 'lucide-react';
import { categories, locations } from '../data/mockData.js';

export default function StockMasterList() {
  const { state, dispatch, addAuditLog, addNotification } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [locFilter, setLocFilter] = useState('');
  const [viewItem, setViewItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  const items = state.stockItems.filter(s => {
    if (s.status === 'deleted') return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.code.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter && s.category !== catFilter) return false;
    if (locFilter && s.location !== locFilter) return false;
    return true;
  });

  const handleDelete = () => {
    const hasTx = state.distributions.some(d => d.stockId === deleteItem.id && d.status !== 'draft');
    if (hasTx) { addNotification('Cannot Delete', 'Stock has active transactions', 'danger'); setDeleteItem(null); return; }
    dispatch({ type: 'DELETE_STOCK', payload: deleteItem.id });
    addAuditLog('stock', deleteItem.id, 'deleted', user.name, 'Soft deleted');
    addNotification('Stock Deleted', `${deleteItem.name} removed`, 'info');
    setDeleteItem(null);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Stock Master</h1><p className="page-subtitle">Manage your inventory stock items</p></div>
        <div className="page-actions"><button className="btn btn-primary" onClick={() => navigate('/stock/upload')}>Upload Stock</button></div>
      </div>
      <div className="filter-bar">
        <div className="search-input"><Search size={18} /><input className="form-input" placeholder="Search by name or code..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select className="form-select" style={{ width: 180 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}><option value="">All Categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select>
        <select className="form-select" style={{ width: 180 }} value={locFilter} onChange={e => setLocFilter(e.target.value)}><option value="">All Locations</option>{locations.map(l => <option key={l}>{l}</option>)}</select>
      </div>
      {items.length === 0 ? (
        <div className="card"><div className="empty-state"><Package size={48} /><h3>No stock items found</h3><p>Try adjusting your filters or upload new stock.</p></div></div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Location</th><th>Available</th><th>Threshold</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map(s => (
                <tr key={s.id}>
                  <td className="font-medium">{s.code}</td>
                  <td>{s.name}</td>
                  <td>{s.category}</td>
                  <td>{s.location}</td>
                  <td><span className={s.quantity <= s.threshold ? 'text-danger font-semibold' : ''}>{s.quantity} {s.unit}</span></td>
                  <td>{s.threshold}</td>
                  <td><span className={`badge ${s.quantity <= s.threshold ? 'badge-warning' : 'badge-active'}`}>{s.quantity <= s.threshold ? 'Low' : 'Active'}</span></td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewItem(s)}><Eye size={14} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDeleteItem(s)}><Trash2 size={14} /></button>
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
            <div className="modal-header"><h2 className="modal-title">Stock Details — {viewItem.code}</h2><button className="modal-close" onClick={() => setViewItem(null)}>✕</button></div>
            <div className="modal-body">
              <div className="form-row"><div className="form-group"><label className="form-label">Stock Code</label><div className="text-sm">{viewItem.code}</div></div><div className="form-group"><label className="form-label">Category</label><div className="text-sm">{viewItem.category}</div></div></div>
              <div className="form-group"><label className="form-label">Name</label><div className="text-sm">{viewItem.name}</div></div>
              <div className="form-row"><div className="form-group"><label className="form-label">Available Qty</label><div className="text-sm font-semibold">{viewItem.quantity} {viewItem.unit}</div></div><div className="form-group"><label className="form-label">Threshold</label><div className="text-sm">{viewItem.threshold}</div></div></div>
              <div className="form-row"><div className="form-group"><label className="form-label">Location</label><div className="text-sm">{viewItem.location}</div></div><div className="form-group"><label className="form-label">Last Updated</label><div className="text-sm">{viewItem.updatedAt}</div></div></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setViewItem(null)}>Close</button></div>
          </div>
        </div>
      )}

      {deleteItem && (
        <div className="modal-overlay" onClick={() => setDeleteItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Confirm Delete</h2></div>
            <div className="modal-body"><p>Are you sure you want to delete <strong>{deleteItem.name}</strong>? This action can be undone by an admin.</p></div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setDeleteItem(null)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
