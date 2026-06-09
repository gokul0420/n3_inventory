import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ArrowLeft, CheckCircle, XCircle, TrendingDown, Brain } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { consumptionData } from '../data/mockData.js';

export default function ApprovalDetail() {
  const { id } = useParams();
  const { state, dispatch, addAuditLog, addNotification } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveModal, setApproveModal] = useState(false);

  const dist = state.distributions.find(d => d.id === id);
  const stock = dist ? state.stockItems.find(s => s.id === dist.stockId) : null;
  const postQty = stock ? stock.quantity - dist.quantity : 0;

  if (!dist) return <div className="card"><div className="empty-state"><h3>Distribution not found</h3></div></div>;

  const handleApprove = () => {
    dispatch({ type: 'UPDATE_DISTRIBUTION', payload: { id: dist.id, status: 'approved', approvedBy: user.id, approvedAt: new Date().toISOString() }});
    if (stock) dispatch({ type: 'UPDATE_STOCK', payload: { id: stock.id, quantity: postQty }});
    addAuditLog('distribution', dist.id, 'approved', user.name, 'Approved');
    addNotification('Distribution Approved', `${dist.id} approved`, 'success');
    navigate('/approvals');
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    dispatch({ type: 'UPDATE_DISTRIBUTION', payload: { id: dist.id, status: 'rejected', approvedBy: user.id, approvedAt: new Date().toISOString(), rejectionReason: rejectReason }});
    addAuditLog('distribution', dist.id, 'rejected', user.name, rejectReason);
    addNotification('Distribution Rejected', `${dist.id} rejected`, 'danger');
    navigate('/approvals');
  };

  return (
    <div className="fade-in">
      <div className="page-header"><div><button className="btn btn-ghost" onClick={() => navigate('/approvals')}><ArrowLeft size={16}/> Back</button><h1 className="page-title mt-2">Review — {dist.id}</h1></div>
        {dist.status === 'submitted' && <div className="page-actions"><button className="btn btn-danger" onClick={() => setRejectModal(true)}><XCircle size={16}/> Reject</button><button className="btn btn-success" onClick={() => setApproveModal(true)}><CheckCircle size={16}/> Approve</button></div>}
      </div>
      <div className="grid-2">
        <div className="card">
          <h3 className="card-title mb-4">Transaction Summary</h3>
          <div className="form-row"><div className="form-group"><label className="form-label">Distribution ID</label><div className="text-sm font-semibold">{dist.id}</div></div><div className="form-group"><label className="form-label">Status</label><span className={`badge badge-${dist.status}`}>{dist.status}</span></div></div>
          <div className="form-group"><label className="form-label">Stock Item</label><div className="text-sm">{dist.stockName}</div></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Quantity</label><div className="text-sm font-semibold">{dist.quantity}</div></div><div className="form-group"><label className="form-label">Recipient</label><div className="text-sm">{dist.recipient}</div></div></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Date</label><div className="text-sm">{dist.date}</div></div><div className="form-group"><label className="form-label">Submitted</label><div className="text-sm">{dist.submittedAt ? new Date(dist.submittedAt).toLocaleString() : '-'}</div></div></div>
          {dist.remarks && <div className="form-group"><label className="form-label">Remarks</label><div className="text-sm">{dist.remarks}</div></div>}
        </div>
        <div>
          {stock && <div className="card mb-4">
            <h3 className="card-title mb-4">Stock Impact Preview</h3>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div className="flex justify-between"><span className="text-sm text-muted">Current Stock</span><span className="font-semibold">{stock.quantity} {stock.unit}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted">Distribution</span><span className="font-semibold text-danger">−{dist.quantity}</span></div>
              <hr style={{border:'none',borderTop:'1px solid var(--border)'}}/>
              <div className="flex justify-between"><span className="text-sm font-medium">Post-Distribution</span><span className={`font-semibold ${postQty<=stock.threshold?'text-danger':'text-success'}`}>{postQty} {stock.unit}</span></div>
              {postQty<=stock.threshold && <div className="badge badge-warning" style={{alignSelf:'flex-start'}}>Below threshold ({stock.threshold})</div>}
            </div>
          </div>}
          <div className="card">
            <div className="flex items-center gap-2 mb-4"><Brain size={20} style={{color:'var(--primary)'}}/><h3 className="card-title">AI Insights</h3></div>
            <p className="text-sm text-muted mb-2">Based on consumption trends, this distribution volume is <strong>within normal range</strong>.</p>
            <div className="chart-container" style={{height:200}}>
              <ResponsiveContainer><LineChart data={consumptionData.slice(0,15)}><CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)"/><XAxis dataKey="date" tick={{fontSize:11}} stroke="var(--gray-400)"/><YAxis tick={{fontSize:11}} stroke="var(--gray-400)"/><Tooltip/><Line type="monotone" dataKey="consumed" stroke="var(--primary)" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {approveModal && <div className="modal-overlay" onClick={()=>setApproveModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-header"><h2 className="modal-title">Confirm Approval</h2></div><div className="modal-body"><p>Approve distribution <strong>{dist.id}</strong>? Stock will be deducted.</p></div><div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setApproveModal(false)}>Cancel</button><button className="btn btn-success" onClick={handleApprove}>Approve</button></div></div></div>}
      {rejectModal && <div className="modal-overlay" onClick={()=>setRejectModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-header"><h2 className="modal-title">Reject Distribution</h2></div><div className="modal-body"><div className="form-group"><label className="form-label">Rejection Reason *</label><textarea className="form-textarea" value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Provide reason for rejection..."/></div></div><div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setRejectModal(false)}>Cancel</button><button className="btn btn-danger" onClick={handleReject} disabled={!rejectReason.trim()}>Reject</button></div></div></div>}
    </div>
  );
}
