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

  const fetchedRef = React.useRef({
    balances: false,
    transactions: false,
    members: false,
    chats: false,
    alerts: false
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Transactions API
  const fetchBalances = useCallback(async (force = false) => {
    if (!token) return;
    if (!force && fetchedRef.current.balances) return;
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
      fetchedRef.current.balances = true;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, logout, API_URL]);

  const fetchTransactions = useCallback(async (force = false) => {
    if (!token) return;
    if (!force && fetchedRef.current.transactions) return;
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
      fetchedRef.current.transactions = true;
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
        // Force refetch after adding payment
        await fetchTransactions(true);
        await fetchBalances(true);
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  // Admin API
  const fetchMembers = useCallback(async (force = false) => {
    if (!token) return;
    if (!force && fetchedRef.current.members) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMembers(data);
        fetchedRef.current.members = true;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, API_URL]);

  const fetchChats = useCallback(async (force = false) => {
    if (!token) return;
    if (!force && fetchedRef.current.chats) return;
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data);
        fetchedRef.current.chats = true;
      }
    } catch (err) {
      console.error(err);
    }
  }, [token, API_URL]);

  const fetchAlerts = useCallback(async (email, isadmin, force = false) => {
    if (!token || !email) return;
    if (!force && fetchedRef.current.alerts) return;
    try {
      let url = `${API_URL}/api/notifications/${email}`;
      if (isadmin) {
        url = `${API_URL}/api/notifications/all`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.notifications || []);
        fetchedRef.current.alerts = true;
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
