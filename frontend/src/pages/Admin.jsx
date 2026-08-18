import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserPlus, Shield, Users, Building2, Key, X, Eye, EyeOff } from 'lucide-react';

export default function Admin() {
  const { user } = useAuth();
  const { members, fetchMembers, addMember, updateMemberRole, loading } = useData();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    isAdmin: false
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [error, setError] = useState('');

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [modalMsg, setModalMsg] = useState({ text: '', type: '' });
  
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showModalPassword, setShowModalPassword] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setError('');
    
    const result = await addMember({ 
      name: formData.name, 
      email: formData.email, 
      password: formData.password, 
      isadmin: formData.isAdmin 
    });
    
    if (result.success) {
      setMessage({ text: result.message || 'Member added successfully!', type: 'success' });
      setFormData({ name: '', email: '', password: '', isAdmin: false });
    } else {
      setMessage({ text: result.error || 'Failed to add member', type: 'error' });
    }
  };

  const handleRoleToggle = async (email, currentIsAdmin) => {
    if (email === user.email && currentIsAdmin) {
      alert("You cannot remove your own admin access.");
      return;
    }
    const result = await updateMemberRole(email, !currentIsAdmin);
    if (!result.success) {
      alert(result.error || "Failed to update role");
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setModalMsg({ text: '', type: '' });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: passwordTarget.email, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setModalMsg({ text: data.message || 'Password updated successfully!', type: 'success' });
        setNewPassword('');
        setTimeout(() => {
          setPasswordModalOpen(false);
          setPasswordTarget(null);
          setModalMsg({ text: '', type: '' });
        }, 2000);
      } else {
        setModalMsg({ text: data.error || 'Failed to change password', type: 'error' });
      }
    } catch (err) {
      setModalMsg({ text: 'Error connecting to server', type: 'error' });
    }
    setPasswordLoading(false);
  };

  if (!user?.isadmin) return null;

  return (
    <div className="animate-fade-in flex-col" style={{ gap: '2rem', display: 'flex' }}>
      {/* Page Navbar */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#FDF8F3', borderRadius: '16px' }}>
        <div style={{ background: 'var(--primary-color)', color: 'white', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
          <Building2 size={20} />
        </div>
        <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--primary-color)', fontWeight: 'bold' }}>Members Administration</h2>
      </div>

      <div className="flex flex-wrap md:flex-nowrap" style={{ gap: '2.5rem' }}>
        {/* Left Column: Current Members */}
        <div style={{ flex: '1 1 60%' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 style={{ fontSize: '1.25rem' }}>Current Members</h2>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--primary-color)', cursor: 'pointer' }}>View All</span>
          </div>

          <div className="card" style={{ backgroundColor: '#FDF8F3', border: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem' }}>
            {members.map((m, idx) => (
              <div key={m.id || m.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: '1rem 1.25rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center gap-4">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=EAF0EC&color=3E6953&rounded=true`} alt="Avatar" style={{ width: '42px', height: '42px' }} />
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{m.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div style={{ padding: '0.25rem 0.75rem', backgroundColor: '#F3F4F6', color: 'var(--text-secondary)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                    {m.isadmin ? 'Admin' : 'Member'}
                  </div>
                  <button 
                    onClick={() => { 
                      setPasswordTarget(m); 
                      setPasswordModalOpen(true); 
                      setModalMsg({ text: '', type: '' }); 
                    }}
                    style={{ background: 'rgba(62,105,83,0.05)', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', padding: '0.4rem', borderRadius: '8px', transition: 'all 0.2s' }}
                    title="Change Password"
                  >
                    <Key size={18} />
                  </button>
                  <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px' }} title={m.isadmin ? "Remove Admin Access" : "Grant Admin Access"}>
                    <input 
                      type="checkbox" 
                      checked={!!m.isadmin} 
                      onChange={() => handleRoleToggle(m.email, !!m.isadmin)}
                      disabled={m.email === user.email}
                      style={{ opacity: 0, width: 0, height: 0 }} 
                    />
                    <span style={{ position: 'absolute', cursor: m.email === user.email ? 'not-allowed' : 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: m.isadmin ? 'var(--success-color)' : '#CBD5E1', transition: '.4s', borderRadius: '34px', opacity: m.email === user.email ? 0.5 : 1 }}>
                      <span style={{ position: 'absolute', content: '""', height: '14px', width: '14px', left: '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%', transform: m.isadmin ? 'translateX(16px)' : 'none' }}></span>
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Add Member & Capacity */}
        <div style={{ flex: '1 1 40%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Active Capacity Card */}
          <div className="card" style={{ backgroundColor: '#F9FAFB', border: 'none' }}>
            <div className="flex items-center gap-2 mb-4 text-secondary" style={{ fontWeight: '600' }}>
              <Users size={18} /> Active Capacity
            </div>
            <div className="flex items-end gap-2 mb-2">
              <h2 style={{ fontSize: '2.5rem', lineHeight: 1, color: 'var(--primary-color)' }}>{members.length}</h2>
              <span className="text-secondary" style={{ marginBottom: '0.4rem' }}>/ 3 members</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.5rem' }}>
              <div style={{ width: `${Math.min((members.length / 3) * 100, 100)}%`, height: '100%', backgroundColor: 'var(--success-color)' }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{Math.max(3 - members.length, 0)} seats remaining in current tier.</p>
          </div>

          {/* Add New Member Form */}
          <div className="card" style={{ backgroundColor: '#F9F8F6', border: 'none' }}>
            <h3 className="mb-6" style={{ fontSize: '1.25rem' }}>Add New Member</h3>
            
            {message.text && (
              <div style={{ padding: '0.75rem', backgroundColor: message.type === 'success' ? '#D1FAE5' : '#FEE2E2', color: message.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleAddMember}>
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input type="text" required className="input-field" placeholder="e.g. Jane Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ backgroundColor: 'white' }} />
              </div>

              <div className="input-group">
                <label className="input-label">Email Address</label>
                <input type="email" required className="input-field" placeholder="jane@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ backgroundColor: 'white' }} />
              </div>

              <div className="input-group">
                <label className="input-label">Temporary Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showAddPassword ? 'text' : 'password'} 
                    required 
                    className="input-field w-full" 
                    placeholder="••••••••" 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    style={{ backgroundColor: 'white', paddingRight: '2.5rem' }} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    tabIndex="-1"
                  >
                    {showAddPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6 mt-4">
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>Administrator Access</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Grant full system permissions</div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                  <input type="checkbox" checked={formData.isAdmin} onChange={e => setFormData({...formData, isAdmin: e.target.checked})} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: formData.isAdmin ? 'var(--success-color)' : '#CBD5E1', transition: '.4s', borderRadius: '34px' }}>
                    <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%', transform: formData.isAdmin ? 'translateX(20px)' : 'none' }}></span>
                  </span>
                </label>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ padding: '0.875rem' }}>
                {loading ? 'Processing...' : 'Invite Member'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {passwordModalOpen && passwordTarget && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', backgroundColor: '#FFFFFF', padding: '2.5rem', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button 
              onClick={() => { setPasswordModalOpen(false); setNewPassword(''); setPasswordTarget(null); setModalMsg({ text: '', type: '' }); }} 
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={24} />
            </button>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Change Password</h3>
            <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Enter a new password for <strong>{passwordTarget.name}</strong>.
            </p>
            
            {modalMsg.text && (
              <div style={{ padding: '0.75rem', backgroundColor: modalMsg.type === 'success' ? '#D1FAE5' : '#FEE2E2', color: modalMsg.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                {modalMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordChange}>
              <div className="input-group">
                <label className="input-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showModalPassword ? 'text' : 'password'} 
                    required 
                    className="input-field w-full" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(!showModalPassword)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    tabIndex="-1"
                  >
                    {showModalPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={passwordLoading} style={{ marginTop: '1rem' }}>
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
