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
  const [results, setResults] = useState(null);
  const [uploading, setUploading] = useState(false);


  const processFile = async (file) => {
    setUploading(true);
    await new Promise(r => setTimeout(r, 800));
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
        if (!row['Quantity'] || isNaN(row['Quantity'])) errs.push('Valid Quantity is required');
        // Resolve the product's department. Non-admins can only upload into
        // their OWN department (the Department column is ignored for them).
        let dept;
        if (user.role === 'admin') {
          const deptName = (row['Department'] || '').toString().trim().toLowerCase();
          dept = (state.departments || []).find(d => d.name.toLowerCase() === deptName);
          if (!row['Department']) errs.push('Department is required');
          else if (!dept) errs.push(`Unknown department "${row['Department']}"`);
        } else {
          dept = (state.departments || []).find(d => d.id === user.departmentId);
          if (!dept) errs.push('Your account has no department assigned.');
        }
        if (errs.length > 0) errors.push({ row: i + 2, data: row, errors: errs });
        else valid.push({ id: row['Stock Code'], code: row['Stock Code'], name: row['Stock Name'], category: row['Category'], location: row['Location'] || 'Central Store', quantity: Number(row['Quantity']), threshold: Number(row['Threshold']) || 10, unit: row['Unit'] || 'Units', status: 'active', departmentId: dept.id, createdAt: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString().split('T')[0] });
      });
      if (valid.length > 0) {
        dispatch({ type: 'ADD_STOCK', payload: valid });
        valid.forEach(v => addAuditLog('stock', v.id, 'created', user.name, 'Created/updated via bulk upload'));
        addNotification('Stock Uploaded', `${valid.length} items uploaded successfully`, 'success');
        // Best practice: confirm against the DB so the UI shows authoritative
        // values immediately, regardless of realtime delivery.
        await reloadStock();
      }
      setResults({ valid, errors, total: rows.length });
    } catch (e) { addNotification('Upload Failed', e.message, 'danger'); }
    setUploading(false);
  };

  // Download a template pre-filled with the user's OWN department products as
  // the sample rows (admins get a generic multi-department template).
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

  const handleDrop = (e) => { e.preventDefault(); setDragover(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); };
  const handleFileChange = (e) => { if (e.target.files[0]) processFile(e.target.files[0]); };

  const downloadErrors = () => {
    if (!results?.errors.length) return;
    const ws = XLSX.utils.json_to_sheet(results.errors.map(e => ({ Row: e.row, ...e.data, Errors: e.errors.join('; ') })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Errors');
    XLSX.writeFile(wb, 'upload_errors.xlsx');
  };

  return (
    <div className="fade-in">
      <div className="page-header"><div><h1 className="page-title">Upload Stock Master</h1><p className="page-subtitle">Bulk upload stock items via Excel</p></div>
        <button className="btn btn-secondary" onClick={handleDownloadTemplate}><Download size={16} /> Download Template</button>
      </div>
      {!results ? (
        <div className="card">
          <div className={`upload-zone ${dragover ? 'dragover' : ''}`} onDragOver={e => { e.preventDefault(); setDragover(true); }} onDragLeave={() => setDragover(false)} onDrop={handleDrop} onClick={() => fileRef.current?.click()}>
            {uploading ? <><div className="spinner" style={{ margin: '0 auto 16px' }}></div><p>Processing file...</p></> : <><Upload size={48} /><p>Drag & drop your Excel file here, or <span className="upload-cta">browse</span></p><p className="text-xs text-muted mt-2">Supports .xlsx and .xls files</p></>}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
        </div>
      ) : (
        <div>
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-icon blue"><FileSpreadsheet size={24} /></div><div className="stat-content"><h3>{results.total}</h3><p>Total Rows</p></div></div>
            <div className="stat-card"><div className="stat-icon green"><CheckCircle size={24} /></div><div className="stat-content"><h3>{results.valid.length}</h3><p>Successfully Imported</p></div></div>
            <div className="stat-card"><div className="stat-icon red"><XCircle size={24} /></div><div className="stat-content"><h3>{results.errors.length}</h3><p>Errors</p></div></div>
          </div>
          {results.errors.length > 0 && (
            <div className="card">
              <div className="card-header"><span className="card-title">Error Details</span><button className="btn btn-secondary btn-sm" onClick={downloadErrors}><Download size={14} /> Download Error Report</button></div>
              <div className="table-container" style={{ border: 'none' }}>
                <table className="data-table">
                  <thead><tr><th>Row</th><th>Data</th><th>Errors</th></tr></thead>
                  <tbody>{results.errors.map((e, i) => <tr key={i}><td>{e.row}</td><td className="text-sm">{JSON.stringify(e.data).substring(0, 80)}...</td><td><span className="text-danger text-sm">{e.errors.join(', ')}</span></td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}
          <div className="mt-4"><button className="btn btn-primary" onClick={() => setResults(null)}>Upload Another File</button></div>
        </div>
      )}
    </div>
  );
}
