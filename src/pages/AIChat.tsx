import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CHAT_RESPONSES, PRODUCTS } from '../data/products';

interface Message {
  id: number;
  role: 'bot' | 'user';
  text: string;
}

let msgId = 0;

const AIChat: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, typing]);

  const addBotMessage = useCallback((text: string) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, { id: ++msgId, role: 'bot', text }]);
    }, 900);
  }, []);

  const getResponse = async (val: string): Promise<string> => {
    // ── TODO: Replace with real Google AI backend call ──────────────────────
    // try {
    //   const response = await fetch('/api/ai/chat', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
    //     body: JSON.stringify({
    //       message: val,
    //       context: PRODUCTS.map(p => `${p.name}: ${p.sub} (${p.priceDisplay})`).join(', ')
    //     }),
    //   });
    //   const data = await response.json();
    //   return data.reply;
    // } catch { /* fall through to keyword matching */ }
    // ────────────────────────────────────────────────────────────────────────

    // Keyword fallback (works offline / before backend is connected)
    const lower = val.toLowerCase();
    for (const key of Object.keys(CHAT_RESPONSES)) {
      if (key !== 'default' && lower.includes(key)) return CHAT_RESPONSES[key];
    }
    return CHAT_RESPONSES.default;
  };

  const handleToggle = () => {
    if (!open && messages.length === 0) {
      addBotMessage("Hello! I'm Claire, your AI beauty stylist 🌿 How can I help you find the perfect ritual today?");
    }
    setOpen(prev => !prev);
  };

  const sendMessage = async () => {
    const val = input.trim();
    if (!val) return;
    setMessages(prev => [...prev, { id: ++msgId, role: 'user', text: val }]);
    setInput('');
    const reply = await getResponse(val);
    setTimeout(() => addBotMessage(reply), 200);
  };

  const sendSuggestion = async (key: string) => {
    setMessages(prev => [...prev, { id: ++msgId, role: 'user', text: key }]);
    const reply = await getResponse(key);
    setTimeout(() => addBotMessage(reply), 300);
  };

  const SUGGESTIONS = ['dry skin', 'best seller', 'hair care', 'spa'];

  return (
    <div className="chatbot-fab">
      {/* Chat Panel */}
      <div className={`chatbot-panel ${open ? 'open' : ''}`} id="chatPanel">
        <div className="chat-head">
          <div className="chat-head-avatar">🌿</div>
          <div className="chat-head-info">
            <h4>Claire — AI Stylist</h4>
            <div className="chat-status">
              <div className="status-dot" />
              <p>Online & ready to help</p>
            </div>
          </div>
        </div>

        <div className="chat-messages" id="chatMessages">
          {messages.map(m => (
            <div key={m.id} className={`chat-msg ${m.role}`}>{m.text}</div>
          ))}
          {typing && (
            <div className="chat-msg typing">
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length === 0 && !typing && (
          <div className="chat-suggestions">
            {SUGGESTIONS.map(s => (
              <button key={s} className="chat-suggestion" onClick={() => sendSuggestion(s)}>
                {s.replace('best seller', 'Best sellers').replace('dry skin', 'Dry skin help').replace('hair care', 'Hair care').replace('spa', 'Spa services')}
              </button>
            ))}
          </div>
        )}

        <div className="chat-input-row">
          <input
            className="chat-input"
            id="chatInput"
            type="text"
            placeholder="Ask about your skin ritual..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
          />
          <button className="chat-send" onClick={sendMessage}>
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>

      {/* FAB Toggle */}
      <button className="chatbot-toggle" onClick={handleToggle} id="chatToggle">
        <div className="pulse-ring" />
        <span className="material-symbols-outlined" id="chatIcon">{open ? 'close' : 'chat'}</span>
      </button>
    </div>
  );
};

export default AIChat;
