import { useState, useEffect } from 'react';
import {
  Download, Printer, Table, Users, Wallet, Building2, History,
  FileSpreadsheet, Search,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

const PAGE_SIZE = 15;
const fmt = (v) => `₺${Number(v || 0).toLocaleString('tr-TR')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '—';

const EmptyState = ({ icon, title, description }) => (
  <div style={{ textAlign: 'center', padding: '4rem 0' }}>
    <div style={{ color: 'var(--text-dim)', margin: '0 auto 1rem', display: 'flex', justifyContent: 'center' }}>{icon}</div>
    <p style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.4rem' }}>{title}</p>
    <p className="text-dim" style={{ fontSize: '0.88rem' }}>{description}</p>
  </div>
);

const Ledgers = () => {
  const cid = useAuthStore(s => s.currentUser)?.company_id;
  const [invoices, setInvoices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeLedger, setActiveLedger] = useState('mizan');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (!cid) return;
    const fetchAll = async () => {
      setLoading(true);
      const [
        { data: invs },
        { data: trans },
        { data: mats },
      ] = await Promise.all([
        supabase.from('invoices').select('*, customers(name)').eq('company_id', cid).order('date', { ascending: false }),
        supabase.from('finance_transactions').select('*').eq('company_id', cid).order('created_at', { ascending: false }),
        supabase.from('materials').select('*').eq('company_id', cid).order('name'),
      ]);
      setInvoices(invs || []);
      setTransactions(trans || []);
      setMaterials(mats || []);
      setLoading(false);
    };
    fetchAll();
  }, [cid]);

  const ledgerTabs = [
    { id: 'mizan',  label: 'Genel Mizan',       icon: <Table size={18} /> },
    { id: 'fiş',    label: 'Muhasebe Fişleri',   icon: <FileSpreadsheet size={18} /> },
    { id: 'cari',   label: 'Cari Muavin',        icon: <Users size={18} /> },
    { id: 'cash',   label: 'Kasa Muavin',        icon: <Wallet size={18} /> },
    { id: 'bank',   label: 'Banka Muavin',       icon: <Building2 size={18} /> },
    { id: 'stock',  label: 'Stok Muavin',        icon: <History size={18} /> },
  ];

  // --- Mizan: derive from invoices + transactions ---
  const invTotal   = invoices.reduce((s, i) => s + Number(i.total_amount), 0);
  const kasaIn     = transactions.filter(t => t.account_type === 'Kasa' && t.type === 'Tahsilat').reduce((s, t) => s + Number(t.amount), 0);
  const kasaOut    = transactions.filter(t => t.account_type === 'Kasa' && t.type !== 'Tahsilat').reduce((s, t) => s + Number(t.amount), 0);
  const bankaIn    = transactions.filter(t => t.account_type === 'Banka' && t.type === 'Tahsilat').reduce((s, t) => s + Number(t.amount), 0);
  const bankaOut   = transactions.filter(t => t.account_type === 'Banka' && t.type !== 'Tahsilat').reduce((s, t) => s + Number(t.amount), 0);

  const mizanRows = [
    { code: '120', accountName: 'Alıcılar',    borc: invTotal,                 alacak: 0 },
    { code: '100', accountName: 'Kasa',         borc: kasaIn,                  alacak: kasaOut },
    { code: '102', accountName: 'Bankalar',     borc: bankaIn,                 alacak: bankaOut },
    { code: '600', accountName: 'Yurtiçi Satışlar', borc: 0,                  alacak: invTotal },
  ]
    .filter(r => r.borc > 0 || r.alacak > 0)
    .map(r => ({
      ...r,
      bakiyeBorc: Math.max(0, r.borc - r.alacak),
      bakiyeAlacak: Math.max(0, r.alacak - r.borc),
    }));

  const mizanTotals = mizanRows.reduce(
    (acc, r) => ({ borc: acc.borc + r.borc, alacak: acc.alacak + r.alacak, bakiyeBorc: acc.bakiyeBorc + r.bakiyeBorc, bakiyeAlacak: acc.bakiyeAlacak + r.bakiyeAlacak }),
    { borc: 0, alacak: 0, bakiyeBorc: 0, bakiyeAlacak: 0 }
  );

  // --- Fişler: invoices as vouchers ---
  const allFisler = invoices.filter(e => {
    const matchSearch = !search || (e.invoice_no || '').toLowerCase().includes(search.toLowerCase()) || (e.description || '').toLowerCase().includes(search.toLowerCase());
    const matchFrom = !dateFrom || (e.date || '') >= dateFrom;
    const matchTo = !dateTo || (e.date || '') <= dateTo;
    return matchSearch && matchFrom && matchTo;
  });

  // --- Cari Muavin: invoices per customer ---
  let cariRunning = 0;
  const cariRows = invoices.map(inv => {
    cariRunning += Number(inv.total_amount);
    return {
      date: inv.date || inv.created_at,
      ref: inv.invoice_no,
      desc: `Fatura — ${inv.customers?.name || ''}`,
      borc: Number(inv.total_amount),
      alacak: 0,
      bakiye: cariRunning,
    };
  }).filter(r => {
    const matchSearch = !search || r.ref?.toLowerCase().includes(search.toLowerCase()) || r.desc.toLowerCase().includes(search.toLowerCase());
    const d = (r.date || '').split('T')[0];
    const matchFrom = !dateFrom || d >= dateFrom;
    const matchTo = !dateTo || d <= dateTo;
    return matchSearch && matchFrom && matchTo;
  });

  // --- Kasa Muavin ---
  const kasaRows = transactions
    .filter(t => t.account_type === 'Kasa')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // --- Banka Muavin ---
  const bankaRows = transactions
    .filter(t => t.account_type === 'Banka')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const totalPages = activeLedger === 'fiş'  ? Math.ceil(allFisler.length / PAGE_SIZE)
                   : activeLedger === 'cari' ? Math.ceil(cariRows.length  / PAGE_SIZE) : 1;

  const exportExcel = () => {
    let rows = [];
    if (activeLedger === 'mizan') {
      rows = [['Hesap Kodu', 'Hesap Adı', 'Borç', 'Alacak', 'Bakiye (B)', 'Bakiye (A)'],
        ...mizanRows.map(r => [r.code, r.accountName, r.borc, r.alacak, r.bakiyeBorc, r.bakiyeAlacak])];
    } else if (activeLedger === 'fiş') {
      rows = [['Fatura No', 'Cari', 'Tarih', 'Tutar'],
        ...allFisler.map(inv => [inv.invoice_no, inv.customers?.name || '', inv.date || '', inv.total_amount])];
    } else if (activeLedger === 'cari') {
      rows = [['Tarih', 'Referans', 'Açıklama', 'Borç', 'Alacak', 'Bakiye'],
        ...cariRows.map(r => [r.date || '', r.ref, r.desc, r.borc, r.alacak, r.bakiye])];
    } else if (activeLedger === 'cash') {
      rows = [['Tarih', 'Hesap', 'Açıklama', 'Giriş', 'Çıkış'],
        ...kasaRows.map(t => [fmtDate(t.created_at), t.account_name, t.description || t.type,
          t.type === 'Tahsilat' ? t.amount : '', t.type !== 'Tahsilat' ? t.amount : ''])];
    } else if (activeLedger === 'bank') {
      rows = [['Tarih', 'Hesap', 'Açıklama', 'Giriş', 'Çıkış'],
        ...bankaRows.map(t => [fmtDate(t.created_at), t.account_name, t.description || t.type,
          t.type === 'Tahsilat' ? t.amount : '', t.type !== 'Tahsilat' ? t.amount : ''])];
    } else {
      rows = [['Malzeme', 'Kategori', 'Birim'], ...materials.map(m => [m.name, m.category || '', m.unit || ''])];
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `defter_${activeLedger}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Defter İşlemleri</h1>
          <p className="text-muted">Çift taraflı muhasebe kayıtlarınızı, mizanınızı ve muavin defterlerinizi izleyin.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-ghost" style={{ background: 'white' }} onClick={() => window.print()}>
            <Printer size={18} /> Yazdır
          </button>
          <button className="btn btn-primary" onClick={exportExcel}>
            <Download size={18} /> Excel'e Aktar
          </button>
        </div>
      </header>

      {/* Tab Seçici */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem', padding: '0.5rem', background: '#f1f5f9', borderRadius: '16px', width: 'fit-content' }}>
        {ledgerTabs.map(l => (
          <button key={l.id} onClick={() => { setActiveLedger(l.id); setPage(1); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', background: activeLedger === l.id ? 'white' : 'transparent', color: activeLedger === l.id ? 'var(--primary)' : 'var(--text-muted)', boxShadow: activeLedger === l.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {l.icon} {l.label}
          </button>
        ))}
      </div>

      {/* Filtreler */}
      {(activeLedger === 'fiş' || activeLedger === 'cari') && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px', background: 'var(--bg-main)', padding: '0.6rem 1rem', borderRadius: '10px' }}>
              <Search size={16} className="text-dim" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ref no, açıklama ara..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', flex: 1 }} />
            </div>
            <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: '160px' }} title="Başlangıç Tarihi" />
            <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: '160px' }} title="Bitiş Tarihi" />
          </div>
        </div>
      )}

      {/* Genel Mizan */}
      {activeLedger === 'mizan' && (
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Genel Mizan</h3>
          {loading ? (
            <p className="text-dim" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</p>
          ) : mizanRows.length === 0 ? (
            <EmptyState icon={<Table size={48} />} title="Mizan boş" description="Henüz muhasebe kaydı oluşturulmamış." />
          ) : (
            <table style={{ width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem' }}>Hesap Kodu</th>
                  <th>Hesap Adı</th>
                  <th style={{ textAlign: 'right' }}>Borç</th>
                  <th style={{ textAlign: 'right' }}>Alacak</th>
                  <th style={{ textAlign: 'right' }}>Bakiye (B)</th>
                  <th style={{ textAlign: 'right' }}>Bakiye (A)</th>
                </tr>
              </thead>
              <tbody>
                {mizanRows.map(r => (
                  <tr key={r.code} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                    <td style={{ padding: '1rem', fontWeight: '700', color: 'var(--primary)', fontFamily: 'monospace' }}>{r.code}</td>
                    <td>{r.accountName}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(r.borc)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(r.alacak)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: r.bakiyeBorc > 0 ? 'var(--danger)' : 'var(--text-dim)' }}>{r.bakiyeBorc > 0 ? fmt(r.bakiyeBorc) : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: r.bakiyeAlacak > 0 ? 'var(--success)' : 'var(--text-dim)' }}>{r.bakiyeAlacak > 0 ? fmt(r.bakiyeAlacak) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--text-main)', color: 'white' }}>
                  <td colSpan={2} style={{ padding: '1rem', fontWeight: '800' }}>TOPLAM</td>
                  <td style={{ textAlign: 'right', fontWeight: '800' }}>{fmt(mizanTotals.borc)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '800' }}>{fmt(mizanTotals.alacak)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '800' }}>{fmt(mizanTotals.bakiyeBorc)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '800' }}>{fmt(mizanTotals.bakiyeAlacak)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Muhasebe Fişleri */}
      {activeLedger === 'fiş' && (
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Muhasebe Fişleri ({allFisler.length} kayıt)</h3>
          {loading ? (
            <p className="text-dim" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</p>
          ) : allFisler.length === 0 ? (
            <EmptyState icon={<FileSpreadsheet size={48} />} title="Fiş bulunamadı" description="Henüz fatura işlenmemiş veya filtre sonuç döndürmüyor." />
          ) : (
            allFisler.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(inv => (
              <div key={inv.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '1rem', overflow: 'hidden' }}>
                <div style={{ background: 'var(--bg-main)', padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{inv.invoice_no}</span>
                    <span className="text-dim" style={{ marginLeft: '1rem', fontSize: '0.85rem' }}>Satış Faturası</span>
                    <span className="text-dim" style={{ marginLeft: '1rem', fontSize: '0.85rem' }}>{inv.customers?.name || ''}</span>
                  </div>
                  <span className="text-dim" style={{ fontSize: '0.8rem' }}>{fmtDate(inv.date)}</span>
                </div>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '0.6rem 1.25rem', fontSize: '0.75rem' }}>Hesap</th>
                      <th style={{ padding: '0.6rem', fontSize: '0.75rem' }}>Açıklama</th>
                      <th style={{ padding: '0.6rem', textAlign: 'right', fontSize: '0.75rem' }}>Borç</th>
                      <th style={{ padding: '0.6rem 1.25rem', textAlign: 'right', fontSize: '0.75rem' }}>Alacak</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '0.6rem 1.25rem', fontFamily: 'monospace', fontWeight: '700', color: 'var(--primary)' }}>120</td>
                      <td style={{ padding: '0.6rem' }}>Alıcılar — {inv.customers?.name || 'Bilinmeyen'}</td>
                      <td style={{ textAlign: 'right', padding: '0.6rem', color: 'var(--danger)', fontWeight: '700' }}>{fmt(inv.total_amount)}</td>
                      <td style={{ textAlign: 'right', padding: '0.6rem 1.25rem', color: 'var(--text-dim)' }}>—</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.6rem 1.25rem', fontFamily: 'monospace', fontWeight: '700', color: 'var(--primary)' }}>600</td>
                      <td style={{ padding: '0.6rem' }}>Yurtiçi Satışlar</td>
                      <td style={{ textAlign: 'right', padding: '0.6rem', color: 'var(--text-dim)' }}>—</td>
                      <td style={{ textAlign: 'right', padding: '0.6rem 1.25rem', color: 'var(--success)', fontWeight: '700' }}>{fmt(inv.total_amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))
          )}
          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} setPage={setPage} />}
        </div>
      )}

      {/* Cari Muavin */}
      {activeLedger === 'cari' && (
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Cari Hesap Muavin Defteri</h3>
          {loading ? (
            <p className="text-dim" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</p>
          ) : cariRows.length === 0 ? (
            <EmptyState icon={<Users size={48} />} title="Hareket yok" description="Henüz fatura kaydı bulunmuyor." />
          ) : (
            <LedgerTable rows={cariRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)} />
          )}
          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} setPage={setPage} />}
        </div>
      )}

      {/* Kasa Muavin */}
      {activeLedger === 'cash' && (
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Kasa Muavin Defteri</h3>
          {loading ? (
            <p className="text-dim" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</p>
          ) : kasaRows.length === 0 ? (
            <EmptyState icon={<Wallet size={48} />} title="Kasa hareketi yok" description="Henüz kasa işlemi kaydedilmemiş." />
          ) : (
            <table style={{ width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem' }}>Tarih</th>
                  <th>Hesap</th>
                  <th>Açıklama</th>
                  <th style={{ textAlign: 'right' }}>Giriş</th>
                  <th style={{ textAlign: 'right' }}>Çıkış</th>
                </tr>
              </thead>
              <tbody>
                {kasaRows.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                    <td style={{ padding: '1rem' }}>{fmtDate(t.created_at)}</td>
                    <td style={{ fontWeight: '600' }}>{t.account_name}</td>
                    <td className="text-dim">{t.description || t.type}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: '700' }}>{t.type === 'Tahsilat' ? fmt(t.amount) : '—'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: '700' }}>{t.type !== 'Tahsilat' ? fmt(t.amount) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Banka Muavin */}
      {activeLedger === 'bank' && (
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Banka Muavin Defteri</h3>
          {loading ? (
            <p className="text-dim" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</p>
          ) : bankaRows.length === 0 ? (
            <EmptyState icon={<Building2 size={48} />} title="Banka hareketi yok" description="Henüz banka işlemi kaydedilmemiş." />
          ) : (
            <table style={{ width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem' }}>Tarih</th>
                  <th>Hesap</th>
                  <th>Açıklama</th>
                  <th style={{ textAlign: 'right' }}>Giriş</th>
                  <th style={{ textAlign: 'right' }}>Çıkış</th>
                </tr>
              </thead>
              <tbody>
                {bankaRows.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                    <td style={{ padding: '1rem' }}>{fmtDate(t.created_at)}</td>
                    <td style={{ fontWeight: '600' }}>{t.account_name}</td>
                    <td className="text-dim">{t.description || t.type}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: '700' }}>{t.type === 'Tahsilat' ? fmt(t.amount) : '—'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: '700' }}>{t.type !== 'Tahsilat' ? fmt(t.amount) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Stok Muavin */}
      {activeLedger === 'stock' && (
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Stok Muavin Defteri</h3>
          {loading ? (
            <p className="text-dim" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</p>
          ) : materials.length === 0 ? (
            <EmptyState icon={<History size={48} />} title="Stok kartı yok" description="Henüz malzeme/stok tanımlanmamış." />
          ) : (
            <table style={{ width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem' }}>Malzeme</th>
                  <th>Kategori</th>
                  <th style={{ textAlign: 'right' }}>Birim</th>
                </tr>
              </thead>
              <tbody>
                {materials.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>{m.name}</td>
                    <td className="text-dim">{m.category || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{m.unit || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

const LedgerTable = ({ rows }) => (
  <table style={{ width: '100%' }}>
    <thead>
      <tr style={{ borderBottom: '1px solid var(--border)' }}>
        <th style={{ padding: '0.75rem' }}>Tarih</th>
        <th>Referans</th>
        <th>Açıklama</th>
        <th style={{ textAlign: 'right' }}>Borç</th>
        <th style={{ textAlign: 'right' }}>Alacak</th>
        <th style={{ textAlign: 'right' }}>Bakiye</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((r, i) => (
        <tr key={i} style={{ borderBottom: '1px solid var(--bg-main)' }}>
          <td style={{ padding: '0.9rem 1rem' }}>{fmtDate(r.date)}</td>
          <td style={{ fontWeight: '700', color: 'var(--primary)', fontFamily: 'monospace' }}>{r.ref}</td>
          <td className="text-dim">{r.desc}</td>
          <td style={{ textAlign: 'right', color: r.borc > 0 ? 'var(--danger)' : 'var(--text-dim)', fontWeight: r.borc > 0 ? '700' : '400' }}>{r.borc > 0 ? fmt(r.borc) : '—'}</td>
          <td style={{ textAlign: 'right', color: r.alacak > 0 ? 'var(--success)' : 'var(--text-dim)', fontWeight: r.alacak > 0 ? '700' : '400' }}>{r.alacak > 0 ? fmt(r.alacak) : '—'}</td>
          <td style={{ textAlign: 'right', fontWeight: '800', color: r.bakiye >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(r.bakiye)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const Pagination = ({ page, totalPages, setPage }) => (
  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
    <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '0.4rem 1rem' }}>←</button>
    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
      const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
      return (
        <button key={pg} className="btn" onClick={() => setPage(pg)}
          style={{ padding: '0.4rem 0.9rem', background: page === pg ? 'var(--primary)' : 'transparent', color: page === pg ? 'white' : 'var(--text-dim)', border: 'none' }}>
          {pg}
        </button>
      );
    })}
    <button className="btn btn-ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '0.4rem 1rem' }}>→</button>
  </div>
);

export default Ledgers;
