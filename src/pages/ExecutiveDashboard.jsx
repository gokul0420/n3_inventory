import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Package, AlertTriangle, FileText, XCircle, Upload, Truck, Brain, ArrowRight, TrendingDown, Users, ShoppingCart } from 'lucide-react';

export default function ExecutiveDashboard() {
  const { state } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  const activeStock = state.stockItems.filter(s => s.status === 'active');
  const lowStock = activeStock.filter(s => s.quantity <= s.threshold);
  const drafts = state.distributions.filter(d => d.status === 'draft');
  const rejected = state.distributions.filter(d => d.status === 'rejected');
  const empAllocations = state.employeeAllocations || [];
  const empPending = empAllocations.filter(a => a.status === 'pending_approval');
  const pendingReorders = state.reorderRequests.filter(r => r.requestedBy === user.id && r.status === 'pending');

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Executive Dashboard</h1><p className="page-subtitle">Overview of inventory operations</p></div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/stock/upload')}><Upload size={16} /> Upload Stock</button>
          <button className="btn btn-secondary" onClick={() => navigate('/emp-distribution')}><Users size={16} /> Distribute to Employee</button>
          <button className="btn btn-primary" onClick={() => navigate('/distributions/create')}><Truck size={16} /> New Distribution</button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><div className="stat-icon blue"><Package size={24} /></div><div className="stat-content"><h3>{activeStock.length}</h3><p>Total Stock Items</p></div></div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/low-stock')}><div className="stat-icon yellow"><AlertTriangle size={24} /></div><div className="stat-content"><h3>{lowStock.length}</h3><p>Low Stock Alerts</p></div></div>
        <div className="stat-card"><div className="stat-icon blue"><FileText size={24} /></div><div className="stat-content"><h3>{drafts.length}</h3><p>Draft Distributions</p></div></div>
        <div className="stat-card"><div className="stat-icon red"><XCircle size={24} /></div><div className="stat-content"><h3>{rejected.length}</h3><p>Rejected Transactions</p></div></div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/emp-distribution')}><div className="stat-icon blue"><Users size={24} /></div><div className="stat-content"><h3>{empPending.length}</h3><p>Emp. Allocations Pending</p></div></div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/reorder-requests')}><div className="stat-icon blue"><ShoppingCart size={24} /></div><div className="stat-content"><h3>{pendingReorders.length}</h3><p>Reorder Requests Pending</p></div></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">Low Stock Alerts</span><button className="btn btn-ghost btn-sm" onClick={() => navigate('/low-stock')}>View All <ArrowRight size={14} /></button></div>
          {lowStock.length === 0 ? <p className="text-sm text-muted">All stock levels are healthy!</p> :
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table">
                <thead><tr><th>Item</th><th>Current</th><th>Threshold</th><th>Status</th></tr></thead>
                <tbody>
                  {lowStock.slice(0, 5).map(s => (
                    <tr key={s.id}>
                      <td className="font-medium">{s.name}</td>
                      <td>{s.quantity} {s.unit}</td>
                      <td>{s.threshold}</td>
                      <td><span className={`badge ${s.quantity <= s.threshold * 0.3 ? 'badge-rejected' : 'badge-warning'}`}>{s.quantity <= s.threshold * 0.3 ? 'Critical' : 'Low'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Recent Activity</span></div>
          <div className="timeline">
            {state.auditLogs.slice(-5).reverse().map(log => (
              <div key={log.id} className="timeline-item">
                <div className={`timeline-dot ${log.action === 'approved' ? 'success' : log.action === 'rejected' ? 'danger' : 'completed'}`} />
                <div className="timeline-content">
                  <h4>{log.action.charAt(0).toUpperCase() + log.action.slice(1)} — {log.entityId}</h4>
                  <p>{log.remarks}</p>
                  <span className="timeline-meta">{log.user} • {new Date(log.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mt-6" style={{ cursor: 'pointer' }} onClick={() => navigate('/low-stock')}>
        <div className="flex items-center gap-3">
          <div className="stat-icon blue"><Brain size={24} /></div>
          <div>
            <h3 className="card-title">AI Stock Intelligence</h3>
            <p className="text-sm text-muted">View AI-powered dynamic thresholds and reorder recommendations for {lowStock.length} items needing attention</p>
          </div>
          <ArrowRight size={20} style={{ marginLeft: 'auto', color: 'var(--gray-400)' }} />
        </div>
      </div>
    </div>
  );
}
