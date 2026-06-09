import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { stockItems as initialStock, distributions as initialDist, auditLogs as initialAudit, notifications as initialNotifs, employeeAllocations as initialEmpAllocs, reorderRequests as initialReorderRequests } from '../data/mockData.js';
import { getAllUsers, addUser as storeAddUser, updateUser as storeUpdateUser } from '../data/userStore.js';

const AppContext = createContext(null);

const initialState = {
  stockItems: initialStock,
  distributions: initialDist,
  auditLogs: initialAudit,
  notifications: initialNotifs,
  employeeAllocations: initialEmpAllocs,
  reorderRequests: initialReorderRequests,
  users: getAllUsers(),
  loading: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_STOCK': return { ...state, stockItems: action.payload };
    case 'ADD_STOCK': return { ...state, stockItems: [...state.stockItems, ...action.payload] };
    case 'UPDATE_STOCK': return { ...state, stockItems: state.stockItems.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) };
    case 'DELETE_STOCK': return { ...state, stockItems: state.stockItems.map(s => s.id === action.payload ? { ...s, status: 'deleted' } : s) };
    case 'ADD_DISTRIBUTION': return { ...state, distributions: [...state.distributions, action.payload] };
    case 'UPDATE_DISTRIBUTION': return { ...state, distributions: state.distributions.map(d => d.id === action.payload.id ? { ...d, ...action.payload } : d) };
    case 'DELETE_DISTRIBUTION': return { ...state, distributions: state.distributions.filter(d => d.id !== action.payload) };
    case 'ADD_EMPLOYEE_ALLOCATION': return { ...state, employeeAllocations: [...state.employeeAllocations, action.payload] };
    case 'UPDATE_EMPLOYEE_ALLOCATION': return { ...state, employeeAllocations: state.employeeAllocations.map(a => a.id === action.payload.id ? { ...a, ...action.payload } : a) };
    case 'ADD_REORDER_REQUEST': return { ...state, reorderRequests: [...state.reorderRequests, action.payload] };
    case 'UPDATE_REORDER_REQUEST': return { ...state, reorderRequests: state.reorderRequests.map(r => r.id === action.payload.id ? { ...r, ...action.payload } : r) };
    case 'ADD_AUDIT': return { ...state, auditLogs: [...state.auditLogs, action.payload] };
    case 'MARK_NOTIF_READ': return { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) };
    case 'ADD_NOTIFICATION': return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'UPDATE_USER': {
      storeUpdateUser(action.payload);
      return { ...state, users: getAllUsers().slice() };
    }
    case 'ADD_USER': {
      storeAddUser(action.payload);
      return { ...state, users: getAllUsers().slice() };
    }
    case 'SET_LOADING': return { ...state, loading: action.payload };
    default: return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addAuditLog = useCallback((entityType, entityId, action, userName, remarks) => {
    dispatch({ type: 'ADD_AUDIT', payload: { id: Date.now(), entityType, entityId, action, user: userName, date: new Date().toISOString(), remarks } });
  }, []);

  const addNotification = useCallback((title, message, type = 'info') => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: { id: Date.now(), title, message, time: 'Just now', read: false, type } });
  }, []);

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

