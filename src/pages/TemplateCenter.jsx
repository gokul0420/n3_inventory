import React, { useState } from 'react';
import { getAllTemplates, downloadTemplate, TEMPLATES } from '../utils/templateGenerator.js';
import { Download, FileSpreadsheet, Info, CheckCircle, Package, Truck, Users, RefreshCw, Search } from 'lucide-react';

const moduleIcons = {
  'Stock Master': Package,
  'Distribution Management': Truck,
  'Employee Distribution': Users,
};

const moduleColors = {
  'Stock Master': 'blue',
  'Distribution Management': 'yellow',
  'Employee Distribution': 'green',
};

export default function TemplateCenter() {
  const [search, setSearch] = useState('');
  const [selectedTmpl, setSelectedTmpl] = useState(null);
  const [downloaded, setDownloaded] = useState({});

  const templates = getAllTemplates();
  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.module.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownload = (id) => {
    downloadTemplate(id);
    setDownloaded(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setDownloaded(prev => ({ ...prev, [id]: false })), 3000);
  };

  const detail = selectedTmpl ? TEMPLATES[selectedTmpl] : null;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Template Center</h1>
          <p className="page-subtitle">Download standardized Excel templates for all bulk operations</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          Object.keys(TEMPLATES).forEach(id => downloadTemplate(id));
        }}>
          <Download size={16} /> Download All Templates
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><FileSpreadsheet size={24} /></div>
          <div className="stat-content"><h3>{templates.length}</h3><p>Available Templates</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Package size={24} /></div>
          <div className="stat-content"><h3>{templates.filter(t => t.module === 'Stock Master').length}</h3><p>Stock Templates</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><Truck size={24} /></div>
          <div className="stat-content"><h3>{templates.filter(t => t.module === 'Distribution Management').length}</h3><p>Distribution Templates</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Users size={24} /></div>
          <div className="stat-content"><h3>{templates.filter(t => t.module === 'Employee Distribution').length}</h3><p>Employee Templates</p></div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <Search size={18} />
          <input className="form-input" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className={detail ? 'grid-2' : ''}>
        <div className="template-card-grid">
          {filtered.map(tmpl => {
            const Icon = moduleIcons[tmpl.module] || FileSpreadsheet;
            const color = moduleColors[tmpl.module] || 'blue';
            return (
              <div key={tmpl.id} className={`template-card ${selectedTmpl === tmpl.id ? 'template-card-selected' : ''}`}>
                <div className="template-card-top" onClick={() => setSelectedTmpl(selectedTmpl === tmpl.id ? null : tmpl.id)}>
                  <div className="flex items-center gap-3">
                    <div className={`stat-icon ${color}`} style={{ width: 40, height: 40 }}><Icon size={20} /></div>
                    <div>
                      <h4 className="template-card-name">{tmpl.name}</h4>
                      <span className="text-xs text-muted">{tmpl.module}</span>
                    </div>
                  </div>
                  <p className="template-card-desc">{tmpl.description}</p>
                  <div className="template-card-cols">
                    {tmpl.columns.map((col, i) => (
                      <span key={i} className={`template-col-chip ${col.required ? 'template-col-required' : ''}`}>
                        {col.header}{col.required ? ' ✱' : ''}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="template-card-bottom">
                  <span className="text-xs text-muted"><FileSpreadsheet size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {tmpl.filename}</span>
                  <button
                    className={`btn ${downloaded[tmpl.id] ? 'btn-success' : 'btn-primary'} btn-sm`}
                    onClick={(e) => { e.stopPropagation(); handleDownload(tmpl.id); }}
                  >
                    {downloaded[tmpl.id] ? <><CheckCircle size={14} /> Downloaded</> : <><Download size={14} /> Download</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {detail && (
          <div className="card template-detail-panel">
            <div className="flex items-center gap-2 mb-4">
              <Info size={20} style={{ color: 'var(--primary)' }} />
              <h3 className="card-title">{detail.name}</h3>
            </div>

            <div className="template-detail-section">
              <label className="form-label">Module</label>
              <div className="text-sm">{detail.module}</div>
            </div>

            <div className="template-detail-section">
              <label className="form-label">Used In</label>
              <div className="text-sm">{detail.usedIn}</div>
            </div>

            <div className="template-detail-section">
              <label className="form-label">When To Use</label>
              <div className="text-sm">{detail.whenToUse}</div>
            </div>

            <div className="template-detail-section">
              <label className="form-label">Column Reference</label>
              <div className="table-container" style={{ border: 'none' }}>
                <table className="data-table">
                  <thead><tr><th>Column</th><th>Required</th><th>Description</th></tr></thead>
                  <tbody>
                    {detail.columns.map((col, i) => (
                      <tr key={i}>
                        <td className="font-medium" style={{ whiteSpace: 'nowrap' }}>{col.header}</td>
                        <td>{col.required ? <span className="badge badge-rejected" style={{ fontSize: '.65rem' }}>Required</span> : <span className="badge badge-draft" style={{ fontSize: '.65rem' }}>Optional</span>}</td>
                        <td className="text-sm">{col.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="template-detail-section">
              <label className="form-label">Sample Data</label>
              <div className="table-container" style={{ border: 'none', overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr>{detail.columns.map((c, i) => <th key={i}>{c.header}</th>)}</tr></thead>
                  <tbody>
                    {detail.sampleRows.map((row, ri) => (
                      <tr key={ri}>{row.map((cell, ci) => <td key={ci} className="text-sm">{String(cell)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button className="btn btn-primary w-full mt-4" style={{ justifyContent: 'center' }} onClick={() => handleDownload(detail.id)}>
              <Download size={16} /> Download {detail.filename}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
