import { useState, useEffect } from 'react';
import {
  Wallet, Plus, MoreVertical, Building, X,
  TrendingDown, TrendingUp, Receipt, BarChart3,
  FileText, ArrowUpRight, ArrowDownLeft,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

const fmt  = (n) => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtD = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '—';

const TABS = [
  { id: 'kasa',   label: 'Kasa & Banka',       icon: <Wallet size={16} /> },
  { id: 'satis',  label: 'Satış Faturaları',    icon: <ArrowUpRight size={16} /> },
  { id: 'alis',   label: 'Alış Faturaları',     icon: <ArrowDownLeft size={16} /> },
  { id: 'rapor',  label: 'Finansal Rapor',      icon: <BarChart3 size={16} /> },
];

const Finance = () => {
  const currentUser = useAuthStore(s => s.currentUser);
  const cid = currentUser?.company_id;

  const [activeTab, setActiveTab]       = useState('kasa');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices]         = useState([]);
  const [customers, setCustomers]       = useState([]);
  const [kasalar, setKasalar]           = useState([]);
  const [openMenuId, setOpenMenuId]     = useState(null);
  const [editRecord, setEditRecord]     = useState(null);

  // ── Tarih filtreleri ──
  const [filterYear,  setFilterYear]  = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDay,   setFilterDay]   = useState('');

  const [newTransaction, setNewTransaction] = useState({
    type: 'Ödeme', account_type: 'Kasa', account_name: '', amount: 0, customer_id: '', description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    const [
      { data: trans },
      { data: invs },
      { data: custs },
      { data: kslar },
    ] = await Promise.all([
      supabase.from('finance_transactions').select('*, customers(name)').eq('company_id', cid).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*, customers(name)').eq('company_id', cid).order('date', { ascending: false }),
      supabase.from('customers').select('*').eq('company_id', cid),
      supabase.from('kasalar').select('*').eq('company_id', cid).order('name'),
    ]);
    setTransactions(trans || []);
    setInvoices(invs || []);
    setCustomers(custs || []);
    setKasalar(kslar || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Tarih filtresi uygula
  const applyDateFilter = (list, dateField) => list.filter(r => {
    const d = new Date(r[dateField] || r.created_at);
    if (filterYear  && d.getFullYear()  !== Number(filterYear))  return false;
    if (filterMonth && d.getMonth() + 1 !== Number(filterMonth)) return false;
    if (filterDay   && d.getDate()      !== Number(filterDay))   return false;
    return true;
  });

  const salesInvoices    = applyDateFilter(invoices.filter(i => i.islem_turu === 'Satış Faturası'), 'date');
  const purchaseInvoices = applyDateFilter(invoices.filter(i => i.islem_turu !== 'Satış Faturası'), 'date');
  const filteredTrans    = applyDateFilter(transactions, 'created_at');

  // Rapor hesapları
  const totalSatis   = salesInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalAlis    = purchaseInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const netKar       = totalSatis - totalAlis;
  const kasaTop      = transactions.filter(t => t.account_type === 'Kasa').reduce((s, t) => s + (t.type === 'Tahsilat' ? Number(t.amount) : -Number(t.amount)), 0);
  const bankaTop     = transactions.filter(t => t.account_type === 'Banka').reduce((s, t) => s + (t.type === 'Tahsilat' ? Number(t.amount) : -Number(t.amount)), 0);
  const totalTahsilat = filteredTrans.filter(t => t.type === 'Tahsilat').reduce((s, t) => s + Number(t.amount), 0);
  const totalOdeme    = filteredTrans.filter(t => t.type === 'Ödeme').reduce((s, t) => s + Number(t.amount), 0);

  // Yıl seçenekleri
  const years = [...new Set([
    ...invoices.map(i => new Date(i.date || i.created_at).getFullYear()),
    ...transactions.map(t => new Date(t.created_at).getFullYear()),
  ])].sort((a, b) => b - a);

  const handleSave = async () => {
    const { error } = await supabase.from('finance_transactions').insert([{
      ...newTransaction, customer_id: newTransaction.customer_id || null,
      amount: Number(newTransaction.amount), company_id: cid,
    }]);
    if (error) { alert(error.message); return; }
    setShowAddModal(false);
    fetchData();
    setNewTransaction({ type: 'Ödeme', account_type: 'Kasa', account_name: '', amount: 0, customer_id: '', description: '' });
  };

  const handleUpdate = async () => {
    const { id, customers: _c, ...fields } = editRecord;
    const { error } = await supabase.from('finance_transactions').update({
      ...fields, customer_id: fields.customer_id || null, amount: Number(fields.amount),
    }).eq('id', id);
    if (error) { alert('Güncelleme hatası: ' + error.message); return; }
    setEditRecord(null);
    fetchData();
  };

  const handleDelete = async (id, record) => {
    if (!window.confirm(`"${record.account_name || id}" silinecek. Emin misin?`)) return;
    const { error } = await supabase.from('finance_transactions').delete().eq('id', id);
    if (error) { alert('Silme hatası: ' + error.message); return; }
    fetchData();
  };

  return (
    <div className="finance-container">

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Finans Yönetimi</h1>
          <p className="text-muted">Kasa, banka, satış ve alış faturalarını tek ekrandan izleyin.</p>
        </div>
        {activeTab === 'kasa' && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={20} /> Yeni İşlem Ekle
          </button>
        )}
      </header>

      {/* Özet kartlar */}
      <div className="grid grid-cols-4" style={{ gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard icon={<Wallet size={22}/>} color="#0284c7" bg="#e0f2fe" label="Kasa Bakiyesi"    value={`₺${fmt(kasaTop)}`} />
        <StatCard icon={<Building size={22}/>} color="#7c3aed" bg="#ede9fe" label="Banka Bakiyesi"  value={`₺${fmt(bankaTop)}`} />
        <StatCard icon={<ArrowUpRight size={22}/>} color="#16a34a" bg="#dcfce7" label="Toplam Satış"  value={`₺${fmt(totalSatis)}`} />
        <StatCard icon={<ArrowDownLeft size={22}/>} color="#dc2626" bg="#fee2e2" label="Toplam Alış"   value={`₺${fmt(totalAlis)}`} />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border)', paddingBottom: '0' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.65rem 1.25rem', border: 'none', cursor: 'pointer', fontWeight: '700',
            fontSize: '0.88rem', borderRadius: '8px 8px 0 0',
            background: activeTab === t.id ? 'var(--primary)' : 'transparent',
            color: activeTab === t.id ? 'white' : 'var(--text-dim)',
            borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-2px',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tarih filtresi — Kasa, Satış, Alış sekmelerinde göster */}
      {activeTab !== 'rapor' && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-dim)' }}>Filtre:</span>
          <select className="input" style={{ width: 'auto', minWidth: '100px' }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="">Tüm Yıllar</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="input" style={{ width: 'auto', minWidth: '110px' }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            <option value="">Tüm Aylar</option>
            {['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
              .map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select className="input" style={{ width: 'auto', minWidth: '90px' }} value={filterDay} onChange={e => setFilterDay(e.target.value)}>
            <option value="">Tüm Günler</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {(filterYear || filterMonth || filterDay) && (
            <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => { setFilterYear(''); setFilterMonth(''); setFilterDay(''); }}>
              ✕ Temizle
            </button>
          )}
        </div>
      )}

      {/* ── KASA & BANKA ── */}
      {activeTab === 'kasa' && (
        <div className="card" style={{ padding: '0' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['İşlem / Hesap', 'Tür', 'Cari', 'Tutar', 'Tarih', ''].map(h => (
                  <th key={h} style={{ padding: '1rem 1.25rem', textAlign: h === '' ? 'right' : 'left', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>Yükleniyor...</td></tr>
              ) : filteredTrans.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>Kayıt bulunamadı.</td></tr>
              ) : filteredTrans.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ background: 'var(--bg-main)', padding: '0.5rem', borderRadius: '8px' }}>
                        {t.account_type === 'Banka' ? <Building size={18} color="var(--primary)" /> : <Wallet size={18} color="var(--primary)" />}
                      </div>
                      <div>
                        <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>{t.account_name}</p>
                        {t.description && <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{t.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${t.type === 'Tahsilat' ? 'badge-success' : 'badge-danger'}`}>
                      {t.type === 'Tahsilat' ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {t.type}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{t.customers?.name || 'Genel İşlem'}</td>
                  <td style={{ fontWeight: '800', color: t.type === 'Tahsilat' ? '#16a34a' : '#dc2626' }}>
                    {t.type === 'Tahsilat' ? '+' : '-'}₺{fmt(t.amount)}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{fmtD(t.created_at)}</td>
                  <td style={{ textAlign: 'right', paddingRight: '1.25rem', position: 'relative' }}>
                    <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === t.id ? null : t.id); }}>
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === t.id && (
                      <div style={{ position: 'absolute', right: '1rem', top: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '140px', overflow: 'hidden' }}
                        onMouseLeave={() => setOpenMenuId(null)}>
                        <MenuBtn onClick={() => { setEditRecord({ ...t }); setOpenMenuId(null); }}>✏️ Düzenle</MenuBtn>
                        <MenuBtn danger onClick={() => { setOpenMenuId(null); handleDelete(t.id, t); }}>🗑️ Sil</MenuBtn>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTrans.length > 0 && (
            <div style={{ padding: '1rem 1.25rem', borderTop: '2px solid var(--border)', display: 'flex', gap: '2rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: '700' }}>Tahsilat: ₺{fmt(totalTahsilat)}</span>
              <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: '700' }}>Ödeme: ₺{fmt(totalOdeme)}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--primary)', marginLeft: 'auto' }}>
                Net: {totalTahsilat - totalOdeme >= 0 ? '+' : ''}₺{fmt(totalTahsilat - totalOdeme)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── SATIŞ FATURALARI ── */}
      {activeTab === 'satis' && (
        <InvoiceTable invoices={salesInvoices} loading={loading} emptyText="Satış faturası bulunamadı." />
      )}

      {/* ── ALIŞ FATURALARI ── */}
      {activeTab === 'alis' && (
        <InvoiceTable invoices={purchaseInvoices} loading={loading} emptyText="Alış faturası bulunamadı." />
      )}

      {/* ── RAPOR ── */}
      {activeTab === 'rapor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Ana metrikler */}
          <div className="grid grid-cols-3" style={{ gap: '1.25rem' }}>
            <ReportCard label="Toplam Satış" value={`₺${fmt(totalSatis)}`} sub={`${salesInvoices.length} fatura`} color="#16a34a" bg="#dcfce7" icon={<ArrowUpRight size={22}/>} />
            <ReportCard label="Toplam Alış"  value={`₺${fmt(totalAlis)}`}  sub={`${purchaseInvoices.length} fatura`} color="#dc2626" bg="#fee2e2" icon={<ArrowDownLeft size={22}/>} />
            <ReportCard
              label="Net Kâr / Zarar"
              value={`${netKar >= 0 ? '+' : ''}₺${fmt(netKar)}`}
              sub="Satış − Alış"
              color={netKar >= 0 ? '#16a34a' : '#dc2626'}
              bg={netKar >= 0 ? '#dcfce7' : '#fee2e2'}
              icon={<BarChart3 size={22}/>}
            />
          </div>

          {/* Kasa / Banka özeti */}
          <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
            <div className="card">
              <p style={{ fontWeight: '700', marginBottom: '1rem', fontSize: '1rem' }}>💼 Kasa & Banka Durumu</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <ReportRow label="Kasa Toplam"   value={`₺${fmt(kasaTop)}`}   color={kasaTop >= 0 ? '#16a34a' : '#dc2626'} />
                <ReportRow label="Banka Toplam"  value={`₺${fmt(bankaTop)}`}  color={bankaTop >= 0 ? '#16a34a' : '#dc2626'} />
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <ReportRow label="Toplam Varlık" value={`₺${fmt(kasaTop + bankaTop)}`} color="var(--primary)" bold />
                </div>
              </div>
            </div>

            <div className="card">
              <p style={{ fontWeight: '700', marginBottom: '1rem', fontSize: '1rem' }}>📊 Kasa İşlem Özeti</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <ReportRow label="Toplam Tahsilat" value={`+₺${fmt(transactions.filter(t=>t.type==='Tahsilat').reduce((s,t)=>s+Number(t.amount),0))}`} color="#16a34a" />
                <ReportRow label="Toplam Ödeme"    value={`-₺${fmt(transactions.filter(t=>t.type==='Ödeme').reduce((s,t)=>s+Number(t.amount),0))}`}    color="#dc2626" />
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <ReportRow label="Net Nakit Akışı" value={`₺${fmt(kasaTop + bankaTop)}`} color="var(--primary)" bold />
                </div>
              </div>
            </div>
          </div>

          {/* Fatura dağılımı */}
          <div className="card">
            <p style={{ fontWeight: '700', marginBottom: '1.25rem', fontSize: '1rem' }}>🧾 Fatura Dağılımı</p>
            <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Satış Faturası', count: invoices.filter(i=>i.islem_turu==='Satış Faturası').length, amount: invoices.filter(i=>i.islem_turu==='Satış Faturası').reduce((s,i)=>s+Number(i.total_amount||0),0), color: '#16a34a' },
                { label: 'Alış Faturası',  count: invoices.filter(i=>i.islem_turu!=='Satış Faturası').length, amount: invoices.filter(i=>i.islem_turu!=='Satış Faturası').reduce((s,i)=>s+Number(i.total_amount||0),0), color: '#dc2626' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>{row.label}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{row.count} adet — ₺{fmt(row.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {editRecord && (
        <div style={overlay}>
          <div className="card" style={modal}>
            <ModalHead title="Finansal İşlemi Düzenle" onClose={() => setEditRecord(null)} />
            <div className="grid grid-cols-2" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
              <SelectGroup label="İşlem Türü" value={editRecord.type} onChange={e => setEditRecord({...editRecord, type: e.target.value})}>
                <option>Ödeme</option><option>Tahsilat</option>
              </SelectGroup>
              <SelectGroup label="Hesap Adı" value={editRecord.account_name || ''} onChange={e => { const k = kasalar.find(k=>k.name===e.target.value); setEditRecord({...editRecord, account_name: e.target.value, account_type: k?.type || editRecord.account_type}); }}>
                <option value="">Seçiniz...</option>
                {kasalar.map(k => <option key={k.id} value={k.name}>{k.name} ({k.type})</option>)}
              </SelectGroup>
              <InputGroup label="Tutar (₺)" type="number" value={editRecord.amount} onChange={e => setEditRecord({...editRecord, amount: e.target.value})} />
              <SelectGroup label="İlgili Cari" value={editRecord.customer_id || ''} onChange={e => setEditRecord({...editRecord, customer_id: e.target.value})}>
                <option value="">Genel İşlem</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </SelectGroup>
            </div>
            <InputGroup label="Açıklama" placeholder="İşlem detayı..." value={editRecord.description || ''} onChange={e => setEditRecord({...editRecord, description: e.target.value})} />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost" onClick={() => setEditRecord(null)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleUpdate}>Güncelle</button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div style={overlay}>
          <div className="card" style={modal}>
            <ModalHead title="Yeni Finansal İşlem" onClose={() => setShowAddModal(false)} />
            <div className="grid grid-cols-2" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
              <SelectGroup label="İşlem Türü" value={newTransaction.type} onChange={e => setNewTransaction({...newTransaction, type: e.target.value})}>
                <option>Ödeme</option><option>Tahsilat</option>
              </SelectGroup>
              <SelectGroup label="Hesap Adı" value={newTransaction.account_name} onChange={e => { const k = kasalar.find(k=>k.name===e.target.value); setNewTransaction({...newTransaction, account_name: e.target.value, account_type: k?.type || newTransaction.account_type}); }}>
                <option value="">Seçiniz...</option>
                {kasalar.map(k => <option key={k.id} value={k.name}>{k.name} ({k.type})</option>)}
              </SelectGroup>
              <InputGroup label="Tutar (₺)" type="number" value={newTransaction.amount} onChange={e => setNewTransaction({...newTransaction, amount: e.target.value})} />
              <SelectGroup label="İlgili Cari" value={newTransaction.customer_id} onChange={e => setNewTransaction({...newTransaction, customer_id: e.target.value})}>
                <option value="">Genel İşlem</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </SelectGroup>
            </div>
            <InputGroup label="Açıklama" placeholder="İşlem detayı..." value={newTransaction.description} onChange={e => setNewTransaction({...newTransaction, description: e.target.value})} />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Alt bileşenler ────────────────────────────────────────────────────────────

const InvoiceTable = ({ invoices, loading, emptyText }) => {
  const total = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  return (
    <div className="card" style={{ padding: '0' }}>
      <table style={{ width: '100%' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Fatura No', 'Cari', 'İşlem Türü', 'Fatura Tipi', 'Tarih', 'Tutar (KDV Dahil)'].map(h => (
              <th key={h} style={{ padding: '1rem 1.25rem', textAlign: h === 'Tutar (KDV Dahil)' ? 'right' : 'left', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>Yükleniyor...</td></tr>
          ) : invoices.length === 0 ? (
            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>{emptyText}</td></tr>
          ) : invoices.map(inv => (
            <tr key={inv.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
              <td style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <FileText size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span style={{ fontWeight: '700', fontSize: '0.88rem' }}>{inv.invoice_no || '—'}</span>
                </div>
              </td>
              <td style={{ fontSize: '0.88rem' }}>{inv.customers?.name || '—'}</td>
              <td>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '6px',
                  background: inv.islem_turu === 'Satış Faturası' ? '#dcfce7' : '#fee2e2',
                  color: inv.islem_turu === 'Satış Faturası' ? '#16a34a' : '#dc2626' }}>
                  {inv.islem_turu || '—'}
                </span>
              </td>
              <td style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{inv.fatura_tipi || '—'}</td>
              <td style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{inv.date ? new Date(inv.date).toLocaleDateString('tr-TR') : '—'}</td>
              <td style={{ textAlign: 'right', paddingRight: '1.25rem', fontWeight: '800', fontSize: '0.95rem',
                color: inv.islem_turu === 'Satış Faturası' ? '#16a34a' : '#dc2626' }}>
                ₺{Number(inv.total_amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {invoices.length > 0 && (
        <div style={{ padding: '1rem 1.25rem', borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>{invoices.length} kayıt</span>
          <span style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--primary)' }}>
            Toplam: ₺{Number(total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, color, bg, label, value }) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
    <div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '2px', fontWeight: '600' }}>{label}</p>
      <p style={{ fontWeight: '800', fontSize: '1.1rem' }}>{value}</p>
    </div>
  </div>
);

const ReportCard = ({ label, value, sub, color, bg, icon }) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
    <div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '3px', fontWeight: '600' }}>{label}</p>
      <p style={{ fontWeight: '800', fontSize: '1.25rem', color }}>{value}</p>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '1px' }}>{sub}</p>
    </div>
  </div>
);

const ReportRow = ({ label, value, color, bold }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{label}</span>
    <span style={{ fontWeight: bold ? '800' : '700', fontSize: '0.9rem', color: color || 'var(--text)' }}>{value}</span>
  </div>
);

const ModalHead = ({ title, onClose }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><Wallet size={18} /></div>
      <h2 style={{ fontSize: '1.15rem' }}>{title}</h2>
    </div>
    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
  </div>
);

const MenuBtn = ({ onClick, danger, children }) => (
  <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: danger ? 'var(--danger)' : 'var(--text)' }}
    onMouseEnter={e => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.07)' : 'var(--bg-main)'}
    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
    {children}
  </button>
);

const InputGroup = ({ label, placeholder, type, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
    <label className="label-sm">{label}</label>
    <input type={type || 'text'} className="input" placeholder={placeholder} value={value} onChange={onChange} />
  </div>
);

const SelectGroup = ({ label, value, onChange, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
    <label className="label-sm">{label}</label>
    <select className="input" value={value} onChange={onChange}>{children}</select>
  </div>
);

const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modal   = { width: '100%', maxWidth: '600px', padding: '2rem' };

export default Finance;
