import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Users, Plus, Search, TrendingUp, AlertCircle, Phone, Mail,
  MapPin, History, ChevronRight, MoreVertical, ShieldCheck,
  CreditCard, X, FileText, Download, Building2, CheckCircle2
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatCurrency, formatDate, isValidTaxNo, isValidPhone, isValidEmail } from '../utils/formatters';
import { FormField, EmptyState } from './Invoices';

const PAGE_SIZE = 10;

const Customers = () => {
  const customers = useStore(s => s.customers);
  const addCustomer = useStore(s => s.addCustomer);
  const getCustomerBalance = useStore(s => s.getCustomerBalance);
  const invoices = useStore(s => s.invoices);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !search || c.name.toLowerCase().includes(q) || c.taxNo?.includes(q) || c.city?.toLowerCase().includes(q);
    const matchType = !filterType || c.type === filterType;
    return matchSearch && matchType;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Özet KPI'lar
  const totals = customers.reduce((acc, c) => {
    const bal = getCustomerBalance(c.id);
    if (bal > 0) acc.receivable += bal;
    else acc.payable += Math.abs(bal);
    return acc;
  }, { receivable: 0, payable: 0 });

  const riskCount = customers.filter(c => {
    const bal = getCustomerBalance(c.id);
    return c.type === 'Müşteri' && bal > (c.creditLimit || 0);
  }).length;

  const riskStatus = (customerId, type, creditLimit) => {
    const bal = getCustomerBalance(customerId);
    if (type !== 'Müşteri') return 'good';
    if (bal > (creditLimit || 0)) return 'danger';
    if (bal > (creditLimit || 0) * 0.8) return 'warning';
    return 'good';
  };

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Cari Yönetimi</h1>
          <p className="text-muted">Müşteri ve tedarikçilerinizin bakiyelerini, risk durumlarını ve vadelerini yönetin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={20} /> Yeni Cari Kart Oluştur
        </button>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <CStatCard title="Toplam Cari" value={customers.length} sub="Aktif Hesap" icon={<Users size={20} />} color="var(--primary)" />
        <CStatCard title="Toplam Alacak" value={formatCurrency(totals.receivable)} sub="Müşterilerden" icon={<TrendingUp size={20} />} color="var(--success)" />
        <CStatCard title="Toplam Borç" value={formatCurrency(totals.payable)} sub="Tedarikçilere" icon={<CreditCard size={20} />} color="var(--danger)" />
        <CStatCard title="Riskli Cariler" value={riskCount} sub="Limit Aşımı" icon={<AlertCircle size={20} />} color="var(--warning)" />
      </div>

      {/* Filtreler */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, background: 'var(--bg-main)', padding: '0.6rem 1rem', borderRadius: '10px' }}>
            <Search size={16} className="text-dim" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Cari adı, vergi no, şehir ara..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', flex: 1 }} />
          </div>
          <select className="input" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} style={{ width: 'auto' }}>
            <option value="">Tümü</option>
            <option>Müşteri</option>
            <option>Tedarikçi</option>
          </select>
        </div>
      </div>

      <div className="card">
        {paginated.length === 0 ? (
          <EmptyState
            icon={<Users size={48} />}
            title="Cari bulunamadı"
            description={search || filterType ? 'Filtrelerinizi değiştirin.' : 'Henüz cari kaydı yok.'}
            action={<button className="btn btn-primary" onClick={() => setShowCreateModal(true)}><Plus size={18} /> Yeni Cari</button>}
          />
        ) : (
          <>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Cari Ünvan</th>
                  <th>İletişim</th>
                  <th>Şehir</th>
                  <th>Risk</th>
                  <th style={{ textAlign: 'right' }}>Bakiye</th>
                  <th style={{ textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(c => {
                  const balance = getCustomerBalance(c.id);
                  const risk = riskStatus(c.id, c.type, c.creditLimit);
                  return (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedCustomer(c)}>
                      <td style={{ padding: '1.25rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '700', fontSize: '1rem' }}>{c.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.type} · {c.taxNo}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-dim)', fontSize: '0.8rem', flexDirection: 'column' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={12} /> {c.phone}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={12} /> {c.email}</span>
                        </div>
                      </td>
                      <td>{c.city}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: risk === 'good' ? 'var(--success)' : risk === 'warning' ? 'var(--warning)' : 'var(--danger)' }} />
                          <span style={{ fontSize: '0.85rem' }}>{risk === 'good' ? 'Normal' : risk === 'warning' ? 'Limit Yakın' : 'Riskli'}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={e => { e.stopPropagation(); setSelectedCustomer(c); }}><History size={16} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '0.4rem 1rem' }}>←</button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i + 1} className="btn" onClick={() => setPage(i + 1)}
                    style={{ padding: '0.4rem 0.9rem', background: page === i + 1 ? 'var(--primary)' : 'transparent', color: page === i + 1 ? 'white' : 'var(--text-dim)', border: 'none' }}>
                    {i + 1}
                  </button>
                ))}
                <button className="btn btn-ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '0.4rem 1rem' }}>→</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Yeni Cari Modal */}
      {showCreateModal && (
        <NewCustomerModal onClose={() => setShowCreateModal(false)} onSave={(data) => {
          addCustomer(data);
          toast.success(`Cari oluşturuldu: ${data.name}`);
          setShowCreateModal(false);
        }} />
      )}

      {/* Cari Detay Drawer */}
      {selectedCustomer && (
        <CustomerDrawer
          customer={selectedCustomer}
          invoices={invoices.filter(i => i.customerId === selectedCustomer.id)}
          balance={getCustomerBalance(selectedCustomer.id)}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
};

// ─── Yeni Cari Modal ──────────────────────────────────────────────────────────
const NewCustomerModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ type: 'Müşteri', name: '', taxOffice: '', taxNo: '', phone: '', email: '', city: '', address: '', creditLimit: 100000 });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Ünvan zorunlu';
    if (form.taxNo && !isValidTaxNo(form.taxNo)) e.taxNo = '10 veya 11 hane olmalı';
    if (form.phone && !isValidPhone(form.phone)) e.phone = 'Geçerli telefon no girin';
    if (form.email && !isValidEmail(form.email)) e.email = 'Geçerli e-posta girin';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form, creditLimit: parseFloat(form.creditLimit) || 100000 });
  };

  return (
    <div style={overlayStyle}>
      <div className="card" style={{ width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><Plus size={20} /></div>
            <h2 style={{ fontSize: '1.25rem' }}>Yeni Cari Kart Tanımla</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={24} /></button>
        </div>

        <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
          <FormField label="Cari Türü *">
            <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%' }}>
              <option>Müşteri</option><option>Tedarikçi</option><option>Personel</option>
            </select>
          </FormField>
          <FormField label="Cari Ünvanı *" error={errors.name}>
            <input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn: Luvia Lojistik Ltd. Şti." style={{ width: '100%' }} />
          </FormField>
          <FormField label="Vergi Dairesi">
            <input className="input" value={form.taxOffice} onChange={e => setForm(f => ({ ...f, taxOffice: e.target.value }))} placeholder="Örn: Gebze V.D." style={{ width: '100%' }} />
          </FormField>
          <FormField label="Vergi / TC No" error={errors.taxNo}>
            <input className={`input ${errors.taxNo ? 'input-error' : ''}`} value={form.taxNo} onChange={e => setForm(f => ({ ...f, taxNo: e.target.value }))} placeholder="0000000000" style={{ width: '100%' }} />
          </FormField>
          <FormField label="Telefon" error={errors.phone}>
            <input className={`input ${errors.phone ? 'input-error' : ''}`} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+90 5..." style={{ width: '100%' }} />
          </FormField>
          <FormField label="E-Posta" error={errors.email}>
            <input className={`input ${errors.email ? 'input-error' : ''}`} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@..." style={{ width: '100%' }} />
          </FormField>
          <FormField label="Şehir">
            <input className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="İstanbul" style={{ width: '100%' }} />
          </FormField>
          <FormField label="Kredi Limiti (₺)">
            <input className="input" type="number" value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: e.target.value }))} style={{ width: '100%' }} />
          </FormField>
        </div>

        <FormField label="Adres">
          <textarea className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={{ width: '100%', height: '80px', padding: '1rem', resize: 'vertical' }} placeholder="Fatura adresi..." />
        </FormField>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>İptal</button>
          <button className="btn btn-primary" style={{ padding: '0.75rem 2rem' }} onClick={handleSave}>Cari Kartı Kaydet</button>
        </div>
      </div>
    </div>
  );
};

// ─── Cari Detay Drawer ────────────────────────────────────────────────────────
const CustomerDrawer = ({ customer, invoices, balance, onClose }) => {
  const customers = useStore(s => s.customers);
  const [tab, setTab] = useState('ekstre');

  const paid = invoices.reduce((s, i) => s + i.payments.reduce((p, x) => p + x.amount, 0), 0);
  const total = invoices.reduce((s, i) => s + i.total, 0);
  const outstanding = total - paid;

  // Cari ekstre: faturalar + ödemeler kronolojik
  const movements = [];
  invoices.forEach(inv => {
    movements.push({ date: inv.date, type: 'Fatura', ref: inv.no, desc: inv.type, amount: inv.type === 'Satış Faturası' ? inv.total : -inv.total });
    inv.payments.forEach(p => {
      movements.push({ date: p.date, type: 'Ödeme', ref: inv.no, desc: `Ödeme — ${p.method}`, amount: inv.type === 'Satış Faturası' ? -p.amount : p.amount });
    });
  });
  movements.sort((a, b) => a.date > b.date ? 1 : -1);

  // Koşan bakiye hesapla
  let running = 0;
  const movementsWithBalance = movements.map(m => {
    running += m.amount;
    return { ...m, balance: running };
  });

  const handleExport = () => {
    const lines = ['Tarih,İşlem,Referans,Açıklama,Tutar,Bakiye'];
    movementsWithBalance.forEach(m => {
      lines.push(`${m.date},${m.type},${m.ref},"${m.desc}",${m.amount.toFixed(2)},${m.balance.toFixed(2)}`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ekstre-${customer.name}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Ekstre indirildi.');
  };

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '520px', height: '100%', borderRadius: '0', padding: '2.5rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem' }}>Cari Kayıt İnceleme</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={24} /></button>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem', padding: '1.25rem', background: 'var(--bg-main)', borderRadius: '15px' }}>
          <div style={{ width: '52px', height: '52px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--primary)', border: '2px solid var(--primary)' }}>
            {customer.name.charAt(0)}
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{customer.name}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{customer.type} · {customer.city} · {customer.taxNo}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{customer.phone} · {customer.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-3" style={{ gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ background: 'white', border: '1px solid var(--border)', padding: '1rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-dim)' }}>TOPLAM İŞLEM</p>
            <h4 style={{ fontSize: '1rem' }}>{formatCurrency(total)}</h4>
          </div>
          <div className="card" style={{ background: 'white', border: '1px solid var(--border)', padding: '1rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-dim)' }}>TAHSİL</p>
            <h4 style={{ fontSize: '1rem', color: 'var(--success)' }}>{formatCurrency(paid)}</h4>
          </div>
          <div className="card" style={{ background: 'white', border: '1px solid var(--border)', padding: '1rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-dim)' }}>BAKİYE</p>
            <h4 style={{ fontSize: '1rem', color: balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(balance)}</h4>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {['ekstre', 'faturalar'].map(t => (
            <button key={t} onClick={() => setTab(t)} className="btn"
              style={{ padding: '0.5rem 1.25rem', background: tab === t ? 'var(--primary)' : 'var(--bg-main)', color: tab === t ? 'white' : 'var(--text-dim)', border: 'none', fontSize: '0.85rem' }}>
              {t === 'ekstre' ? 'Cari Ekstre' : 'Faturalar'}
            </button>
          ))}
        </div>

        {tab === 'ekstre' && (
          movementsWithBalance.length === 0
            ? <p className="text-dim" style={{ textAlign: 'center', padding: '2rem' }}>Henüz hareket yok.</p>
            : movementsWithBalance.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontWeight: '600', fontSize: '0.85rem' }}>{m.desc}</p>
                  <p className="text-dim" style={{ fontSize: '0.75rem' }}>{formatDate(m.date)} · {m.ref}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: '700', fontSize: '0.9rem', color: m.amount >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {m.amount >= 0 ? '+' : ''}{formatCurrency(m.amount)}
                  </p>
                  <p className="text-dim" style={{ fontSize: '0.75rem' }}>{formatCurrency(m.balance)}</p>
                </div>
              </div>
            ))
        )}

        {tab === 'faturalar' && (
          invoices.length === 0
            ? <p className="text-dim" style={{ textAlign: 'center', padding: '2rem' }}>Bu cariye fatura yok.</p>
            : invoices.map(inv => {
              const invPaid = inv.payments.reduce((s, p) => s + p.amount, 0);
              return (
                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>{inv.no}</p>
                    <p className="text-dim" style={{ fontSize: '0.75rem' }}>{inv.type} · {formatDate(inv.date)}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: '700' }}>{formatCurrency(inv.total)}</p>
                    <p style={{ fontSize: '0.75rem', color: inv.status === 'paid' ? 'var(--success)' : 'var(--danger)' }}>
                      Kalan: {formatCurrency(inv.total - invPaid)}
                    </p>
                  </div>
                </div>
              );
            })
        )}

        <button className="btn btn-ghost" style={{ marginTop: '1.5rem', width: '100%' }} onClick={handleExport}>
          <Download size={16} /> Ekstre İndir (CSV)
        </button>
      </div>
    </div>
  );
};

const CStatCard = ({ title, value, sub, icon, color }) => (
  <div className="card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
      <div style={{ color }}>{icon}</div>
      <ShieldCheck size={16} className="text-dim" />
    </div>
    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{value}</h3>
    <p className="text-dim" style={{ fontSize: '0.85rem', fontWeight: '600' }}>{title}</p>
    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>{sub}</p>
  </div>
);

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };

export default Customers;
