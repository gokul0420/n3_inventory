import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Users, Plus, Edit, ToggleLeft, ToggleRight } from 'lucide-react';

export default function UserManagement() {
  const { state, dispatch, addNotification } = useApp();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'executive', status: 'active' });

  const openCreate = () => { setForm({ name: '', email: '', role: 'executive', status: 'active' }); setModal('create'); };
  const openEdit = (u) => { setForm({ ...u }); setModal('edit'); };

  const handleSave = () => {
    if (modal === 'create') { dispatch({ type: 'ADD_USER', payload: { ...form, id: Date.now(), avatar: form.name.split(' ').map(n=>n[0]).join(''), password: null, status: 'pending' } }); addNotification('User Created', `${form.name} added — they can now sign up to set their password`, 'success'); }
    else { dispatch({ type: 'UPDATE_USER', payload: form }); addNotification('User Updated', `${form.name} updated`, 'info'); }
    setModal(null);
  };

  const toggleStatus = (u) => {
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    dispatch({ type: 'UPDATE_USER', payload: { id: u.id, status: newStatus } });
    addNotification('User Updated', `${u.name} ${newStatus}`, 'info');
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
              <td><div className="table-actions"><button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}><Edit size={14}/></button><button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(u)}>{u.status==='active'?<ToggleRight size={14} style={{color:'var(--success)'}}/>:<ToggleLeft size={14}/>}</button></div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}><div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header"><h2 className="modal-title">{modal==='create'?'Add User':'Edit User'}</h2><button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Enter name"/></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Enter email"/></div>
            <div className="form-group"><label className="form-label">Role</label><select className="form-select" value={form.role} onChange={e => setForm({...form, role: e.target.value})}><option value="executive">Executive</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
          </div>
          <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={!form.name||!form.email}>Save</button></div>
        </div></div>
      )}
    </div>
  );
}
