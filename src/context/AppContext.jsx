import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { analyzeAllStock } from '../utils/aiEngine.js';
import { sendCriticalStockAlert, getEmailConfig } from '../utils/emailService.js';
import { useAuth } from './AuthContext.jsx';
import { loadAll, subscribeAll, insertRow, insertRows, updateRow, deleteRow, pendingToUser } from '../data/api.js';

const AppContext = createContext(null);

const initialState = {
  stockItems: [],
  distributions: [],
  auditLogs: [],
  notifications: [],
  employeeAllocations: [],
  reorderRequests: [],
  users: [],
  loading: true,
};

// Map a realtime/persistence table name to the matching state collection key.
const TABLE_TO_KEY = {
  stock_items: 'stockItems',
  distributions: 'distributions',
  reorder_requests: 'reorderRequests',
  employee_allocations: 'employeeAllocations',
  notifications: 'notifications',
  profiles: 'users',
};

// Insert-or-replace by id — keeps state idempotent when realtime echoes our own writes.
const upsert = (list, item) => {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [item, ...list];
  const next = [...list];
  next[i] = { ...next[i], ...item };
  return next;
};

function relativeTime(iso) {
  if (!iso) return 'Just now';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  return `${Math.floor(h / 24)} day(s) ago`;
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_ALL': return { ...state, ...action.payload, loading: false };
    case 'SET_STOCK': return { ...state, stockItems: action.payload };
    case 'ADD_STOCK': return { ...state, stockItems: action.payload.reduce(upsert, state.stockItems) };
    case 'UPDATE_STOCK': return { ...state, stockItems: state.stockItems.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) };
    case 'DELETE_STOCK': return { ...state, stockItems: state.stockItems.map(s => s.id === action.payload ? { ...s, status: 'deleted' } : s) };
    case 'ADD_DISTRIBUTION': return { ...state, distributions: upsert(state.distributions, action.payload) };
    case 'UPDATE_DISTRIBUTION': return { ...state, distributions: state.distributions.map(d => d.id === action.payload.id ? { ...d, ...action.payload } : d) };
    case 'DELETE_DISTRIBUTION': return { ...state, distributions: state.distributions.filter(d => d.id !== action.payload) };
    case 'ADD_EMPLOYEE_ALLOCATION': return { ...state, employeeAllocations: upsert(state.employeeAllocations, action.payload) };
    case 'UPDATE_EMPLOYEE_ALLOCATION': return { ...state, employeeAllocations: state.employeeAllocations.map(a => a.id === action.payload.id ? { ...a, ...action.payload } : a) };
    case 'ADD_REORDER_REQUEST': return { ...state, reorderRequests: upsert(state.reorderRequests, action.payload) };
    case 'UPDATE_REORDER_REQUEST': return { ...state, reorderRequests: state.reorderRequests.map(r => r.id === action.payload.id ? { ...r, ...action.payload } : r) };
    case 'ADD_AUDIT': return { ...state, auditLogs: [action.payload, ...state.auditLogs] };
    case 'MARK_NOTIF_READ': return { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) };
    case 'ADD_NOTIFICATION': return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'UPDATE_USER': return { ...state, users: state.users.map(u => u.id === action.payload.id ? { ...u, ...action.payload } : u) };
    case 'ADD_USER': return { ...state, users: upsert(state.users, action.payload) };
    case 'DELETE_USER': return { ...state, users: state.users.filter(u => u.id !== action.payload) };
    case 'ADD_PENDING_USER': {
      const p = action.payload;
      const row = { id: 'P_' + p.email, email: p.email, name: p.name, role: p.role, status: 'pending', pending: true, avatar: (p.name || p.email).replace(/\s/g, '').slice(0, 2).toUpperCase() };
      return { ...state, users: upsert(state.users, row) };
    }
    case 'UPDATE_PENDING_USER': return { ...state, users: state.users.map(u => u.id === 'P_' + action.payload.email ? { ...u, ...action.payload } : u) };
    case 'DELETE_PENDING_USER': return { ...state, users: state.users.filter(u => u.id !== 'P_' + action.payload) };
    // Realtime-driven collection mutations
    case 'RT_UPSERT': {
      const key = action.key;
      const item = key === 'notifications' ? { time: relativeTime(action.row.createdAt), ...action.row } : action.row;
      return { ...state, [key]: upsert(state[key], item) };
    }
    case 'RT_DELETE': {
      const key = action.key;
      return { ...state, [key]: state[key].filter(x => x.id !== action.row.id) };
    }
    case 'SET_LOADING': return { ...state, loading: action.payload };
    default: return state;
  }
}

// Translate a mutating action into a Supabase write. Fire-and-forget; realtime
// reconciles the authoritative row. Returns a promise (errors are logged).
async function persist(action) {
  switch (action.type) {
    case 'ADD_STOCK': return insertRows('stock_items', action.payload);
    case 'UPDATE_STOCK': return updateRow('stock_items', action.payload.id, action.payload);
    case 'DELETE_STOCK': return updateRow('stock_items', action.payload, { status: 'deleted' });
    case 'ADD_DISTRIBUTION': return insertRow('distributions', action.payload);
    case 'UPDATE_DISTRIBUTION': return updateRow('distributions', action.payload.id, action.payload);
    case 'DELETE_DISTRIBUTION': return deleteRow('distributions', action.payload);
    case 'ADD_EMPLOYEE_ALLOCATION': return insertRow('employee_allocations', action.payload);
    case 'UPDATE_EMPLOYEE_ALLOCATION': return updateRow('employee_allocations', action.payload.id, action.payload);
    case 'ADD_REORDER_REQUEST': return insertRow('reorder_requests', action.payload);
    case 'UPDATE_REORDER_REQUEST': return updateRow('reorder_requests', action.payload.id, action.payload);
    case 'ADD_AUDIT': return insertRow('audit_logs', { entityType: action.payload.entityType, entityId: action.payload.entityId, action: action.payload.action, user: action.payload.user, date: action.payload.date, remarks: action.payload.remarks });
    case 'ADD_NOTIFICATION': return insertRow('notifications', { title: action.payload.title, message: action.payload.message, type: action.payload.type, read: !!action.payload.read });
    case 'MARK_NOTIF_READ': return updateRow('notifications', action.payload, { read: true });
    case 'UPDATE_USER': return updateRow('profiles', action.payload.id, action.payload);
    case 'DELETE_USER': return deleteRow('profiles', action.payload);
    // Admin invite flow: admin pre-adds a user; they sign up later to set a password.
    case 'ADD_PENDING_USER': return insertRow('pending_users', { email: action.payload.email, name: action.payload.name, role: action.payload.role });
    case 'UPDATE_PENDING_USER': return updateRow('pending_users', action.payload.email, { name: action.payload.name, role: action.payload.role }, 'email');
    case 'DELETE_PENDING_USER': return deleteRow('pending_users', action.payload, 'email');
    case 'ADD_USER':
      console.warn('[AppContext] ADD_USER is local-only — use ADD_PENDING_USER for the invite flow.');
      return null;
    default: return null;
  }
}

// Actions whose local effect should wait for realtime instead of optimistic add
// (avoids a duplicate row appearing with a temp id before the DB id arrives).
const REALTIME_ONLY = new Set(['ADD_NOTIFICATION']);

export function AppProvider({ children }) {
  const [state, rawDispatch] = useReducer(reducer, initialState);
  const { user, authReady } = useAuth();

  // Load all data + open realtime once the user is authenticated.
  useEffect(() => {
    if (!authReady || !user) return;
    let cleanup = () => {};
    let cancelled = false;
    (async () => {
      const data = await loadAll();
      if (cancelled) return;
      data.notifications = data.notifications.map(n => ({ time: relativeTime(n.createdAt), ...n }));
      rawDispatch({ type: 'LOAD_ALL', payload: data });
      cleanup = subscribeAll((table, eventType, row) => {
        // pending_users → render as a 'pending' user row keyed by P_<email>
        if (table === 'pending_users') {
          const u = pendingToUser({ email: row.email, name: row.name, role: row.role });
          if (eventType === 'DELETE') rawDispatch({ type: 'RT_DELETE', key: 'users', row: u });
          else rawDispatch({ type: 'RT_UPSERT', key: 'users', row: u });
          return;
        }
        const key = TABLE_TO_KEY[table];
        if (!key) return;
        if (eventType === 'DELETE') rawDispatch({ type: 'RT_DELETE', key, row });
        else rawDispatch({ type: 'RT_UPSERT', key, row });
      });
    })();
    return () => { cancelled = true; cleanup(); };
  }, [authReady, user]);

  // Public dispatch: optimistic local update + persist to Supabase.
  const dispatch = useCallback((action) => {
    if (!REALTIME_ONLY.has(action.type)) rawDispatch(action);
    persist(action).catch(err => console.error('[persist]', err));
  }, []);

  const addAuditLog = useCallback((entityType, entityId, action, userName, remarks) => {
    dispatch({ type: 'ADD_AUDIT', payload: { id: Date.now(), entityType, entityId, action, user: userName, date: new Date().toISOString(), remarks } });
  }, [dispatch]);

  const addNotification = useCallback((title, message, type = 'info') => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: { id: Date.now(), title, message, time: 'Just now', read: false, type } });
  }, [dispatch]);

  // ── Critical-stock email trigger (unchanged logic) ────────────────────────
  const prevCriticalIds = useRef(null);
  useEffect(() => {
    if (state.loading) return;
    const analyzed = analyzeAllStock(state.stockItems, state.distributions, state.auditLogs);
    const currentCriticalMap = new Map(
      analyzed
        .filter(item => item.ai.health === 'critical' || item.ai.health === 'out_of_stock')
        .map(item => [item.id, item])
    );
    if (prevCriticalIds.current === null) {
      prevCriticalIds.current = new Set(currentCriticalMap.keys());
      return;
    }
    const newlyCritical = [...currentCriticalMap.values()].filter(
      item => !prevCriticalIds.current.has(item.id)
    );
    if (newlyCritical.length > 0) {
      const config = getEmailConfig();
      if (config.enabled) {
        const executives = state.users.filter(u =>
          u.role === 'executive' && u.email && u.status === 'active'
        );
        newlyCritical.forEach(item => {
          executives.forEach(exec => { sendCriticalStockAlert(exec, item, item.ai.health); });
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              id: Date.now() + Math.random(),
              title: `Critical Stock: ${item.name}`,
              message: `${item.name} dropped to ${item.ai.health === 'out_of_stock' ? 'Out of Stock' : 'Critical'} (${item.quantity} ${item.unit}). Email alerts sent.`,
              time: 'Just now', read: false, type: 'danger',
            },
          });
        });
      }
    }
    prevCriticalIds.current = new Set(currentCriticalMap.keys());
  }, [state.stockItems, state.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppContext.Provider value={{ state, dispatch, addAuditLog, addNotification }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
