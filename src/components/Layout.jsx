import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { LayoutDashboard, Package, Upload, Truck, ClipboardCheck, AlertTriangle, BarChart3, History, Users, Settings, Workflow, ChevronLeft, ChevronRight, Bell, LogOut, Menu, X, Search, FileSpreadsheet, Inbox, Download, ShoppingCart } from 'lucide-react';

const navConfig = {
  executive: [
    { section: 'Overview' },
    { to: '/executive', icon: LayoutDashboard, label: 'Dashboard' },
    { section: 'Inventory' },
    { to: '/stock', icon: Package, label: 'Stock Master' },
    { to: '/stock/upload', icon: Upload, label: 'Upload Stock' },
    { section: 'Distribution' },
    { to: '/distributions', icon: Truck, label: 'Distributions' },
    { to: '/distributions/create', icon: FileSpreadsheet, label: 'New Distribution' },
    { to: '/emp-distribution', icon: Users, label: 'Emp. Distribution' },
    { section: 'Intelligence' },
    { to: '/low-stock', icon: AlertTriangle, label: 'AI Stock Intelligence' },
    { to: '/reorder-requests', icon: ShoppingCart, label: 'My Reorder Requests' },
    { section: 'Analytics' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
    { to: '/audit', icon: History, label: 'Audit Trail' },
    { section: 'Resources' },
    { to: '/templates', icon: Download, label: 'Template Center' },
  ],
  manager: [
    { section: 'Overview' },
    { to: '/manager', icon: LayoutDashboard, label: 'Dashboard' },
    { section: 'Approvals' },
    { to: '/approvals', icon: ClipboardCheck, label: 'Approvals' },
    { to: '/emp-approvals', icon: Users, label: 'Emp. Approvals' },
    { to: '/reorder-approvals', icon: ShoppingCart, label: 'Reorder Approvals' },
    { section: 'Intelligence' },
    { to: '/low-stock', icon: AlertTriangle, label: 'AI Stock Intelligence' },
    { section: 'Analytics' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
    { to: '/audit', icon: History, label: 'Audit Trail' },
    { section: 'Resources' },
    { to: '/templates', icon: Download, label: 'Template Center' },
  ],
  admin: [
    { section: 'Overview' },
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { section: 'Inventory' },
    { to: '/stock', icon: Package, label: 'Stock Master' },
    { to: '/stock/upload', icon: Upload, label: 'Upload Stock' },
    { section: 'Distribution' },
    { to: '/distributions', icon: Truck, label: 'Distributions' },
    { section: 'Approvals' },
    { to: '/approvals', icon: ClipboardCheck, label: 'Approvals' },
    { to: '/reorder-approvals', icon: ShoppingCart, label: 'Reorder Approvals' },
    { section: 'Intelligence' },
    { to: '/low-stock', icon: AlertTriangle, label: 'AI Stock Intelligence' },
    { section: 'Analytics' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
    { to: '/audit', icon: History, label: 'Audit Trail' },
    { section: 'Administration' },
    { to: '/users', icon: Users, label: 'User Management' },
    { to: '/workflow', icon: Workflow, label: 'Workflow Config' },
    { to: '/settings', icon: Settings, label: 'System Settings' },
    { section: 'Resources' },
    { to: '/templates', icon: Download, label: 'Template Center' },
  ],
  employee: [
    { section: 'Overview' },
    { to: '/employee', icon: LayoutDashboard, label: 'Dashboard' },
    { section: 'Allocations' },
    { to: '/employee/allocations', icon: Inbox, label: 'My Allocations' },
  ],
};

const breadcrumbMap = {
  '/executive': ['Dashboard'],
  '/manager': ['Dashboard'],
  '/admin': ['Dashboard'],
  '/employee': ['Dashboard'],
  '/stock': ['Inventory', 'Stock Master'],
  '/stock/upload': ['Inventory', 'Upload Stock'],
  '/distributions': ['Distribution', 'List'],
  '/distributions/create': ['Distribution', 'Create'],
  '/distributions/upload': ['Distribution', 'Bulk Upload'],
  '/emp-distribution': ['Distribution', 'Employee Distribution'],
  '/approvals': ['Approvals', 'Dashboard'],
  '/emp-approvals': ['Approvals', 'Employee Allocations'],
  '/low-stock': ['Intelligence', 'AI Stock Intelligence'],
  '/reorder-requests': ['Intelligence', 'My Reorder Requests'],
  '/reorder-approvals': ['Approvals', 'Reorder Approvals'],
  '/reports': ['Analytics', 'Reports'],
  '/audit': ['Analytics', 'Audit Trail'],
  '/users': ['Admin', 'User Management'],
  '/workflow': ['Admin', 'Workflow Config'],
  '/settings': ['Admin', 'System Settings'],
  '/employee/allocations': ['Allocations', 'My Allocations'],
  '/templates': ['Resources', 'Template Center'],
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const { user, logout } = useAuth();
  const { state, dispatch } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const nav = navConfig[user?.role] || [];
  const crumbs = breadcrumbMap[location.pathname] || ['Page'];
  const unreadCount = state.notifications.filter(n => !n.read).length;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-layout">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#2563EB"/><path d="M8 22V10l8 6-8 6z" fill="white"/><path d="M16 22V10l8 6-8 6z" fill="white" opacity="0.6"/></svg>
          <span>Mavericks</span>
        </div>
        <nav className="sidebar-nav">
          {nav.map((item, i) =>
            item.section ? (
              <div key={i} className="nav-section-title">{item.section}</div>
            ) : (
              <NavLink key={item.to} to={item.to} end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <item.icon size={20} />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            )
          )}
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-toggle" onClick={handleLogout}>
            <LogOut size={20} />
            {!collapsed && <span>Logout</span>}
          </button>
          <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)} style={{ marginTop: 4 }}>
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <div className="main-area" style={{ marginLeft: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-w)' }}>
        <header className="header">
          <div className="header-left">
            <div className="breadcrumbs">
              <span>Mavericks</span>
              {crumbs.map((c, i) => (
                <React.Fragment key={i}>
                  <span style={{ color: 'var(--gray-300)' }}>/</span>
                  <span className={i === crumbs.length - 1 ? 'current' : ''}>{c}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="header-right">
            <div style={{ position: 'relative' }}>
              <button className="notification-btn" onClick={() => setShowNotifs(!showNotifs)}>
                <Bell size={20} />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>
              {showNotifs && (
                <div className="notification-dropdown">
                  <div className="notification-dropdown-header">
                    <span className="font-semibold">Notifications</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => state.notifications.forEach(n => dispatch({ type: 'MARK_NOTIF_READ', payload: n.id }))}>Mark all read</button>
                  </div>
                  <div className="notification-list">
                    {state.notifications.map(n => (
                      <div key={n.id} className={`notification-item ${!n.read ? 'unread' : ''}`} onClick={() => dispatch({ type: 'MARK_NOTIF_READ', payload: n.id })}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.type === 'success' ? 'var(--success)' : n.type === 'warning' ? 'var(--warning)' : n.type === 'danger' ? 'var(--danger)' : 'var(--info)', marginTop: 6, flexShrink: 0 }} />
                        <div>
                          <div className="font-medium text-sm">{n.title}</div>
                          <div className="text-xs text-muted">{n.message}</div>
                          <div className="text-xs text-muted" style={{ marginTop: 2 }}>{n.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button className="user-menu" onClick={() => {}}>
              <div className="user-avatar">{user?.avatar}</div>
              <div className="user-info">
                <div className="user-name">{user?.name}</div>
                <div className="user-role">{user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}</div>
              </div>
            </button>
          </div>
        </header>
        <div className="page-content fade-in">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
