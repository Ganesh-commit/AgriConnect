import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket.io] Connected:', socket.id);
    });

    socket.on('user_online', ({ userId, online }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (online) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    socket.on('online_users', (userIds) => {
      setOnlineUsers(new Set(userIds));
    });

    socket.on('new_notification', () => {
      setUnreadNotifications((prev) => prev + 1);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket.io] Connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket.io] Disconnected:', reason);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user]);

  const joinConversation = (convId) => {
    socketRef.current?.emit('join_conversation', convId);
  };

  const leaveConversation = (convId) => {
    socketRef.current?.emit('leave_conversation', convId);
  };

  const sendSocketMessage = (conversationId, text) => new Promise((resolve) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      resolve(null);
      return;
    }

    socket.timeout(5000).emit('send_message', { conversationId, text }, (error, result) => {
      resolve(error ? null : result);
    });
  });

  const sendTyping = (conversationId, isTyping) => {
    socketRef.current?.emit('typing', { conversationId, isTyping });
  };

  const onMessage = (handler) => {
    socketRef.current?.on('new_message', handler);
    return () => socketRef.current?.off('new_message', handler);
  };

  const onTyping = (handler) => {
    socketRef.current?.on('typing', handler);
    return () => socketRef.current?.off('typing', handler);
  };

  const onUnreadUpdate = (handler) => {
    socketRef.current?.on('unread_count_update', handler);
    return () => socketRef.current?.off('unread_count_update', handler);
  };

  const clearNotificationBadge = () => setUnreadNotifications(0);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        onlineUsers,
        unreadNotifications,
        clearNotificationBadge,
        setUnreadNotifications,
        joinConversation,
        leaveConversation,
        sendSocketMessage,
        sendTyping,
        onMessage,
        onTyping,
        onUnreadUpdate
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
