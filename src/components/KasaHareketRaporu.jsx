import React, { useState, useEffect } from 'react';
import { Wallet, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

const fmt  = (n) => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtD = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '—';

const KasaHareketRaporu = () => {
  const currentUser = useAuthStore(s => s.currentUser);
  const cid = currentUser?.company_id;

  const [kasalar,       setKasalar]       = useState([]);
  const [selectedKasa,  setSelectedKasa]  = useState('');
  const [movements,     setMovements]     = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [startDate,     setStartDate]     = useState('');
  const [endDate,       setEndDate]       = useState('');

  useEffect(() => {
    supabase.from('kasalar').select('*').eq('company_id', cid).order('name').then(({ data }) => setKasalar(data || []));
  }, [cid]);

  const fetchMovements = async (kasaName, sd, ed) => {
    if (!kasaName) return;
    setLoading(true);
    setMovements([]);
    try {
      let q = supabase
        .from('finance_transactions')
        .select('id, date, type, amount, description, account_name')
        .eq('company_id', cid)
        .eq('account_name', kasaName)
        .order('date', { ascending: false });

      if (sd) q = q.gte('date', sd);
      if (ed) q = q.lte('date', ed);

      const { data, error } = await q;
      if (error) throw error;

      const GIRIS_TYPES  = ['Tahsilat', 'Gelir'];
      const CIKIS_TYPES  = ['Ödeme', 'Gider'];

      const rows = (data || [])
        .map(tx => ({
          ...tx,
          giris:  GIRIS_TYPES.includes(tx.type)  ? Number(tx.amount) : 0,
          cikis:  CIKIS_TYPES.includes(tx.type)  ? Number(tx.amount) : 0,
        }))
        .reverse();  // eskiden yeniye sırala bakiye için

      let bal = 0;
      const withBal = rows.map(r => {
        bal += r.giris - r.cikis;
        return { ...r, balance: bal };
      });

      setMovements(withBal.reverse()); // yeniden eskiye göster
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKasaChange = (name) => {
    setSelectedKasa(name);
    fetchMovements(name, startDate, endDate);
  };

  const handleFilter = () => fetchMovements(selectedKasa, startDate, endDate);

  const totalGiris  = movements.reduce((a, m) => a + m.giris, 0);
  const totalCikis  = movements.reduce((a, m) => a + m.cikis, 0);
  const netBakiye   = totalGiris - totalCikis;

  const handlePrint = () => {
    const rows = [...movements].reverse().map(m => `
      <tr>
        <td>${fmtD(m.date)}</td>
        <td>${m.type}</td>
        <td>${m.description || '—'}</td>
        <td style="text-align:right;color:#10b981">${m.giris > 0 ? '₺' + fmt(m.giris) : '—'}</td>
        <td style="text-align:right;color:#ef4444">${m.cikis > 0 ? '₺' + fmt(m.cikis) : '—'}</td>
        <td style="text-align:right;font-weight:700;color:${m.balance >= 0 ? '#10b981' : '#ef4444'}">
          ₺${fmt(Math.abs(m.balance))}
        </td>
      </tr>`).join('');

    const period = (startDate || endDate)
      ? `${startDate ? fmtD(startDate) : 'Başlangıç'} — ${endDate ? fmtD(endDate) : 'Bugün'}`
      : 'Tüm Hareketler';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>Kasa Hareket Raporu - ${selectedKasa}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; color: #1e293b; margin: 2cm; }
        h1 { font-size: 16pt; margin-bottom: 4px; }
        p.sub { color: #64748b; font-size: 10pt; margin: 0 0 16px; }
        .summary { display: flex; gap: 32px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border-radius: 8px; }
        .summary div { font-size: 10pt; }
        .summary strong { display: block; font-size: 13pt; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; font-size: 10pt; }
        th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-size: 9pt; color: #64748b; border-bottom: 2px solid #e2e8f0; }
        td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
        tfoot td { border-top: 2px solid #e2e8f0; font-weight: 700; background: #f8fafc; }
        @media print { body { margin: 1cm; } }
      </style></head><body>
      <h1>Kasa Hareket Raporu</h1>
      <p class="sub">${selectedKasa} · ${period} · Yazdırma: ${new Date().toLocaleDateString('tr-TR')}</p>
      <div class="summary">
        <div>Toplam Giriş<strong style="color:#10b981">₺${fmt(totalGiris)}</strong></div>
        <div>Toplam Çıkış<strong style="color:#ef4444">₺${fmt(totalCikis)}</strong></div>
        <div>Net Bakiye<strong style="color:${netBakiye >= 0 ? '#10b981' : '#ef4444'}">₺${fmt(Math.abs(netBakiye))}</strong></div>
      </div>
      <table>
        <thead><tr>
          <th>Tarih</th><th>İşlem Türü</th><th>Açıklama</th>
          <th style="text-align:right;color:#10b981">Giriş ▲</th>
          <th style="text-align:right;color:#ef4444">Çıkış ▼</th>
          <th style="text-align:right">Bakiye</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="3">GENEL TOPLAM</td>
          <td style="text-align:right;color:#10b981">₺${fmt(totalGiris)}</td>
          <td style="text-align:right;color:#ef4444">₺${fmt(totalCikis)}</td>
          <td style="text-align:right">₺${fmt(Math.abs(netBakiye))}</td>
        </tr></tfoot>
      </table>
      <script>window.onload = () => { window.print(); }</script>
      </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Kasa Hareket Raporu</h1>
        <p className="text-muted">Kasa ve banka hesaplarının dönemsel hareket dökümü</p>
      </header>

      {/* Filtreler */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: '180px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Kasa / Hesap</label>
          <select className="input" value={selectedKasa} onChange={e => handleKasaChange(e.target.value)}>
            <option value="">Seçiniz...</option>
            {kasalar.map(k => <option key={k.id} value={k.name}>{k.name} ({k.type})</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '140px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Başlangıç Tarihi</label>
          <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: '140px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Bitiş Tarihi</label>
          <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={handleFilter} disabled={!selectedKasa}>Getir</button>
        {selectedKasa && movements.length > 0 && (
          <button className="btn btn-ghost" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Yazdır / PDF
          </button>
        )}
      </div>

      {/* Özet kartlar */}
      {selectedKasa && !loading && movements.length > 0 && (
        <div className="grid grid-cols-3" style={{ marginBottom: '1.5rem' }}>
          <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Toplam Giriş</p>
            <h2 style={{ fontSize: '1.75rem', color: 'var(--success)', marginTop: '0.25rem' }}>₺{fmt(totalGiris)}</h2>
          </div>
          <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Toplam Çıkış</p>
            <h2 style={{ fontSize: '1.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>₺{fmt(totalCikis)}</h2>
          </div>
          <div className="card" style={{ borderLeft: `4px solid ${netBakiye >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Net Bakiye</p>
            <h2 style={{ fontSize: '1.75rem', color: netBakiye >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: '0.25rem' }}>₺{fmt(Math.abs(netBakiye))}</h2>
          </div>
        </div>
      )}

      {/* Tablo */}
      {selectedKasa && (
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
            {selectedKasa} — Hareket Detayı
            {(startDate || endDate) && (
              <span style={{ fontSize: '0.82rem', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '0.75rem' }}>
                {startDate ? fmtD(startDate) : '…'} – {endDate ? fmtD(endDate) : 'Bugün'}
              </span>
            )}
          </h3>
          {loading ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</p>
          ) : movements.length === 0 ? (
            <p className="text-dim" style={{ textAlign: 'center', padding: '3rem' }}>Bu kasa için hareket bulunamadı.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '700' }}>Tarih</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '700' }}>İşlem Türü</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '700' }}>Açıklama</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.82rem', color: 'var(--success)', fontWeight: '700' }}>Giriş ▲</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.82rem', color: 'var(--danger)', fontWeight: '700' }}>Çıkış ▼</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '700' }}>Bakiye</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m, i) => (
                    <tr key={i} style={{
                      borderBottom: '1px solid var(--bg-main)',
                      background: m.giris > 0 ? 'rgba(16,185,129,0.03)' : 'rgba(239,68,68,0.03)',
                    }}>
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{fmtD(m.date)}</td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '20px',
                          background: m.giris > 0 ? '#dcfce7' : '#fee2e2',
                          color: m.giris > 0 ? '#166534' : '#991b1b'
                        }}>{m.type}</span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>{m.description || '—'}</td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontWeight: '700', color: m.giris > 0 ? 'var(--success)' : 'var(--text-dim)' }}>
                        {m.giris > 0 ? `₺${fmt(m.giris)}` : '—'}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontWeight: '700', color: m.cikis > 0 ? 'var(--danger)' : 'var(--text-dim)' }}>
                        {m.cikis > 0 ? `₺${fmt(m.cikis)}` : '—'}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontWeight: '800', fontSize: '0.9rem' }}>
                        <span style={{ color: m.balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          ₺{fmt(Math.abs(m.balance))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-main)' }}>
                    <td colSpan={3} style={{ padding: '1rem', fontWeight: '800', fontSize: '0.9rem' }}>GENEL TOPLAM</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '800', color: 'var(--success)' }}>₺{fmt(totalGiris)}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '800', color: 'var(--danger)' }}>₺{fmt(totalCikis)}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '800', color: netBakiye >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      ₺{fmt(Math.abs(netBakiye))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KasaHareketRaporu;
