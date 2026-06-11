import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ClipboardCheck, AlertTriangle, Clock, Shield, ArrowRight, Users, ShoppingCart } from 'lucide-react';

export default function ManagerDashboard() {
  const { state } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  // A manager only sees requests routed to them; admins see all.
  const pending = state.distributions.filter(d =>
    d.status === 'submitted' && (user.role === 'admin' || d.managerId === user.id)
  );
  const slaBreaches = pending.filter(d => {
    const submitted = new Date(d.submittedAt);
    return (Date.now() - submitted.getTime()) > 48 * 60 * 60 * 1000;
  });
  const highRisk = pending.filter(d => {
    const stock = state.stockItems.find(s => s.id === d.stockId);
    return stock && d.quantity > stock.quantity * 0.5;
  });
  const empPending = (state.employeeAllocations || []).filter(a => a.status === 'pending_approval');
  const pendingReorders = state.reorderRequests.filter(r => r.status === 'pending');

  return (
    <div className="fade-in">
      <div className="page-header"><div><h1 className="page-title">Approval Dashboard</h1><p className="page-subtitle">Review and approve pending transactions</p></div></div>
      <div className="stat-grid">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/approvals')}><div className="stat-icon blue"><ClipboardCheck size={24} /></div><div className="stat-content"><h3>{pending.length}</h3><p>Pending Approvals</p></div></div>
        <div className="stat-card"><div className="stat-icon red"><Clock size={24} /></div><div className="stat-content"><h3>{slaBreaches.length}</h3><p>SLA Breaches</p></div></div>
        <div className="stat-card"><div className="stat-icon yellow"><Shield size={24} /></div><div className="stat-content"><h3>{highRisk.length}</h3><p>High-Risk Transactions</p></div></div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/emp-approvals')}><div className="stat-icon blue"><Users size={24} /></div><div className="stat-content"><h3>{empPending.length}</h3><p>Emp. Allocation Approvals</p></div></div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/reorder-approvals')}><div className="stat-icon yellow"><ShoppingCart size={24} /></div><div className="stat-content"><h3>{pendingReorders.length}</h3><p>Reorder Approvals</p></div></div>
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">Pending Approvals</span><button className="btn btn-primary btn-sm" onClick={() => navigate('/approvals')}>View All <ArrowRight size={14} /></button></div>
        {pending.length === 0 ? <div className="empty-state"><ClipboardCheck size={48} /><h3>All caught up!</h3><p>No pending approvals at this time.</p></div> : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead><tr><th>ID</th><th>Stock Item</th><th>Qty</th><th>Recipient</th><th>Submitted</th><th>Action</th></tr></thead>
              <tbody>
                {pending.map(d => (
                  <tr key={d.id}>
                    <td className="font-medium">{d.id}</td>
                    <td>{d.stockName}</td>
                    <td>{d.quantity}</td>
                    <td>{d.recipient}</td>
                    <td>{d.submittedAt ? new Date(d.submittedAt).toLocaleDateString() : '-'}</td>
                    <td><button className="btn btn-primary btn-sm" onClick={() => navigate(`/approvals/${d.id}`)}>Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
