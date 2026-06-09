import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Package, CheckCircle, Clock, Inbox, ArrowRight, Box } from 'lucide-react';

const statusLabels = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  accepted: 'Accepted',
  employee_rejected: 'Emp. Rejected',
  received: 'Received',
  not_received: 'Not Received',
};

export default function EmployeeDashboard() {
  const { state } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  const myAllocations = state.employeeAllocations.filter(a => a.employeeId === user?.employeeId);
  const pending = myAllocations.filter(a => a.status === 'pending_approval');
  const actionRequired = myAllocations.filter(a => a.status === 'approved' || a.status === 'accepted');
  const received = myAllocations.filter(a => a.status === 'received');
  const recent = [...myAllocations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome, {user?.name}</h1>
          <p className="page-subtitle">Employee ID: {user?.employeeId} • {user?.email}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/employee/allocations')}>
          <Package size={16} /> View All Allocations
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><Inbox size={24} /></div>
          <div className="stat-content"><h3>{myAllocations.length}</h3><p>Total Allocations</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><Clock size={24} /></div>
          <div className="stat-content"><h3>{pending.length}</h3><p>Pending Approval</p></div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/employee/allocations')}>
          <div className="stat-icon blue"><Package size={24} /></div>
          <div className="stat-content"><h3>{actionRequired.length}</h3><p>Action Required</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><CheckCircle size={24} /></div>
          <div className="stat-content"><h3>{received.length}</h3><p>Received</p></div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Allocations</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/employee/allocations')}>View All <ArrowRight size={14} /></button>
          </div>
          {recent.length === 0 ? (
            <div className="empty-state"><Box size={48} /><h3>No allocations yet</h3><p>You'll see items allocated to you here.</p></div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table">
                <thead><tr><th>Item</th><th>Qty</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {recent.map(a => (
                    <tr key={a.id}>
                      <td className="font-medium">{a.stockName}</td>
                      <td>{a.quantity}</td>
                      <td><span className={`badge badge-${a.status}`}>{statusLabels[a.status]}</span></td>
                      <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Allocation Workflow</span></div>
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-dot completed" />
              <div className="timeline-content">
                <h4>Executive Creates Allocation</h4>
                <p>An inventory item is assigned to you by the executive team.</p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot completed" />
              <div className="timeline-content">
                <h4>Manager Approval</h4>
                <p>Your manager reviews and approves the allocation request.</p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot" style={{ borderColor: 'var(--primary)' }} />
              <div className="timeline-content">
                <h4>Accept / Reject</h4>
                <p>Review the allocation and accept or reject it.</p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot" />
              <div className="timeline-content">
                <h4>Collect & Confirm</h4>
                <p>Collect the item from the designated location and confirm receipt.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
