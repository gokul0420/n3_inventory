import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Package, Truck, ClipboardCheck, History, FileSpreadsheet, ArrowRight } from 'lucide-react';

const reports = [
  { type: 'stock-availability', title: 'Current Stock Availability', desc: 'View current stock levels across all categories and locations', icon: Package, color: 'blue' },
  { type: 'distributed-stock', title: 'Distributed Stock Report', desc: 'Track all distributed stock items with status', icon: Truck, color: 'green' },
  { type: 'pending-approval', title: 'Pending Approval Report', desc: 'View all transactions awaiting approval', icon: ClipboardCheck, color: 'yellow' },
  { type: 'approval-history', title: 'Approval History', desc: 'Complete history of approved and rejected transactions', icon: History, color: 'blue' },
  { type: 'stock-movement', title: 'Stock Movement Ledger', desc: 'Track all stock movements and transactions over time', icon: FileSpreadsheet, color: 'green' },
];

export default function ReportsList() {
  const navigate = useNavigate();
  return (
    <div className="fade-in">
      <div className="page-header"><div><h1 className="page-title">Reports</h1><p className="page-subtitle">Generate and export reports</p></div></div>
      <div className="grid-auto">
        {reports.map(r => (
          <div key={r.type} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/reports/${r.type}`)}>
            <div className="flex flex-col gap-3">
              <div className={`stat-icon ${r.color}`}><r.icon size={24}/></div>
              <h3 className="card-title">{r.title}</h3>
              <p className="text-sm text-muted">{r.desc}</p>
              <span className="flex items-center gap-2 text-sm" style={{color:'var(--primary)',fontWeight:500}}>View Report <ArrowRight size={14}/></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
