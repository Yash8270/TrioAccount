import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (user) {
      const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const newSocket = io(SOCKET_URL);
      
      newSocket.on('connect', () => {
        newSocket.emit('user_connected', user.email);
      });

      newSocket.on('online_users', (users) => {
        setOnlineUsers(users);
      });

      setSocket(newSocket);

      return () => newSocket.close();
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
