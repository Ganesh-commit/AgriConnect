import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { aiService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { MarkdownRenderer, ChatCropCards } from '../components/ai/MarkdownRenderer';
import {
  Bot,
  Send,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PhoneCall,
  Sprout,
  ShieldAlert,
  Database
} from 'lucide-react';
import toast from 'react-hot-toast';

const QUICK_CHIPS = {
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

const SAMPLE_QUESTIONS = {
  en: [
    "What's available near me?",
    'Cheapest vegetables',
    'High-priced spices',
    'Compare tomato prices',
    'What crops are available in Guntur?',
    'How to grow tomatoes organically?'
  ],
  te: [
    'గుంటూరులో ఏ పంటలు అందుబాటులో ఉన్నాయి?',
    'తక్కువ ధర కూరగాయలు చూపించు',
    'ఎక్కువ ధర సుగంధ ద్రవ్యాలు',
    'టమాటా ధరలను పోల్చండి',
    'నా పంట లిస్టింగ్స్ మరియు ఆర్డర్ల వివరాలు చెప్పండి.',
    'టమాటా పంటను సేంద్రియ పద్ధతిలో ఎలా పండించాలి?'
  ]
};

export default function AssistantPage() {
  const { language: globalLang } = useLanguage();
  const [chatLang, setChatLang] = useState(globalLang === 'te' ? 'te' : 'en');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [toolActivity, setToolActivity] = useState(null);
  const [health, setHealth] = useState(null);
  const bottomRef = useRef(null);

  const loadInitialData = async () => {
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
    loadInitialData();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const handleSend = async (customText) => {
    const text = (customText !== undefined ? customText : input).trim();
    if (!text || streaming) return;

    const historySnapshot = messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.content
    }));

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text, language: chatLang },
      { role: 'assistant', content: '', language: chatLang, streaming: true }
    ]);
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
            updated[lastIdx] = { ...updated[lastIdx], content: accumulated };
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
              latencyMs: payload?.meta?.latencyMs,
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
      toast.success('Conversation history cleared');
    } catch {
      toast.error('Could not clear history');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar: LLM Provider Diagnostics & Quick Prompts */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-sm">
                <Bot size={24} />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-900">
                  AgriConnect AI Sahayak
                </h1>
                <p className="text-xs text-slate-500">
                  Bilingual English & తెలుగు Assistant
                </p>
              </div>
            </div>

            {/* Language Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setChatLang('en')}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                  chatLang === 'en'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English (EN)
              </button>
              <button
                type="button"
                onClick={() => setChatLang('te')}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                  chatLang === 'te'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                తెలుగు (Telugu)
              </button>
            </div>

            {/* Multi-Provider LLM Health Status */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">LLM Layer Status</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    health?.available
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {health?.available ? `Active (${health.primaryProvider})` : 'Fallback Mode'}
                </span>
              </div>

              {health && !health.available && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>{health.uiNotice}</span>
                </div>
              )}

              {health?.providers && (
                <div className="space-y-1.5">
                  {health.providers.map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div>
                        <span className="font-bold capitalize text-slate-800">{p.name}</span>
                        <span className="text-[10px] text-slate-400 block">{p.model}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          p.reachable
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {p.reachable ? 'Reachable' : p.configured ? 'Offline' : 'Unconfigured'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              {chatLang === 'te' ? 'తరచుగా అడిగే ప్రశ్నలు' : 'Suggested Prompts'}
            </h2>
            <div className="space-y-2">
              {SAMPLE_QUESTIONS[chatLang].map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(q)}
                  className="w-full text-left text-xs font-semibold p-3 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-900 border border-emerald-200/70 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Kisan Call Centre Card */}
          <div className="bg-gradient-to-br from-emerald-800 to-green-900 text-white p-6 rounded-3xl shadow-md space-y-3">
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <PhoneCall size={15} />
              <span>Govt. Helpline</span>
            </div>
            <h3 className="text-base font-extrabold">Kisan Call Centre</h3>
            <p className="text-xs text-emerald-100 leading-relaxed">
              For official agronomy, pest control, or weather advisories, call the toll-free Kisan Call Centre.
            </p>
            <a
              href="tel:18001801551"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-900 font-extrabold text-xs shadow-xs hover:bg-emerald-50"
            >
              <PhoneCall size={14} />
              <span>Call 1800-180-1551</span>
            </a>
          </div>
        </div>

        {/* Right Column: Main Chat Window */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-[75vh] overflow-hidden">
          {/* Top Bar */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-emerald-600" />
              <span className="text-sm font-extrabold text-slate-900">
                {chatLang === 'te'
                  ? 'వ్యవసాయ & మార్కెట్ సహాయకుడు (తెలుగు)'
                  : 'Agriculture & Marketplace Assistant (English)'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/farmer/disease-check"
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5"
              >
                <Sprout size={14} />
                <span>Leaf Disease Check</span>
              </Link>
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} />
                <span>Clear Chat</span>
              </button>
            </div>
          </div>

          {/* Chat Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
            {messages.length === 0 && (
              <div className="text-center py-16 space-y-3 max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <Bot size={28} />
                </div>
                <h3 className="text-base font-extrabold text-slate-800">
                  {chatLang === 'te'
                    ? 'అగ్రికనెక్ట్ AI సహాయకుడికి స్వాగతం!'
                    : 'Welcome to AgriConnect AI Sahayak!'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {chatLang === 'te'
                    ? 'మార్కెట్ ధరలు, మీ ఆర్డర్లు, పంటల సమాచారం లేదా ప్లాట్‌ఫారమ్ సందేహాలను అడగండి.'
                    : 'Ask about live mandi prices, your own listings & orders (PII-scrubbed), crop care, or platform features.'}
                </p>
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
                  className={`max-w-[88%] rounded-3xl px-5 py-3.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-emerald-700 text-white rounded-br-xs shadow-xs whitespace-pre-line'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs shadow-xs'
                  }`}
                >
                  {m.role === 'user' ? (
                    m.content
                  ) : m.content ? (
                    <MarkdownRenderer content={m.content} />
                  ) : m.streaming ? (
                    '...'
                  ) : (
                    ''
                  )}
                </div>

                {m.role === 'assistant' && Array.isArray(m.cards) && m.cards.length > 0 && (
                  <div className="w-full max-w-[90%]">
                    <ChatCropCards cards={m.cards} />
                  </div>
                )}

                {m.role === 'assistant' && m.provider && (
                  <span className="text-[10px] text-slate-400 mt-1 px-2">
                    Answered by {m.provider} ({m.model})
                    {m.latencyMs ? ` • ${m.latencyMs}ms` : ''}
                    {Array.isArray(m.toolsUsed) && m.toolsUsed.length > 0
                      ? ` • Live DB Tools: ${m.toolsUsed.map((t) => t.name).join(', ')}`
                      : ''}
                  </span>
                )}
              </div>
            ))}

            {streaming && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-bold px-2">
                {toolActivity ? (
                  <>
                    <Database size={15} className="animate-pulse text-emerald-600" />
                    <span>{toolActivity}</span>
                  </>
                ) : (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>
                      {chatLang === 'te' ? 'సమాధానం సిద్ధమవుతోంది...' : 'Generating response...'}
                    </span>
                  </>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick Suggestion Chips above input */}
          <div className="px-4 py-2 bg-slate-50/90 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
            {QUICK_CHIPS[chatLang].map((chip, i) => (
              <button
                key={i}
                type="button"
                disabled={streaming}
                onClick={() => handleSend(chip)}
                className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50 disabled:opacity-50 transition-colors shadow-2xs"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Bar & Mandatory Disclaimer */}
          <div className="p-4 bg-white border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <ShieldAlert size={13} className="text-amber-600" />
              <span>
                AI replies are suggestions and may be imperfect. Never guarantees yields, profits, or medical advice.
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  chatLang === 'te'
                    ? 'తెలుగులో లేదా ఇంగ్లీషులో మీ ప్రశ్నను అడగండి...'
                    : 'Type your question in English or Telugu...'
                }
                className="flex-1 px-4 py-3 text-sm rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="px-6 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm disabled:opacity-50 flex items-center gap-2 shadow-sm transition-colors"
              >
                <Send size={16} />
                <span>{chatLang === 'te' ? 'పంపు' : 'Send'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

