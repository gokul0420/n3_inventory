import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { downloadTemplate } from '../utils/templateGenerator.js';

export default function StockUpload() {
  const { state, dispatch, addAuditLog, addNotification, reloadStock } = useApp();
  const { user } = useAuth();
  const fileRef = useRef();
  const [dragover, setDragover] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null);   // { valid, errors, total } — NOT yet committed
  const [committing, setCommitting] = useState(false);
  const [results, setResults] = useState(null);    // post-confirm summary
  const [addMode, setAddMode] = useState(false);    // add to existing vs replace

  // ── Step 1: parse + validate only (no DB write yet) ──────────────────────
  const parseFile = async (file) => {
    setParsing(true);
    setResults(null);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data); const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      const valid = [], errors = [];
      rows.forEach((row, i) => {
        const errs = [];
        if (!row['Stock Code']) errs.push('Stock Code is required');
        if (!row['Stock Name']) errs.push('Stock Name is required');
        if (!row['Category']) errs.push('Category is required');
        if (row['Quantity'] === undefined || row['Quantity'] === '' || isNaN(row['Quantity'])) errs.push('Valid Quantity is required');

        // Department: non-admins are locked to their own department.
        let dept;
        if (user.role === 'admin') {
          const dn = (row['Department'] || '').toString().trim().toLowerCase();
          dept = (state.departments || []).find(d => d.name.toLowerCase() === dn);
          if (!row['Department']) errs.push('Department is required');
          else if (!dept) errs.push(`Unknown department "${row['Department']}"`);
        } else {
          dept = (state.departments || []).find(d => d.id === user.departmentId);
          if (!dept) errs.push('Your account has no department assigned.');
        }

        if (errs.length > 0) { errors.push({ row: i + 2, data: row, errors: errs }); return; }

        const existing = state.stockItems.find(s => s.id === row['Stock Code']);
        valid.push({
          id: row['Stock Code'], code: row['Stock Code'], name: row['Stock Name'],
          category: row['Category'], location: row['Location'] || 'Central Store',
          uploadedQty: Number(row['Quantity']),
          currentQty: existing ? existing.quantity : 0,
          isNew: !existing,
          threshold: Number(row['Threshold']) || (existing?.threshold ?? 10),
          unit: row['Unit'] || existing?.unit || 'Units',
          departmentId: dept.id,
        });
      });
      setPreview({ valid, errors, total: rows.length });
    } catch (e) {
      addNotification('Upload Failed', e.message, 'danger');
    }
    setParsing(false);
  };

  // ── Step 2: user confirms → write to DB → refresh UI ─────────────────────
  const confirmUpload = async () => {
    if (!preview?.valid.length) return;
    setCommitting(true);
    const today = new Date().toISOString().split('T')[0];
    const payload = preview.valid.map(v => ({
      id: v.id, code: v.code, name: v.name, category: v.category, location: v.location,
      quantity: addMode && !v.isNew ? v.currentQty + v.uploadedQty : v.uploadedQty,
      threshold: v.threshold, unit: v.unit, status: 'active', departmentId: v.departmentId,
      createdAt: today, updatedAt: today,
    }));
    dispatch({ type: 'ADD_STOCK', payload });
    payload.forEach(v => addAuditLog('stock', v.id, 'updated', user.name, `Stock ${addMode ? 'incremented' : 'set'} via bulk upload`));
    await reloadStock();               // authoritative refresh — UI reflects DB
    addNotification('Stock Updated', `${payload.length} items ${addMode ? 'incremented' : 'updated'} successfully`, 'success');
    setResults({ count: payload.length, errors: preview.errors, total: preview.total, addMode });
    setPreview(null);
    setCommitting(false);
  };

  const cancelPreview = () => { setPreview(null); if (fileRef.current) fileRef.current.value = ''; };

  const handleDownloadTemplate = () => {
    const dept = (state.departments || []).find(d => d.id === user.departmentId);
    if (user.role === 'admin' || !dept) { downloadTemplate('stock_upload'); return; }
    const deptProducts = state.stockItems.filter(s => s.departmentId === dept.id && s.status !== 'deleted');
    const sampleRows = deptProducts.map(s => [s.code, s.name, dept.name, s.category, s.location, s.quantity, s.threshold, s.unit]);
    downloadTemplate('stock_upload', {
      sampleRows: sampleRows.length ? sampleRows : [['NEW001', 'New Product', dept.name, 'Merchandise', 'Central Store', 100, 20, 'Units']],
      filename: `stock_upload_${dept.name.replace(/\s/g, '_')}.xlsx`,
    });
  };

  const handleDrop = (e) => { e.preventDefault(); setDragover(false); if (e.dataTransfer.files[0]) parseFile(e.dataTransfer.files[0]); };
  const handleFileChange = (e) => { if (e.target.files[0]) parseFile(e.target.files[0]); };

  const reset = () => { setResults(null); setPreview(null); if (fileRef.current) fileRef.current.value = ''; };

  return (
    <div className="fade-in">
      <div className="page-header"><div><h1 className="page-title">Upload Stock Master</h1><p className="page-subtitle">Bulk add or update stock via Excel</p></div>
        <button className="btn btn-secondary" onClick={handleDownloadTemplate}><Download size={16} /> Download Template</button>
      </div>

      {/* ── Drop zone (shown until a file is parsed) ── */}
      {!preview && !results && (
        <div className="card">
          <div className={`upload-zone ${dragover ? 'dragover' : ''}`} onDragOver={e => { e.preventDefault(); setDragover(true); }} onDragLeave={() => setDragover(false)} onDrop={handleDrop} onClick={() => fileRef.current?.click()}>
            {parsing ? <><div className="spinner" style={{ margin: '0 auto 16px' }}></div><p>Reading file…</p></> : <><Upload size={48} /><p>Drag &amp; drop your Excel file here, or <span className="upload-cta">browse</span></p><p className="text-xs text-muted mt-2">Supports .xlsx and .xls — you'll preview changes before they're applied.</p></>}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
        </div>
      )}

      {/* ── Step: Preview + Confirm ── */}
      {preview && (
        <div>
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-icon blue"><FileSpreadsheet size={24} /></div><div className="stat-content"><h3>{preview.total}</h3><p>Rows in File</p></div></div>
            <div className="stat-card"><div className="stat-icon green"><CheckCircle size={24} /></div><div className="stat-content"><h3>{preview.valid.length}</h3><p>Ready to Apply</p></div></div>
            <div className="stat-card"><div className="stat-icon red"><XCircle size={24} /></div><div className="stat-content"><h3>{preview.errors.length}</h3><p>Errors (skipped)</p></div></div>
          </div>

          {preview.valid.length > 0 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Preview Changes</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={addMode} onChange={e => setAddMode(e.target.checked)} />
                  Add to existing quantity (restock) instead of replacing
                </label>
              </div>
              <div className="table-container" style={{ border: 'none' }}>
                <table className="data-table">
                  <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Current</th><th>{addMode ? 'Adding' : 'New Value'}</th><th>Result</th></tr></thead>
                  <tbody>{preview.valid.map(v => {
                    const result = addMode && !v.isNew ? v.currentQty + v.uploadedQty : v.uploadedQty;
                    return (
                      <tr key={v.id}>
                        <td className="font-medium">{v.code}</td><td>{v.name}</td>
                        <td>{v.isNew ? <span className="badge badge-info">New</span> : <span className="badge badge-active">Update</span>}</td>
                        <td>{v.isNew ? '—' : `${v.currentQty} ${v.unit}`}</td>
                        <td>{addMode && !v.isNew ? `+${v.uploadedQty}` : `${v.uploadedQty} ${v.unit}`}</td>
                        <td className="font-semibold" style={{ color: 'var(--success)' }}>{result} {v.unit}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            </div>
          )}

          {preview.errors.length > 0 && (
            <div className="card">
              <div className="card-header"><span className="card-title">Rows with Errors (will be skipped)</span></div>
              <div className="table-container" style={{ border: 'none' }}>
                <table className="data-table">
                  <thead><tr><th>Row</th><th>Errors</th></tr></thead>
                  <tbody>{preview.errors.map((e, i) => <tr key={i}><td>{e.row}</td><td><span className="text-danger text-sm">{e.errors.join(', ')}</span></td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button className="btn btn-secondary" onClick={cancelPreview} disabled={committing}>Cancel</button>
            <button className="btn btn-primary" onClick={confirmUpload} disabled={committing || preview.valid.length === 0}>
              {committing ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Applying…</> : <><CheckCircle size={16} /> Confirm Upload ({preview.valid.length})</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Done ── */}
      {results && (
        <div>
          <div className="card">
            <div className="empty-state">
              <CheckCircle size={48} style={{ color: 'var(--success)' }} />
              <h3>Upload Applied</h3>
              <p>{results.count} item(s) {results.addMode ? 'incremented' : 'updated'} in inventory.{results.errors.length ? ` ${results.errors.length} row(s) skipped due to errors.` : ''}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-3"><button className="btn btn-primary" onClick={reset}>Upload Another File</button></div>
        </div>
      )}
    </div>
  );
}
