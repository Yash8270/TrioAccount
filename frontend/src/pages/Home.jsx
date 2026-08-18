import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useSocket } from '../context/SocketContext';
import { Wallet, TrendingUp, IndianRupee, Building2 } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const { balancesData: data, fetchBalances, loading, error } = useData();
  const { onlineUsers } = useSocket();

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  if (loading || !data) return <div className="spinner-container"><div className="spinner"></div></div>;
  if (error) return <div className="text-center mt-6 balance-negative">{error}</div>;

  const myBalanceData = data.balances.find(b => b.email === user.email);

  const totalFundBalance = data.balances.reduce((acc, b) => acc + parseFloat(b.total_paid), 0);
  const totalExpected = data.balances.reduce((acc, b) => acc + parseFloat(b.expected_amount), 0);
  const overallBalance = data.balances.reduce((acc, b) => acc + parseFloat(b.balance), 0);

  const handleNotify = async (member) => {
    try {
      const token = localStorage.getItem('token');
      const message = `Group Alert: ${member.name} currently owes ₹${Math.abs(member.balance)}`;
      
      const promises = data.balances.map(b => 
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: b.email, admin_email: user.email, message })
        })
      );
      
      await Promise.all(promises);
      
      window.dispatchEvent(new CustomEvent('custom_toast', { 
        detail: { title: 'Notification Sent', message: `Alert regarding ${member.name} sent to all members!`, isAlert: false } 
      }));
      
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('custom_toast', { 
        detail: { title: 'Error', message: 'Failed to send notifications', isAlert: true } 
      }));
    }
  };

  console.log(data);

  return (
    <div className="animate-fade-in flex-col" style={{ gap: '2rem', display: 'flex' }}>
      {/* Page Navbar */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#FDF8F3', borderRadius: '16px' }}>
        <div style={{ background: 'var(--primary-color)', color: 'white', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
          <Building2 size={20} />
        </div>
        <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--primary-color)', fontWeight: 'bold' }}>Dashboard</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {/* Total Paid Card */}
        <div className="card" style={{ border: 'none', backgroundColor: '#FFFFFF' }}>
          <p className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             TOTAL PAID (GROUP)
          </p>
          <h2 style={{ fontSize: '2rem', color: 'var(--success-color)', marginBottom: '0.5rem' }}>₹{totalFundBalance.toFixed(2)}</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Overall group collection</p>
        </div>

        {/* Total Expected Card */}
        <div className="card" style={{ border: 'none', backgroundColor: '#FFFFFF' }}>
          <p className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             TOTAL EXPECTED (GROUP)
          </p>
          <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>₹{totalExpected.toFixed(2)}</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Expected amount till today</p>
        </div>

        {/* Overall Balance Card */}
        <div className="card" style={{ border: 'none', backgroundColor: '#FFFFFF' }}>
          <p className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             OVERALL BALANCE
          </p>
          <h2 style={{ fontSize: '2rem', color: overallBalance > 0 ? 'var(--success-color)' : overallBalance < 0 ? 'var(--danger-color)' : 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {overallBalance > 0 ? '+' : overallBalance < 0 ? '-' : ''}₹{Math.abs(overallBalance).toFixed(2)}
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Group's net balance</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 style={{ fontSize: '1.5rem' }}>Group Summary</h2>
        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--primary-color)', cursor: 'pointer' }}>View All →</span>
      </div>
      
      <div className="card" style={{ padding: '0', overflow: 'hidden', border: 'none' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: '#FFFFFF' }}>
              <th style={{ padding: '1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Member</th>
              <th style={{ padding: '1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Paid</th>
              <th style={{ padding: '1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
              {user?.isadmin ? (
                <th style={{ padding: '1.25rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {data.balances.map((b, idx) => {
              const isOnline = onlineUsers?.includes(b.email);
              return (
                <tr key={b.email} style={{ borderBottom: idx !== data.balances.length - 1 ? '1px solid var(--border-color)' : 'none', backgroundColor: '#FFFFFF' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <div className="flex items-center" style={{ gap: '1rem' }}>
                      <div style={{ position: 'relative' }}>
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=3E6953&color=fff&rounded=true`} alt="Avatar" style={{ width: '40px', height: '40px' }} />
                        {isOnline && <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--success-color)', border: '2px solid white' }}></div>}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{b.name} {b.email === user.email ? '(You)' : ''}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{b.email}</div>
                      </div>
                    </div>
                  </td>
                <td style={{ padding: '1.25rem', fontWeight: '500', color: 'var(--text-secondary)' }}>₹{b.total_paid}</td>
                <td style={{ padding: '1.25rem' }}>
                  <span className={`pill ${b.balance > 0 ? 'pill-advance' : b.balance < 0 ? 'pill-owes' : 'pill-settled'}`}>
                    {b.balance > 0 ? `Advance ₹${b.balance}` : b.balance < 0 ? `Owes ₹${Math.abs(b.balance)}` : 'Settled'}
                  </span>
                </td>
                {user?.isadmin ? (
                  <td style={{ padding: '1.25rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {b.balance < 0 ? (
                      <button 
                        onClick={() => handleNotify(b)}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', backgroundColor: '#FDF2F2', color: '#E02424', border: '1px solid #FBD5D5', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                      >
                        Notify
                      </button>
                    ) : null}
                  </td>
                ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
