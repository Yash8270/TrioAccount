import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const { token, logout } = useAuth();
  
  // State for different data
  const [balancesData, setBalancesData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [members, setMembers] = useState([]);
  const [chats, setChats] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Transactions API
  const fetchBalances = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/transactions/balances`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        logout();
        throw new Error('Session expired');
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch balances');
      setBalancesData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, logout, API_URL]);

  const fetchTransactions = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch transactions');
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, logout, API_URL]);

  const addTransaction = async (transactionData) => {
    try {
      const res = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(transactionData)
      });
      if (res.ok) {
        await fetchTransactions();
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  // Admin API
  const fetchMembers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setMembers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, API_URL]);

  const fetchChats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [token, API_URL]);

  const fetchAlerts = useCallback(async (email) => {
    if (!token || !email) return;
    try {
      const res = await fetch(`${API_URL}/api/notifications/${email}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.notifications || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, [token, API_URL]);

  const addMember = async (memberData) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/add-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(memberData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add member');
      await fetchMembers();
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateMemberRole = async (email, isadmin) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email, isadmin })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role');
      await fetchMembers();
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return (
    <DataContext.Provider value={{
      balancesData, fetchBalances,
      transactions, fetchTransactions, addTransaction,
      members, fetchMembers, addMember, updateMemberRole,
      chats, fetchChats, setChats,
      alerts, fetchAlerts, setAlerts,
      loading, error
    }}>
      {children}
    </DataContext.Provider>
  );
};
