import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Plus, Check, Building2, X, Wallet, TrendingUp, IndianRupee, Filter } from 'lucide-react';
import upiImage from '../assets/upi.jpeg';
import CustomSelect from '../components/CustomSelect';
import CustomDatePicker from '../components/CustomDatePicker';

export default function Transactions() {
  const { user } = useAuth();
  const { transactions, fetchTransactions, addTransaction, loading, balancesData: data, fetchBalances } = useData();
  const [showForm, setShowForm] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [adding, setAdding] = useState(false);
  
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('online');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMember, setPaymentMember] = useState(user.email);

  // Filters
  const [filterMode, setFilterMode] = useState('All');
  const [filterMember, setFilterMember] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');

  useEffect(() => {
    fetchTransactions();
    fetchBalances();
  }, [fetchTransactions, fetchBalances]);

  const myBalanceData = data?.balances?.find(b => b.email === user.email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAdding(true);
    const result = await addTransaction({
      amount: parseFloat(amount),
      transaction_mode: mode,
      date,
      email: paymentMember
    });
    
    if (result.success) {
      setAmount('');
      setPaymentMember(user.email);
      setShowForm(false);
    }
    setAdding(false);
  };

  // Calculate metrics
  const totalFundBalance = transactions.reduce((acc, tx) => acc + parseFloat(tx.amount), 0);
  const myInflow = transactions.filter(tx => tx.email === user.email).reduce((acc, tx) => acc + parseFloat(tx.amount), 0);
  
  // Approximate outflow as expected per day (simplified for UI)
  const startDate = new Date('2026-08-13');
  const today = new Date();
  const days = Math.max(1, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)));
  const myOutflow = days * 20;

  // Derive unique values for filters
  const uniqueMembers = [...new Set(transactions.map(tx => tx.email))].map(email => {
    const tx = transactions.find(t => t.email === email);
    return { email, name: tx.email === user.email ? 'You' : tx.name || tx.email };
  });

  const allUsers = data?.balances?.map(b => ({ label: b.name || b.email, value: b.email })) || [];

  const uniqueMonths = [...new Set(transactions.map(tx => {
    const d = new Date(tx.date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }))].sort((a, b) => b.localeCompare(a));

  const formatMonth = (yyyy_mm) => {
    const [y, m] = yyyy_mm.split('-');
    const d = new Date(y, parseInt(m) - 1);
    return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    const d = new Date(tx.date);
    const txMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    if (filterMode !== 'All' && tx.transaction_mode.toLowerCase() !== filterMode.toLowerCase()) return false;
    if (filterMember !== 'All' && tx.email !== filterMember) return false;
    if (filterMonth !== 'All' && txMonth !== filterMonth) return false;
    return true;
  });

  return (
    <>
      <div className="animate-fade-in flex-col" style={{ gap: '2rem', display: 'flex' }}>
      
      {/* Page Navbar & Actions */}
      <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FDF8F3', borderRadius: '16px', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="flex items-center gap-2">
          <div style={{ background: 'var(--primary-color)', color: 'white', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
            <Building2 size={20} />
          </div>
          <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--primary-color)', fontWeight: 'bold' }}>Transactions</h2>
        </div>
        
        <button 
          onClick={() => user.isadmin ? setShowForm(!showForm) : setShowQRModal(true)} 
          className="btn btn-primary"
        >
          {showForm ? 'Cancel' : <><Plus size={18} style={{ marginRight: '0.5rem' }} /> {user.isadmin ? 'Add Payment' : 'Add Online Payment'}</>}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Total Paid Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: 'none' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#EAF0EC', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Paid</p>
            <h2 style={{ fontSize: '2rem' }}>₹{myBalanceData?.total_paid || 0}</h2>
          </div>
        </div>

        {/* Expected Amount Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#FDF8F3', border: 'none' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#F4E8D8', color: '#B78C53', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Expected Till Today</p>
            <h2 style={{ fontSize: '2rem' }}>₹{myBalanceData?.expected_amount || 0}</h2>
          </div>
        </div>

        {/* Current Balance Card */}
        <div className="card" style={{ 
          display: 'flex', flexDirection: 'column', gap: '1rem', 
          backgroundColor: myBalanceData?.balance < 0 ? '#FDF2F2' : 'var(--accent-gold)', 
          color: myBalanceData?.balance < 0 ? '#E02424' : 'white', 
          border: 'none', 
          boxShadow: '0 10px 25px -5px rgba(200, 169, 126, 0.4)' 
        }}>
          <div style={{ 
            width: '48px', height: '48px', borderRadius: '12px', 
            background: myBalanceData?.balance < 0 ? '#FBD5D5' : 'rgba(255,255,255,0.2)', 
            color: myBalanceData?.balance < 0 ? '#E02424' : 'white', 
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <IndianRupee size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem', opacity: 0.9 }}>Your Balance</p>
            <div className="flex items-center" style={{ gap: '1rem' }}>
              <h2 style={{ 
                fontSize: '2rem', 
                color: myBalanceData?.balance < 0 ? '#E02424' : 'white',
                margin: 0,
                textShadow: myBalanceData?.balance > 0 ? '0 1px 2px rgba(0,0,0,0.2)' : 'none'
              }}>
                {myBalanceData?.balance > 0 ? '+' : myBalanceData?.balance < 0 ? '-' : ''}₹{Math.abs(myBalanceData?.balance || 0)}
              </h2>
              {myBalanceData?.balance !== 0 && (
                <span style={{ 
                  background: myBalanceData?.balance < 0 ? '#E02424' : 'white', 
                  color: myBalanceData?.balance < 0 ? 'white' : 'var(--danger-color)', 
                  padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '600' 
                }}>
                  {myBalanceData?.balance > 0 ? 'Advance' : 'Owes'}
                </span>
              )}
              {myBalanceData?.balance === 0 && (
                 <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '600' }}>
                   Settled
                 </span>
              )}
            </div>
          </div>
        </div>
      </div>



      <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Recent Ledger</h2>
        
        <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
          <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.25rem' }}>
            <Filter size={16} /> <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Filter by:</span>
          </div>
          
          <div style={{ zIndex: 10 }}><CustomSelect 
            value={filterMode} 
            onChange={setFilterMode} 
            options={[
              { label: 'All Modes', value: 'All' },
              { label: 'Online', value: 'Online' },
              { label: 'Cash', value: 'Cash' }
            ]} 
          /></div>
          
          <div style={{ zIndex: 10 }}><CustomSelect 
            value={filterMember} 
            onChange={setFilterMember} 
            options={[
              { label: 'All Members', value: 'All' },
              ...uniqueMembers.map(m => ({ label: m.name, value: m.email }))
            ]} 
          /></div>
          
          <div style={{ zIndex: 10 }}><CustomSelect 
            value={filterMonth} 
            onChange={setFilterMonth} 
            options={[
              { label: 'All Time', value: 'All' },
              ...uniqueMonths.map(m => ({ label: formatMonth(m), value: m }))
            ]} 
          /></div>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', border: 'none' }}>
        {loading ? (
          <div className="spinner-container"><div className="spinner"></div></div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-4 text-center text-secondary">No transactions match the selected filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: '#FDF8F3' }}>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Member</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Mode</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx, idx) => (
                <tr key={tx.transaction_id} style={{ borderBottom: idx !== filteredTransactions.length - 1 ? '1px solid var(--border-color)' : 'none', backgroundColor: '#FFFFFF' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <div className="flex items-center" style={{ gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#EAF0EC', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {tx.name ? tx.name.substring(0, 2).toUpperCase() : tx.email.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{tx.email === user.email ? 'You' : tx.name || tx.email}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TXN #{tx.transaction_id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    {new Date(tx.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <span className="pill" style={{ 
                      backgroundColor: tx.transaction_mode === 'online' ? 'rgba(56, 161, 105, 0.1)' : 'rgba(200, 169, 126, 0.15)',
                      color: tx.transaction_mode === 'online' ? 'var(--success-color)' : '#9A7B4F'
                    }}>
                      {tx.transaction_mode}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--success-color)', fontSize: '1.1rem' }}>
                    +₹{tx.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
      {showQRModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', backgroundColor: '#FFFFFF', padding: '2rem', textAlign: 'center', position: 'relative' }}>
            <button 
              onClick={() => setShowQRModal(false)} 
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={24} />
            </button>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Pay via UPI</h3>
            <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '2rem' }}>Scan this QR code using any UPI app to make your payment to the admin.</p>
            
            <div style={{ padding: '1rem', border: '2px dashed var(--border-color)', borderRadius: '16px', display: 'inline-block', marginBottom: '1.5rem', backgroundColor: '#F9FAFB' }}>
              <img src={upiImage} alt="Admin UPI QR Code" style={{ width: '250px', height: 'auto', borderRadius: '8px' }} />
            </div>
            
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: '600' }}>When you are done, the admin will verify and record the transaction.</p>
          </div>
        </div>
      )}

      {showForm && user.isadmin && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', backgroundColor: '#FFFFFF', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => setShowForm(false)} 
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={24} />
            </button>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Record a Payment</h3>
            <form onSubmit={handleSubmit} className="flex-col gap-4">
              <div className="input-group">
                <label className="input-label">Payment For</label>
                <CustomSelect 
                  value={paymentMember} 
                  onChange={setPaymentMember} 
                  options={allUsers} 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Amount (₹)</label>
                <input type="number" required min="1" className="input-field w-full" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Mode</label>
                <CustomSelect 
                  value={mode} 
                  onChange={setMode} 
                  options={[
                    { label: 'Online (UPI)', value: 'online' },
                    { label: 'Cash', value: 'cash' }
                  ]} 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Date</label>
                <CustomDatePicker value={date} onChange={setDate} />
              </div>
              <button type="submit" className="btn btn-primary w-full mt-2" disabled={adding}>
                <Check size={18} style={{ marginRight: '0.5rem' }} /> {adding ? 'Saving...' : 'Save Payment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
