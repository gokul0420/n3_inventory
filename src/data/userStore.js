// Shared mutable user store — both AuthContext and AppContext reference this
// so that admin-added users are visible to the login/signup flow.
import { users as seedUsers } from './mockData.js';

const STORAGE_KEY = 'mavericks_users';

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // Merge: seed users as base, overwrite with saved versions, append any saved extras
      const seedMap = new Map(seedUsers.map(u => [u.email, u]));
      const savedMap = new Map(saved.map(u => [u.email, u]));
      // Start with seed, overriding with saved state for existing users
      seedUsers.forEach(u => seedMap.set(u.email, { ...u, ...savedMap.get(u.email) }));
      // Append any extra users added via admin (not in seed)
      saved.forEach(u => { if (!seedUsers.find(s => s.email === u.email)) seedMap.set(u.email, u); });
      return [...seedMap.values()];
    }
  } catch { /* ignore */ }
  return [...seedUsers];
}

function persist(store) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch { /* ignore */ }
}

const userStore = loadStore();

export function getAllUsers() {
  return userStore;
}

export function addUser(user) {
  const existing = userStore.find(u => u.email === user.email);
  if (!existing) {
    userStore.push(user);
    persist(userStore);
  }
}

export function updateUser(updatedFields) {
  const idx = userStore.findIndex(u => u.id === updatedFields.id);
  if (idx !== -1) {
    userStore[idx] = { ...userStore[idx], ...updatedFields };
    persist(userStore);
  }
}

export function findUserByEmail(email) {
  return userStore.find(u => u.email === email);
}

export function findUserByEmployeeId(employeeId) {
  return userStore.find(u => u.employeeId === employeeId && u.role === 'employee');
}
