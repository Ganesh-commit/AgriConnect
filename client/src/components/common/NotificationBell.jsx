import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { notificationService } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

const typeColors = {
  order_placed: 'bg-blue-100 text-blue-600',
  order_accepted: 'bg-green-100 text-green-600',
  order_rejected: 'bg-red-100 text-red-600',
  order_completed: 'bg-emerald-100 text-emerald-600',
  order_cancelled: 'bg-gray-100 text-gray-600',
  negotiation_offer: 'bg-purple-100 text-purple-600',
  negotiation_accepted: 'bg-green-100 text-green-600',
  negotiation_rejected: 'bg-red-100 text-red-600',
  verification_approved: 'bg-blue-100 text-blue-700',
  verification_rejected: 'bg-red-100 text-red-600',
  new_message: 'bg-indigo-100 text-indigo-600',
  general: 'bg-gray-100 text-gray-600'
};

const typeEmojis = {
  order_placed: '📦',
  order_accepted: '✅',
  order_rejected: '❌',
  order_completed: '🎉',
  order_cancelled: '🚫',
  negotiation_offer: '💬',
  negotiation_accepted: '🤝',
  negotiation_rejected: '❌',
  verification_approved: '🏅',
  verification_rejected: '⛔',
  new_message: '💌',
  general: '🔔'
};

const timeAgo = (dateStr) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const { unreadNotifications, clearNotificationBadge, setUnreadNotifications } = useSocket();

  useEffect(() => {
    loadNotifications();
  }, []);

  // Update badge count when new socket notification arrives
  useEffect(() => {
    if (unreadNotifications > 0) {
      setUnreadCount((prev) => prev + unreadNotifications);
    }
  }, [unreadNotifications]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications({ limit: 20 });
      setNotifications(res.data.data.notifications);
      setUnreadCount(res.data.data.unreadCount);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen((prev) => !prev);
    if (!open) {
      clearNotificationBadge();
      loadNotifications();
    }
  };

  const markRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotif = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        id="notification-bell"
        onClick={handleOpen}
        className="relative p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
        aria-label="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[480px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 ml-2">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-gray-400 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 text-sm gap-2">
                <Bell size={36} className="text-gray-200" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors
                    ${!notif.isRead ? 'bg-blue-50/30' : ''}`}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">
                    {typeEmojis[notif.type] || '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notif.isRead && (
                      <button
                        onClick={() => markRead(notif._id)}
                        className="p-1 text-green-500 hover:bg-green-100 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotif(notif._id)}
                      className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
