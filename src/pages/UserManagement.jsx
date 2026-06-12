import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Users, Plus, Edit, ToggleLeft, ToggleRight, Trash2, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function UserManagement() {
  const { state, dispatch, addNotification } = useApp();
  const { user: currentUser } = useAuth();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'executive', status: 'active', departmentId: '', managerId: '', employeeId: '' });
  const empFileRef = React.useRef();

  const departments = state.departments || [];
  const deptName = (id) => departments.find(d => d.id === id)?.name || '—';
  const userName = (id) => state.users.find(u => u.id === id)?.name || '—';
  // Registered (non-pending) managers in a given department — valid to assign.
  const managersIn = (deptId) => state.users.filter(u => u.role === 'manager' && !u.pending && u.departmentId === deptId);

  const openCreate = () => { setForm({ name: '', email: '', role: 'executive', status: 'active', departmentId: '', managerId: '', employeeId: '' }); setModal('create'); };
  const openEmployee = () => { setForm({ name: '', email: '', role: 'employee', status: 'active', departmentId: '', managerId: '', employeeId: '' }); setModal('create'); };
  const openEdit = (u) => { setForm({ ...u, departmentId: u.departmentId || '', managerId: u.managerId || '', employeeId: u.employeeId || '' }); setModal('edit'); };

  // Hierarchy rules: managers & executives need a department; executives also
  // need a manager; employees need an Employee ID.
  const validateMapping = () => {
    if ((form.role === 'manager' || form.role === 'executive') && !form.departmentId) {
      addNotification('Department required', `A ${form.role} must be assigned to a department.`, 'danger');
      return false;
    }
    if (form.role === 'executive' && !form.managerId) {
      addNotification('Manager required', 'An executive must be mapped to a manager in their department.', 'danger');
      return false;
    }
    if (form.role === 'employee' && !form.employeeId.trim()) {
      addNotification('Employee ID required', 'An employee must have an Employee ID.', 'danger');
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validateMapping()) return;
    const dept = (form.role === 'admin' || form.role === 'employee') ? null : (form.departmentId || null);
    const mgr = form.role === 'executive' ? (form.managerId || null) : null;
    const empId = form.role === 'employee' ? form.employeeId.trim() : null;

    if (modal === 'create') {
      const email = form.email.trim().toLowerCase();
      if (state.users.some(u => u.email?.toLowerCase() === email)) {
        addNotification('Already exists', `${email} is already in the system.`, 'danger');
        return;
      }
      dispatch({ type: 'ADD_PENDING_USER', payload: { name: form.name.trim(), email, role: form.role, departmentId: dept, managerId: mgr, employeeId: empId } });
      addNotification('User Invited', `${form.name} added as ${form.role}. They can now sign up to set their password.`, 'success');
    } else if (form.pending) {
      dispatch({ type: 'UPDATE_PENDING_USER', payload: { email: form.email, name: form.name.trim(), role: form.role, departmentId: dept, managerId: mgr, employeeId: empId } });
      addNotification('Invite Updated', `${form.name} updated`, 'info');
    } else {
      dispatch({ type: 'UPDATE_USER', payload: { id: form.id, name: form.name.trim(), role: form.role, status: form.status, departmentId: dept, managerId: mgr, employeeId: empId } });
      addNotification('User Updated', `${form.name} updated`, 'info');
    }
    setModal(null);
  };

  // Bulk-add employees from an Excel file with columns: Employee ID, Name, Email
  const handleEmployeeBulk = async (file) => {
    try {
      const wb = XLSX.read(await file.arrayBuffer());
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      let added = 0, skipped = 0;
      rows.forEach(r => {
        const email = (r['Email'] || r['Email ID'] || '').toString().trim().toLowerCase();
        const empId = (r['Employee ID'] || r['EmployeeID'] || '').toString().trim();
        const name = (r['Name'] || '').toString().trim();
        if (!email || !empId || !name) { skipped++; return; }
        if (state.users.some(u => u.email?.toLowerCase() === email)) { skipped++; return; }
        dispatch({ type: 'ADD_PENDING_USER', payload: { name, email, role: 'employee', departmentId: null, managerId: null, employeeId: empId } });
        added++;
      });
      addNotification('Bulk Employees', `${added} employee(s) invited${skipped ? `, ${skipped} skipped (missing fields/duplicates)` : ''}.`, added ? 'success' : 'info');
    } catch (e) { addNotification('Upload Failed', e.message, 'danger'); }
    if (empFileRef.current) empFileRef.current.value = '';
  };

  const toggleStatus = (u) => {
    if (u.pending) {
      addNotification('Not signed up yet', `${u.name} hasn't signed up yet — no account to activate.`, 'info');
      return;
    }
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    dispatch({ type: 'UPDATE_USER', payload: { id: u.id, status: newStatus } });
    addNotification('User Updated', `${u.name} ${newStatus}`, 'info');
  };

  const handleDelete = (u) => {
    if (u.id === currentUser?.id) {
      addNotification('Action blocked', "You can't remove your own account while signed in.", 'danger');
      return;
    }
    const label = u.pending ? `Cancel the invite for ${u.name} (${u.email})?` : `Remove ${u.name} (${u.email})? They will lose access to the app.`;
    if (!window.confirm(label)) return;
    if (u.pending) {
      dispatch({ type: 'DELETE_PENDING_USER', payload: u.email });
      addNotification('Invite Cancelled', `${u.name}'s invite was removed`, 'info');
    } else {
      dispatch({ type: 'DELETE_USER', payload: u.id });
      addNotification('User Removed', `${u.name} has been removed`, 'info');
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header"><div><h1 className="page-title">User Management</h1><p className="page-subtitle">Manage users, roles and employees</p></div>
        <div className="page-actions" style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={openEmployee}><Plus size={16}/> Add Employee</button>
          <button className="btn btn-secondary" onClick={() => empFileRef.current?.click()}><Upload size={16}/> Bulk Employees</button>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16}/> Add User</button>
        </div>
        <input ref={empFileRef} type="file" accept=".xlsx,.xls" style={{ display:'none' }} onChange={e => e.target.files[0] && handleEmployeeBulk(e.target.files[0])} />
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Dept / Emp ID</th><th>Manager</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{state.users.map(u => (
            <tr key={u.id}>
              <td><div className="flex items-center gap-3"><div className="user-avatar" style={{width:32,height:32,fontSize:'.75rem'}}>{u.avatar}</div><span className="font-medium">{u.name}</span></div></td>
              <td>{u.email}</td>
              <td><span className="badge badge-info">{u.role}</span></td>
              <td className="text-sm">{u.role==='employee' ? `ID: ${u.employeeId || '—'}` : u.role==='admin' ? '—' : deptName(u.departmentId)}</td>
              <td className="text-sm">{u.role==='executive' ? userName(u.managerId) : '—'}</td>
              <td><span className={`badge ${u.status==='active'?'badge-active':u.status==='pending'?'badge-warning':'badge-inactive'}`}>{u.pending ? 'awaiting sign-up' : u.status}</span></td>
              <td><div className="table-actions" style={{ display:'flex', gap:6, alignItems:'center' }}>
                <button className="btn btn-ghost btn-sm" title="Edit user" onClick={() => openEdit(u)}><Edit size={14}/></button>
                {u.pending ? (
                  <span className="text-xs text-muted" title="This user must sign up to set their password — no activation needed" style={{ minWidth: 90 }}>Invited · can sign up</span>
                ) : (
                  <button className="btn btn-ghost btn-sm" title={u.status==='active'?'Deactivate':'Activate'} onClick={() => toggleStatus(u)}>{u.status==='active'?<ToggleRight size={14} style={{color:'var(--success)'}}/>:<ToggleLeft size={14}/>}</button>
                )}
                <button className="btn btn-sm" onClick={() => handleDelete(u)} style={{ display:'inline-flex', alignItems:'center', gap:4, color:'#fff', background:'var(--danger)', borderColor:'var(--danger)' }}><Trash2 size={14}/> Remove</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}><div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header"><h2 className="modal-title">{modal==='create'?'Add User':'Edit User'}</h2><button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Enter name"/></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} disabled={modal==='edit'} onChange={e => setForm({...form, email: e.target.value})} placeholder="Enter email"/></div>
            <div className="form-group"><label className="form-label">Role</label><select className="form-select" value={form.role} onChange={e => setForm({...form, role: e.target.value, managerId: ''})}><option value="executive">Executive</option><option value="manager">Manager</option><option value="admin">Admin</option><option value="employee">Employee</option></select></div>
            {form.role === 'employee' && (
              <div className="form-group"><label className="form-label">Employee ID</label><input className="form-input" value={form.employeeId} disabled={modal==='edit'} onChange={e => setForm({...form, employeeId: e.target.value})} placeholder="e.g. EMP1001"/></div>
            )}
            {form.role !== 'admin' && form.role !== 'employee' && (
              <div className="form-group"><label className="form-label">Department</label>
                <select className="form-select" value={form.departmentId || ''} onChange={e => setForm({...form, departmentId: e.target.value, managerId: ''})}>
                  <option value="">— Select department —</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            {form.role === 'executive' && (
              <div className="form-group"><label className="form-label">Assigned Manager</label>
                <select className="form-select" value={form.managerId || ''} disabled={!form.departmentId} onChange={e => setForm({...form, managerId: e.target.value})}>
                  <option value="">{form.departmentId ? '— Select manager —' : 'Select a department first'}</option>
                  {managersIn(form.departmentId).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {form.departmentId && managersIn(form.departmentId).length === 0 && (
                  <p className="text-sm" style={{ color:'var(--danger)', marginTop:4 }}>No active managers in this department yet. Add &amp; have a manager sign up first.</p>
                )}
              </div>
            )}
            {modal==='edit' && !form.pending && (
              <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status || 'active'} onChange={e => setForm({...form, status: e.target.value})}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
            )}
            {modal==='create' && (
              <p className="text-sm text-muted" style={{ background:'var(--info-light)', padding:'10px 12px', borderRadius:'var(--radius)' }}>
                The user will appear as <strong>Pending</strong> until they sign up. On the Sign Up screen they only set their password — their role is fixed to what you choose here.
              </p>
            )}
          </div>
          <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={!form.name||!form.email}>Save</button></div>
        </div></div>
      )}
    </div>
  );
}
