// Shared mutable user store — both AuthContext and AppContext reference this
// so that admin-added users are visible to the login/signup flow.
import { users as seedUsers } from './mockData.js';

// Clone the seed data so mutations don't affect the original export
const userStore = [...seedUsers];

export function getAllUsers() {
  return userStore;
}

export function addUser(user) {
  // Prevent duplicates (React StrictMode calls reducers twice)
  const existing = userStore.find(u => u.email === user.email);
  if (!existing) {
    userStore.push(user);
  }
}

export function updateUser(updatedFields) {
  const idx = userStore.findIndex(u => u.id === updatedFields.id);
  if (idx !== -1) {
    userStore[idx] = { ...userStore[idx], ...updatedFields };
  }
}

export function findUserByEmail(email) {
  return userStore.find(u => u.email === email);
}

export function findUserByEmployeeId(employeeId) {
  return userStore.find(u => u.employeeId === employeeId && u.role === 'employee');
}
