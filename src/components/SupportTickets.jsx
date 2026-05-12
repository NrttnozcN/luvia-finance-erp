import React, { useState, useEffect } from 'react';
import { MessageCircle, CheckCircle, Clock, ChevronLeft, Send, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

const fmt = (d) => new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const SupportTickets = () => {
  const currentUser = useAuthStore(s => s.currentUser);
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    setLoading(true);
    const query = isAdmin
      ? supabase.from('support_tickets').select('*').order('created_at', { ascending: false })
      : supabase.from('support_tickets').select('*').eq('user_id', currentUser?.id).order('created_at', { ascending: false });
    const { data } = await query;
    setTickets(data || []);
    setLoading(false);
  };

  const openTicket = async (ticket) => {
    setSelected(ticket);
    const { data } = await supabase.from('support_messages').select('*').eq('ticket_id', ticket.id).order('created_at');
    setMessages(data || []);
  };

  const handleReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    await supabase.from('support_messages').insert([{
      ticket_id: selected.id,
      sender_id: currentUser?.id,
      sender_name: currentUser?.name,
      sender_role: currentUser?.role,
      message: reply.trim(),
      is_admin_reply: isAdmin,
    }]);
    setReply('');
    const { data } = await supabase.from('support_messages').select('*').eq('ticket_id', selected.id).order('created_at');
    setMessages(data || []);
    setSending(false);
  };

  const handleClose = async (ticketId) => {
    await supabase.from('support_tickets').update({ status: 'Kapalı' }).eq('id', ticketId);
    fetchTickets();
    if (selected?.id === ticketId) setSelected(s => ({ ...s, status: 'Kapalı' }));
  };

  const handleReopen = async (ticketId) => {
    await supabase.from('support_tickets').update({ status: 'Açık' }).eq('id', ticketId);
    fetchTickets();
    if (selected?.id === ticketId) setSelected(s => ({ ...s, status: 'Açık' }));
  };

  const openCount = tickets.filter(t => t.status === 'Açık').length;

  if (selected) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button className="btn btn-ghost" onClick={() => { setSelected(null); fetchTickets(); }}>
            <ChevronLeft size={18} /> Geri
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.5rem' }}>{selected.title}</h1>
            <p className="text-muted" style={{ fontSize: '0.82rem' }}>
              {selected.user_name} · {fmt(selected.created_at)}
            </p>
          </div>
          {selected.status === 'Açık' ? (
            <button className="btn" style={{ background: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => handleClose(selected.id)}>
              <CheckCircle size={16} /> Tamamlandı İşaretle
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={() => handleReopen(selected.id)}>Yeniden Aç</button>
          )}
        </div>

        <div className="card" style={{ marginBottom: '1.5rem', maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.length === 0 ? (
            <p className="text-dim" style={{ textAlign: 'center', padding: '2rem' }}>Henüz mesaj yok.</p>
          ) : messages.map((msg) => {
            const isMine = msg.sender_id === currentUser?.id;
            const isAdminMsg = msg.is_admin_reply;
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '75%', padding: '0.9rem 1.1rem', borderRadius: '14px',
                  background: isAdminMsg ? '#fff0e6' : 'var(--bg-main)',
                  borderLeft: isAdminMsg ? '3px solid var(--primary)' : '3px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: '800', color: isAdminMsg ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {msg.sender_name}
                    </span>
                    {isAdminMsg && (
                      <span style={{ fontSize: '0.65rem', background: 'var(--primary)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: '700' }}>Admin</span>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>{fmt(msg.created_at)}</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{msg.message}</p>
                </div>
              </div>
            );
          })}
        </div>

        {selected.status === 'Açık' && (
          <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <textarea
              className="input"
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Cevabınızı yazın..."
              rows={3}
              style={{ flex: 1, resize: 'vertical' }}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleReply(); }}
            />
            <button className="btn btn-primary" onClick={handleReply} disabled={sending || !reply.trim()}>
              <Send size={16} /> {sending ? 'Gönderiliyor...' : 'Gönder'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Destek Talepleri</h1>
          <p className="text-muted">
            {isAdmin
              ? `${openCount} açık talep bulunuyor`
              : 'Sistemle ilgili destek talepleriniz'}
          </p>
        </div>
        {openCount > 0 && (
          <div style={{ background: 'var(--danger)', color: 'white', borderRadius: '20px', padding: '0.35rem 1rem', fontWeight: '800', fontSize: '0.85rem' }}>
            {openCount} Açık
          </div>
        )}
      </header>

      <div className="card">
        {loading ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</p>
        ) : tickets.length === 0 ? (
          <p className="text-dim" style={{ textAlign: 'center', padding: '3rem' }}>Henüz destek talebi bulunmuyor.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Talep</th>
                {isAdmin && <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Kullanıcı</th>}
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Tarih</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--bg-main)', cursor: 'pointer' }}
                  onClick={() => openTicket(t)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <MessageCircle size={16} style={{ color: t.status === 'Açık' ? 'var(--primary)' : 'var(--text-dim)', flexShrink: 0 }} />
                      <div>
                        <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>{t.title}</p>
                        {t.description && <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>{t.description.slice(0, 60)}{t.description.length > 60 ? '...' : ''}</p>}
                      </div>
                    </div>
                  </td>
                  {isAdmin && <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.user_name}<br /><span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{t.user_email}</span></td>}
                  <td style={{ padding: '1rem', fontSize: '0.82rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{fmt(t.created_at)}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${t.status === 'Açık' ? 'badge-warning' : 'badge-success'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', width: 'fit-content' }}>
                      {t.status === 'Açık' ? <Clock size={11} /> : <CheckCircle size={11} />}
                      {t.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <ChevronLeft size={16} style={{ transform: 'rotate(180deg)', color: 'var(--text-dim)' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SupportTickets;
