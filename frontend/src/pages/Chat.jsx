import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useData } from '../context/DataContext';
import { Send, User as UserIcon, Building2, X, Info, Lock, Unlock } from 'lucide-react';

export default function Chat() {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { balancesData: data, chats: messages, setChats: setMessages, fetchChats, fetchBalances } = useData();
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [selectedMsgInfo, setSelectedMsgInfo] = useState(null);
  const [isLocked, setIsLocked] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChats();
    fetchBalances();
  }, [fetchChats, fetchBalances]);

  useEffect(() => {
    // Scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  useEffect(() => {
    if (!socket) return;

    socket.on('receive_message', (message) => {
      setMessages((prev) => [...prev, message]);
      if (message.sender_email !== user.email) {
        socket.emit('mark_seen', { chat_id: message.id, user_email: user.email });
      }
    });

    socket.on('message_seen', ({ chat_id, user_email, seen_at }) => {
      setMessages((prev) => prev.map(msg => {
        if (msg.id === chat_id) {
          const seenBy = msg.seenBy || [];
          if (!seenBy.map(s => s.email).includes(user_email)) {
            return { ...msg, seenBy: [...seenBy, { email: user_email, seenAt: seen_at }] };
          }
        }
        return msg;
      }));
    });

    socket.on('user_typing', ({ email, isTyping }) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        if (isTyping) newSet.add(email);
        else newSet.delete(email);
        return newSet;
      });
    });

    return () => {
      socket.off('receive_message');
      socket.off('message_seen');
      socket.off('user_typing');
    };
  }, [socket, user.email]);

  useEffect(() => {
    if (!socket || messages.length === 0) return;
    
    // Mark historical unseen messages as seen
    messages.forEach(msg => {
      if (msg.sender_email !== user.email && (!msg.seenBy || !msg.seenBy.some(s => s.email === user.email))) {
        socket.emit('mark_seen', { chat_id: msg.id, user_email: user.email });
      }
    });
  }, [messages, socket, user.email]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;

    socket.emit('send_message', {
      sender_email: user.email,
      content: input.trim()
    });
    
    socket.emit('typing', { email: user.email, isTyping: false });
    setInput('');
  };

  const typingTimeoutRef = useRef(null);

  const handleTyping = (e) => {
    setInput(e.target.value);
    if (socket) {
      socket.emit('typing', { email: user.email, isTyping: e.target.value.length > 0 });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { email: user.email, isTyping: false });
      }, 2000);
    }
  };

  const totalFundBalance = data?.balances ? data.balances.reduce((acc, b) => acc + parseFloat(b.total_paid), 0) : 0;

  return (
    <div className="flex animate-fade-in flex-wrap md:flex-nowrap" style={{ gap: '2rem', height: 'calc(100vh - 120px)' }}>
      {/* Left Column: Fund Overview */}
      <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Fund Overview</h2>
          <div className="card" style={{ backgroundColor: '#F9FAFB', border: 'none' }}>
            <p className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Balance</p>
            <h2 style={{ fontSize: '2rem', color: 'var(--primary-color)' }}>₹{totalFundBalance.toFixed(2)}</h2>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserIcon size={20} /> Members
          </h2>
          <div className="flex-col gap-3">
            {data?.balances.map(b => {
              const isMe = b.email === user.email;
              const isOnline = onlineUsers.includes(b.email);
              return (
                <div key={b.email} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none', backgroundColor: '#FFFFFF' }}>
                  <div className="flex items-center gap-3">
                    <div style={{ position: 'relative' }}>
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=EAF0EC&color=3E6953&rounded=true`} alt="Avatar" style={{ width: '40px', height: '40px' }} />
                      {isOnline && <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--success-color)', border: '2px solid white' }}></div>}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{isMe ? 'You' : b.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {b.balance === 0 ? 'Settled up' : b.balance > 0 ? (isMe ? `You are owed` : `Owes you`) : (isMe ? `You owe` : `You are owed`)}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '1rem', color: b.balance > 0 ? 'var(--success-color)' : b.balance < 0 ? 'var(--danger-color)' : 'var(--text-primary)' }}>
                    {b.balance > 0 ? '+' : b.balance < 0 ? '-' : ''}₹{Math.abs(b.balance).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Chat Area */}
      <div className="flex-col" style={{ flex: 1, backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        {/* Chat Navbar */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FDF8F3' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'var(--primary-color)', color: 'white', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
              <Building2 size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--primary-color)', fontWeight: 'bold' }}>TrioAccount</h2>
          </div>
          {!isLocked && (
            <button onClick={() => setIsLocked(true)} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-secondary)', backgroundColor: '#FFFFFF', fontWeight: '500', transition: 'all 0.2s' }}>
              <Lock size={16} /> Lock
            </button>
          )}
        </div>

        {isLocked ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#EAF0EC', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <Lock size={40} />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Chat is Locked</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '300px' }}>Unlock the chat to view messages and join the conversation.</p>
            <button 
              onClick={() => setIsLocked(false)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', fontSize: '1.1rem' }}
            >
              <Unlock size={20} /> Unlock Chat
            </button>
          </div>
        ) : (
          <>
            <div className="chat-messages" style={{ flex: 1, backgroundColor: '#FFFFFF', padding: '1.5rem', gap: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {messages.length === 0 ? null : (() => {
            const lastSeenMap = {};
            messages.forEach((msg, i) => {
              if (msg.seenBy) {
                msg.seenBy.forEach(seenObj => {
                  if (seenObj.email !== user.email) {
                    lastSeenMap[seenObj.email] = { index: i, seenAt: seenObj.seenAt };
                  }
                });
              }
            });

            return messages.map((msg, i) => {
              const isMine = msg.sender_email === user.email;
              const senderName = data?.balances.find(b => b.email === msg.sender_email)?.name || msg.sender_email.split('@')[0];
              
              const msgDate = new Date(msg.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
              const prevMsgDate = i > 0 ? new Date(messages[i-1].timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
              const showDate = msgDate !== prevMsgDate;
              
              // Show all users who have seen this specific message (only for my messages)
              const seenByUsersHere = isMine ? (msg.seenBy?.map(s => s.email) || []) : [];

              const senderInitial = senderName.charAt(0).toUpperCase();
              
              let initialColor = 'var(--text-secondary)';
              let initialBgColor = '#F3F4F6';
              if (senderInitial === 'Y') { initialColor = 'var(--primary-color)'; initialBgColor = '#EAF0EC'; }
              else if (senderInitial === 'T') { initialColor = '#4A7C59'; initialBgColor = 'rgba(74, 124, 89, 0.15)'; }
              else if (senderInitial === 'R') { initialColor = '#8B7355'; initialBgColor = 'rgba(139, 115, 85, 0.15)'; }

              return (
                <React.Fragment key={i}>
                  {showDate && (
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                      <span style={{ backgroundColor: '#F3F4F6', color: 'var(--text-secondary)', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '500' }}>
                        {msgDate === new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) ? 'Today' : msgDate}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', width: '100%', marginBottom: '0.5rem' }}>
                    {!isMine && <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: initialColor, marginBottom: '0.25rem', marginLeft: '0.5rem' }}>{senderName}</div>}
                    <div className={`message-bubble ${isMine ? 'mine' : 'other'}`} 
                      onClick={() => { if (isMine) setSelectedMsgInfo(msg); }}
                      style={{ 
                        backgroundColor: isMine ? 'var(--primary-color)' : initialBgColor, 
                        color: isMine ? 'white' : '#000000',
                        border: 'none',
                        borderRadius: '16px',
                        borderBottomRightRadius: isMine ? '4px' : '16px',
                        borderBottomLeftRadius: !isMine ? '4px' : '16px',
                        padding: '0.875rem 1.25rem',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        cursor: 'pointer',
                        maxWidth: '75%',
                        overflowWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                        fontSize: '0.95rem'
                      }}>
                      {msg.content}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem', alignSelf: isMine ? 'flex-end' : 'flex-start', display: 'flex', gap: '4px', marginRight: isMine ? '0.5rem' : '0', marginLeft: !isMine ? '0.5rem' : '0' }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isMine && <span>✓</span>}
                    </div>
                    {seenByUsersHere.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', justifyContent: isMine ? 'flex-end' : 'flex-start', marginTop: '2px', marginRight: isMine ? '0.5rem' : '0' }}>
                        {seenByUsersHere.map(email => {
                          const name = data?.balances?.find(b => b.email === email)?.name || email.split('@')[0];
                          const seenRecord = msg.seenBy?.find(s => s.email === email);
                          const seenAtDate = seenRecord?.seenAt ? new Date(seenRecord.seenAt) : null;
                          const seenAtStr = seenAtDate && !isNaN(seenAtDate.getTime()) 
                            ? seenAtDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' IST'
                            : 'Unknown Time';
                          return (
                            <img 
                              key={email}
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3E6953&color=fff&rounded=true`}
                              alt={name}
                              title={`Seen by ${name} at ${seenAtStr}`}
                              style={{ width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer', border: '1px solid #E5E7EB' }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            });
          })()}
          
          {typingUsers.size > 0 && Array.from(typingUsers).filter(e => e !== user.email).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'flex-start', maxWidth: '75%', marginLeft: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', marginLeft: '0.5rem' }}>
                {Array.from(typingUsers).filter(e => e !== user.email).map(e => data?.balances?.find(b => b.email === e)?.name || e.split('@')[0]).join(', ')} {typingUsers.size > 1 ? 'are' : 'is'} typing...
              </div>
              <div className="typing-bubble" style={{ margin: 0 }}>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} style={{ padding: '1.25rem 1.5rem', backgroundColor: '#FFFFFF', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              value={input}
              onChange={handleTyping}
              placeholder="Type a message..."
              className="input-field"
              style={{ width: '100%', borderRadius: '99px', padding: '1rem 1.5rem', backgroundColor: '#F9FAFB', border: '1px solid var(--border-color)' }}
            />
          </div>
            <button type="submit" style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', opacity: input.trim() ? 1 : 0.6, transition: 'all 0.2s' }}>
              <Send size={20} style={{ marginLeft: '4px' }}/>
            </button>
          </form>
          </>
        )}

        {/* Message Info Modal */}
        {selectedMsgInfo && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', backgroundColor: '#FFFFFF', padding: '2rem', position: 'relative' }}>
              <button 
                onClick={() => setSelectedMsgInfo(null)} 
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={24} />
              </button>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={20} /> Message Info
              </h3>
              
              <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#F9FAFB', borderRadius: '12px', wordBreak: 'normal', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {selectedMsgInfo.content}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontWeight: '600', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Read by</div>
                {data?.balances?.filter(b => b.email !== selectedMsgInfo.sender_email).map(member => {
                  const seenRecord = selectedMsgInfo.seenBy?.find(s => s.email === member.email);
                  const seenAtDate = seenRecord?.seenAt ? new Date(seenRecord.seenAt) : null;
                  const timeString = seenAtDate && !isNaN(seenAtDate.getTime()) 
                    ? seenAtDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST'
                    : 'Seen';

                  return (
                    <div key={member.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=EAF0EC&color=3E6953&rounded=true`} alt="Avatar" style={{ width: '32px', height: '32px' }} />
                        <span style={{ fontWeight: '500', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{member.name}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '500', color: seenRecord ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
                        {seenRecord ? `✓✓ ${timeString}` : '✓ Delivered'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
