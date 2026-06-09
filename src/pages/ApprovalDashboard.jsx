import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { ClipboardCheck, Clock, Shield, AlertTriangle } from 'lucide-react';

export default function ApprovalDashboard() {
  const { state } = useApp();
  const navigate = useNavigate();
  const pending = state.distributions.filter(d => d.status === 'submitted');
  const slaBreaches = pending.filter(d => d.submittedAt && (Date.now() - new Date(d.submittedAt).getTime()) > 48*3600000);
  const highRisk = pending.filter(d => { const s = state.stockItems.find(s => s.id === d.stockId); return s && d.quantity > s.quantity * 0.5; });

  return (
    <div className="fade-in">
      <div className="page-header"><div><h1 className="page-title">Approval Queue</h1><p className="page-subtitle">Review and approve pending distributions</p></div></div>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-icon blue"><ClipboardCheck size={24}/></div><div className="stat-content"><h3>{pending.length}</h3><p>Pending</p></div></div>
        <div className="stat-card"><div className="stat-icon red"><Clock size={24}/></div><div className="stat-content"><h3>{slaBreaches.length}</h3><p>SLA Breaches</p></div></div>
        <div className="stat-card"><div className="stat-icon yellow"><Shield size={24}/></div><div className="stat-content"><h3>{highRisk.length}</h3><p>High-Risk</p></div></div>
      </div>
      {pending.length === 0 ? <div className="card"><div className="empty-state"><ClipboardCheck size={48}/><h3>All caught up!</h3><p>No pending approvals.</p></div></div> : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Stock Item</th><th>Qty</th><th>Recipient</th><th>Submitted</th><th>Risk</th><th>Action</th></tr></thead>
            <tbody>{pending.map(d => {
              const stock = state.stockItems.find(s => s.id === d.stockId);
              const isHighRisk = stock && d.quantity > stock.quantity * 0.5;
              const isSLA = d.submittedAt && (Date.now() - new Date(d.submittedAt).getTime()) > 48*3600000;
              return (
                <tr key={d.id}>
                  <td className="font-medium">{d.id}</td><td>{d.stockName}</td><td>{d.quantity}</td><td>{d.recipient}</td>
                  <td>{d.submittedAt ? new Date(d.submittedAt).toLocaleDateString() : '-'}</td>
                  <td>{isHighRisk ? <span className="badge badge-rejected">High</span> : isSLA ? <span className="badge badge-warning">SLA</span> : <span className="badge badge-active">Normal</span>}</td>
                  <td><button className="btn btn-primary btn-sm" onClick={() => navigate(`/approvals/${d.id}`)}>Review</button></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
