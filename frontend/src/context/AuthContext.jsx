import React, { createContext, useState, useEffect, useContext } from 'react';
import api, { setAccessToken, getAccessToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auto-login on load if refresh token is present
  useEffect(() => {
    const initSession = async () => {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          // Silent refresh
          const response = await api.post('/auth/refresh', {
            refresh_token: refreshToken,
          });
          setAccessToken(response.data.access_token);
          
          // Get user details
          const meResponse = await api.get('/auth/me');
          setUser(meResponse.data);
        } catch (err) {
          console.error('Session initialization failed:', err);
          localStorage.removeItem('refresh_token');
          setAccessToken(null);
        }
      }
      setLoading(false);
    };

    initSession();

    // Listen for axios interceptor logout event
    const handleLogoutEvent = () => {
      setUser(null);
    };
    window.addEventListener('auth-logout', handleLogoutEvent);
    return () => window.removeEventListener('auth-logout', handleLogoutEvent);
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/login-json', { email, password });
      const { access_token, refresh_token } = response.data;
      
      setAccessToken(access_token);
      localStorage.setItem('refresh_token', refresh_token);
      
      const meResponse = await api.get('/auth/me');
      setUser(meResponse.data);
      return meResponse.data;
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Login failed. Please check credentials.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      } catch (err) {
        console.error('Server-side logout failed:', err);
      }
    }
    localStorage.removeItem('refresh_token');
    setAccessToken(null);
    setUser(null);
  };

  const registerStudent = async (payload) => {
    setError(null);
    try {
      const response = await api.post('/auth/register/student', payload);
      return response.data;
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Student registration failed.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const registerRecruiter = async (payload) => {
    setError(null);
    try {
      const response = await api.post('/auth/register/recruiter', payload);
      return response.data;
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Recruiter registration failed.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const register = async (payload) => {
    setError(null);
    try {
      const response = await api.post('/auth/register', payload);
      return response.data;
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Registration failed.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const forgotPassword = async (email) => {
    setError(null);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Password reset request failed.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const resetPassword = async (token, new_password) => {
    setError(null);
    try {
      const response = await api.post('/auth/reset-password', { token, new_password });
      return response.data;
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Password reset failed.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const verifyEmail = async (token) => {
    setError(null);
    try {
      const response = await api.post('/auth/verify-email', { token });
      // If verification succeeds, update user verification state in context if matching
      setUser(prev => prev ? { ...prev, is_verified: true } : null);
      return response.data;
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Email verification failed.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const refreshUser = async () => {
    try {
      const meResponse = await api.get('/auth/me');
      setUser(meResponse.data);
      return meResponse.data;
    } catch (err) {
      console.error('Failed to refresh user details:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        registerStudent,
        registerRecruiter,
        register,
        forgotPassword,
        resetPassword,
        verifyEmail,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
