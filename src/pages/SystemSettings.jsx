import React, { useState } from 'react';
import { Settings, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { systemSettings as defaults, categories } from '../data/mockData.js';

export default function SystemSettings() {
  const [thresholds, setThresholds] = useState(defaults.thresholdRules);
  const [features, setFeatures] = useState(defaults.features);
  const [saved, setSaved] = useState(false);

  const updateThreshold = (i, val) => { const t = [...thresholds]; t[i] = { ...t[i], threshold: Number(val) }; setThresholds(t); };
  const toggleFeature = (key) => setFeatures({ ...features, [key]: !features[key] });
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="fade-in">
      <div className="page-header"><div><h1 className="page-title">System Settings</h1><p className="page-subtitle">Configure system-wide rules and features</p></div>
        <button className="btn btn-primary" onClick={handleSave}><Save size={16}/> {saved ? '✓ Saved!' : 'Save Changes'}</button>
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
    </div>
  );
}
