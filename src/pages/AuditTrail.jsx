import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { History, Lock, Search } from 'lucide-react';

export default function AuditTrail() {
  const { state } = useApp();
  const [entityFilter, setEntityFilter] = useState('');
  const [search, setSearch] = useState('');

  const logs = state.auditLogs.filter(l => {
    if (entityFilter && l.entityType !== entityFilter) return false;
    if (search && !l.entityId.toLowerCase().includes(search.toLowerCase()) && !l.user.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="fade-in">
      <div className="page-header"><div><h1 className="page-title">Audit Trail</h1><p className="page-subtitle">Immutable record of all system actions</p></div></div>
      <div className="filter-bar">
        <div className="search-input"><Search size={18}/><input className="form-input" placeholder="Search by ID or user..." value={search} onChange={e => setSearch(e.target.value)}/></div>
        <select className="form-select" style={{width:180}} value={entityFilter} onChange={e => setEntityFilter(e.target.value)}><option value="">All Types</option><option value="stock">Stock</option><option value="distribution">Distribution</option><option value="ai_suggestion">AI Suggestion</option></select>
      </div>
      <div className="card">
        <div className="timeline">
          {logs.map(log => (
            <div key={log.id} className="timeline-item">
              <div className={`timeline-dot ${log.action==='approved'?'success':log.action==='rejected'?'danger':'completed'}`}/>
              <div className="timeline-content">
                <div className="flex items-center gap-2"><h4>{log.action.charAt(0).toUpperCase()+log.action.slice(1)}</h4><span className="badge badge-info" style={{fontSize:'.65rem'}}>{log.entityType}</span><Lock size={12} style={{color:'var(--gray-400)'}}/></div>
                <p><strong>{log.entityId}</strong> — {log.remarks}</p>
                <span className="timeline-meta">{log.user} • {new Date(log.date).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
        {logs.length===0 && <div className="empty-state"><History size={48}/><h3>No audit records</h3></div>}
      </div>
    </div>
  );
}
