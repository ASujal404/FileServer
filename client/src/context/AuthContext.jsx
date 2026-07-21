import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('USER_DATA');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('AUTH_TOKEN') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    verifySession();

    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const verifySession = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/me');
      if (res.data.success) {
        setUser(res.data.user);
        localStorage.setItem('USER_DATA', JSON.stringify(res.data.user));
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/login', { email, password });
    if (res.data.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('AUTH_TOKEN', res.data.token);
      localStorage.setItem('USER_DATA', JSON.stringify(res.data.user));
    }
    return res.data;
  };

  const register = async (name, email, password, role) => {
    const res = await api.post('/register', { name, email, password, role });
    if (res.data.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('AUTH_TOKEN', res.data.token);
      localStorage.setItem('USER_DATA', JSON.stringify(res.data.user));
    }
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (e) {
      // Ignore errors on logout
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('AUTH_TOKEN');
      localStorage.removeItem('USER_DATA');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, verifySession }}>
      {children}
    </AuthContext.Provider>
  );
};
