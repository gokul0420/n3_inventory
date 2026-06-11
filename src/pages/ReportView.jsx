import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { ArrowLeft, Download, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { categories, locations } from '../data/mockData.js';
import { buildReport, computeReportStats, aiPayload, REPORT_TITLES } from '../utils/reports.js';
import { supabase } from '../lib/supabaseClient.js';

const titles = { 'stock-availability': 'Current Stock Availability', 'distributed-stock': 'Distributed Stock Report', 'pending-approval': 'Pending Approval Report', 'approval-history': 'Approval History', 'stock-movement': 'Stock Movement Ledger' };

export default function ReportView() {
  const { type } = useParams();
  const { state } = useApp();
  const navigate = useNavigate();
  const [catFilter, setCatFilter] = useState('');
  const [locFilter, setLocFilter] = useState('');

  const { columns, data } = useMemo(() => {
    switch (type) {
      case 'stock-availability': return { columns: ['Code','Name','Category','Location','Qty','Threshold','Status'], data: state.stockItems.filter(s => s.status==='active' && (!catFilter||s.category===catFilter) && (!locFilter||s.location===locFilter)).map(s => [s.code,s.name,s.category,s.location,s.quantity,s.threshold,s.quantity<=s.threshold?'Low':'Active']) };
      case 'distributed-stock': return { columns: ['ID','Stock','Qty','Recipient','Date','Status'], data: state.distributions.map(d => [d.id,d.stockName,d.quantity,d.recipient,d.date,d.status]) };
      case 'pending-approval': return { columns: ['ID','Stock','Qty','Recipient','Submitted'], data: state.distributions.filter(d=>d.status==='submitted').map(d => [d.id,d.stockName,d.quantity,d.recipient,d.submittedAt||'-']) };
      case 'approval-history': return { columns: ['ID','Stock','Qty','Status','Date','Reason'], data: state.distributions.filter(d=>['approved','rejected'].includes(d.status)).map(d => [d.id,d.stockName,d.quantity,d.status,d.approvedAt||'-',d.rejectionReason||'-']) };
      case 'stock-movement': return { columns: ['Date','Entity','Action','User','Remarks'], data: state.auditLogs.map(l => [new Date(l.date).toLocaleString(),l.entityId,l.action,l.user,l.remarks]) };
      default: return { columns: [], data: [] };
    }
  }, [type, state, catFilter, locFilter]);

  const exportExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([columns, ...data]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${type}_report.xlsx`);
  };

  const [generating, setGenerating] = useState(false);

  // Try to get an AI-written executive summary from the Supabase Edge Function.
  // Falls back to the computed summary if the function isn't deployed / errors.
  const fetchAiSummary = async (title, stats) => {
    try {
      const { data, error } = await supabase.functions.invoke('smart-worker', {
        body: { title, stats: aiPayload(type, stats) },
      });
      if (error || !data?.summary) return null;
      return data.summary;
    } catch { return null; }
  };

  const exportPDF = async () => {
    // Every report type is now a multi-page analytical PDF with its own data.
    setGenerating(true);
    const stats = computeReportStats(type, state);
    const aiSummary = await fetchAiSummary(REPORT_TITLES[type] || 'Report', stats);
    const doc = buildReport(type, state, aiSummary);   // null aiSummary → computed fallback
    doc.save(`${type}_report.pdf`);
    setGenerating(false);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><button className="btn btn-ghost" onClick={() => navigate('/reports')}><ArrowLeft size={16}/> Back</button><h1 className="page-title mt-2">{titles[type]}</h1></div>
        <div className="page-actions"><button className="btn btn-secondary" onClick={exportExcel}><FileSpreadsheet size={16}/> Excel</button><button className="btn btn-secondary" onClick={exportPDF} disabled={generating}><FileText size={16}/> {generating ? 'Generating…' : 'Analytical PDF'}</button></div>
      </div>
      {type === 'stock-availability' && <div className="filter-bar">
        <select className="form-select" style={{width:180}} value={catFilter} onChange={e=>setCatFilter(e.target.value)}><option value="">All Categories</option>{categories.map(c=><option key={c}>{c}</option>)}</select>
        <select className="form-select" style={{width:180}} value={locFilter} onChange={e=>setLocFilter(e.target.value)}><option value="">All Locations</option>{locations.map(l=><option key={l}>{l}</option>)}</select>
      </div>}
      <div className="table-container">
        <table className="data-table">
          <thead><tr>{columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>{data.length===0?<tr><td colSpan={columns.length} style={{textAlign:'center',padding:32}} className="text-muted">No data</td></tr>:data.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
