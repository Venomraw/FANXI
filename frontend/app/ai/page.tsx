'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import NavBar from '@/src/components/NavBar';

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'critique' | 'formation' | 'chat' | 'commentary';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ── Mode config ───────────────────────────────────────────────────────────────

const MODES: {
  id: Mode;
  icon: string;
  label: string;
  hint: string;
}[] = [
  {
    id: 'critique',
    icon: '⚔️',
    label: 'Lineup Critique',
    hint: 'Describe your lineup — tell me the formation, your 11 players, and any reasoning behind the picks.',
  },
  {
    id: 'formation',
    icon: '🗺️',
    label: 'Formation Advisor',
    hint: "Tell me about your team's strengths and your opponent's style — I'll suggest the optimal formation.",
  },
  {
    id: 'chat',
    icon: '💬',
    label: 'Tactical Chat',
    hint: 'Ask me anything about football tactics — pressing triggers, half-spaces, positional play, you name it.',
  },
  {
    id: 'commentary',
    icon: '🎙️',
    label: 'Match Commentary',
    hint: 'Share your pre-match prediction and what actually happened — I\'ll deliver a post-match debrief.',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AIPage() {
  const [mode, setMode] = useState<Mode>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentMode = MODES.find(m => m.id === mode)!;

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Switch mode — clear chat, show hint
  const handleModeSwitch = (newMode: Mode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setMessages([]);
    setInput('');
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Auto-resize textarea back to baseline
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, messages: newMessages }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `⚠️ ${err.detail ?? 'Request failed.'}` },
        ]);
        return;
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '⚠️ Could not reach the FANXI AI server. Is the backend running?' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-grow textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', color: 'var(--text)' }}>
      <NavBar subtitle="AI" />

      <div
        style={{
          maxWidth: 'var(--container, 1200px)',
          margin: '0 auto',
          padding: '40px 28px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
        }}
      >
        {/* ── Header ── */}
        <div>
          <h1
            className="font-display"
            style={{ fontSize: 'clamp(40px, 6vw, 56px)', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}
          >
            FANXI <span style={{ color: 'var(--gold)' }}>AI</span>
          </h1>
          <p className="font-sans" style={{ fontSize: '15px', color: 'var(--muted)' }}>
            Your tactical analyst, formation strategist, and post-match narrator — all in one.
          </p>
        </div>

        {/* ── Main layout ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 220px) 1fr',
            gap: '20px',
            alignItems: 'start',
            minHeight: '560px',
          }}
          className="ai-grid"
        >
          {/* ── Mode sidebar ── */}
          <div
            style={{
              background: 'rgba(13, 19, 13, 0.9)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <p
              className="font-mono uppercase"
              style={{ fontSize: '10px', letterSpacing: '1.2px', color: 'var(--muted)', padding: '4px 8px 8px' }}
            >
              Mode
            </p>
            {MODES.map(m => {
              const active = m.id === mode;
              return (
                <button
                  key={m.id}
                  onClick={() => handleModeSwitch(m.id)}
                  className="font-sans font-semibold transition-all"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textAlign: 'left',
                    background: active
                      ? 'color-mix(in srgb, var(--gold) 12%, transparent)'
                      : 'transparent',
                    color: active ? 'var(--gold)' : 'var(--muted)',
                    boxShadow: active ? 'inset 0 0 0 1px color-mix(in srgb, var(--gold) 30%, transparent)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
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
                </button>
              );
            })}
          </div>

          {/* ── Chat window ── */}
          <div
            style={{
              background: 'rgba(13, 19, 13, 0.9)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              height: '620px',
            }}
          >
            {/* Messages area */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Starter hint */}
              {messages.length === 0 && (
                <div
                  style={{
                    margin: 'auto',
                    textAlign: 'center',
                    padding: '40px 20px',
                    maxWidth: '440px',
                  }}
                >
                  <div style={{ fontSize: '40px', marginBottom: '16px' }}>{currentMode.icon}</div>
                  <p
                    className="font-display"
                    style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}
                  >
                    {currentMode.label}
                  </p>
                  <p className="font-sans" style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>
                    {currentMode.hint}
                  </p>
                </div>
              )}

              {/* Message bubbles */}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    className="font-sans"
                    style={{
                      maxWidth: '82%',
                      padding: '12px 16px',
                      borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      fontSize: '14px',
                      lineHeight: 1.65,
                      whiteSpace: 'pre-wrap',
                      background:
                        msg.role === 'user'
                          ? 'color-mix(in srgb, var(--gold) 15%, var(--dark3))'
                          : 'rgba(255,255,255,0.05)',
                      color: msg.role === 'user' ? 'var(--text)' : 'var(--text)',
                      border:
                        msg.role === 'user'
                          ? '1px solid color-mix(in srgb, var(--gold) 25%, transparent)'
                          : '1px solid var(--border)',
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div
                    style={{
                      padding: '12px 18px',
                      borderRadius: '16px 16px 16px 4px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border)',
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
                          background: 'var(--muted)',
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

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--border)' }} />

            {/* Input bar */}
            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-end',
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask the tactical brain..."
                rows={1}
                className="font-sans"
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
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
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--gold) 50%, transparent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="font-sans font-semibold"
                style={{
                  background: input.trim() && !loading ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
                  color: input.trim() && !loading ? '#060A06' : 'var(--muted)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  flexShrink: 0,
                  height: '42px',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Hint */}
        <p className="font-sans" style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>
          Enter to send · Shift+Enter for new line · Switch mode to start a new conversation
        </p>
      </div>

      {/* Typing dot animation */}
      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% { opacity: 0.25; transform: scale(1); }
          30% { opacity: 1; transform: scale(1.2); }
        }
        @media (max-width: 640px) {
          .ai-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
