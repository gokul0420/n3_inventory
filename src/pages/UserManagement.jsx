import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Users, Plus, Edit, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

export default function UserManagement() {
  const { state, dispatch, addNotification } = useApp();
  const { user: currentUser } = useAuth();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'executive', status: 'active' });

  const openCreate = () => { setForm({ name: '', email: '', role: 'executive', status: 'active' }); setModal('create'); };
  const openEdit = (u) => { setForm({ ...u }); setModal('edit'); };

  const handleSave = () => {
    if (modal === 'create') {
      const email = form.email.trim().toLowerCase();
      if (state.users.some(u => u.email?.toLowerCase() === email)) {
        addNotification('Already exists', `${email} is already in the system.`, 'danger');
        return;
      }
      // Admin invite: create a PENDING entry. The person signs up later to set
      // their password; their role is locked to what the admin chose here.
      dispatch({ type: 'ADD_PENDING_USER', payload: { name: form.name.trim(), email, role: form.role } });
      addNotification('User Invited', `${form.name} added as ${form.role}. They can now sign up to set their password.`, 'success');
    } else if (form.pending) {
      // Editing an invite that hasn't signed up yet → update the pending row.
      dispatch({ type: 'UPDATE_PENDING_USER', payload: { email: form.email, name: form.name.trim(), role: form.role } });
      addNotification('Invite Updated', `${form.name} updated`, 'info');
    } else {
      dispatch({ type: 'UPDATE_USER', payload: { id: form.id, name: form.name.trim(), role: form.role, status: form.status } });
      addNotification('User Updated', `${form.name} updated`, 'info');
    }
    setModal(null);
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
      <div className="page-header"><div><h1 className="page-title">User Management</h1><p className="page-subtitle">Manage users and assign roles</p></div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16}/> Add User</button>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{state.users.map(u => (
            <tr key={u.id}>
              <td><div className="flex items-center gap-3"><div className="user-avatar" style={{width:32,height:32,fontSize:'.75rem'}}>{u.avatar}</div><span className="font-medium">{u.name}</span></div></td>
              <td>{u.email}</td>
              <td><span className="badge badge-info">{u.role}</span></td>
              <td><span className={`badge ${u.status==='active'?'badge-active':u.status==='pending'?'badge-warning':'badge-inactive'}`}>{u.status}</span></td>
              <td><div className="table-actions" style={{ display:'flex', gap:6, alignItems:'center' }}>
                <button className="btn btn-ghost btn-sm" title="Edit user" onClick={() => openEdit(u)}><Edit size={14}/></button>
                <button className="btn btn-ghost btn-sm" title={u.status==='active'?'Deactivate':'Activate'} onClick={() => toggleStatus(u)}>{u.status==='active'?<ToggleRight size={14} style={{color:'var(--success)'}}/>:<ToggleLeft size={14}/>}</button>
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
            <div className="form-group"><label className="form-label">Role</label><select className="form-select" value={form.role} onChange={e => setForm({...form, role: e.target.value})}><option value="executive">Executive</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
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
