import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatService } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { MessageCircle, Send, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export default function ChatPage() {
  const { user } = useAuth();
  const { joinConversation, leaveConversation, sendSocketMessage, sendTyping, onMessage, onTyping, onUnreadUpdate, onlineUsers } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    // Listen for new socket messages
    const cleanup = onMessage(({ message, conversationId }) => {
      if (activeConv && conversationId === activeConv._id) {
        setMessages((prev) => prev.some((item) => item._id === message._id)
          ? prev
          : [...prev, message]);
        scrollToBottom();
      }
      // Update last message in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId
            ? {
                ...c,
                lastMessage: message,
                unreadCounts: {
                  ...c.unreadCounts,
                  [user._id]: activeConv?._id === conversationId || message.sender?._id === user._id
                    ? 0
                    : (c.unreadCounts?.[user._id] || 0) + 1
                }
              }
            : c
        )
      );
    });
    return cleanup;
  }, [activeConv, onMessage, user._id]);

  useEffect(() => {
    const cleanup = onUnreadUpdate(() => loadConversations());
    return cleanup;
  }, [onUnreadUpdate]);

  useEffect(() => {
    // Listen for typing events
    const cleanup = onTyping(({ userId: typingUserId, conversationId, isTyping }) => {
      if (activeConv && conversationId === activeConv._id && typingUserId !== user._id) {
        setTypingUsers((prev) => ({ ...prev, [conversationId]: isTyping }));
      }
    });
    return cleanup;
  }, [activeConv, onTyping, user._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await chatService.getConversations();
      setConversations(res.data.data.conversations);
    } catch {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const openConversation = async (conv) => {
    if (activeConv) leaveConversation(activeConv._id);
    setActiveConv(conv);
    joinConversation(conv._id);
    try {
      const res = await chatService.getMessages(conv._id);
      setMessages(res.data.data.messages);
      setConversations((prev) => prev.map((item) => item._id === conv._id
        ? { ...item, unreadCounts: { ...item.unreadCounts, [user._id]: 0 } }
        : item));
    } catch {
      toast.error('Failed to load messages');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || !activeConv || sendingMsg) return;
    const text = input.trim();
    setInput('');
    setSendingMsg(true);
    try {
      const result = await sendSocketMessage(activeConv._id, text);
      if (result?.success && result.message) {
        setMessages((prev) => prev.some((message) => message._id === result.message._id)
          ? prev
          : [...prev, result.message]);
      } else {
        const response = await chatService.sendMessage(activeConv._id, text);
        setMessages((prev) => [...prev, response.data.data.message]);
      }
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    if (!activeConv) return;
    sendTyping(activeConv._id, true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      sendTyping(activeConv._id, false);
    }, 1500);
  };

  const getOtherParticipant = (conv) => {
    return conv.participants?.find((p) => p._id !== user._id);
  };

  const filteredConversations = conversations.filter((c) => {
    const other = getOtherParticipant(c);
    return other?.name?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <MessageCircle className="text-green-600" size={28} /> Chat
        </h1>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 flex overflow-hidden"
             style={{ height: '75vh' }}>

          {/* Sidebar: Conversation List */}
          <div className="w-80 border-r border-gray-100 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 text-sm rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2">
                  <MessageCircle size={40} className="text-gray-200" />
                  <p>No conversations yet</p>
                  <p className="text-xs text-gray-300">Chat about a crop or order</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const other = getOtherParticipant(conv);
                  const isOnline = onlineUsers.has(other?._id);
                  const isActive = activeConv?._id === conv._id;
                  const unread = conv.unreadCounts?.[user._id] || 0;

                  return (
                    <button
                      key={conv._id}
                      onClick={() => openConversation(conv)}
                      className={`w-full flex items-center gap-3 p-4 text-left hover:bg-green-50 transition-colors border-b border-gray-50
                        ${isActive ? 'bg-green-50 border-l-4 border-l-green-500' : ''}`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-semibold text-sm">
                          {other?.name?.charAt(0) || '?'}
                        </div>
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-800 truncate">{other?.name || 'Unknown'}</span>
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                            {conv.lastMessage ? formatDate(conv.lastMessage.createdAt) : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-gray-500 truncate">
                            {conv.lastMessage?.text || (conv.crop?.name ? `Re: ${conv.crop.name}` : 'Start chatting')}
                          </p>
                          {unread > 0 && (
                            <span className="ml-2 flex-shrink-0 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {unread}
                            </span>
                          )}
                        </div>
                        {conv.crop?.name && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1 inline-block">
                            🌾 {conv.crop.name}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Main: Message Window */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!activeConv ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <MessageCircle size={64} className="text-gray-200" />
                <p className="text-lg font-medium text-gray-400">Select a conversation</p>
                <p className="text-sm text-gray-300">Chat with farmers and buyers about crops & orders</p>
              </div>
            ) : (
              <>
                {/* Header */}
                {(() => {
                  const other = getOtherParticipant(activeConv);
                  const isOnline = onlineUsers.has(other?._id);
                  return (
                    <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-semibold">
                          {other?.name?.charAt(0) || '?'}
                        </div>
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-800">{other?.name}</p>
                          {other?.isVerified && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">✓ Verified</span>
                          )}
                        </div>
                        <p className={`text-xs ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                          {isOnline ? '● Online' : '○ Offline'}
                        </p>
                      </div>
                      {activeConv.crop && (
                        <div className="ml-auto text-sm text-gray-500 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                          🌾 {activeConv.crop.name}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                      <p>No messages yet. Say hello! 👋</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender._id === user._id || msg.sender === user._id;
                      return (
                        <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm shadow-sm
                            ${isMe
                              ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-br-none'
                              : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                            }`}
                          >
                            <p className="leading-relaxed">{msg.text}</p>
                            <p className={`text-xs mt-1 text-right ${isMe ? 'text-green-100' : 'text-gray-400'}`}>
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {typingUsers[activeConv._id] && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-2 text-gray-400 text-sm">
                        <span className="animate-pulse">typing...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <textarea
                      value={input}
                      onChange={handleTyping}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message... (Enter to send)"
                      rows={1}
                      className="flex-1 resize-none px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-green-300 transition-all"
                      style={{ maxHeight: '120px' }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || sendingMsg}
                      className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
