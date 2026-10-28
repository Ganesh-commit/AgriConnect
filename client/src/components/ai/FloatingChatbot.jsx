import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { aiService } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { MarkdownRenderer, ChatCropCards } from './MarkdownRenderer';
import {
  Bot,
  X,
  Send,
  Trash2,
  Maximize2,
  Sparkles,
  AlertCircle,
  Loader2,
  Database
} from 'lucide-react';
import toast from 'react-hot-toast';

const QUICK_PROMPTS = {
  en: [
    "What's available near me?",
    'Cheapest vegetables',
    'High-priced spices',
    'Compare tomato prices'
  ],
  te: [
    'గుంటూరులో ఏ పంటలు అందుబాటులో ఉన్నాయి?',
    'తక్కువ ధర కూరగాయలు చూపించు',
    'ఎక్కువ ధర సుగంధ ద్రవ్యాలు',
    'టమాటా ధరలను పోల్చండి'
  ]
};

export default function FloatingChatbot() {
  const { language: globalLang } = useLanguage();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [chatLang, setChatLang] = useState(globalLang === 'te' ? 'te' : 'en');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [toolActivity, setToolActivity] = useState(null);
  const [health, setHealth] = useState(null);
  const bottomRef = useRef(null);

  const loadHistoryAndHealth = async () => {
    try {
      const [histRes, healthRes] = await Promise.all([
        aiService.getChatHistory(),
        aiService.getHealth()
      ]);
      if (histRes.data?.data?.messages) {
        setMessages(histRes.data.data.messages);
      }
      if (healthRes.data?.data) {
        setHealth(healthRes.data.data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setChatLang(globalLang === 'te' ? 'te' : 'en');
  }, [globalLang]);

  useEffect(() => {
    if (open) {
      loadHistoryAndHealth();
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  // Hide floating widget when already on the full /assistant page
  if (location.pathname === '/assistant') {
    return null;
  }

  const handleSend = async (customText) => {
    const text = (customText !== undefined ? customText : input).trim();
    if (!text || streaming) return;

    const historySnapshot = messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.content
    }));

    const userMsg = { role: 'user', content: text, language: chatLang };
    const assistantPlaceholder = {
      role: 'assistant',
      content: '',
      language: chatLang,
      streaming: true
    };

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    if (customText === undefined) setInput('');
    setStreaming(true);
    setToolActivity(null);

    let accumulated = '';
    await aiService.streamChat({
      message: text,
      language: chatLang,
      history: historySnapshot,
      onToolActivity: (activity) => {
        setToolActivity(activity?.status || 'Checking live listings...');
      },
      onToken: (chunk) => {
        accumulated += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: accumulated
            };
          }
          return updated;
        });
      },
      onDone: (payload) => {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
            updated[lastIdx] = {
              role: 'assistant',
              content: accumulated || payload?.reply || '',
              language: payload?.language || chatLang,
              cards: payload?.cards || [],
              toolsUsed: payload?.toolsUsed || [],
              provider: payload?.meta?.provider,
              model: payload?.meta?.model,
              streaming: false
            };
          }
          return updated;
        });
        setToolActivity(null);
        setStreaming(false);
      },
      onError: (err) => {
        setToolActivity(null);
        setStreaming(false);
        toast.error(err.message || 'AI is busy, try again in a minute');
      }
    });
  };

  const handleClear = async () => {
    try {
      await aiService.clearChatHistory();
      setMessages([]);
      toast.success(chatLang === 'te' ? 'చాట్ క్లియర్ చేయబడింది' : 'Chat cleared');
    } catch {
      toast.error('Failed to clear chat');
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-gradient-to-r from-emerald-700 to-green-600 text-white font-bold text-xs shadow-xl shadow-emerald-900/25 hover:scale-105 transition-all"
          title="AgriConnect AI Sahayak"
        >
          <Bot size={20} />
          <span>{chatLang === 'te' ? 'AI సహాయకుడు' : 'AI Sahayak'}</span>
        </button>
      ) : (
        <div className="w-[360px] sm:w-[400px] h-[540px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-800 to-green-700 text-white px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold leading-tight flex items-center gap-1.5">
                  <span>{chatLang === 'te' ? 'అగ్రికనెక్ట్ సహాయకుడు' : 'AgriConnect Sahayak'}</span>
                  <Sparkles size={13} className="text-amber-300" />
                </h3>
                <p className="text-[10px] text-emerald-100">
                  {health?.available
                    ? `Active: ${health.primaryProvider}`
                    : 'Offline Smart Assistant'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Language Toggle EN / తెలుగు */}
              <div className="flex items-center bg-black/20 rounded-lg p-0.5 text-[10px] font-bold mr-1">
                <button
                  type="button"
                  onClick={() => setChatLang('en')}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    chatLang === 'en' ? 'bg-white text-emerald-900' : 'text-emerald-100'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setChatLang('te')}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    chatLang === 'te' ? 'bg-white text-emerald-900' : 'text-emerald-100'
                  }`}
                >
                  తెలుగు
                </button>
              </div>

              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-100"
                title="Clear chat"
              >
                <Trash2 size={15} />
              </button>
              <Link
                to="/assistant"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-100"
                title="Open full Assistant page"
              >
                <Maximize2 size={15} />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white"
                title="Close"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Provider Notice if no live LLM configured */}
          {health && !health.available && (
            <div className="px-3.5 py-2 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
              <AlertCircle size={13} className="shrink-0 text-amber-600" />
              <span className="truncate">
                No cloud/local LLM reachable; using verified mandi & FAQ fallback.
              </span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60">
            {messages.length === 0 && (
              <div className="space-y-3 pt-2">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed shadow-2xs">
                  {chatLang === 'te'
                    ? 'నమస్కారం! మార్కెట్ ధరలు, పంట వ్యాధులు, UPI QR చెల్లింపులు లేదా పంట అమ్మకాల గురించి తెలుగులో లేదా ఇంగ్లీషులో అడగండి.'
                    : 'Namaste! Ask me about current mandi prices, crop care, UPI QR payments, or how to buy & sell directly on AgriConnect.'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS[chatLang].map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSend(q)}
                      className="text-left text-[11px] font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  m.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-emerald-700 text-white rounded-br-xs whitespace-pre-line'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs shadow-2xs'
                  }`}
                >
                  {m.role === 'user' ? (
                    m.content
                  ) : m.content ? (
                    <MarkdownRenderer content={m.content} compact />
                  ) : m.streaming ? (
                    '...'
                  ) : (
                    ''
                  )}
                </div>

                {m.role === 'assistant' && Array.isArray(m.cards) && m.cards.length > 0 && (
                  <div className="w-full max-w-[95%]">
                    <ChatCropCards
                      cards={m.cards}
                      compact
                      onCardClick={() => setOpen(false)}
                    />
                  </div>
                )}

                {m.role === 'assistant' && m.provider && (
                  <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                    {m.provider} • {m.model}
                    {Array.isArray(m.toolsUsed) && m.toolsUsed.length > 0
                      ? ` • Live DB (${m.toolsUsed.map((t) => t.name).join(', ')})`
                      : ''}
                  </span>
                )}
              </div>
            ))}

            {streaming && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold px-2">
                {toolActivity ? (
                  <>
                    <Database size={13} className="animate-pulse text-emerald-600" />
                    <span>{toolActivity}</span>
                  </>
                ) : (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>
                      {chatLang === 'te' ? 'సమాధానం రాస్తోంది...' : 'Sahayak is typing...'}
                    </span>
                  </>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Persistent Quick Suggestion Chips */}
          {messages.length > 0 && (
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {QUICK_PROMPTS[chatLang].map((q, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={streaming}
                  onClick={() => handleSend(q)}
                  className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Disclaimer + Input */}
          <div className="p-3 bg-white border-t border-slate-200 space-y-2">
            <p className="text-[10px] text-slate-400 text-center">
              AI replies are suggestions and may be imperfect.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  chatLang === 'te'
                    ? 'మీ ప్రశ్నను ఇక్కడ టైప్ చేయండి...'
                    : 'Ask about mandi prices, crops, orders...'
                }
                className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50 transition-colors"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

