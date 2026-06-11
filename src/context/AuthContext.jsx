import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { rowToApp } from '../data/api.js';

const AuthContext = createContext(null);

// Fetch the app-level profile (role/status/name/department/manager) and convert
// snake_case DB columns to the camelCase the app uses (departmentId, managerId).
async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return rowToApp(data);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);     // merged auth + profile object
  const [authReady, setAuthReady] = useState(false);

  // Restore session on load and subscribe to auth changes (login/logout/refresh).
  useEffect(() => {
    let active = true;

    async function hydrate(session) {
      if (!session?.user) { if (active) { setUser(null); setAuthReady(true); } return; }
      const profile = await fetchProfile(session.user.id);
      if (!active) return;
      if (profile) {
        setUser({ ...profile, authId: session.user.id });
      } else {
        // Auth user exists but no profile row — treat as logged out.
        setUser(null);
      }
      setAuthReady(true);
    }

    supabase.auth.getSession().then(({ data }) => hydrate(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrate(session);
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      return { success: false, error: error.message || 'Invalid email or password' };
    }
    const profile = await fetchProfile(data.user.id);
    if (!profile) {
      return { success: false, error: 'No profile found for this account. Contact admin.' };
    }
    if (profile.status === 'inactive') {
      await supabase.auth.signOut();
      return { success: false, error: 'Your account has been deactivated. Contact admin.' };
    }
    const merged = { ...profile, authId: data.user.id };
    setUser(merged);
    return { success: true, user: merged };
  }, []);

  // Staff self-registration. Creates the auth user; a DB trigger creates the
  // matching profile row from the metadata passed here.
  const signup = useCallback(async (email, password, name, role = 'executive') => {
    const cleanEmail = email.trim();
    const displayName = name?.trim() || cleanEmail.split('@')[0];
    const avatar = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { name: displayName, role, avatar } },
    });
    if (error) {
      // The DB trigger rejects emails an admin hasn't pre-added.
      const msg = /database error|not_invited/i.test(error.message)
        ? 'Your email is not registered. Please ask your admin to add you in User Management first.'
        : error.message;
      return { success: false, error: msg };
    }
    // If email confirmation is ON, there is no session yet.
    if (!data.session) {
      return { success: false, error: 'Account created — please confirm your email, then sign in. (Tip: disable "Confirm email" in Supabase Auth settings for instant access.)' };
    }
    const profile = await fetchProfile(data.user.id);
    const merged = { ...(profile || { name: displayName, email: cleanEmail, role }), authId: data.user.id };
    setUser(merged);
    return { success: true, user: merged };
  }, []);

  // Employee login: sign in by email/password, then verify the profile is an
  // employee whose employee_id matches what they typed.
  const employeeLogin = useCallback(async (employeeId, email, password) => {
    const res = await login(email, password);
    if (!res.success) return res;
    if (res.user.role !== 'employee') {
      await supabase.auth.signOut();
      setUser(null);
      return { success: false, error: 'This account is not an employee account.' };
    }
    if (res.user.employee_id && res.user.employee_id !== employeeId.trim()) {
      await supabase.auth.signOut();
      setUser(null);
      return { success: false, error: 'Email does not match the registered Employee ID.' };
    }
    return res;
  }, [login]);

  const employeeSignup = useCallback(async (employeeId, email, password) => {
    return signup(email, password, email.trim().split('@')[0], 'employee');
  }, [signup]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, authReady, login, employeeLogin, signup, employeeSignup, logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
