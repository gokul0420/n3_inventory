import React, { createContext, useContext, useState, useCallback } from 'react';
import { getAllUsers, findUserByEmail, findUserByEmployeeId, updateUser } from '../data/userStore.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = useCallback((email, password) => {
    const found = getAllUsers().find(u => u.email === email && u.password === password);
    if (found) {
      if (found.status === 'pending') {
        return { success: false, error: 'Please sign up first to set your password.' };
      }
      if (found.status === 'inactive') {
        return { success: false, error: 'Your account has been deactivated. Contact admin.' };
      }
      setUser(found);
      return { success: true, user: found };
    }
    // Check if user exists but password is wrong
    const byEmail = findUserByEmail(email);
    if (byEmail && !byEmail.password) {
      return { success: false, error: 'Please sign up first to set your password.' };
    }
    return { success: false, error: 'Invalid email or password' };
  }, []);

  const employeeLogin = useCallback((employeeId, email, password) => {
    const found = findUserByEmployeeId(employeeId);
    if (!found) {
      return { success: false, error: 'Employee ID not found in the system.' };
    }
    if (found.email !== email) {
      return { success: false, error: 'Email does not match the registered Employee ID.' };
    }
    if (found.status === 'pending') {
      return { success: false, error: 'Please sign up first to set your password.' };
    }
    if (found.status === 'inactive') {
      return { success: false, error: 'Your account has been deactivated. Contact admin.' };
    }
    if (found.password !== password) {
      return { success: false, error: 'Invalid password.' };
    }
    setUser(found);
    return { success: true, user: found };
  }, []);

  const signup = useCallback((email, password) => {
    const found = findUserByEmail(email);
    if (!found) {
      return { success: false, error: "Oops! Your email ID was not found in the system. Please contact the admin." };
    }
    if (found.password && found.status === 'active') {
      return { success: false, error: 'This account already has a password. Please sign in instead.' };
    }
    // Set the password and activate the user
    updateUser({ id: found.id, password, status: 'active' });
    const updatedUser = findUserByEmail(email);
    setUser(updatedUser);
    return { success: true, user: updatedUser };
  }, []);

  const employeeSignup = useCallback((employeeId, email, password) => {
    const found = findUserByEmployeeId(employeeId);
    if (!found) {
      return { success: false, error: 'Employee ID not found. Please contact your admin.' };
    }
    if (found.email !== email) {
      return { success: false, error: 'Email does not match the registered Employee ID.' };
    }
    if (found.password && found.status === 'active') {
      return { success: false, error: 'This account already has a password. Please sign in instead.' };
    }
    updateUser({ id: found.id, password, status: 'active' });
    const updatedUser = findUserByEmployeeId(employeeId);
    setUser(updatedUser);
    return { success: true, user: updatedUser };
  }, []);

  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, login, employeeLogin, signup, employeeSignup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

