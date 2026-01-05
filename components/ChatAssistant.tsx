import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot } from 'lucide-react';
import { chatWithSolarExpert } from '../services/geminiService';
import { ChatMessage } from '../types';

const ChatAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Olá! Sou o SolarBot. Tem alguma dúvida sobre sua economia solar?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
        // Convert to Gemini history format
        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const response = await chatWithSolarExpert(history, userMsg);
        if (response) {
            setMessages(prev => [...prev, { role: 'model', text: response }]);
        }
    } catch (error) {
        setMessages(prev => [...prev, { role: 'model', text: "Desculpe, estou com problemas de conexão. Tente novamente." }]);
    } finally {
        setLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-slate-900 text-white p-4 rounded-full shadow-xl hover:scale-110 transition-transform z-40"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-scale-in" style={{ height: '500px' }}>
          <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <span className="font-bold">SolarBot Assistente</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:text-slate-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-orange-500 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
                <div className="flex justify-start">
                    <div className="bg-slate-200 p-3 rounded-2xl rounded-bl-none animate-pulse">
                        <span className="text-xs text-slate-500">Digitando...</span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Pergunte sobre energia solar..."
              className="flex-1 px-4 py-2 bg-slate-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
            />
            <button type="submit" disabled={loading} className="bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600 disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;
