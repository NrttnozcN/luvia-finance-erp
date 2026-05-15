import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

// API anahtarı artık güvenli bir şekilde Environment Variable'dan okunuyor.
// Vercel veya yerel ortamda VITE_GEMINI_API_KEY olarak tanımlanmalıdır.
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

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
  const [isMaximized, setIsMaximized] = useState(false);
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
    if (!companyId) return { error: "Oturum açık değil." };
    
    const startDate = `${year}-${String(month).padStart(2,'0')}-01`;
    const endDate   = new Date(year, month, 0).toISOString().split('T')[0];

    // Paralel sorgulama
    const [finRes, fuelRes] = await Promise.all([
      supabase.from('finance_transactions').select('*').eq('company_id', companyId).gte('date', startDate).lte('date', endDate),
      supabase.from('fuel_logs').select('*').eq('company_id', companyId).gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`)
    ]);

    if (finRes.error) return { error: `Finans hatası: ${finRes.error.message}` };
    if (fuelRes.error) return { error: `Akaryakıt hatası: ${fuelRes.error.message}` };

    const finData = finRes.data || [];
    const fuelData = fuelRes.data || [];

    if (finData.length === 0 && fuelData.length === 0) {
      return { message: `${month}/${year} dönemine ait herhangi bir kayıt bulunamadı.` };
    }

    // Gruplama ve Hesaplama
    const giderler = finData.filter(t => t.type?.includes('Gider') || t.type === 'Ödeme');
    const gelirler = finData.filter(t => t.type?.includes('Gelir') || t.type === 'Tahsilat');
    
    // Akaryakıtı giderlere ekle
    const fuelTotal = fuelData.reduce((s, l) => s + Number(l.total_amount || 0), 0);
    const fuelLitres = fuelData.reduce((s, l) => s + Number(l.litres || 0), 0);

    const categories = giderler.reduce((acc, curr) => {
      const cat = curr.category || 'Genel';
      acc[cat] = (acc[cat] || 0) + Number(curr.amount || 0);
      return acc;
    }, {});

    if (fuelTotal > 0) {
      categories['Akaryakıt'] = (categories['Akaryakıt'] || 0) + fuelTotal;
    }

    return {
      donem: `${month}/${year}`,
      toplam_gider: giderler.reduce((s,t) => s + Number(t.amount||0), 0) + fuelTotal,
      toplam_gelir: gelirler.reduce((s,t) => s + Number(t.amount||0), 0),
      akaryakit_detay: fuelTotal > 0 ? { tutar: fuelTotal, litre: fuelLitres, kayit_sayisi: fuelData.length } : null,
      gider_dagilimi: Object.entries(categories).map(([k,v]) => ({ kategori: k, toplam: v })),
      gelir_dagilimi: Object.entries(gelirler.reduce((acc, curr) => {
        const cat = curr.category || 'Genel';
        acc[cat] = (acc[cat] || 0) + Number(curr.amount || 0);
        return acc;
      }, {})).map(([k,v]) => ({ kategori: k, toplam: v })),
    };
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
          bottom: isMaximized ? '0' : '24px',
          right: isMaximized ? '0' : '24px',
          width: isMaximized ? '100%' : '380px',
          height: isMaximized ? '100%' : '600px',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(15px)',
          borderRadius: isMaximized ? '0' : '24px',
          boxShadow: '0 12px 48px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10000,
          border: isMaximized ? 'none' : '1px solid rgba(255,255,255,0.4)',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={() => setIsMaximized(!isMaximized)} 
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8, display: 'flex', alignItems: 'center' }}
              >
                {isMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
              <button 
                onClick={() => { setIsOpen(false); setIsMaximized(false); }} 
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8, display: 'flex', alignItems: 'center' }}
              >
                <X size={24} />
              </button>
            </div>
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
