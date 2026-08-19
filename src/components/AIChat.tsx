import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../services/api';

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

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  const addBotMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, { id: ++msgId, role: 'bot', text }]);
  }, []);

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, { id: ++msgId, role: 'user', text }]);
  };

  const handleToggle = () => {
    if (!open && messages.length === 0) {
      addBotMessage("Hello! I'm Claire, your AI beauty stylist 🌿 How can I help you find the perfect skin ritual or spa service today?");
    }
    setOpen(prev => !prev);
  };

  const sendToBackend = async (userText: string, currentMessages: Message[]) => {
    setTyping(true);
    try {
      // Format history for backend: array of { role: 'user' | 'assistant', text }
      const historyPayload = currentMessages.map(m => ({
        role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
        text: m.text,
      }));

      const res = await api.post('/ai/chat', {
        message: userText,
        history: historyPayload,
      });

      const replyText = res.data?.data?.message || res.data?.message || "How else may I help you find your ideal beauty ritual?";
      addBotMessage(replyText);
    } catch (err: any) {
      console.error('AI Chat request error:', err);
      const errMsg = err?.response?.data?.message || "I'm currently unable to reach my knowledge base. Please try again shortly or chat with us on WhatsApp!";
      addBotMessage(errMsg);
    } finally {
      setTyping(false);
    }
  };

  const sendMessage = () => {
    const val = input.trim();
    if (!val || typing) return;
    
    const newMessages: Message[] = [...messages, { id: ++msgId, role: 'user', text: val }];
    setMessages(newMessages);
    setInput('');
    
    sendToBackend(val, messages);
  };

  const sendSuggestion = (suggestionText: string) => {
    if (typing) return;
    const newMessages: Message[] = [...messages, { id: ++msgId, role: 'user', text: suggestionText }];
    setMessages(newMessages);
    sendToBackend(suggestionText, messages);
  };

  const suggestions = ['Dry skin help', 'Best sellers', 'Hair care', 'Spa services'];

  return (
    <div className="fixed bottom-8 right-8 z-[1500]">
      {/* Panel */}
      <div
        className={`absolute bottom-[70px] right-0 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] bg-surface-container-lowest rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden transition-all duration-500 ${
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-50 pointer-events-none'
        }`}
        style={{ transformOrigin: 'bottom right' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-primary-container p-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">🌿</div>
          <div className="flex-1">
            <h4 className="font-bold text-white text-sm">Claire — AI Stylist</h4>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <p className="text-white/80 text-xs">Online & ready to help</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`max-w-[88%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'bot'
                  ? 'bg-surface-container-low text-on-surface self-start rounded-bl-xs border border-outline/10'
                  : 'bg-primary text-white self-end rounded-br-xs shadow-xs'
              }`}
              style={{ animation: 'fadeUp-cs 0.3s cubic-bezier(0.22,1,0.36,1) both' }}
            >
              {msg.text}
            </div>
          ))}

          {typing && (
            <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-xs bg-surface-container-low self-start flex gap-1.5 items-center border border-outline/10">
              <span className="text-xs text-on-surface/60 font-medium mr-1">Claire is thinking</span>
              {[0, 0.2, 0.4].map((delay, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-primary/70 rounded-full"
                  style={{ animation: `typing-cs 1.4s ${delay}s infinite` }}
                />
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        {messages.length <= 2 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-2">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => sendSuggestion(s)}
                disabled={typing}
                className="text-xs border border-outline-variant rounded-full px-3 py-1.5 text-primary font-semibold hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="flex items-center gap-2 p-4 border-t border-outline-variant bg-surface-container-lowest">
          <input
            className="flex-1 bg-surface-container-low rounded-full px-4 py-2.5 text-sm text-on-surface outline-none font-sans border border-outline/10 focus:border-primary/50 transition-colors"
            placeholder="Ask about skincare, products, or spa..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            disabled={typing}
          />
          <button
            onClick={sendMessage}
            disabled={typing || !input.trim()}
            className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:scale-100"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </div>
      </div>

      {/* FAB Button */}
      <button
        onClick={handleToggle}
        className="relative w-[60px] h-[60px] bg-gradient-to-br from-primary to-primary-container rounded-full flex items-center justify-center text-white shadow-[0_8px_30px_rgba(0,108,12,0.4)] hover:scale-105 active:scale-95 transition-all duration-300"
      >
        <div className="absolute inset-0 rounded-full border-2 border-primary" style={{ animation: 'pulse-ring-cs 2.5s ease infinite' }} />
        <span className="material-symbols-outlined text-[26px] transition-transform duration-300" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
          {open ? 'close' : 'chat'}
        </span>
      </button>

      <style>{`
        @keyframes pulse-ring-cs { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes typing-cs { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; } 40% { transform: scale(1.2); opacity: 1; } }
        @keyframes fadeUp-cs { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AIChat;
