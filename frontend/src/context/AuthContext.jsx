import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async (userEmail, authToken) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    
    let permission = Notification.permission;
    // We only explicitly request permission if it hasn't been denied.
    // If it's 'default', the browser will prompt.
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch (e) {
        console.error('Failed to request notification permission', e);
      }
    }
    
    if (permission !== 'granted') return;

    try {
      const register = await navigator.serviceWorker.register('/sw.js');
      
      const keyRes = await fetch(`${API_URL}/api/notifications/vapid-public-key`);
      if (!keyRes.ok) return;
      const { publicKey } = await keyRes.json();

      const subscription = await register.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      await fetch(`${API_URL}/api/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ email: userEmail, subscription })
      });
    } catch (err) {
      console.error('Service Worker/Push Error', err);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await fetch(`${API_URL}/api/auth/user`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.status === 401) {
            logout();
            return;
          }
          const data = await res.json();
          if (res.ok) {
            setUser(data);
            subscribeToPush(data.email, token);
          }
        } catch (error) {
          console.error("Failed to fetch user", error);
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [token, API_URL]);

  const login = async (name, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        subscribeToPush(data.user.email, data.token);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
