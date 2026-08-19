import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchProfile, loginUser, logoutUser, registerUser } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // row from public.profiles (includes role)
  const [loading, setLoading] = useState(true);

  const [theme, setTheme] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('autorescue-theme') || 'light' : 'light'
  );
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('autorescue-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  const loadProfile = useCallback(async (userId) => {
    try {
      const p = await fetchProfile(userId);
      setProfile(p);
    } catch (err) {
      console.error('Failed to load profile', err);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      setSession(initialSession);
      if (initialSession?.user) loadProfile(initialSession.user.id);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const login = async (email, password) => {
    await loginUser({ email, password });
    addToast('Welcome back!', 'success');
  };

  const register = async (fields) => {
    await registerUser(fields);
    addToast('Account created!', 'success');
  };

  const logout = async () => {
    await logoutUser();
    setProfile(null);
    addToast('Logged out', 'info');
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        profile,
        role: profile?.role || null,
        isAuthenticated: !!session,
        loading,
        login,
        register,
        logout,
        theme,
        toggleTheme,
        toasts,
        addToast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
