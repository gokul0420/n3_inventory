import React, { useState } from 'react';
import { Settings, Save, ToggleLeft, ToggleRight, Mail, Send, CheckCircle, XCircle, Info } from 'lucide-react';
import { systemSettings as defaults, categories } from '../data/mockData.js';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getEmailConfig, saveEmailConfig, sendTestEmail } from '../utils/emailService.js';

export default function SystemSettings() {
  const { state } = useApp();
  const { user } = useAuth();

  const [thresholds, setThresholds] = useState(defaults.thresholdRules);
  const [features, setFeatures] = useState(defaults.features);
  const [saved, setSaved] = useState(false);

  // Email config — read from localStorage on mount
  const [emailCfg, setEmailCfg] = useState(() => getEmailConfig());
  const [testStatus, setTestStatus] = useState(null); // null | 'sending' | 'ok' | 'err'
  const [testMsg, setTestMsg] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);

  const updateThreshold = (i, val) => { const t = [...thresholds]; t[i] = { ...t[i], threshold: Number(val) }; setThresholds(t); };
  const toggleFeature = (key) => setFeatures({ ...features, [key]: !features[key] });
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const handleEmailSave = () => {
    saveEmailConfig(emailCfg);
    setEmailSaved(true);
    setTimeout(() => setEmailSaved(false), 2000);
  };

  const handleTestEmail = async () => {
    if (executives.length === 0) {
      setTestStatus('err');
      setTestMsg('No active executives found to send test email.');
      setTimeout(() => setTestStatus(null), 6000);
      return;
    }
    setTestStatus('sending');
    setTestMsg('');
    const results = await Promise.all(
      executives.map(exec => sendTestEmail(exec.email, exec.name))
    );
    const failed = results.filter(r => !r.success);
    if (failed.length === 0) {
      setTestStatus('ok');
      setTestMsg(`Test email sent to ${executives.map(e => e.email).join(', ')}`);
    } else {
      setTestStatus('err');
      setTestMsg(failed[0].reason || 'Failed to send. Check your EmailJS credentials.');
    }
    setTimeout(() => setTestStatus(null), 6000);
  };

  const executives = state.users.filter(u =>
    u.role === 'executive' && u.email && u.status === 'active'
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h1 className="page-title">System Settings</h1><p className="page-subtitle">Configure system-wide rules and features</p></div>
        <button className="btn btn-primary" onClick={handleSave}><Save size={16} /> {saved ? '✓ Saved!' : 'Save Changes'}</button>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title mb-4">Stock Threshold Rules</h3>
          <p className="text-sm text-muted mb-4">Set minimum stock thresholds per category</p>
          {thresholds.map((t, i) => (
            <div key={t.category} className="form-group">
              <label className="form-label">{t.category}</label>
              <input className="form-input" type="number" value={t.threshold} onChange={e => updateThreshold(i, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="card">
          <h3 className="card-title mb-4">Feature Toggles</h3>
          <p className="text-sm text-muted mb-4">Enable or disable system features</p>
          {Object.entries(features).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div><div className="font-medium text-sm">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</div></div>
              <button className="btn btn-ghost btn-sm" onClick={() => toggleFeature(key)}>
                {val ? <ToggleRight size={24} style={{ color: 'var(--success)' }} /> : <ToggleLeft size={24} style={{ color: 'var(--gray-400)' }} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Email Notifications ── */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="flex items-center justify-between mb-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mail size={20} style={{ color: 'var(--primary)' }} />
            <h3 className="card-title" style={{ margin: 0 }}>Critical Stock Email Notifications</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setEmailCfg(c => ({ ...c, enabled: !c.enabled }))}>
            {emailCfg.enabled
              ? <ToggleRight size={28} style={{ color: 'var(--success)' }} />
              : <ToggleLeft size={28} style={{ color: 'var(--gray-400)' }} />}
          </button>
        </div>
        <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
          When a stock item transitions to <strong>Critical</strong> or <strong>Out of Stock</strong>, an email alert is
          automatically sent to all active executives. Powered by{' '}
          <strong>EmailJS</strong> — no backend required.
        </p>

        {/* Setup guide */}
        <div style={{ background: 'var(--info-light)', border: '1px solid var(--info)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Info size={16} style={{ color: 'var(--info)', flexShrink: 0, marginTop: 2 }} />
            <div className="text-sm">
              <strong>Quick Setup (free):</strong>
              <ol style={{ paddingLeft: 18, marginTop: 6, lineHeight: 1.8 }}>
                <li>Sign up at <strong>emailjs.com</strong> and create an <strong>Email Service</strong> (Gmail, Outlook, etc.)</li>
                <li>Create an <strong>Email Template</strong> — use these variables:<br />
                  <code style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: 4 }}>
                    {'{{to_name}}'} {'{{item_name}}'} {'{{item_code}}'} {'{{item_quantity}}'} {'{{item_unit}}'} {'{{item_location}}'} {'{{health_status}}'} {'{{item_threshold}}'} {'{{sent_at}}'}
                  </code>
                  <br />Set <em>To Email</em> field to <code style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: 4 }}>{'{{to_email}}'}</code>
                </li>
                <li>Copy your <strong>Service ID</strong>, <strong>Template ID</strong>, and <strong>Public Key</strong> from the EmailJS dashboard below.</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Service ID</label>
            <input
              className="form-input"
              placeholder="service_xxxxxxx"
              value={emailCfg.serviceId}
              onChange={e => setEmailCfg(c => ({ ...c, serviceId: e.target.value.trim() }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Template ID</label>
            <input
              className="form-input"
              placeholder="template_xxxxxxx"
              value={emailCfg.templateId}
              onChange={e => setEmailCfg(c => ({ ...c, templateId: e.target.value.trim() }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Public Key</label>
            <input
              className="form-input"
              placeholder="xxxxxxxxxxxxxxxxxxxxxx"
              value={emailCfg.publicKey}
              onChange={e => setEmailCfg(c => ({ ...c, publicKey: e.target.value.trim() }))}
            />
          </div>
        </div>

        {/* Recipients preview */}
        <div style={{ marginBottom: 20 }}>
          <p className="text-sm font-medium" style={{ marginBottom: 8 }}>Alert recipients ({executives.length})</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {executives.length === 0
              ? <span className="text-sm text-muted">No active executives or admins found.</span>
              : executives.map(u => (
                  <span key={u.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', fontSize: '0.8rem', fontWeight: 500 }}>
                    <span style={{ width: 22, height: 22, background: 'var(--primary)', color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>{u.avatar}</span>
                    {u.name} — {u.email}
                  </span>
                ))
            }
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleEmailSave}>
            <Save size={15} /> {emailSaved ? '✓ Saved!' : 'Save Email Config'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleTestEmail}
            disabled={testStatus === 'sending' || !emailCfg.serviceId || !emailCfg.templateId || !emailCfg.publicKey}
          >
            <Send size={15} />
            {testStatus === 'sending' ? 'Sending…' : 'Send Test Email'}
          </button>
          {testStatus === 'ok' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontSize: '0.875rem', fontWeight: 500 }}>
              <CheckCircle size={16} /> {testMsg}
            </span>
          )}
          {testStatus === 'err' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', fontSize: '0.875rem' }}>
              <XCircle size={16} /> {testMsg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
