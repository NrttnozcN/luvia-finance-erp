import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Wallet, Plus, TrendingUp, ArrowUpRight, ArrowDownLeft,
  Building2, CreditCard, MoreVertical, X, DollarSign, ArrowLeftRight
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatCurrency, formatDate, today } from '../utils/formatters';
import { FormField, EmptyState } from './Invoices';

const Finance = () => {
  const accounts = useStore(s => s.accounts);
  const transactions = useStore(s => s.transactions);
  const customers = useStore(s => s.customers);
  const addTransaction = useStore(s => s.addTransaction);

  const [activeTab, setActiveTab] = useState('kasa');
  const [showAddModal, setShowAddModal] = useState(false);

  const typeFilter = { kasa: 'kasa', banka: 'banka', kart: 'kart' };
  const filteredAccounts = accounts.filter(a => a.type === typeFilter[activeTab]);
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  // Son işlemleri hesap tipiyle filtrele
  const accountIds = filteredAccounts.map(a => a.id);
  const filteredTxn = transactions.filter(t => accountIds.includes(t.accountId));

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Finans & Nakit Yönetimi</h1>
          <p className="text-muted">Kasa, Banka ve Kredi Kartı süreçlerinizi profesyonelce yönetin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni İşlem Ekle
        </button>
      </header>

      {/* Özet KPI */}
      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        {accounts.map(acc => (
          <AccountCard key={acc.id} account={acc} />
        ))}
      </div>

      {/* Toplam Nakit */}
      <div className="card" style={{ marginBottom: '2rem', background: 'var(--text-main)', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Toplam Nakit Pozisyonu</p>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '900', color: totalBalance >= 0 ? 'var(--primary)' : '#f87171' }}>
              {formatCurrency(totalBalance)}
            </h2>
          </div>
          <TrendingUp size={48} style={{ opacity: 0.15 }} />
        </div>
      </div>

      {/* Hesap Tabları */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <TabButton active={activeTab === 'kasa'} label="Kasa" icon={<Wallet size={18} />} count={accounts.filter(a => a.type === 'kasa').length} onClick={() => setActiveTab('kasa')} />
        <TabButton active={activeTab === 'banka'} label="Banka" icon={<Building2 size={18} />} count={accounts.filter(a => a.type === 'banka').length} onClick={() => setActiveTab('banka')} />
        <TabButton active={activeTab === 'kart'} label="Kredi Kartı" icon={<CreditCard size={18} />} count={accounts.filter(a => a.type === 'kart').length} onClick={() => setActiveTab('kart')} />
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem' }}>
          {activeTab === 'kasa' ? 'Kasa' : activeTab === 'banka' ? 'Banka' : 'Kredi Kartı'} Hareketleri
        </h3>

        {filteredTxn.length === 0 ? (
          <EmptyState
            icon={<DollarSign size={48} />}
            title="Hareket bulunamadı"
            description="Bu hesap tipi için henüz işlem kaydı yok."
            action={<button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={18} /> Yeni İşlem</button>}
          />
        ) : (
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>İşlem</th>
                <th>Açıklama</th>
                <th>Hesap</th>
                <th>Tarih</th>
                <th style={{ textAlign: 'right' }}>Tutar</th>
                <th style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredTxn.map(t => {
                const acc = accounts.find(a => a.id === t.accountId);
                return (
                  <tr key={t.id}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ color: t.type === 'in' ? 'var(--success)' : 'var(--danger)', background: t.type === 'in' ? '#f0fdf4' : '#fef2f2', padding: '0.4rem', borderRadius: '8px' }}>
                          {t.type === 'in' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                        </div>
                        <span style={{ fontWeight: '700' }}>{t.title}</span>
                      </div>
                    </td>
                    <td className="text-dim">{t.desc}</td>
                    <td><span className="badge" style={{ background: 'var(--bg-main)' }}>{acc?.name}</span></td>
                    <td className="text-dim">{formatDate(t.date)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: t.type === 'in' ? 'var(--success)' : 'var(--danger)' }}>
                      {t.type === 'in' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost" style={{ padding: '0.4rem' }}><MoreVertical size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <NewTransactionModal
          accounts={accounts}
          customers={customers}
          onClose={() => setShowAddModal(false)}
          onSave={(data) => {
            addTransaction(data);
            toast.success(`İşlem kaydedildi: ${formatCurrency(data.amount)}`);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
};

// ─── Yeni İşlem Modal ─────────────────────────────────────────────────────────
const NewTransactionModal = ({ accounts, customers, onClose, onSave }) => {
  const [form, setForm] = useState({
    type: 'in', title: 'Tahsilat', desc: '', accountId: accounts[0]?.id || '',
    amount: '', customerId: '', date: today(),
  });
  const [errors, setErrors] = useState({});

  const typeLabels = { in: 'Tahsilat (Giriş)', out: 'Ödeme (Çıkış)' };

  const validate = () => {
    const e = {};
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) e.amount = 'Geçerli tutar girin';
    if (!form.accountId) e.accountId = 'Hesap seçin';
    if (!form.date) e.date = 'Tarih girin';
    if (!form.desc.trim()) e.desc = 'Açıklama girin';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form, amount: parseFloat(form.amount) });
  };

  return (
    <div style={overlayStyle}>
      <div className="card" style={{ width: '100%', maxWidth: '560px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><DollarSign size={20} /></div>
            <h2 style={{ fontSize: '1.25rem' }}>Yeni Finansal İşlem</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        {/* İşlem tipi seçimi */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          {[{ val: 'in', label: 'Tahsilat', icon: <ArrowUpRight size={18} />, color: 'var(--success)' },
            { val: 'out', label: 'Ödeme', icon: <ArrowDownLeft size={18} />, color: 'var(--danger)' }].map(opt => (
            <button key={opt.val} onClick={() => setForm(f => ({ ...f, type: opt.val, title: opt.label }))}
              style={{ flex: 1, padding: '1rem', border: form.type === opt.val ? `2px solid ${opt.color}` : '1px solid var(--border)', borderRadius: '12px', background: form.type === opt.val ? `${opt.color}15` : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: form.type === opt.val ? opt.color : 'var(--text-dim)', fontWeight: '700' }}>
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
            <FormField label="Hesap / Kasa *" error={errors.accountId}>
              <select className={`input ${errors.accountId ? 'input-error' : ''}`} value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))} style={{ width: '100%' }}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance)}</option>)}
              </select>
            </FormField>
            <FormField label="Tutar (₺) *" error={errors.amount}>
              <input className={`input ${errors.amount ? 'input-error' : ''}`} type="number" min="0" placeholder="0,00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ width: '100%' }} />
            </FormField>
          </div>

          <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
            <FormField label="Tarih *" error={errors.date}>
              <input className={`input ${errors.date ? 'input-error' : ''}`} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%' }} />
            </FormField>
            <FormField label="Cari (İsteğe Bağlı)">
              <select className="input" value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} style={{ width: '100%' }}>
                <option value="">— Cari Bağımsız —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
          </div>

          <FormField label="Açıklama *" error={errors.desc}>
            <input className={`input ${errors.desc ? 'input-error' : ''}`} placeholder="İşlem detayı..." value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} style={{ width: '100%' }} />
          </FormField>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>İptal</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>İşlemi Kaydet</button>
        </div>
      </div>
    </div>
  );
};

// ─── Hesap Kartı ──────────────────────────────────────────────────────────────
const AccountCard = ({ account }) => {
  const typeIcon = account.type === 'kasa' ? <Wallet size={20} /> : account.type === 'banka' ? <Building2 size={20} /> : <CreditCard size={20} />;
  const isNeg = account.balance < 0;
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ color: 'var(--primary)' }}>{typeIcon}</div>
      </div>
      <h3 style={{ fontSize: '1.35rem', marginBottom: '0.25rem', color: isNeg ? 'var(--danger)' : 'var(--text-main)' }}>
        {formatCurrency(account.balance)}
      </h3>
      <p className="text-dim" style={{ fontSize: '0.85rem', fontWeight: '600' }}>{account.name}</p>
      <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem', textTransform: 'capitalize' }}>{account.type}</p>
    </div>
  );
};

const TabButton = ({ active, label, icon, count, onClick }) => (
  <button onClick={onClick} className="btn"
    style={{ background: active ? 'white' : 'transparent', color: active ? 'var(--primary)' : 'var(--text-muted)', border: active ? '1px solid var(--primary)' : '1px solid var(--border)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
    {icon} {label}
    {count > 0 && <span style={{ background: active ? 'var(--primary)' : 'var(--bg-main)', color: active ? 'white' : 'var(--text-dim)', borderRadius: '20px', padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: '700' }}>{count}</span>}
  </button>
);

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };

export default Finance;
