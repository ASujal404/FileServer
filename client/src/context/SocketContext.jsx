import React, { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getServerUrl } from '../services/api';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const serverUrl = getServerUrl();
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    newSocket.on('connect', () => {
      console.log('[Socket.IO Client] Connected to LAN Server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket.IO Client] Disconnected from LAN Server');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
