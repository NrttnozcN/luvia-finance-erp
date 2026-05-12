import React, { useState, useEffect } from 'react';
import { Users, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

const fmt = (n) => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '—';

const CustomerMovementReport = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('customers').select('id, name').order('name').then(({ data }) => setCustomers(data || []));
  }, []);

  const fetchMovements = async (custId, custName) => {
    if (!custId) return;
    setSelectedId(custId);
    setSelectedName(custName);
    setLoading(true);

    const [{ data: invs }, { data: txns }] = await Promise.all([
      supabase.from('invoices').select('id, invoice_no, date, total_amount, description, status').eq('customer_id', custId).order('date'),
      supabase.from('finance_transactions').select('id, date, amount, type, description').eq('customer_id', custId).order('date').then(r => ({ data: r.data || [] })),
    ]);

    const rows = [
      ...(invs || []).map(inv => ({
        date: inv.date,
        description: `Fatura #${inv.invoice_no}${inv.description ? ' – ' + inv.description : ''}`,
        borc: Number(inv.total_amount),
        alacak: 0,
        type: 'invoice',
      })),
      ...(txns || []).map(tx => ({
        date: tx.date,
        description: `${tx.type}${tx.description ? ' – ' + tx.description : ''}`,
        borc: ['Ödeme', 'Gider'].includes(tx.type) ? Number(tx.amount) : 0,
        alacak: ['Tahsilat', 'Gelir'].includes(tx.type) ? Number(tx.amount) : 0,
        type: 'payment',
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    let bal = 0;
    const withBal = rows.map(r => { bal += r.borc - r.alacak; return { ...r, balance: bal }; });
    setMovements(withBal);
    setLoading(false);
  };

  const totalBorc   = movements.reduce((a, m) => a + m.borc, 0);
  const totalAlacak = movements.reduce((a, m) => a + m.alacak, 0);
  const netBakiye   = totalBorc - totalAlacak;

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Cari Hareket Raporu</h1>
        <p className="text-muted">Cari hesap borç, alacak ve bakiye hareketleri</p>
      </header>

      {/* Cari seçici */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Cari Seçin</label>
          <select className="input" value={selectedId} onChange={e => {
            const opt = e.target.options[e.target.selectedIndex];
            fetchMovements(e.target.value, opt.text);
          }}>
            <option value="">Cari seçiniz...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {selectedId && (
          <button className="btn btn-ghost" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Yazdır / PDF
          </button>
        )}
      </div>

      {selectedId && (
        <>
          {/* Özet kartlar */}
          <div className="grid grid-cols-3" style={{ marginBottom: '1.5rem' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>Toplam Borç</p>
              <h2 style={{ fontSize: '1.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>₺{fmt(totalBorc)}</h2>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>Toplam Alacak</p>
              <h2 style={{ fontSize: '1.75rem', color: 'var(--success)', marginTop: '0.25rem' }}>₺{fmt(totalAlacak)}</h2>
            </div>
            <div className="card" style={{ borderLeft: `4px solid ${netBakiye > 0 ? 'var(--danger)' : 'var(--success)'}` }}>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>Net Bakiye</p>
              <h2 style={{ fontSize: '1.75rem', color: netBakiye > 0 ? 'var(--danger)' : 'var(--success)', marginTop: '0.25rem' }}>
                ₺{fmt(Math.abs(netBakiye))}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                {netBakiye > 0 ? '⬆ Borçlu (bize borçlu)' : netBakiye < 0 ? '⬇ Alacaklı (bize ödenecek)' : 'Dengede'}
              </p>
            </div>
          </div>

          {/* Tablo */}
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
              {selectedName} — Hareket Detayı
            </h3>
            {loading ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</p>
            ) : movements.length === 0 ? (
              <p className="text-dim" style={{ textAlign: 'center', padding: '3rem' }}>Bu cariye ait hareket bulunamadı.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '700' }}>Tarih</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '700' }}>Açıklama</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.82rem', color: 'var(--danger)', fontWeight: '700' }}>Borç ▲</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.82rem', color: 'var(--success)', fontWeight: '700' }}>Alacak ▼</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '700' }}>Bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m, i) => (
                      <tr key={i} style={{
                        borderBottom: '1px solid var(--bg-main)',
                        background: m.borc > 0
                          ? 'rgba(239,68,68,0.03)'
                          : 'rgba(16,185,129,0.03)',
                      }}>
                        <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          {fmtDate(m.date)}
                        </td>
                        <td style={{ padding: '0.9rem 1rem', fontSize: '0.9rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                              background: m.borc > 0 ? 'var(--danger)' : 'var(--success)'
                            }} />
                            {m.description}
                          </div>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontWeight: '700', color: m.borc > 0 ? 'var(--danger)' : 'var(--text-dim)' }}>
                          {m.borc > 0 ? `₺${fmt(m.borc)}` : '—'}
                        </td>
                        <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontWeight: '700', color: m.alacak > 0 ? 'var(--success)' : 'var(--text-dim)' }}>
                          {m.alacak > 0 ? `₺${fmt(m.alacak)}` : '—'}
                        </td>
                        <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontWeight: '800', fontSize: '0.9rem' }}>
                          <span style={{ color: m.balance > 0 ? 'var(--danger)' : m.balance < 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                            ₺{fmt(Math.abs(m.balance))}
                          </span>
                          <span style={{ fontSize: '0.68rem', marginLeft: '3px', color: 'var(--text-dim)' }}>
                            {m.balance > 0 ? 'B' : m.balance < 0 ? 'A' : ''}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-main)' }}>
                      <td colSpan={2} style={{ padding: '1rem', fontWeight: '800', fontSize: '0.9rem' }}>GENEL TOPLAM</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '800', color: 'var(--danger)' }}>₺{fmt(totalBorc)}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '800', color: 'var(--success)' }}>₺{fmt(totalAlacak)}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '800', color: netBakiye > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        ₺{fmt(Math.abs(netBakiye))} {netBakiye > 0 ? 'B' : 'A'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerMovementReport;
