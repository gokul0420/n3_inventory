import React, { useState } from 'react';
import { Workflow, Save, ArrowRight } from 'lucide-react';

export default function WorkflowConfig() {
  const [type, setType] = useState('single');
  const [sla, setSla] = useState(48);
  const [escalation, setEscalation] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="fade-in">
      <div className="page-header"><div><h1 className="page-title">Workflow Configuration</h1><p className="page-subtitle">Configure approval workflows and escalation rules</p></div>
        <button className="btn btn-primary" onClick={handleSave}><Save size={16}/> {saved ? '✓ Saved!' : 'Save Changes'}</button>
      </div>
      <div className="grid-2">
        <div className="card">
          <h3 className="card-title mb-4">Approval Type</h3>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3" style={{padding:16,border:'1px solid var(--border)',borderRadius:'var(--radius)',cursor:'pointer',background:type==='single'?'var(--primary-light)':''}}>
              <input type="radio" name="type" checked={type==='single'} onChange={() => setType('single')}/> <div><div className="font-medium">Single-Level Approval</div><div className="text-sm text-muted">One manager approves all transactions</div></div>
            </label>
            <label className="flex items-center gap-3" style={{padding:16,border:'1px solid var(--border)',borderRadius:'var(--radius)',cursor:'pointer',background:type==='multi'?'var(--primary-light)':''}}>
              <input type="radio" name="type" checked={type==='multi'} onChange={() => setType('multi')}/> <div><div className="font-medium">Multi-Level Approval</div><div className="text-sm text-muted">Requires multiple approvers for high-value items</div></div>
            </label>
          </div>
          <div className="form-group mt-4"><label className="form-label">SLA (hours)</label><input className="form-input" type="number" value={sla} onChange={e => setSla(e.target.value)}/><div className="form-hint">Maximum hours before escalation triggers</div></div>
          <div className="form-group">
            <label className="flex items-center gap-3" style={{cursor:'pointer'}}><input type="checkbox" checked={escalation} onChange={e => setEscalation(e.target.checked)}/> <span className="form-label" style={{marginBottom:0}}>Enable SLA Escalation</span></label>
          </div>
        </div>
        <div className="card">
          <h3 className="card-title mb-4">Role Mapping</h3>
          <div style={{padding:24,background:'var(--gray-50)',borderRadius:'var(--radius-lg)',textAlign:'center'}}>
            <div className="flex items-center justify-between" style={{maxWidth:300,margin:'0 auto'}}>
              <div style={{padding:'12px 20px',background:'var(--surface)',borderRadius:'var(--radius)',border:'1px solid var(--border)'}}><div className="text-xs text-muted">Maker</div><div className="font-semibold">Executive</div></div>
              <ArrowRight size={24} style={{color:'var(--gray-400)'}}/>
              <div style={{padding:'12px 20px',background:'var(--primary-light)',borderRadius:'var(--radius)',border:'1px solid var(--primary)'}}><div className="text-xs" style={{color:'var(--primary)'}}>Checker</div><div className="font-semibold">Manager</div></div>
            </div>
            {type === 'multi' && <div className="flex items-center justify-between mt-4" style={{maxWidth:300,margin:'16px auto 0'}}>
              <div style={{padding:'12px 20px',background:'var(--primary-light)',borderRadius:'var(--radius)',border:'1px solid var(--primary)'}}><div className="text-xs" style={{color:'var(--primary)'}}>Level 2</div><div className="font-semibold">Manager</div></div>
              <ArrowRight size={24} style={{color:'var(--gray-400)'}}/>
              <div style={{padding:'12px 20px',background:'var(--success-light)',borderRadius:'var(--radius)',border:'1px solid var(--success)'}}><div className="text-xs" style={{color:'var(--success)'}}>Final</div><div className="font-semibold">Admin</div></div>
            </div>}
          </div>
        </div>
      </div>
    </div>
  );
}
