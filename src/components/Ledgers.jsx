import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  BookOpen, Download, Printer, Table, Users, Wallet, Building2, History,
  FileSpreadsheet, Search
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { EmptyState } from './Invoices';

const PAGE_SIZE = 15;

const Ledgers = () => {
  const ledgerEntries = useStore(s => s.ledgerEntries);
  const customers = useStore(s => s.customers);
  const invoices = useStore(s => s.invoices);
  const transactions = useStore(s => s.transactions);
  const accounts = useStore(s => s.accounts);
  const stockItems = useStore(s => s.stockItems);

  const [activeLedger, setActiveLedger] = useState('mizan');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const ledgerTabs = [
    { id: 'mizan', label: 'Genel Mizan', icon: <Table size={18} /> },
    { id: 'fiş', label: 'Muhasebe Fişleri', icon: <FileSpreadsheet size={18} /> },
    { id: 'cari', label: 'Cari Muavin', icon: <Users size={18} /> },
    { id: 'cash', label: 'Kasa Muavin', icon: <Wallet size={18} /> },
    { id: 'bank', label: 'Banka Muavin', icon: <Building2 size={18} /> },
    { id: 'stock', label: 'Stok Muavin', icon: <History size={18} /> },
  ];

  // Tüm muhasebe fişlerinden hesap toplamları
  const accountTotals = {};
  ledgerEntries.forEach(entry => {
    entry.entries?.forEach(e => {
      if (!accountTotals[e.account]) accountTotals[e.account] = { accountName: e.accountName, borc: 0, alacak: 0 };
      if (e.side === 'borc') accountTotals[e.account].borc += e.amount;
      else accountTotals[e.account].alacak += e.amount;
    });
  });
  const mizanRows = Object.entries(accountTotals).map(([code, data]) => ({
    code, accountName: data.accountName, borc: data.borc, alacak: data.alacak,
    bakiyeBorc: Math.max(0, data.borc - data.alacak),
    bakiyeAlacak: Math.max(0, data.alacak - data.borc),
  })).sort((a, b) => a.code.localeCompare(b.code));
  const mizanTotals = mizanRows.reduce((acc, r) => ({
    borc: acc.borc + r.borc, alacak: acc.alacak + r.alacak,
    bakiyeBorc: acc.bakiyeBorc + r.bakiyeBorc, bakiyeAlacak: acc.bakiyeAlacak + r.bakiyeAlacak
  }), { borc: 0, alacak: 0, bakiyeBorc: 0, bakiyeAlacak: 0 });

  // Muhasebe fişleri (düz liste)
  const allFisler = ledgerEntries.filter(e => {
    const matchSearch = !search || e.ref?.toLowerCase().includes(search.toLowerCase()) || e.desc?.toLowerCase().includes(search.toLowerCase());
    const matchFrom = !dateFrom || e.date >= dateFrom;
    const matchTo = !dateTo || e.date <= dateTo;
    return matchSearch && matchFrom && matchTo;
  }).sort((a, b) => b.date > a.date ? 1 : -1);

  // Cari muavin — tüm fatura + ödeme satırları
  const cariRows = [];
  let cariRunning = 0;
  invoices.forEach(inv => {
    const cust = customers.find(c => c.id === inv.customerId);
    const amount = inv.type === 'Satış Faturası' ? inv.total : -inv.total;
    cariRunning += amount;
    cariRows.push({ date: inv.date, ref: inv.no, desc: `${inv.type} — ${cust?.name || ''}`, borc: inv.type === 'Satış Faturası' ? inv.total : 0, alacak: inv.type !== 'Satış Faturası' ? inv.total : 0, bakiye: cariRunning });
    inv.payments.forEach(p => {
      const delta = inv.type === 'Satış Faturası' ? -p.amount : p.amount;
      cariRunning += delta;
      cariRows.push({ date: p.date, ref: `ODE-${inv.no}`, desc: `Ödeme — ${p.method}`, borc: inv.type !== 'Satış Faturası' ? p.amount : 0, alacak: inv.type === 'Satış Faturası' ? p.amount : 0, bakiye: cariRunning });
    });
  });
  cariRows.sort((a, b) => a.date > b.date ? 1 : -1);

  // Kasa muavin
  const kasaAccounts = accounts.filter(a => a.type === 'kasa');
  const kasaTxns = transactions.filter(t => kasaAccounts.some(a => a.id === t.accountId));
  let kasaRunning = kasaAccounts.reduce((s, a) => s + a.balance, 0);
  const kasaRows = [...kasaTxns].sort((a, b) => a.date > b.date ? 1 : -1);

  // Banka muavin
  const bankAccounts = accounts.filter(a => a.type === 'banka');
  const bankTxns = transactions.filter(t => bankAccounts.some(a => a.id === t.accountId));
  const bankRows = [...bankTxns].sort((a, b) => a.date > b.date ? 1 : -1);

  const totalPages = activeLedger === 'fiş' ? Math.ceil(allFisler.length / PAGE_SIZE) :
    activeLedger === 'cari' ? Math.ceil(cariRows.length / PAGE_SIZE) : 1;

  const handleExport = () => {
    toast.success('Excel indirme özelliği backend entegrasyonu ile aktif olacak.');
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
          <button className="btn btn-primary" onClick={handleExport}>
            <Download size={18} /> Excel'e Aktar
          </button>
        </div>
      </header>

      {/* Mizan denge kontrolü */}
      {mizanTotals.borc !== mizanTotals.alacak && mizanRows.length > 0 && (
        <div style={{ padding: '1rem 1.5rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', marginBottom: '1.5rem', color: 'var(--danger)', fontWeight: '700' }}>
          ⚠ Mizan Dengesi Bozuk — Borç: {formatCurrency(mizanTotals.borc)} ≠ Alacak: {formatCurrency(mizanTotals.alacak)}
        </div>
      )}

      {/* Defter Seçici */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem', padding: '0.5rem', background: '#f1f5f9', borderRadius: '16px', width: 'fit-content' }}>
        {ledgerTabs.map(l => (
          <button key={l.id} onClick={() => { setActiveLedger(l.id); setPage(1); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', background: activeLedger === l.id ? 'white' : 'transparent', color: activeLedger === l.id ? 'var(--primary)' : 'var(--text-muted)', boxShadow: activeLedger === l.id ? 'var(--shadow-sm)' : 'none' }}>
            {l.icon} {l.label}
          </button>
        ))}
      </div>

      {/* Filtreler (fiş ve cari için) */}
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
          {mizanRows.length === 0 ? (
            <EmptyState icon={<Table size={48} />} title="Mizan boş" description="Henüz muhasebe kaydı oluşturulmamış. Fatura veya işlem ekleyin." />
          ) : (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Hesap Kodu</th>
                  <th>Hesap Adı</th>
                  <th style={{ textAlign: 'right' }}>Borç</th>
                  <th style={{ textAlign: 'right' }}>Alacak</th>
                  <th style={{ textAlign: 'right' }}>Bakiye (B)</th>
                  <th style={{ textAlign: 'right' }}>Bakiye (A)</th>
                </tr>
              </thead>
              <tbody>
                {mizanRows.map(r => (
                  <tr key={r.code}>
                    <td style={{ padding: '1rem', fontWeight: '700', color: 'var(--primary)', fontFamily: 'monospace' }}>{r.code}</td>
                    <td>{r.accountName}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(r.borc)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(r.alacak)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: r.bakiyeBorc > 0 ? 'var(--danger)' : 'var(--text-dim)' }}>{r.bakiyeBorc > 0 ? formatCurrency(r.bakiyeBorc) : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: r.bakiyeAlacak > 0 ? 'var(--success)' : 'var(--text-dim)' }}>{r.bakiyeAlacak > 0 ? formatCurrency(r.bakiyeAlacak) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--text-main)', color: 'white' }}>
                  <td colSpan={2} style={{ padding: '1rem', fontWeight: '800' }}>TOPLAM</td>
                  <td style={{ textAlign: 'right', fontWeight: '800' }}>{formatCurrency(mizanTotals.borc)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '800' }}>{formatCurrency(mizanTotals.alacak)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '800' }}>{formatCurrency(mizanTotals.bakiyeBorc)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '800' }}>{formatCurrency(mizanTotals.bakiyeAlacak)}</td>
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
          {allFisler.length === 0 ? (
            <EmptyState icon={<FileSpreadsheet size={48} />} title="Fiş bulunamadı" description="Henüz muhasebe fişi oluşturulmamış." />
          ) : (
            allFisler.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(entry => (
              <div key={entry.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '1rem', overflow: 'hidden' }}>
                <div style={{ background: 'var(--bg-main)', padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{entry.ref}</span>
                    <span className="text-dim" style={{ marginLeft: '1rem', fontSize: '0.85rem' }}>{entry.type}</span>
                    <span className="text-dim" style={{ marginLeft: '1rem', fontSize: '0.85rem' }}>{entry.desc}</span>
                  </div>
                  <span className="text-dim" style={{ fontSize: '0.8rem' }}>{formatDate(entry.date)}</span>
                </div>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '0.6rem 1.25rem', fontSize: '0.75rem' }}>Hesap</th>
                      <th style={{ padding: '0.6rem', fontSize: '0.75rem' }}>Hesap Adı</th>
                      <th style={{ padding: '0.6rem', textAlign: 'right', fontSize: '0.75rem' }}>Borç</th>
                      <th style={{ padding: '0.6rem 1.25rem', textAlign: 'right', fontSize: '0.75rem' }}>Alacak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.entries?.map((e, i) => (
                      <tr key={i}>
                        <td style={{ padding: '0.6rem 1.25rem', fontFamily: 'monospace', fontWeight: '700', color: 'var(--primary)' }}>{e.account}</td>
                        <td style={{ padding: '0.6rem' }}>{e.accountName}</td>
                        <td style={{ textAlign: 'right', padding: '0.6rem', color: e.side === 'borc' ? 'var(--danger)' : 'var(--text-dim)' }}>{e.side === 'borc' ? formatCurrency(e.amount) : '—'}</td>
                        <td style={{ textAlign: 'right', padding: '0.6rem 1.25rem', color: e.side === 'alacak' ? 'var(--success)' : 'var(--text-dim)' }}>{e.side === 'alacak' ? formatCurrency(e.amount) : '—'}</td>
                      </tr>
                    ))}
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
          {cariRows.length === 0 ? (
            <EmptyState icon={<Users size={48} />} title="Hareket yok" description="Henüz cari hareket kaydı yok." />
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
          {kasaRows.length === 0 ? (
            <EmptyState icon={<Wallet size={48} />} title="Kasa hareketi yok" description="Henüz kasa işlemi kaydedilmemiş." />
          ) : (
            <table style={{ width: '100%' }}>
              <thead><tr><th>Tarih</th><th>Açıklama</th><th style={{ textAlign: 'right' }}>Giriş</th><th style={{ textAlign: 'right' }}>Çıkış</th></tr></thead>
              <tbody>
                {kasaRows.map(t => (
                  <tr key={t.id}>
                    <td style={{ padding: '1rem' }}>{formatDate(t.date)}</td>
                    <td>{t.desc}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: '700' }}>{t.type === 'in' ? formatCurrency(t.amount) : '—'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: '700' }}>{t.type === 'out' ? formatCurrency(t.amount) : '—'}</td>
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
          {bankRows.length === 0 ? (
            <EmptyState icon={<Building2 size={48} />} title="Banka hareketi yok" description="Henüz banka işlemi kaydedilmemiş." />
          ) : (
            <table style={{ width: '100%' }}>
              <thead><tr><th>Tarih</th><th>Açıklama</th><th style={{ textAlign: 'right' }}>Giriş</th><th style={{ textAlign: 'right' }}>Çıkış</th></tr></thead>
              <tbody>
                {bankRows.map(t => (
                  <tr key={t.id}>
                    <td style={{ padding: '1rem' }}>{formatDate(t.date)}</td>
                    <td>{t.desc}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: '700' }}>{t.type === 'in' ? formatCurrency(t.amount) : '—'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: '700' }}>{t.type === 'out' ? formatCurrency(t.amount) : '—'}</td>
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
          <table style={{ width: '100%' }}>
            <thead><tr><th>Malzeme</th><th>Kategori</th><th style={{ textAlign: 'right' }}>Stok</th><th style={{ textAlign: 'right' }}>Birim M.</th><th style={{ textAlign: 'right' }}>Toplam Değer</th></tr></thead>
            <tbody>
              {useStore.getState().stockItems.map(s => (
                <tr key={s.id}>
                  <td style={{ padding: '1rem', fontWeight: '600' }}>{s.name}</td>
                  <td className="text-dim">{s.category}</td>
                  <td style={{ textAlign: 'right', fontWeight: '700' }}>{s.qty} {s.unit}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(s.unitCost || 0)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '700' }}>{formatCurrency(s.qty * (s.unitCost || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const LedgerTable = ({ rows }) => (
  <table style={{ width: '100%' }}>
    <thead>
      <tr>
        <th>Tarih</th>
        <th>Referans</th>
        <th>Açıklama</th>
        <th style={{ textAlign: 'right' }}>Borç</th>
        <th style={{ textAlign: 'right' }}>Alacak</th>
        <th style={{ textAlign: 'right' }}>Bakiye</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((r, i) => (
        <tr key={i}>
          <td style={{ padding: '0.9rem 1rem' }}>{formatDate(r.date)}</td>
          <td style={{ fontWeight: '700', color: 'var(--primary)', fontFamily: 'monospace' }}>{r.ref}</td>
          <td className="text-dim">{r.desc}</td>
          <td style={{ textAlign: 'right', color: r.borc > 0 ? 'var(--danger)' : 'var(--text-dim)', fontWeight: r.borc > 0 ? '700' : '400' }}>{r.borc > 0 ? formatCurrency(r.borc) : '—'}</td>
          <td style={{ textAlign: 'right', color: r.alacak > 0 ? 'var(--success)' : 'var(--text-dim)', fontWeight: r.alacak > 0 ? '700' : '400' }}>{r.alacak > 0 ? formatCurrency(r.alacak) : '—'}</td>
          <td style={{ textAlign: 'right', fontWeight: '800', color: r.bakiye >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(r.bakiye)}</td>
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
