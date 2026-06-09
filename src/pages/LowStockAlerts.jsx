import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { AlertTriangle, Brain, ShoppingCart, Activity, Package, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { analyzeAllStock } from '../utils/aiEngine.js';

export default function LowStockAlerts() {
  const { state, dispatch, addAuditLog, addNotification } = useApp();
  const { user } = useAuth();
  const [selectedItem, setSelectedItem] = useState(null);
  const [orderModal, setOrderModal] = useState(false);
  const [orderQty, setOrderQty] = useState('');
  const [orderRemarks, setOrderRemarks] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const analyzedItems = useMemo(() =>
    analyzeAllStock(state.stockItems, state.distributions, state.auditLogs),
    [state.stockItems, state.distributions, state.auditLogs]
  );

  const counts = useMemo(() => {
    const c = { healthy: 0, low: 0, critical: 0, out_of_stock: 0, total: analyzedItems.length };
    analyzedItems.forEach(item => { c[item.ai.health]++; });
    return c;
  }, [analyzedItems]);

  const filteredItems = useMemo(() => {
    let items = analyzedItems;
    if (filter !== 'all') items = items.filter(i => i.ai.health === filter);
    if (search) items = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase()));
    const order = { out_of_stock: 0, critical: 1, low: 2, healthy: 3 };
    return items.sort((a, b) => order[a.ai.health] - order[b.ai.health]);
  }, [analyzedItems, filter, search]);

  const canPlaceOrder = user.role === 'executive' || user.role === 'admin';

  const consumptionChartData = useMemo(() => {
    if (!selectedItem) return [];
    return state.distributions
      .filter(d => d.stockId === selectedItem.id && d.status === 'approved')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        quantity: d.quantity,
      }));
  }, [selectedItem, state.distributions]);

  const handleOpenOrder = (item) => {
    setSelectedItem(item);
    setOrderQty(item.ai.recommendation?.suggestedQty || item.ai.dynamicThreshold);
    setOrderRemarks('');
    setOrderModal(true);
  };

  const handlePlaceOrder = () => {
    if (!selectedItem || !orderQty) return;
    const newId = `ROR-${String(state.reorderRequests.length + 1).padStart(3, '0')}`;
    dispatch({ type: 'ADD_REORDER_REQUEST', payload: {
      id: newId, stockId: selectedItem.id, stockName: selectedItem.name,
      currentStock: selectedItem.quantity, aiThreshold: selectedItem.ai.dynamicThreshold,
      suggestedQty: selectedItem.ai.recommendation?.suggestedQty || selectedItem.ai.dynamicThreshold,
      requestedQty: parseInt(orderQty), status: 'pending',
      requestedBy: user.id, requestedByName: user.name,
      requestDate: new Date().toISOString(),
      remarks: orderRemarks || 'AI-recommended reorder request',
      aiReasoning: selectedItem.ai.recommendation?.reasoning || '',
      aiConfidence: selectedItem.ai.recommendation?.confidence || selectedItem.ai.dataQuality,
      urgency: selectedItem.ai.recommendation?.urgency || 'standard',
      reviewedBy: null, reviewedByName: null, reviewedAt: null, rejectionReason: null,
    }});
    addAuditLog('reorder_request', newId, 'created', user.name, `Reorder request: ${selectedItem.name} × ${orderQty}`);
    addNotification('Reorder Request Submitted', `${newId} for ${selectedItem.name} sent for approval`, 'info');
    setOrderModal(false); setSelectedItem(null);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h1 className="page-title">AI Stock Intelligence</h1>
        <p className="page-subtitle">Dynamic threshold analysis — {counts.total} items analyzed</p></div>
      </div>

      <div className="stat-grid">
        <div className="stat-card" style={{cursor:'pointer'}} onClick={()=>setFilter('all')}>
          <div className="stat-icon blue"><Activity size={24}/></div>
          <div className="stat-content"><h3>{counts.total}</h3><p>Total Analyzed</p></div>
        </div>
        <div className="stat-card" style={{cursor:'pointer'}} onClick={()=>setFilter('healthy')}>
          <div className="stat-icon green"><Package size={24}/></div>
          <div className="stat-content"><h3>{counts.healthy}</h3><p>Healthy Stock</p></div>
        </div>
        <div className="stat-card" style={{cursor:'pointer'}} onClick={()=>setFilter('low')}>
          <div className="stat-icon yellow"><AlertTriangle size={24}/></div>
          <div className="stat-content"><h3>{counts.low}</h3><p>Low Stock</p></div>
        </div>
        <div className="stat-card" style={{cursor:'pointer'}} onClick={()=>setFilter('critical')}>
          <div className="stat-icon red"><AlertTriangle size={24}/></div>
          <div className="stat-content"><h3>{counts.critical + counts.out_of_stock}</h3><p>Critical / Out</p></div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input"><Search size={18}/><input className="form-input" placeholder="Search items..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <select className="form-select" style={{width:180}} value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="all">All Items</option>
          <option value="healthy">🟢 Healthy</option>
          <option value="low">🟡 Low Stock</option>
          <option value="critical">🔴 Critical</option>
          <option value="out_of_stock">⚫ Out of Stock</option>
        </select>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Item</th><th>Category</th><th>Current Qty</th><th>AI Threshold</th><th>Health</th><th>Confidence</th><th>Action</th></tr></thead>
          <tbody>
            {filteredItems.length===0 ? <tr><td colSpan={7} style={{textAlign:'center',padding:32}} className="text-muted">No items match filter</td></tr> :
            filteredItems.map(item => {
              const hc = item.ai.healthConfig;
              const hasPending = state.reorderRequests.some(r=>r.stockId===item.id && r.status==='pending');
              return (
                <tr key={item.id}>
                  <td><div className="font-medium">{item.name}</div><div className="text-xs text-muted">{item.code} • {item.location}</div></td>
                  <td>{item.category}</td>
                  <td><span className={item.ai.health!=='healthy'?'text-danger font-semibold':''}>{item.quantity} {item.unit}</span></td>
                  <td><div className="flex items-center gap-2"><Brain size={14} style={{color:'var(--primary)',opacity:.7}}/><span className="font-medium">{item.ai.dynamicThreshold}</span></div></td>
                  <td><span className={`badge ${hc.badgeClass}`}>{hc.emoji} {hc.label}</span></td>
                  <td><div className="confidence-bar" style={{width:80}}><div className="confidence-fill" style={{width:`${item.ai.dataQuality}%`,background:item.ai.dataQuality>70?'var(--success)':'var(--warning)'}}/></div><span className="text-xs text-muted">{item.ai.dataQuality}%</span></td>
                  <td><div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={()=>{setSelectedItem(item);setOrderModal(false);}}><Brain size={14}/> Details</button>
                    {canPlaceOrder && item.ai.health!=='healthy' && (hasPending ? <span className="badge badge-info">Request Pending</span> : <button className="btn btn-primary btn-sm" onClick={()=>handleOpenOrder(item)}><ShoppingCart size={14}/> Place Order</button>)}
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* AI Details Modal */}
      {selectedItem && !orderModal && (
        <div className="modal-overlay" onClick={()=>setSelectedItem(null)}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title"><Brain size={20} style={{display:'inline',marginRight:8,color:'var(--primary)'}}/> AI Analysis — {selectedItem.name}</h2><button className="modal-close" onClick={()=>setSelectedItem(null)}>✕</button></div>
            <div className="modal-body">
              <div className="ai-analysis-header">
                <div className="ai-analysis-metric"><div className="text-sm text-muted">Health</div><span className={`badge ${selectedItem.ai.healthConfig.badgeClass}`} style={{fontSize:'.9rem',padding:'4px 14px'}}>{selectedItem.ai.healthConfig.emoji} {selectedItem.ai.healthConfig.label}</span></div>
                <div className="ai-analysis-metric"><div className="text-sm text-muted">Current Stock</div><div style={{fontSize:'1.5rem',fontWeight:700,color:selectedItem.ai.health!=='healthy'?'var(--danger)':'var(--success)'}}>{selectedItem.quantity} {selectedItem.unit}</div></div>
                <div className="ai-analysis-metric"><div className="text-sm text-muted">AI Threshold</div><div style={{fontSize:'1.5rem',fontWeight:700,color:'var(--primary)'}}>{selectedItem.ai.dynamicThreshold}</div></div>
                <div className="ai-analysis-metric"><div className="text-sm text-muted">Confidence</div><div style={{fontSize:'1.3rem',fontWeight:600}}>{selectedItem.ai.dataQuality}%</div><div className="confidence-bar" style={{width:100,marginTop:4}}><div className="confidence-fill" style={{width:`${selectedItem.ai.dataQuality}%`,background:selectedItem.ai.dataQuality>70?'var(--success)':'var(--warning)'}}/></div></div>
              </div>

              <div className="card mt-4" style={{background:'var(--gray-50)',border:'1px solid var(--border)'}}>
                <h4 className="text-sm font-semibold mb-2">Threshold Calculation Breakdown</h4>
                <div className="ai-breakdown-grid">
                  <div className="ai-breakdown-item"><span className="text-sm text-muted">Avg Daily Consumption</span><span className="font-semibold">{selectedItem.ai.avgDailyConsumption}/day</span></div>
                  <div className="ai-breakdown-item"><span className="text-sm text-muted">Avg Monthly Consumption</span><span className="font-semibold">{selectedItem.ai.avgMonthlyConsumption}/month</span></div>
                  <div className="ai-breakdown-item"><span className="text-sm text-muted">Lead Time</span><span className="font-semibold">{selectedItem.ai.leadTimeDays} days</span></div>
                  <div className="ai-breakdown-item"><span className="text-sm text-muted">Lead Time Demand</span><span className="font-semibold">{selectedItem.ai.leadTimeDemand}</span></div>
                  <div className="ai-breakdown-item"><span className="text-sm text-muted">Safety Stock</span><span className="font-semibold">{selectedItem.ai.safetyStock}</span></div>
                  <div className="ai-breakdown-item"><span className="text-sm text-muted">Distributions Analyzed</span><span className="font-semibold">{selectedItem.ai.distributionCount} ({selectedItem.ai.totalDistributed} total)</span></div>
                </div>
              </div>

              {consumptionChartData.length > 0 && <div className="mt-4"><h4 className="text-sm font-semibold mb-2">Distribution History</h4>
                <div className="chart-container" style={{height:200}}><ResponsiveContainer><BarChart data={consumptionChartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)"/><XAxis dataKey="date" tick={{fontSize:11}} stroke="var(--gray-400)"/><YAxis tick={{fontSize:11}} stroke="var(--gray-400)"/><Tooltip/><Bar dataKey="quantity" radius={[4,4,0,0]}>{consumptionChartData.map((_,i)=><Cell key={i} fill={i===consumptionChartData.length-1?'var(--primary)':'var(--primary-50)'}/>)}</Bar></BarChart></ResponsiveContainer></div>
              </div>}

              {selectedItem.ai.recommendation && <div className="ai-recommendation-card mt-4">
                <div className="flex items-center gap-2 mb-2"><Brain size={16} style={{color:'var(--primary)'}}/><h4 className="text-sm font-semibold">AI Recommendation</h4>{selectedItem.ai.recommendation.urgency==='urgent' && <span className="badge badge-rejected">⚡ Urgent</span>}</div>
                <p className="text-sm text-muted">{selectedItem.ai.recommendation.reasoning}</p>
                <div className="flex items-center gap-3 mt-4" style={{padding:12,background:'var(--primary-light)',borderRadius:'var(--radius)'}}>
                  <div><div className="text-xs text-muted">Suggested Reorder</div><div style={{fontSize:'1.5rem',fontWeight:700,color:'var(--primary)'}}>{selectedItem.ai.recommendation.suggestedQty} {selectedItem.unit}</div></div>
                </div>
              </div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setSelectedItem(null)}>Close</button>
              {canPlaceOrder && selectedItem.ai.health!=='healthy' && <button className="btn btn-primary" onClick={()=>handleOpenOrder(selectedItem)}><ShoppingCart size={16}/> Place Order Request</button>}
            </div>
          </div>
        </div>
      )}

      {/* Place Order Modal */}
      {orderModal && selectedItem && (
        <div className="modal-overlay" onClick={()=>{setOrderModal(false);setSelectedItem(null);}}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title"><ShoppingCart size={20} style={{display:'inline',marginRight:8,color:'var(--primary)'}}/> Place Order Request</h2><button className="modal-close" onClick={()=>{setOrderModal(false);setSelectedItem(null);}}>✕</button></div>
            <div className="modal-body">
              <div className="card mb-4" style={{background:'var(--gray-50)',border:'1px solid var(--border)'}}>
                <div className="form-row"><div className="form-group"><label className="form-label">Item</label><div className="text-sm font-semibold">{selectedItem.name}</div></div><div className="form-group"><label className="form-label">Code</label><div className="text-sm">{selectedItem.code}</div></div></div>
                <div className="form-row"><div className="form-group"><label className="form-label">Current Stock</label><div className="text-sm font-semibold text-danger">{selectedItem.quantity} {selectedItem.unit}</div></div><div className="form-group"><label className="form-label">AI Threshold</label><div className="text-sm font-semibold" style={{color:'var(--primary)'}}>{selectedItem.ai.dynamicThreshold}</div></div></div>
                <div className="form-group"><label className="form-label">AI Suggested Qty</label><div className="text-sm font-semibold" style={{color:'var(--success)'}}>{selectedItem.ai.recommendation?.suggestedQty || selectedItem.ai.dynamicThreshold} {selectedItem.unit}</div></div>
              </div>
              <div className="form-group"><label className="form-label">Requested Quantity *</label><input className="form-input" type="number" min="1" value={orderQty} onChange={e=>setOrderQty(e.target.value)}/><div className="form-hint">You may adjust the AI-suggested quantity</div></div>
              <div className="form-group"><label className="form-label">Remarks (Optional)</label><textarea className="form-textarea" value={orderRemarks} onChange={e=>setOrderRemarks(e.target.value)} placeholder="Notes for the approving manager..."/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>{setOrderModal(false);setSelectedItem(null);}}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePlaceOrder} disabled={!orderQty||parseInt(orderQty)<=0}><ShoppingCart size={16}/> Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
