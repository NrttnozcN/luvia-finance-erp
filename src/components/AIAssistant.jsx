import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

// Kendi anahtarınızı buraya güvenle koyabilirsiniz, yerel kullanım içindir.
const genAI = new GoogleGenerativeAI('AIzaSyCOzr6Ky2-sULC0MIJk4VvDEMa-icIs5j8');

const toolsDeclaration = {
  functionDeclarations: [
    {
      name: "get_expenses_summary",
      description: "Belirtilen ay ve yıla ait giderlerin kategorik özetini getirir.",
      parameters: {
        type: "OBJECT",
        properties: {
          month: { type: "INTEGER", description: "İstenen ay (1-12)" },
          year: { type: "INTEGER", description: "İstenen yıl" }
        },
        required: ["month", "year"],
      },
    },
  ],
};

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Merhaba! Luvia Finansal Asistanı emrinizde. Size nasıl yardımcı olabilirim?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const currentUser = useAuthStore(s => s.currentUser);
  const companyId = currentUser?.company_id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // Frontend içinde çalışan veritabanı okuma aracı (Doğrudan Supabase'den okur)
  const getExpensesSummary = async ({ month, year }) => {
    if (!companyId) return { error: "Oturum açık değil veya şirket kimliği yok." };
    
    // Basit bir yaklaşım: Tüm o ayın giderlerini çekip frontend'de toplarız
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('company_id', companyId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error(error);
      return { error: "Veri çekilirken hata oluştu." };
    }

    if (!data || data.length === 0) {
      return { message: "Bu aya ait gider bulunamadı." };
    }

    // Kategorilere göre grupla ve topla
    const summary = data.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
      return acc;
    }, {});

    return Object.entries(summary).map(([category, total]) => ({ category, total }));
  };

  const toolsFunctions = {
    get_expenses_summary: getExpensesSummary
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        tools: [toolsDeclaration],
        systemInstruction: "Sen Luvia ERP'nin resmi finansal asistanısın. Kullanıcıya kibar ve profesyonel Türkçe cevap ver. Sana sağlanan araçları kullanarak veritabanından veri çek ve bunları markdown formatında okunaklı tablolarla sun. Bugünün tarihi: " + new Date().toLocaleDateString('tr-TR'),
      });

      const chat = model.startChat();
      let result = await chat.sendMessage(userMessage);
      let response = result.response;

      // Gemini function calling - farklı API versiyonlarıyla uyumlu erişim
      const calls = response.functionCalls?.() ?? response.functionCalls ?? [];

      if (calls && calls.length > 0) {
        const call = calls[0];
        if (toolsFunctions[call.name]) {
          const apiResponse = await toolsFunctions[call.name](call.args);
          result = await chat.sendMessage([{
            functionResponse: { name: call.name, response: { result: apiResponse } }
          }]);
          response = result.response;
        }
      }

      const text = typeof response.text === 'function' ? response.text() : response.text;
      setMessages(prev => [...prev, { role: 'assistant', content: text || 'Yanıt alınamadı.' }]);
    } catch (error) {
      console.error('AI Error:', error);
      // Hata mesajını kullanıcıya göster (geliştirme aşaması için)
      const errMsg = error?.message || JSON.stringify(error);
      setMessages(prev => [...prev, { role: 'assistant', content: `Bir hata oluştu: ${errMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '30px',
          background: 'linear-gradient(135deg, var(--primary), #8B5CF6)',
          color: 'white',
          border: 'none',
          boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)',
          cursor: 'pointer',
          display: isOpen ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          transition: 'transform 0.3s ease'
        }}
      >
        <MessageSquare size={28} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '380px',
          height: '600px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '24px',
          boxShadow: '0 12px 48px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10000,
          border: '1px solid rgba(255,255,255,0.4)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, var(--primary), #8B5CF6)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>Luvia Copilot</h3>
                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Online</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8 }}><X size={24} /></button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#F9FAFB' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bot size={16} />
                  </div>
                )}
                <div style={{ background: msg.role === 'user' ? 'var(--primary)' : 'white', color: msg.role === 'user' ? 'white' : 'var(--text)', padding: '12px 16px', borderRadius: msg.role === 'user' ? '20px 20px 0 20px' : '20px 20px 20px 0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  {msg.role === 'assistant' ? <div className="prose prose-sm" style={{ margin: 0 }}><ReactMarkdown>{msg.content}</ReactMarkdown></div> : msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Bot size={16} /></div>
                <div style={{ background: 'white', padding: '12px 16px', borderRadius: '20px 20px 20px 0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '16px', background: 'white', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px' }}>
            <input 
              type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Bir soru sorun..." disabled={isLoading}
              style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid var(--border)', outline: 'none', background: 'var(--bg-main)', fontSize: '0.9rem' }}
            />
            <button onClick={handleSend} disabled={isLoading || !input.trim()} style={{ width: '44px', height: '44px', borderRadius: '50%', background: input.trim() && !isLoading ? 'var(--primary)' : 'var(--border)', color: 'white', border: 'none', cursor: input.trim() && !isLoading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={20} style={{ marginLeft: '2px' }} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
