import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { downloadTemplate } from '../utils/templateGenerator.js';

export default function BulkDistributionUpload() {
  const { state, dispatch, addAuditLog, addNotification } = useApp();
  const { user } = useAuth();
  const fileRef = useRef();
  const [dragover, setDragover] = useState(false);
  const [results, setResults] = useState(null);
  const [uploading, setUploading] = useState(false);


  const processFile = async (file) => {
    setUploading(true); await new Promise(r => setTimeout(r, 800));
    try {
      const data = await file.arrayBuffer(); const wb = XLSX.read(data); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const valid = [], errors = [];
      rows.forEach((row, i) => {
        const errs = [];
        const stock = state.stockItems.find(s => s.code === row['Stock Code']);
        if (!stock) errs.push('Stock Code not found');
        if (!row['Quantity'] || isNaN(row['Quantity'])) errs.push('Valid Quantity required');
        if (!row['Recipient']) errs.push('Recipient required');
        if (stock && Number(row['Quantity']) > stock.quantity) errs.push('Exceeds available quantity');
        if (errs.length) errors.push({ row: i + 2, data: row, errors: errs });
        else valid.push({ id: `DST${String(state.distributions.length + valid.length + 1).padStart(3,'0')}`, stockId: stock.id, stockName: stock.name, quantity: Number(row['Quantity']), recipient: row['Recipient'], date: row['Date'] || new Date().toISOString().split('T')[0], status: 'draft', remarks: row['Remarks'] || '', submittedBy: user.id });
      });
      valid.forEach(v => { dispatch({ type: 'ADD_DISTRIBUTION', payload: v }); addAuditLog('distribution', v.id, 'created', user.name, 'Bulk upload'); });
      if (valid.length) addNotification('Bulk Upload', `${valid.length} distributions created`, 'success');
      setResults({ valid, errors, total: rows.length });
    } catch (e) { addNotification('Upload Failed', e.message, 'danger'); }
    setUploading(false);
  };

  const downloadErrors = () => {
    const ws = XLSX.utils.json_to_sheet(results.errors.map(e => ({ Row: e.row, ...e.data, Errors: e.errors.join('; ') })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Errors'); XLSX.writeFile(wb, 'distribution_errors.xlsx');
  };

  return (
    <div className="fade-in">
      <div className="page-header"><div><h1 className="page-title">Bulk Distribution Upload</h1><p className="page-subtitle">Upload multiple distributions via Excel</p></div>
        <button className="btn btn-secondary" onClick={() => downloadTemplate('bulk_distribution')}><Download size={16} /> Download Template</button>
      </div>
      {!results ? (
        <div className="card">
          <div className={`upload-zone ${dragover ? 'dragover' : ''}`} onDragOver={e => { e.preventDefault(); setDragover(true); }} onDragLeave={() => setDragover(false)} onDrop={e => { e.preventDefault(); setDragover(false); processFile(e.dataTransfer.files[0]); }} onClick={() => fileRef.current?.click()}>
            {uploading ? <><div className="spinner" style={{ margin: '0 auto 16px' }} /><p>Processing...</p></> : <><Upload size={48} /><p>Drag & drop or <span className="upload-cta">browse</span></p></>}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={e => processFile(e.target.files[0])} style={{ display: 'none' }} />
        </div>
      ) : (
        <div>
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-icon blue"><span style={{fontSize:'1.2rem'}}>📊</span></div><div className="stat-content"><h3>{results.total}</h3><p>Total Rows</p></div></div>
            <div className="stat-card"><div className="stat-icon green"><span style={{fontSize:'1.2rem'}}>✅</span></div><div className="stat-content"><h3>{results.valid.length}</h3><p>Imported</p></div></div>
            <div className="stat-card"><div className="stat-icon red"><span style={{fontSize:'1.2rem'}}>❌</span></div><div className="stat-content"><h3>{results.errors.length}</h3><p>Errors</p></div></div>
          </div>
          {results.errors.length > 0 && <div className="card"><div className="card-header"><span className="card-title">Errors</span><button className="btn btn-secondary btn-sm" onClick={downloadErrors}><Download size={14} /> Download</button></div>
            <div className="table-container" style={{border:'none'}}><table className="data-table"><thead><tr><th>Row</th><th>Data</th><th>Errors</th></tr></thead><tbody>{results.errors.map((e,i)=><tr key={i}><td>{e.row}</td><td className="text-sm">{JSON.stringify(e.data).substring(0,60)}...</td><td className="text-danger text-sm">{e.errors.join(', ')}</td></tr>)}</tbody></table></div></div>}
          <button className="btn btn-primary mt-4" onClick={() => setResults(null)}>Upload Another</button>
        </div>
      )}
    </div>
  );
}
