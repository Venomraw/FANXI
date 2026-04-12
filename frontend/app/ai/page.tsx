'use client';

import { useState, useRef, useEffect, KeyboardEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/src/components/NavBar';
import { useAuth } from '@/src/context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'scout_report' | 'critique' | 'formation' | 'chat' | 'commentary';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ── Mode config ───────────────────────────────────────────────────────────────

interface ModeConfig {
  id: Mode;
  icon: string;
  label: string;
  color: string;
  hint: string;
  starters: string[];
}

const MODES: ModeConfig[] = [
  {
    id: 'scout_report',
    icon: '🔍',
    label: 'Scout Report',
    color: '#C084FC',
    hint: 'Type a WC 2026 nation and get a full tactical dossier — formation, key players, strengths, vulnerabilities, and a prediction rating.',
    starters: [
      'Give me a full scout report on France',
      'Scout Report: Brazil',
      'Scout Report: England',
      'Analyze Argentina for WC 2026',
      'Scout Report: Spain',
    ],
  },
  {
    id: 'chat',
    icon: '💬',
    label: 'Tactical Chat',
    color: 'var(--success)',
    hint: 'Ask anything about WC 2026 tactics, teams, players, or football theory. The AI knows the tournament inside out.',
    starters: [
      "Who wins WC 2026 and why?",
      "Which team has the best midfield at WC 2026?",
      "Explain how Spain build out from the back",
      "Who are the penalty takers for Brazil?",
      "4-3-3 vs 4-2-3-1 — which wins more at World Cups?",
    ],
  },
  {
    id: 'critique',
    icon: '⚔️',
    label: 'Lineup Critique',
    color: '#FF6B6B',
    hint: 'Share your predicted lineup — formation, 11 players, and any reasoning. Get a ruthless tactical breakdown.',
    starters: [
      'Critique my France XI: Maignan; Koundé, Saliba, Upamecano, T.Hernandez; Tchouaméni, Camavinga; Dembélé, Griezmann, Mbappé; Giroud. 4-2-3-1',
      'Critique my Brazil lineup: Alisson, Militão, Marquinhos, Bremer, Wendell, Casemiro, Paquetá, Rodrygo, Raphinha, Vinicius, Endrick. 4-2-3-1',
      'Critique my Spain XI: Unai Simón; Carvajal, Le Normand, Laporte, Cucurella; Rodri, Pedri; Yamal, Olmo, Williams; Morata. 4-3-3',
    ],
  },
  {
    id: 'formation',
    icon: '🗺️',
    label: 'Formation Advisor',
    color: 'var(--blue)',
    hint: "Describe a matchup — teams, styles, personnel. Get the optimal formation and a full tactical plan.",
    starters: [
      'Spain vs Germany — what shape should Spain use?',
      'Morocco face Brazil in the knockouts. Best defensive setup?',
      'France have Mbappé as false 9 — which formation maximizes him?',
      'England vs Argentina — how should England set up tactically?',
    ],
  },
  {
    id: 'commentary',
    icon: '🎙️',
    label: 'Match Debrief',
    color: 'var(--gold)',
    hint: "Share your pre-match prediction and what actually happened — get a dramatic post-match debrief with your Tactical IQ score.",
    starters: [
      "I predicted Spain 4-3-3, they played 4-2-3-1 and won 2-0. Yamal and Olmo both started.",
      "I said France would win 2-1 with Mbappé scoring. It ended 0-0. Brutal.",
      "I predicted Brazil 4-3-3 with Vinicius as ST. They used 4-2-3-1 but won 3-0.",
    ],
  },
];

// ── Rich message renderer ─────────────────────────────────────────────────────

function renderMessage(content: string, accentColor: string) {
  if (!content) return null;

  // Split into lines and group into sections
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      elements.push(<div key={key++} style={{ height: '8px' }} />);
      continue;
    }

    // Section header: line starting with emoji followed by CAPS words
    const sectionMatch = line.match(/^([\u{1F300}-\u{1FFFF}⚡⚠️✅❌🔄🧠🎯💪🎙️🏆📐👥👤])\s+([A-Z][A-Z\s'0-9\/–—-]+)/u);
    if (sectionMatch) {
      elements.push(
        <div key={key++} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '14px',
          marginBottom: '4px',
          padding: '6px 10px',
          background: `color-mix(in srgb, ${accentColor} 8%, transparent)`,
          border: `1px solid color-mix(in srgb, ${accentColor} 20%, transparent)`,
          borderRadius: '6px',
        }}>
          <span style={{ fontSize: '15px' }}>{sectionMatch[1]}</span>
          <span style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '10px',
            letterSpacing: '1.5px',
            fontWeight: 700,
            color: accentColor,
            textTransform: 'uppercase',
          }}>{sectionMatch[2]}</span>
        </div>
      );
      continue;
    }

    // Bullet points
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const text = line.slice(2);
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '2px 0 2px 8px' }}>
          <span style={{ color: accentColor, flexShrink: 0, marginTop: '1px', fontSize: '12px' }}>▸</span>
          <span style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text)' }}>{renderInline(text)}</span>
        </div>
      );
      continue;
    }

    // Numbered list
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '2px 0 2px 8px' }}>
          <span style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '11px',
            color: accentColor,
            flexShrink: 0,
            marginTop: '2px',
            minWidth: '16px',
          }}>{numberedMatch[1]}.</span>
          <span style={{ fontSize: '14px', lineHeight: 1.6 }}>{renderInline(numberedMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Regular line
    elements.push(
      <p key={key++} style={{ fontSize: '14px', lineHeight: 1.65, margin: 0 }}>
        {renderInline(line)}
      </p>
    );
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} style={{ color: 'var(--text)', fontWeight: 700 }}>{part}</strong>
      : part
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const LS_KEY = (mode: Mode) => `fanxi_ai_chat_${mode}`;

export default function AIPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('scout_report');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentMode = MODES.find(m => m.id === mode)!;
  const accentColor = currentMode.color;

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  // Load chat history from localStorage on mode switch
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY(mode));
      setMessages(saved ? JSON.parse(saved) : []);
    } catch {
      setMessages([]);
    }
  }, [mode]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem(LS_KEY(mode), JSON.stringify(messages)); } catch { /* quota */ }
    }
  }, [messages, mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleModeSwitch = (newMode: Mode) => {
    if (newMode === mode) { setSidebarOpen(false); return; }
    setMode(newMode);
    setInput('');
    setSidebarOpen(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const clearChat = () => {
    setMessages([]);
    try { localStorage.removeItem(LS_KEY(mode)); } catch { /* ok */ }
  };

  const sendMessage = useCallback(async (text?: string) => {
    const msgText = (text ?? input).trim();
    if (!msgText || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: msgText }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, messages: newMessages }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.detail ?? 'Request failed.'}` }]);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let aiMessage = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      setLoading(false);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: `Error: ${parsed.error}` };
                return updated;
              });
              break;
            }
            if (parsed.text) {
              aiMessage += parsed.text;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: aiMessage };
                return updated;
              });
            }
          } catch { /* malformed chunk */ }
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Could not reach the FANXI AI server. Is the backend running?' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, mode]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  if (isLoading || !user) return null;

  return (
    <div className="flex min-h-screen flex-col font-sans" style={{ background: 'transparent', color: 'var(--text)' }}>
      <NavBar subtitle="AI" />

      {/* Page header */}
      <div style={{ background: 'rgba(0,0,0,0.55)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(24px)' }}>
        <div className="max-w-[1400px] mx-auto px-7 py-6">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="font-mono text-xs tracking-widest uppercase mb-2" style={{ color: accentColor }}>
                {'// AI Tactical Brain'}
              </div>
              <h1 className="font-display font-semibold leading-none" style={{ fontSize: 'clamp(36px, 5vw, 64px)', letterSpacing: '-1px' }}>
                FANXI <span style={{ color: accentColor }}>AI</span>
              </h1>
            </div>
            <p className="font-sans text-[14px] max-w-sm" style={{ color: 'var(--muted)' }}>
              Tactical analyst, scout, formation strategist, and post-match narrator — powered by Llama 3.3 70B.
            </p>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>
        <div className="max-w-[1400px] w-full mx-auto px-7 py-6 flex gap-5" style={{ height: 'calc(100vh - 220px)', minHeight: '520px' }}>

          {/* ── Mode sidebar ── */}
          <div
            className="flex-shrink-0 flex-col gap-1 hidden lg:flex"
            style={{ width: '210px' }}
          >
            <p className="font-mono text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)', padding: '0 8px' }}>
              Mode
            </p>
            {MODES.map(m => {
              const active = m.id === mode;
              return (
                <button
                  key={m.id}
                  onClick={() => handleModeSwitch(m.id)}
                  className="font-sans font-semibold transition-all text-left"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '11px 14px',
                    border: active ? `1px solid color-mix(in srgb, ${m.color} 35%, transparent)` : '1px solid transparent',
                    cursor: 'pointer',
                    fontSize: '13px',
                    background: active ? `color-mix(in srgb, ${m.color} 10%, rgba(0,0,0,0.4))` : 'transparent',
                    color: active ? m.color : 'var(--muted)',
                    backdropFilter: active ? 'blur(12px)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.color = 'var(--text)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--muted)';
                    }
                  }}
                >
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{m.icon}</span>
                  <span>{m.label}</span>
                  {active && messages.length > 0 && (
                    <span
                      className="font-mono text-xs ml-auto"
                      style={{ background: `color-mix(in srgb, ${m.color} 20%, transparent)`, color: m.color, padding: '1px 5px', borderRadius: '4px' }}
                    >
                      {Math.ceil(messages.length / 2)}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Mobile mode picker trigger */}
            <div className="lg:hidden mt-auto">
              <button
                onClick={() => setSidebarOpen(o => !o)}
                className="w-full font-mono text-xs tracking-widest uppercase px-4 py-2.5 text-left"
                style={{ color: accentColor, border: `1px solid color-mix(in srgb, ${accentColor} 30%, transparent)`, background: `color-mix(in srgb, ${accentColor} 8%, transparent)` }}
              >
                {currentMode.icon} {currentMode.label} ▾
              </button>
            </div>
          </div>

          {/* ── Chat window ── */}
          <div
            className="flex flex-col flex-1 min-w-0"
            style={{
              background: 'rgba(0,0,0,0.50)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: `1px solid color-mix(in srgb, ${accentColor} 20%, var(--border))`,
              transition: 'border-color 0.3s ease',
            }}
          >
            {/* Chat header */}
            <div
              className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
              style={{ borderBottom: `1px solid color-mix(in srgb, ${accentColor} 15%, var(--border))` }}
            >
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '18px' }}>{currentMode.icon}</span>
                <div>
                  <span className="font-sans font-semibold text-[14px]" style={{ color: accentColor }}>
                    {currentMode.label}
                  </span>
                  <span className="font-mono text-xs ml-3 tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                    Llama 3.3 70B · Groq
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Mobile mode switcher */}
                <div className="lg:hidden flex gap-1">
                  {MODES.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleModeSwitch(m.id)}
                      title={m.label}
                      style={{
                        padding: '4px 8px',
                        fontSize: '13px',
                        border: m.id === mode ? `1px solid color-mix(in srgb, ${m.color} 40%, transparent)` : '1px solid transparent',
                        background: m.id === mode ? `color-mix(in srgb, ${m.color} 10%, transparent)` : 'transparent',
                        cursor: 'pointer',
                        borderRadius: '4px',
                      }}
                    >
                      {m.icon}
                    </button>
                  ))}
                </div>
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="font-mono text-xs tracking-widest uppercase px-3 py-1.5 transition-all"
                    style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'rgba(255,45,85,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3" style={{ minHeight: 0 }}>

              {/* Empty state */}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-6" style={{ textAlign: 'center', maxWidth: '520px', margin: '0 auto' }}>
                  <div style={{ fontSize: '44px' }}>{currentMode.icon}</div>
                  <div>
                    <p className="font-display font-semibold mb-2" style={{ fontSize: '20px', color: accentColor }}>
                      {currentMode.label}
                    </p>
                    <p className="font-sans text-[14px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                      {currentMode.hint}
                    </p>
                  </div>

                  {/* Starter prompts */}
                  <div className="flex flex-col gap-2 w-full">
                    <p className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                      Try asking:
                    </p>
                    {currentMode.starters.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(s)}
                        className="font-sans text-[13px] text-left px-4 py-3 transition-all"
                        style={{
                          border: `1px solid color-mix(in srgb, ${accentColor} 20%, var(--border))`,
                          background: `color-mix(in srgb, ${accentColor} 4%, rgba(0,0,0,0.3))`,
                          color: 'var(--muted)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = 'var(--text)';
                          e.currentTarget.style.borderColor = `color-mix(in srgb, ${accentColor} 45%, transparent)`;
                          e.currentTarget.style.background = `color-mix(in srgb, ${accentColor} 8%, rgba(0,0,0,0.4))`;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = 'var(--muted)';
                          e.currentTarget.style.borderColor = `color-mix(in srgb, ${accentColor} 20%, var(--border))`;
                          e.currentTarget.style.background = `color-mix(in srgb, ${accentColor} 4%, rgba(0,0,0,0.3))`;
                        }}
                      >
                        <span style={{ color: accentColor, marginRight: '8px' }}>→</span>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message bubbles */}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className="flex"
                  style={{ justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
                >
                  {msg.role === 'assistant' && (
                    <div
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center mr-2.5 mt-0.5 font-mono text-xs font-bold"
                      style={{
                        background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                        color: accentColor,
                        border: `1px solid color-mix(in srgb, ${accentColor} 30%, transparent)`,
                        borderRadius: '4px',
                        flexShrink: 0,
                        alignSelf: 'flex-start',
                      }}
                    >
                      AI
                    </div>
                  )}
                  <div
                    className="font-sans"
                    style={{
                      maxWidth: msg.role === 'user' ? '72%' : '88%',
                      padding: '12px 16px',
                      fontSize: '14px',
                      lineHeight: 1.65,
                      background: msg.role === 'user'
                        ? `color-mix(in srgb, ${accentColor} 14%, rgba(0,0,0,0.5))`
                        : 'rgba(255,255,255,0.04)',
                      color: 'var(--text)',
                      border: msg.role === 'user'
                        ? `1px solid color-mix(in srgb, ${accentColor} 28%, transparent)`
                        : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '2px 12px 12px 12px',
                    }}
                  >
                    {msg.role === 'assistant'
                      ? renderMessage(msg.content, accentColor)
                      : msg.content
                    }
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center font-mono text-xs font-bold"
                    style={{
                      background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                      color: accentColor,
                      border: `1px solid color-mix(in srgb, ${accentColor} 30%, transparent)`,
                      borderRadius: '4px',
                    }}
                  >
                    AI
                  </div>
                  <div
                    style={{
                      padding: '12px 16px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: '2px 12px 12px 12px',
                      display: 'flex',
                      gap: '5px',
                      alignItems: 'center',
                    }}
                  >
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: accentColor,
                          opacity: 0.6,
                          animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                          display: 'inline-block',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div
              className="flex-shrink-0 px-4 py-3.5 flex gap-3 items-end"
              style={{ borderTop: `1px solid color-mix(in srgb, ${accentColor} 12%, var(--border))` }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${currentMode.label}...`}
                rows={1}
                className="font-sans flex-1"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                  padding: '10px 14px',
                  fontSize: '14px',
                  color: 'var(--text)',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.5,
                  minHeight: '42px',
                  maxHeight: '160px',
                  transition: 'border-color 0.2s ease',
                  fontFamily: 'inherit',
                  borderRadius: '6px',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${accentColor} 55%, transparent)`)}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="font-sans font-semibold flex-shrink-0 transition-all"
                style={{
                  background: input.trim() && !loading ? accentColor : 'rgba(255,255,255,0.06)',
                  color: input.trim() && !loading ? 'var(--dark)' : 'var(--muted)',
                  border: 'none',
                  padding: '10px 22px',
                  fontSize: '13px',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  height: '42px',
                  whiteSpace: 'nowrap',
                  borderRadius: '6px',
                  boxShadow: input.trim() && !loading ? `0 0 16px color-mix(in srgb, ${accentColor} 35%, transparent)` : 'none',
                }}
              >
                Send →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="text-center pb-4">
        <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Enter to send · Shift+Enter for new line · Chats saved per mode
        </span>
      </div>

      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% { opacity: 0.25; transform: scale(1); }
          30% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
