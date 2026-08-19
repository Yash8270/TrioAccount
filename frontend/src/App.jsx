import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { DataProvider, useData } from './context/DataContext';

// Pages
import Login from './pages/Login';
import Home from './pages/Home';
import Transactions from './pages/Transactions';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import Notifications from './pages/Notifications';

import { Menu, X, LayoutDashboard, ArrowRightLeft, MessageSquare, Users, LogOut, Building2, Bell } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner-container"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner-container"><div className="spinner"></div></div>;
  if (!user || !user.isadmin) return <Navigate to="/" />;
  return children;
};

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const { chats, fetchChats, alerts, fetchAlerts } = useData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [liveUnread, setLiveUnread] = useState(0);
  const [toasts, setToasts] = useState([]);
  const location = useLocation();



  useEffect(() => {
    fetchChats();
    if (user?.email) fetchAlerts(user.email);
  }, [fetchChats, fetchAlerts, user?.email]);

  useEffect(() => {
    if (location.pathname === '/chat') {
      setLiveUnread(0);
    }
  }, [location.pathname]);

  const showToast = (title, message, isAlert = false) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, isAlert }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  useEffect(() => {
    const handleCustomToast = (e) => {
      showToast(e.detail.title, e.detail.message, e.detail.isAlert);
    };
    window.addEventListener('custom_toast', handleCustomToast);
    return () => window.removeEventListener('custom_toast', handleCustomToast);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleReceiveMessage = (message) => {
      if (location.pathname !== '/chat' && message.sender_email !== user?.email) {
        setLiveUnread(prev => prev + 1);
        showToast('New Message', `${message.sender_email}: ${message.content.substring(0, 30)}...`);
      }
    };
    
    const handleReceiveAlert = (alert) => {
      if (alert.email === user?.email) {
        fetchAlerts(user.email);
        showToast('Due Alert', alert.message, true);
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('receive_alert', handleReceiveAlert);
    
    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('receive_alert', handleReceiveAlert);
    };
  }, [socket, location.pathname, user?.email, fetchAlerts]);

  const dbUnread = location.pathname === '/chat' ? 0 : chats.filter(msg => 
    msg.sender_email !== user?.email && (!msg.seenBy || !msg.seenBy.some(s => s.email === user?.email))
  ).length;

  const totalUnread = dbUnread + liveUnread;
  const unreadAlerts = alerts?.filter(a => !a.is_read).length || 0;

  const markAlertRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id })
      });
      fetchAlerts(user.email);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSidebar = () => setMobileOpen(!mobileOpen);
  const closeSidebar = () => setMobileOpen(false);

  const NavLinks = () => (
    <>
      <Link to="/" onClick={closeSidebar} className={`sidebar-link topbar-link ${location.pathname === '/' ? 'active' : ''}`}>
        <LayoutDashboard size={20} /> <span className="md:inline">Dashboard</span>
      </Link>
      <Link to="/transactions" onClick={closeSidebar} className={`sidebar-link topbar-link ${location.pathname === '/transactions' ? 'active' : ''}`}>
        <ArrowRightLeft size={20} /> <span>Transactions</span>
      </Link>
      <Link to="/chat" onClick={closeSidebar} className={`sidebar-link topbar-link ${location.pathname === '/chat' ? 'active' : ''}`} style={{ position: 'relative' }}>
        <MessageSquare size={20} /> <span>Chat</span>
        {totalUnread > 0 && (
          <span style={{ 
            position: 'absolute', 
            top: '2px', 
            right: '-10px', 
            backgroundColor: '#E02424', 
            color: 'white', 
            borderRadius: '99px', 
            padding: '2px 6px', 
            fontSize: '0.65rem', 
            fontWeight: 'bold',
            lineHeight: 1
          }}>
            {totalUnread}
          </span>
        )}
      </Link>
      {user?.isadmin === 1 && (
        <Link to="/admin" onClick={closeSidebar} className={`sidebar-link topbar-link ${location.pathname === '/admin' ? 'active' : ''}`}>
          <Users size={20} /> <span>Members</span>
        </Link>
      )}
    </>
  );



  return (
    <div className="app-container">
      {/* Mobile Header */}
      <div className="mobile-header md:hidden">
        <div className="flex items-center gap-2">
          <Building2 size={24} color="var(--primary-color)" />
          <h1 style={{ fontSize: '1.25rem', margin: 0 }}>TrioAccount</h1>
        </div>
        <div className="flex items-center" style={{ gap: '1.25rem' }}>
          <NotificationBell />
          <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
            <LogOut size={22} />
          </button>
        </div>
      </div>

      {/* Desktop Topbar */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%', minHeight: 0, overflow: 'hidden' }}>
        <header className="topbar">
          <div className="topbar-logo">
            <div style={{ background: 'var(--primary-color)', color: 'white', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}><Building2 size={20} /></div>
            <h1 style={{ fontSize: '1.4rem', margin: 0 }}>TrioAccount</h1>
          </div>
          <nav className="topbar-nav items-center">
            <NavLinks />
          </nav>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent-gold)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-secondary font-medium">{user?.name}</span>
            </div>
            <button onClick={logout} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem' }}><LogOut size={16} style={{ marginRight: '0.4rem' }}/> Logout</button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="main-content">
          {children}
        </main>
      </div>

      {/* Bottom Nav (Mobile) */}
      <nav className="bottom-nav md:hidden">
        <Link to="/" className={`bottom-nav-link ${location.pathname === '/' ? 'active' : ''}`}>
          <LayoutDashboard size={24} />
          <span>Home</span>
        </Link>
        <Link to="/transactions" className={`bottom-nav-link ${location.pathname === '/transactions' ? 'active' : ''}`}>
          <ArrowRightLeft size={24} />
          <span>Transactions</span>
        </Link>
        <Link to="/chat" className={`bottom-nav-link ${location.pathname === '/chat' ? 'active' : ''}`} style={{ position: 'relative' }}>
          <MessageSquare size={24} />
          <span>Chat</span>
          {totalUnread > 0 && (
            <span style={{ position: 'absolute', top: '-4px', right: '4px', backgroundColor: '#E02424', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyItems: 'center', paddingLeft: '4.5px', paddingTop: '0px', fontWeight: 'bold' }}>
              {totalUnread}
            </span>
          )}
        </Link>
        {user?.isadmin === 1 && (
          <Link to="/admin" className={`bottom-nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
            <Users size={24} />
            <span>Admin</span>
          </Link>
        )}
      </nav>

      {/* Toast Container */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map(toast => (
          <div key={toast.id} className="card animate-fade-in" style={{ backgroundColor: toast.isAlert ? '#FDF2F2' : '#3E6953', border: toast.isAlert ? '1px solid #FBD5D5' : '1px solid #4A7C59', padding: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: '250px' }}>
            <h4 style={{ margin: '0 0 0.25rem 0', color: toast.isAlert ? '#E02424' : 'white' }}>{toast.title}</h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: toast.isAlert ? '#C81E1E' : 'rgba(255,255,255,0.8)' }}>{toast.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const NotificationBell = () => {
  const { alerts, fetchAlerts } = useData();
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const myAlerts = alerts?.filter(a => a.email === user?.email) || [];
  const unreadAlerts = myAlerts.filter(a => !a.is_read).length;

  const markAlertRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id })
      });
      fetchAlerts(user.email);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div ref={bellRef} style={{ position: 'relative' }}>
      <button onClick={() => setShowDropdown(!showDropdown)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', position: 'relative', display: 'flex' }}>
        <Bell size={24} />
        {unreadAlerts > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#E02424', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {unreadAlerts}
          </span>
        )}
      </button>
      
      {showDropdown && (
        <div className="card animate-fade-in" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '300px', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '1rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
          <h4 style={{ margin: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Notifications</h4>
          {myAlerts.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No alerts at this time.</p>
          ) : (
            myAlerts.slice(0, 1).map(alert => (
              <div key={alert.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.5rem', backgroundColor: alert.is_read ? 'transparent' : '#FDF2F2', borderRadius: '8px', cursor: 'pointer' }} onClick={() => !alert.is_read && markAlertRead(alert.id)}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: alert.is_read ? 'var(--text-secondary)' : '#E02424', fontWeight: alert.is_read ? 'normal' : '600' }}>{alert.message}</p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(alert.created_at.endsWith('Z') ? alert.created_at : alert.created_at.replace(' ', 'T') + 'Z').toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))
          )}
          <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', textAlign: 'center' }}>
            <Link 
              to="/notifications" 
              onClick={() => setShowDropdown(false)}
              style={{ color: 'var(--primary-color)', fontSize: '0.875rem', fontWeight: '600', textDecoration: 'none' }}
            >
              Explore All →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <DataProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout><Home /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/transactions" element={
                <ProtectedRoute>
                  <Layout><Transactions /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <Layout><Notifications /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/chat" element={
                <ProtectedRoute>
                  <Layout><Chat /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/admin" element={
                <AdminRoute>
                  <Layout><Admin /></Layout>
                </AdminRoute>
              } />
              
            </Routes>
          </BrowserRouter>
        </DataProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
