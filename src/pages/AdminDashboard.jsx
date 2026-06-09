import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { Users, Workflow, Settings, Activity, Shield, ArrowRight } from 'lucide-react';

export default function AdminDashboard() {
  const { state } = useApp();
  const navigate = useNavigate();
  const activeUsers = state.users.filter(u => u.status === 'active').length;
  const pendingApprovals = state.distributions.filter(d => d.status === 'submitted').length;

  return (
    <div className="fade-in">
      <div className="page-header"><div><h1 className="page-title">Admin Dashboard</h1><p className="page-subtitle">System administration overview</p></div></div>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-icon blue"><Users size={24} /></div><div className="stat-content"><h3>{activeUsers}</h3><p>Active Users</p></div></div>
        <div className="stat-card"><div className="stat-icon yellow"><Workflow size={24} /></div><div className="stat-content"><h3>{pendingApprovals}</h3><p>Pending Workflows</p></div></div>
        <div className="stat-card"><div className="stat-icon green"><Shield size={24} /></div><div className="stat-content"><h3>Healthy</h3><p>System Status</p></div></div>
      </div>
      <div className="grid-3">
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/users')}>
          <div className="flex flex-col gap-3">
            <Users size={32} style={{ color: 'var(--primary)' }} />
            <h3 className="card-title">User Management</h3>
            <p className="text-sm text-muted">Create, edit and manage user accounts and roles</p>
            <span className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', padding: 0 }}>Manage <ArrowRight size={14} /></span>
          </div>
        </div>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/workflow')}>
          <div className="flex flex-col gap-3">
            <Workflow size={32} style={{ color: 'var(--primary)' }} />
            <h3 className="card-title">Workflow Config</h3>
            <p className="text-sm text-muted">Configure approval workflows, SLA and escalations</p>
            <span className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', padding: 0 }}>Configure <ArrowRight size={14} /></span>
          </div>
        </div>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/settings')}>
          <div className="flex flex-col gap-3">
            <Settings size={32} style={{ color: 'var(--primary)' }} />
            <h3 className="card-title">System Settings</h3>
            <p className="text-sm text-muted">Threshold rules, validation rules, feature toggles</p>
            <span className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', padding: 0 }}>Settings <ArrowRight size={14} /></span>
          </div>
        </div>
      </div>
      <div className="card mt-6">
        <div className="card-header"><span className="card-title">Recent System Activity</span></div>
        <div className="timeline">
          {state.auditLogs.slice(-4).reverse().map(log => (
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
  );
}
