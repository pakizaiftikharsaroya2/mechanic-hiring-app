import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchProfile, loginUser, logoutUser, registerUser, loginWithGoogle, loginWithPhone } from '../services/authService';

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
    addToast('Logged out successfully', 'info');
    window.location.href = '/';
  };

  const loginGoogle = async () => {
    await loginWithGoogle();
    addToast('Successfully signed in with Google!', 'success');
  };

  const loginPhone = async (phone) => {
    await loginWithPhone(phone);
    addToast('Phone number verified! Welcome to AutoRescue.', 'success');
  };

  const updateLocalProfile = useCallback(async (updates) => {
    if (!session?.user?.id) return;
    try {
      // 1. Update mock profiles db
      const profiles = JSON.parse(localStorage.getItem('mock_profiles') || '[]');
      const updated = profiles.map(p => p.id === session.user.id ? { ...p, name: updates.name, phone: updates.phone, email: updates.email } : p);
      localStorage.setItem('mock_profiles', JSON.stringify(updated));

      // 2. Update mock users db
      const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
      const updatedUsers = users.map(u => {
        if (u.id === session.user.id) {
          const updatedUser = { 
            ...u, 
            email: updates.email,
            user_metadata: { ...u.user_metadata, name: updates.name, phone: updates.phone } 
          };
          if (updates.password) {
            updatedUser.password = updates.password;
          }
          return updatedUser;
        }
        return u;
      });
      localStorage.setItem('mock_users', JSON.stringify(updatedUsers));

      // 3. Update active session metadata
      const mockSession = JSON.parse(localStorage.getItem('mock_session') || '{}');
      if (mockSession?.user?.id === session.user.id) {
        mockSession.user.email = updates.email;
        mockSession.user.user_metadata = { ...mockSession.user.user_metadata, name: updates.name, phone: updates.phone };
        localStorage.setItem('mock_session', JSON.stringify(mockSession));
      }

      await loadProfile(session.user.id);
      addToast('Profile & security settings updated successfully!', 'success');
    } catch (err) {
      addToast('Failed to update account details', 'error');
    }
  }, [session, loadProfile, addToast]);

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
        loginGoogle,
        loginPhone,
        theme,
        toggleTheme,
        toasts,
        addToast,
        updateLocalProfile
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
