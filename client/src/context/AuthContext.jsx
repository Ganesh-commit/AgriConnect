import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, userService } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('agri_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('agri_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify authentication on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('agri_token');
      if (storedToken) {
        try {
          const res = await authService.getMe();
          if (res.data?.data?.user) {
            setUser(res.data.data.user);
            localStorage.setItem('agri_user', JSON.stringify(res.data.data.user));
          }
        } catch (error) {
          console.warn('Session expired or invalid:', error.message);
          localStorage.removeItem('agri_token');
          localStorage.removeItem('agri_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const res = await authService.login({ email, password });
      const { token: receivedToken, data } = res.data;
      const loggedUser = data.user;

      localStorage.setItem('agri_token', receivedToken);
      localStorage.setItem('agri_user', JSON.stringify(loggedUser));

      setToken(receivedToken);
      setUser(loggedUser);

      toast.success(res.data.message || 'Logged in successfully!');
      return loggedUser;
    } catch (error) {
      toast.error(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const res = await authService.register(userData);
      const { token: receivedToken, data } = res.data;
      const newUser = data.user;

      localStorage.setItem('agri_token', receivedToken);
      localStorage.setItem('agri_user', JSON.stringify(newUser));

      setToken(receivedToken);
      setUser(newUser);

      toast.success(res.data.message || 'Registration successful!');
      return newUser;
    } catch (error) {
      toast.error(error.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('agri_token');
      localStorage.removeItem('agri_user');
      setUser(null);
      setToken(null);
      toast.success('Logged out successfully');
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await userService.updateProfile(profileData);
      const updatedUser = res.data.data.user;
      setUser(updatedUser);
      localStorage.setItem('agri_user', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully!');
      return updatedUser;
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
      throw error;
    }
  };

  const changePassword = async (passwordData) => {
    try {
      const res = await userService.changePassword(passwordData);
      toast.success(res.data.message || 'Password changed successfully!');
      return true;
    } catch (error) {
      toast.error(error.message || 'Failed to change password');
      throw error;
    }
  };

  const setSession = (receivedToken, loggedUser, msg = 'Logged in successfully!') => {
    localStorage.setItem('agri_token', receivedToken);
    localStorage.setItem('agri_user', JSON.stringify(loggedUser));
    setToken(receivedToken);
    setUser(loggedUser);
    if (msg) toast.success(msg);
    return loggedUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user && token),
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        setSession,
        setUser
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
