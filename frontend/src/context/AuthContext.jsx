import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, getMe, logoutUser } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('photo_gallery_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('photo_gallery_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const res = await getMe();
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('photo_gallery_user', JSON.stringify(res.user));
          }
        } catch (err) {
          console.warn('[AuthContext] Session expired or invalid');
          logout();
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, [token]);

  const login = async (email, password) => {
    const res = await loginUser({ email, password });
    if (res.success && res.token) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('photo_gallery_token', res.token);
      localStorage.setItem('photo_gallery_user', JSON.stringify(res.user));
    }
    return res;
  };

  const register = async (userData) => {
    const res = await registerUser(userData);
    if (res.success && res.token) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('photo_gallery_token', res.token);
      localStorage.setItem('photo_gallery_user', JSON.stringify(res.user));
    }
    return res;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      // Ignore network errors on logout
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('photo_gallery_token');
    localStorage.removeItem('photo_gallery_user');
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAdmin,
        isAuthenticated: Boolean(user && token)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
