import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Building2, Filter, BellRing, CheckCircle2, Circle, Users, X } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

export default function Notifications() {
  const { user } = useAuth();
  const { balancesData, fetchBalances, fetchAlerts } = useData();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
  
  // Filters
  const [filterMember, setFilterMember] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');

  useEffect(() => {
    const fetchNotifs = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const endpoint = user.isadmin ? '/api/notifications/all' : `/api/notifications/${user.email}`;
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        const res = await fetch(`${API_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          const marked = data.notifications.map(n => n.email === user.email ? { ...n, is_read: 1 } : n);
          setNotifications(marked);
        }

        // Mark all personal notifications as read when opening this page
        await fetch(`${API_URL}/api/notifications/read-all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: user.email })
        });
        fetchAlerts(user.email, user.isadmin);

      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchNotifs();
    fetchBalances();
  }, [user.email, user.isadmin, fetchBalances, fetchAlerts]);

  const allSystemMembers = balancesData?.balances || [];

  const uniqueMonths = [...new Set(notifications.map(n => {
    const d = new Date(n.created_at.endsWith('Z') ? n.created_at : n.created_at.replace(' ', 'T') + 'Z');
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }))].sort((a, b) => b.localeCompare(a));

  const formatMonth = (yyyy_mm) => {
    const [y, m] = yyyy_mm.split('-');
    const d = new Date(y, parseInt(m) - 1);
    return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  };

  // Group notifications for Admin
  const groupedNotifs = [];
  if (user.isadmin) {
    notifications.forEach(n => {
      if (n.admin_email !== user.email) return;
      const existing = groupedNotifs.find(g => g.message === n.message && Math.abs(new Date(g.created_at.endsWith('Z') ? g.created_at : g.created_at.replace(' ', 'T') + 'Z') - new Date(n.created_at.endsWith('Z') ? n.created_at : n.created_at.replace(' ', 'T') + 'Z')) < 60000);
      if (existing) {
        existing.recipients.push({ email: n.email, name: n.member_name || n.email, is_read: n.is_read });
        if (n.is_read) existing.readCount++;
      } else {
        groupedNotifs.push({
          ...n,
          recipients: [{ email: n.email, name: n.member_name || n.email, is_read: n.is_read }],
          readCount: n.is_read ? 1 : 0
        });
      }
    });

    groupedNotifs.forEach(g => {
      // Sort recipients: unread first, then by name
      g.recipients.sort((a, b) => {
        if (a.is_read === b.is_read) return a.name.localeCompare(b.name);
        return a.is_read - b.is_read;
      });
    });
  }

  const itemsToFilter = user.isadmin ? groupedNotifs : notifications;

  const filteredNotifs = itemsToFilter.filter(n => {
    const d = new Date(n.created_at.endsWith('Z') ? n.created_at : n.created_at.replace(' ', 'T') + 'Z');
    const txMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    if (filterMember !== 'All') {
      if (user.isadmin) {
        if (!n.recipients.some(r => r.email === filterMember)) return false;
      } else {
        if (n.email !== filterMember) return false;
      }
    }
    if (filterMonth !== 'All' && txMonth !== filterMonth) return false;
    return true;
  });

  return (
    <div className="animate-fade-in flex-col" style={{ gap: '2rem', display: 'flex' }}>
      
      {/* Page Navbar */}
      <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FDF8F3', borderRadius: '16px', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="flex items-center gap-2">
          <div style={{ background: 'var(--primary-color)', color: 'white', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
            <Building2 size={20} />
          </div>
          <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--primary-color)', fontWeight: 'bold' }}>All Notifications</h2>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Notification History</h2>
        
        <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
          <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.25rem' }}>
            <Filter size={16} /> <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Filter by:</span>
          </div>
          
          <div style={{ zIndex: 10 }}>
            <CustomSelect 
              value={filterMember} 
              onChange={setFilterMember} 
              options={[
                { label: 'All Members', value: 'All' },
                ...allSystemMembers.map(m => ({ label: m.name, value: m.email }))
              ]} 
            />
          </div>
          
          <div style={{ zIndex: 10 }}>
            <CustomSelect 
              value={filterMonth} 
              onChange={setFilterMonth} 
              options={[
                { label: 'All Time', value: 'All' },
                ...uniqueMonths.map(m => ({ label: formatMonth(m), value: m }))
              ]} 
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', border: 'none' }}>
        {loading ? (
          <div className="p-4 text-center">Loading notifications...</div>
        ) : filteredNotifs.length === 0 ? (
          <div className="p-4 text-center text-secondary">No notifications found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: '#FDF8F3' }}>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Alert Message</th>
                {!user.isadmin && <th style={{ padding: '1rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Sent To</th>}
                <th style={{ padding: '1rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Date & Time</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{user.isadmin ? 'Seen By' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotifs.map((n, idx) => {
                const isFullyRead = user.isadmin ? (n.readCount === n.recipients.length) : n.is_read;
                return (
                <tr key={n.id} style={{ borderBottom: idx !== filteredNotifs.length - 1 ? '1px solid var(--border-color)' : 'none', backgroundColor: isFullyRead ? '#FFFFFF' : '#FDF2F2', cursor: user.isadmin ? 'pointer' : 'default', transition: 'background-color 0.2s' }} onClick={() => user.isadmin && setSelectedBroadcast(n)} className={user.isadmin ? 'hover:bg-gray-50' : ''}>
                  <td style={{ padding: '1.25rem' }}>
                    <div className="flex items-center" style={{ gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#FDF8F3', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BellRing size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: isFullyRead ? 'var(--text-primary)' : 'var(--danger-color)' }}>{n.message}</div>
                        {user.isadmin && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sent by: {n.admin_email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  {!user.isadmin && (
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                        {n.member_name || n.email} (You)
                      </div>
                    </td>
                  )}
                  <td style={{ padding: '1.25rem', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    {new Date(n.created_at.endsWith('Z') ? n.created_at : n.created_at.replace(' ', 'T') + 'Z').toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '1.25rem', textAlign: 'center' }}>
                    {user.isadmin ? (
                      <span className="pill flex items-center justify-center gap-1" style={{ backgroundColor: isFullyRead ? '#EAF0EC' : '#FEE2E2', color: isFullyRead ? 'var(--success-color)' : 'var(--danger-color)', margin: '0 auto', width: 'fit-content' }}>
                        <Users size={14} /> {n.readCount} / {n.recipients.length}
                      </span>
                    ) : (
                      n.is_read ? (
                        <span className="pill flex items-center justify-center gap-1" style={{ backgroundColor: '#EAF0EC', color: 'var(--success-color)', margin: '0 auto', width: 'fit-content' }}>
                          <CheckCircle2 size={14} /> Seen
                        </span>
                      ) : (
                        <span className="pill flex items-center justify-center gap-1" style={{ backgroundColor: '#FEE2E2', color: 'var(--danger-color)', margin: '0 auto', width: 'fit-content' }}>
                          <Circle size={14} /> Unseen
                        </span>
                      )
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {selectedBroadcast && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', backgroundColor: '#FFFFFF', padding: '2rem', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button 
              onClick={() => setSelectedBroadcast(null)} 
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={24} />
            </button>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Read Receipts</h3>
            <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Message: <strong>{selectedBroadcast.message}</strong>
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {selectedBroadcast.recipients.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: r.is_read ? '#FFFFFF' : '#FDF2F2', border: r.is_read ? '1px solid var(--border-color)' : '1px solid #FBCFE8', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="flex items-center" style={{ gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: r.is_read ? '#EAF0EC' : '#FEE2E2', color: r.is_read ? 'var(--success-color)' : 'var(--danger-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      {r.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{r.name}</span>
                  </div>
                  {r.is_read ? (
                    <span style={{ color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      <CheckCircle2 size={18} /> Seen
                    </span>
                  ) : (
                    <span style={{ color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      <Circle size={18} /> Unseen
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
