import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Receipt, Plus, Search, ArrowUpRight, ArrowDownLeft, MoreVertical,
  FileText, Truck, Package, X, ChevronDown, ArrowLeft, Save, Trash2,
  Tags, Layers, CheckCircle2, Clock, AlertCircle, CreditCard, Banknote
} from 'lucide-react';
import useStore from '../store/useStore';
import {
  formatCurrency, formatDate, today, KDV_RATES, TEVKIFAT_RATES,
  calcLineTotal, calcInvoiceTotals, genId
} from '../utils/formatters';

const EXPENSE_CARDS = [
  'Akaryakıt Giderleri', 'Bakım/Onarım Giderleri', 'Yedek Parça Giderleri',
  'Lastik Giderleri', 'Personel Giderleri', 'Nakliye Gelirleri',
  'Genel Yönetim Giderleri', 'Kira / Ofis Giderleri', 'Diğer'
];

const PAGE_SIZE = 10;

const emptyItem = () => ({
  id: genId(), expenseCard: 'Akaryakıt Giderleri', name: '',
  qty: 1, unit: 'Adet', unitPrice: '', vatRate: 0.20, tevkifatRate: 0
});

// ─── Fatura Listesi ───────────────────────────────────────────────────────────
const InvoiceList = ({ onCreateNew }) => {
  const invoices = useStore(s => s.invoices);
  const customers = useStore(s => s.customers);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const openInvoiceModal = useStore(s => s.openInvoiceModal);
  const setOpenInvoiceModal = useStore(s => s.setOpenInvoiceModal);

  useEffect(() => {
    if (openInvoiceModal) { onCreateNew(); setOpenInvoiceModal(false); }
  }, [openInvoiceModal]);

  const filtered = invoices.filter(inv => {
    const cust = customers.find(c => c.id === inv.customerId);
    const matchSearch = !search || inv.no.toLowerCase().includes(search.toLowerCase()) || cust?.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || inv.type === filterType;
    const matchStatus = !filterStatus || inv.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statusBadge = (status) => {
    if (status === 'paid') return <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><CheckCircle2 size={12} /> Ödendi</span>;
    if (status === 'partial') return <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={12} /> Kısmi</span>;
    return <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><AlertCircle size={12} /> Ödenmedi</span>;
  };

  const totals = filtered.reduce((acc, inv) => {
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    acc.total += inv.total;
    acc.paid += paid;
    acc.outstanding += inv.total - paid;
    return acc;
  }, { total: 0, paid: 0, outstanding: 0 });

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Fatura Yönetimi</h1>
          <p className="text-muted">Gider kartı bazlı fatura ve maliyet süreçlerinizi yönetin.</p>
        </div>
        <button className="btn btn-primary" onClick={onCreateNew}>
          <Plus size={20} /> Yeni Fatura Oluştur
        </button>
      </header>

      {/* KPI Kartları */}
      <div className="grid grid-cols-3" style={{ marginBottom: '2rem' }}>
        <InvStatCard title="Toplam Tutar" value={formatCurrency(totals.total)} color="var(--text-main)" icon={<FileText size={20} />} />
        <InvStatCard title="Tahsil Edildi" value={formatCurrency(totals.paid)} color="var(--success)" icon={<CheckCircle2 size={20} />} />
        <InvStatCard title="Kalan Alacak" value={formatCurrency(totals.outstanding)} color="var(--danger)" icon={<AlertCircle size={20} />} />
      </div>

      {/* Filtreler */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px', background: 'var(--bg-main)', padding: '0.6rem 1rem', borderRadius: '10px' }}>
            <Search size={16} className="text-dim" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Fatura no, cari ara..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', flex: 1 }} />
          </div>
          <select className="input" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} style={{ width: 'auto' }}>
            <option value="">Tüm Tipler</option>
            <option>Alış Faturası</option>
            <option>Satış Faturası</option>
            <option>Hizmet Alımı</option>
          </select>
          <select className="input" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={{ width: 'auto' }}>
            <option value="">Tüm Durumlar</option>
            <option value="unpaid">Ödenmedi</option>
            <option value="partial">Kısmi</option>
            <option value="paid">Ödendi</option>
          </select>
        </div>
      </div>

      <div className="card">
        {paginated.length === 0 ? (
          <EmptyState
            icon={<FileText size={48} />}
            title="Fatura bulunamadı"
            description={search || filterType || filterStatus ? 'Filtreleri temizleyin veya yeni fatura oluşturun.' : 'Henüz fatura kaydı yok. İlk faturanı oluştur.'}
            action={<button className="btn btn-primary" onClick={onCreateNew}><Plus size={18} /> Yeni Fatura</button>}
          />
        ) : (
          <>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Fatura No</th>
                  <th>Cari / Tedarikçi</th>
                  <th>Tarih</th>
                  <th>Tür</th>
                  <th>Durum</th>
                  <th style={{ textAlign: 'right' }}>Tutar</th>
                  <th style={{ textAlign: 'right' }}>Kalan</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(inv => {
                  const cust = customers.find(c => c.id === inv.customerId);
                  const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
                  const outstanding = inv.total - paid;
                  return (
                    <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedInvoice(inv)}>
                      <td style={{ padding: '1.1rem 1rem' }}><span style={{ fontWeight: '700' }}>{inv.no}</span></td>
                      <td>{cust?.name || '—'}</td>
                      <td className="text-dim">{formatDate(inv.date)}</td>
                      <td>
                        <span className={`badge ${inv.type === 'Satış Faturası' ? 'badge-primary' : ''}`} style={{ color: inv.type === 'Satış Faturası' ? 'var(--primary)' : 'var(--danger)' }}>
                          {inv.type === 'Satış Faturası' ? <ArrowUpRight size={12} style={{ display: 'inline' }} /> : <ArrowDownLeft size={12} style={{ display: 'inline' }} />} {inv.type}
                        </span>
                      </td>
                      <td>{statusBadge(inv.status)}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700' }}>{formatCurrency(inv.total)}</td>
                      <td style={{ textAlign: 'right', color: outstanding > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: '700' }}>{formatCurrency(outstanding)}</td>
                      <td style={{ textAlign: 'right' }}><button className="btn btn-ghost" style={{ padding: '0.4rem' }}><MoreVertical size={16} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '0.4rem 1rem' }}>←</button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    className="btn"
                    onClick={() => setPage(i + 1)}
                    style={{ padding: '0.4rem 0.9rem', background: page === i + 1 ? 'var(--primary)' : 'transparent', color: page === i + 1 ? 'white' : 'var(--text-dim)', border: 'none' }}
                  >
                    {i + 1}
                  </button>
                ))}
                <button className="btn btn-ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '0.4rem 1rem' }}>→</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detay drawer */}
      {selectedInvoice && (
        <InvoiceDetailDrawer invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
};

// ─── Fatura Detay Drawer (Ödeme) ──────────────────────────────────────────────
const InvoiceDetailDrawer = ({ invoice, onClose }) => {
  const customers = useStore(s => s.customers);
  const accounts = useStore(s => s.accounts);
  const addInvoicePayment = useStore(s => s.addInvoicePayment);
  const [showPayment, setShowPayment] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', accountId: accounts[0]?.id || '', date: today(), method: 'Banka', note: '' });
  const [errors, setErrors] = useState({});

  const cust = customers.find(c => c.id === invoice.customerId);
  const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = invoice.total - paid;

  const validatePay = () => {
    const e = {};
    const amt = parseFloat(payForm.amount);
    if (!payForm.amount || isNaN(amt) || amt <= 0) e.amount = 'Geçerli tutar girin';
    if (amt > outstanding + 0.01) e.amount = `Kalan: ${formatCurrency(outstanding)}`;
    if (!payForm.accountId) e.accountId = 'Hesap seçin';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePayment = () => {
    if (!validatePay()) return;
    addInvoicePayment(invoice.id, { ...payForm, amount: parseFloat(payForm.amount) });
    toast.success(`Ödeme kaydedildi: ${formatCurrency(parseFloat(payForm.amount))}`);
    setShowPayment(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '480px', height: '100%', borderRadius: '0', padding: '2.5rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem' }}>Fatura Detayı</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={24} /></button>
        </div>

        <div style={{ padding: '1.5rem', background: 'var(--bg-main)', borderRadius: '15px', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '1.5rem', fontWeight: '800' }}>{invoice.no}</p>
          <p className="text-dim">{invoice.type} — {cust?.name}</p>
          <p className="text-dim" style={{ fontSize: '0.8rem' }}>{formatDate(invoice.date)} → Vade: {formatDate(invoice.dueDate)}</p>
        </div>

        <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ background: 'white', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-dim)' }}>TOPLAM</p>
            <h3>{formatCurrency(invoice.total)}</h3>
          </div>
          <div className="card" style={{ background: 'white', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-dim)' }}>KALAN</p>
            <h3 style={{ color: outstanding > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCurrency(outstanding)}</h3>
          </div>
        </div>

        {/* Kalemler */}
        <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: '700' }}>FATURA KALEMLERİ</h4>
        {invoice.items.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.name}</p>
              <p className="text-dim" style={{ fontSize: '0.75rem' }}>{item.qty} {item.unit} × {formatCurrency(item.unitPrice)} | KDV %{(item.vatRate * 100).toFixed(0)}</p>
            </div>
            <span style={{ fontWeight: '700' }}>{formatCurrency(calcLineTotal(item.qty, item.unitPrice))}</span>
          </div>
        ))}

        <div style={{ paddingTop: '1rem', borderTop: '2px solid var(--border)', marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
            <span>Ara Toplam</span><span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
            <span>KDV</span><span>{formatCurrency(invoice.vatAmount)}</span>
          </div>
          {invoice.tevkifatAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--warning)', marginBottom: '0.5rem' }}>
              <span>Tevkifat (-)</span><span>-{formatCurrency(invoice.tevkifatAmount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.1rem' }}>
            <span>Genel Toplam</span><span>{formatCurrency(invoice.total)}</span>
          </div>
        </div>

        {/* Ödemeler */}
        {invoice.payments.length > 0 && (
          <>
            <h4 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: '700' }}>ÖDEME GEÇMİŞİ</h4>
            {invoice.payments.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={14} color="var(--success)" />
                  <span style={{ fontSize: '0.85rem' }}>{formatDate(p.date)} — {p.method}</span>
                </div>
                <span style={{ fontWeight: '700', color: 'var(--success)' }}>{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </>
        )}

        {/* Ödeme ekle */}
        {outstanding > 0.01 && !showPayment && (
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => setShowPayment(true)}>
            <CreditCard size={18} /> Ödeme Kaydet
          </button>
        )}

        {showPayment && (
          <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--bg-main)', borderRadius: '15px' }}>
            <h4 style={{ marginBottom: '1rem' }}>Yeni Ödeme</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <FormField label="Tutar" error={errors.amount}>
                <input className={`input ${errors.amount ? 'input-error' : ''}`} type="number" placeholder={`Max: ${formatCurrency(outstanding)}`} value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} style={{ width: '100%' }} />
              </FormField>
              <FormField label="Hesap" error={errors.accountId}>
                <select className="input" value={payForm.accountId} onChange={e => setPayForm(f => ({ ...f, accountId: e.target.value }))} style={{ width: '100%' }}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance)}</option>)}
                </select>
              </FormField>
              <div className="grid grid-cols-2" style={{ gap: '0.75rem' }}>
                <FormField label="Tarih">
                  <input className="input" type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%' }} />
                </FormField>
                <FormField label="Yöntem">
                  <select className="input" value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))} style={{ width: '100%' }}>
                    <option>Banka</option><option>Kasa</option><option>Çek</option><option>EFT</option>
                  </select>
                </FormField>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowPayment(false)}>İptal</button>
                <button className="btn btn-primary" style={{ flex: 2 }} onClick={handlePayment}><Save size={16} /> Kaydet</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Yeni Fatura Oluştur ──────────────────────────────────────────────────────
const InvoiceCreate = ({ onBack }) => {
  const customers = useStore(s => s.customers);
  const vehicles = useStore(s => s.vehicles);
  const addInvoice = useStore(s => s.addInvoice);

  const [form, setForm] = useState({
    type: 'Alış Faturası', customerId: customers[0]?.id || '',
    date: today(), dueDate: '', destination: 'warehouse', vehicleId: vehicles[0]?.id || '',
  });
  const [items, setItems] = useState([emptyItem()]);
  const [errors, setErrors] = useState({});

  const totals = calcInvoiceTotals(items);

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (id) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const validate = () => {
    const e = {};
    if (!form.customerId) e.customerId = 'Cari seçin';
    if (!form.date) e.date = 'Tarih girin';
    items.forEach((item, idx) => {
      if (!item.name.trim()) e[`name_${idx}`] = 'Ad girin';
      if (!item.qty || parseFloat(item.qty) <= 0) e[`qty_${idx}`] = 'Miktar > 0';
      if (!item.unitPrice || parseFloat(item.unitPrice) <= 0) e[`price_${idx}`] = 'Fiyat > 0';
    });
    if (form.destination === 'vehicle' && !form.vehicleId) e.vehicleId = 'Araç seçin';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) { toast.error('Lütfen zorunlu alanları doldurun.'); return; }
    const invoice = {
      ...form, items,
      subtotal: totals.subtotal, vatAmount: totals.vatAmount,
      tevkifatAmount: totals.tevkifatAmount, total: totals.total,
    };
    const saved = addInvoice(invoice);
    toast.success(`Fatura kaydedildi: ${saved.no}`);
    onBack();
  };

  return (
    <div style={{ paddingBottom: '5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost" onClick={onBack} style={{ padding: '0.5rem' }}><ArrowLeft size={24} /></button>
          <div>
            <h1 style={{ fontSize: '1.75rem' }}>Yeni Fatura & Gider İşleme</h1>
            <p className="text-muted">Gider kartı eşleştirmesi yaparak fatura kalemlerini kaydedin.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-ghost" onClick={onBack}>İptal</button>
          <button className="btn btn-primary" style={{ padding: '0.75rem 2rem' }} onClick={handleSave}>
            <Save size={18} /> Kaydet ve Muhasebeleştir
          </button>
        </div>
      </header>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Genel Bilgiler */}
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Genel Bilgiler</h3>
            <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
              <FormField label="Fatura Tipi *">
                <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%' }}>
                  <option>Alış Faturası</option>
                  <option>Satış Faturası</option>
                  <option>Hizmet Alımı</option>
                </select>
              </FormField>
              <FormField label="Cari / Tedarikçi *" error={errors.customerId}>
                <select className={`input ${errors.customerId ? 'input-error' : ''}`} value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} style={{ width: '100%' }}>
                  <option value="">— Seçin —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FormField>
              <FormField label="İşlem Tarihi *" error={errors.date}>
                <input className={`input ${errors.date ? 'input-error' : ''}`} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%' }} />
              </FormField>
              <FormField label="Vade Tarihi">
                <input className="input" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={{ width: '100%' }} />
              </FormField>
            </div>
          </div>

          {/* Kalemler */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Fatura Kalemleri</h3>
              <button className="btn btn-ghost" style={{ fontSize: '0.85rem' }} onClick={addItem}><Plus size={16} /> Satır Ekle</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '700px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem', width: '180px', fontSize: '0.8rem' }}>Gider Kartı</th>
                    <th style={{ padding: '0.75rem', fontSize: '0.8rem' }}>Malzeme / Hizmet</th>
                    <th style={{ padding: '0.75rem', width: '70px', fontSize: '0.8rem' }}>Miktar</th>
                    <th style={{ padding: '0.75rem', width: '60px', fontSize: '0.8rem' }}>Birim</th>
                    <th style={{ padding: '0.75rem', width: '110px', fontSize: '0.8rem' }}>B. Fiyat</th>
                    <th style={{ padding: '0.75rem', width: '80px', fontSize: '0.8rem' }}>KDV</th>
                    <th style={{ padding: '0.75rem', width: '100px', fontSize: '0.8rem' }}>Tevkifat</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', width: '100px', fontSize: '0.8rem' }}>Toplam</th>
                    <th style={{ width: '36px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <select className="input" value={item.expenseCard} onChange={e => updateItem(item.id, 'expenseCard', e.target.value)} style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}>
                          {EXPENSE_CARDS.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input
                          className={`input ${errors[`name_${idx}`] ? 'input-error' : ''}`}
                          value={item.name}
                          onChange={e => updateItem(item.id, 'name', e.target.value)}
                          placeholder="Malzeme / Hizmet adı"
                          style={{ width: '100%', fontSize: '0.85rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input
                          className={`input ${errors[`qty_${idx}`] ? 'input-error' : ''}`}
                          type="number" min="0" value={item.qty}
                          onChange={e => updateItem(item.id, 'qty', e.target.value)}
                          style={{ width: '100%', textAlign: 'center', fontSize: '0.85rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <select className="input" value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)} style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}>
                          <option>Adet</option><option>Litre</option><option>Kg</option><option>Set</option><option>Sefer</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input
                          className={`input ${errors[`price_${idx}`] ? 'input-error' : ''}`}
                          type="number" min="0" value={item.unitPrice}
                          onChange={e => updateItem(item.id, 'unitPrice', e.target.value)}
                          placeholder="0,00"
                          style={{ width: '100%', textAlign: 'right', fontSize: '0.85rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <select className="input" value={item.vatRate} onChange={e => updateItem(item.id, 'vatRate', parseFloat(e.target.value))} style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}>
                          {KDV_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <select className="input" value={item.tevkifatRate} onChange={e => updateItem(item.id, 'tevkifatRate', parseFloat(e.target.value))} style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}>
                          {TEVKIFAT_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '700', padding: '0.5rem', whiteSpace: 'nowrap' }}>
                        {formatCurrency(calcLineTotal(item.qty, item.unitPrice))}
                      </td>
                      <td>
                        <button className="btn btn-ghost" style={{ padding: '0.3rem', color: 'var(--danger)' }} onClick={() => removeItem(item.id)}><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sağ panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Harcama Yeri */}
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Harcama / Giriş Yeri</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <DestinationBtn active={form.destination === 'warehouse'} onClick={() => setForm(f => ({ ...f, destination: 'warehouse' }))} icon={<Package size={20} />} title="Depo / Stok" desc="Girişleri envantere aktar" />
              <DestinationBtn active={form.destination === 'vehicle'} onClick={() => setForm(f => ({ ...f, destination: 'vehicle' }))} icon={<Truck size={20} />} title="Araç Gideri" desc="Plaka bazlı masraf yansıt" />
              <DestinationBtn active={form.destination === 'none'} onClick={() => setForm(f => ({ ...f, destination: 'none' }))} icon={<Tags size={20} />} title="Genel Gider" desc="Sadece muhasebe kaydı" />
            </div>
            {form.destination === 'vehicle' && (
              <div style={{ marginTop: '1.5rem' }}>
                <FormField label="Araç / Plaka *" error={errors.vehicleId}>
                  <select className={`input ${errors.vehicleId ? 'input-error' : ''}`} value={form.vehicleId} onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))} style={{ width: '100%' }}>
                    <option value="">— Araç Seçin —</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
                  </select>
                </FormField>
              </div>
            )}
          </div>

          {/* Toplam */}
          <div className="card" style={{ background: 'var(--text-main)', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', opacity: 0.7 }}>
              <span>Ara Toplam</span><span>{formatCurrency(totals.subtotal)}</span>
            </div>
            {items.some(i => i.vatRate > 0) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', opacity: 0.7 }}>
                <span>KDV</span><span>{formatCurrency(totals.vatAmount)}</span>
              </div>
            )}
            {totals.tevkifatAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#fbbf24' }}>
                <span>Tevkifat (-)</span><span>-{formatCurrency(totals.tevkifatAmount)}</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '800' }}>
              <span style={{ color: 'var(--primary)' }}>GENEL TOPLAM</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────
const Invoices = () => {
  const [view, setView] = useState('list');
  return view === 'list'
    ? <InvoiceList onCreateNew={() => setView('create')} />
    : <InvoiceCreate onBack={() => setView('list')} />;
};

// ─── Yardımcı Bileşenler ──────────────────────────────────────────────────────
const InvStatCard = ({ title, value, color, icon }) => (
  <div className="card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
      <div style={{ color }}>{icon}</div>
    </div>
    <h3 style={{ fontSize: '1.5rem', color, marginBottom: '0.25rem' }}>{value}</h3>
    <p className="text-dim" style={{ fontSize: '0.85rem', fontWeight: '600' }}>{title}</p>
  </div>
);

const DestinationBtn = ({ active, onClick, icon, title, desc }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem',
      borderRadius: '15px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', width: '100%',
      border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
      background: active ? 'var(--primary-light)' : 'white',
    }}
  >
    <div style={{ color: active ? 'var(--primary)' : 'var(--text-muted)' }}>{icon}</div>
    <div>
      <p style={{ fontWeight: '700', fontSize: '0.9rem', color: active ? 'var(--text-main)' : 'var(--text-dim)' }}>{title}</p>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{desc}</p>
    </div>
  </button>
);

export const FormField = ({ label, children, error }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-dim)' }}>{label}</label>
    {children}
    {error && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.2rem' }}>{error}</span>}
  </div>
);

const EmptyState = ({ icon, title, description, action }) => (
  <div style={{ textAlign: 'center', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
    <div style={{ color: 'var(--text-muted)', opacity: 0.4 }}>{icon}</div>
    <h3 style={{ color: 'var(--text-dim)', fontWeight: '700' }}>{title}</h3>
    <p className="text-muted" style={{ maxWidth: '320px', lineHeight: '1.6' }}>{description}</p>
    {action}
  </div>
);

export { EmptyState };
export default Invoices;
