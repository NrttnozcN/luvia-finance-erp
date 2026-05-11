import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { TrendingDown, TrendingUp, Plus, X, DollarSign, ArrowUpRight, ArrowDownLeft, MoreVertical } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import useStore from '../store/useStore';
import { formatCurrency, formatDate, today } from '../utils/formatters';
import { FormField, EmptyState } from './Invoices';

const CATEGORIES_GIDER = ['Kira/Ofis', 'Personel', 'Yemek', 'Ulaşım', 'Vergi', 'Diğer'];
const CATEGORIES_GELIR = ['Faiz', 'Kira Geliri', 'Yan Gelir', 'Diğer'];
const COLORS = ['#FF6B00', '#22C55E', '#3B82F6', '#EF4444', '#8B5CF6', '#F59E0B'];

const RevenueExpense = () => {
  const revenueExpenses = useStore(s => s.revenueExpenses);
  const accounts = useStore(s => s.accounts);
  const addRevenueExpense = useStore(s => s.addRevenueExpense);
  const [showAddModal, setShowAddModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState('Tümü');

  const giderler = revenueExpenses.filter(r => r.type === 'Gider');
  const gelirler = revenueExpenses.filter(r => r.type === 'Gelir');
  const totalGider = giderler.reduce((s, r) => s + r.amount, 0);
  const totalGelir = gelirler.reduce((s, r) => s + r.amount, 0);
  const net = totalGelir - totalGider;

  const pieData = (() => {
    const map = {};
    giderler.forEach(r => { map[r.category] = (map[r.category] || 0) + r.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  })();

  const visible = revenueExpenses.filter(r => typeFilter === 'Tümü' || r.type === typeFilter);

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Gelir & Gider Yönetimi</h1>
          <p className="text-muted">Fatura dışı genel giderlerinizi ve ek gelirlerinizi kategorize edin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Hareket Ekle
        </button>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <REStatCard title="Toplam Gelir" value={formatCurrency(totalGelir)} icon={<ArrowUpRight size={20} />} color="var(--success)" />
        <REStatCard title="Toplam Gider" value={formatCurrency(totalGider)} icon={<ArrowDownLeft size={20} />} color="var(--danger)" />
        <REStatCard title="Net Bakiye" value={formatCurrency(net)} icon={<DollarSign size={20} />} color={net >= 0 ? 'var(--primary)' : 'var(--danger)'} />
        <REStatCard title="Toplam Kayıt" value={`${revenueExpenses.length} Hareket`} icon={<TrendingDown size={20} />} color="var(--text-dim)" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Hareketler</h3>
            <select className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: 'auto', fontSize: '0.85rem', padding: '0.4rem 0.7rem' }}>
              <option>Tümü</option>
              <option>Gelir</option>
              <option>Gider</option>
            </select>
          </div>
          {visible.length === 0 ? (
            <EmptyState icon={<TrendingDown size={48} />} title="Hareket yok" description="Henüz gelir/gider hareketi eklenmemiş."
              action={<button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={18} /> Hareket Ekle</button>} />
          ) : (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Açıklama</th>
                  <th>Kategori</th>
                  <th>Tarih</th>
                  <th style={{ textAlign: 'right' }}>Tutar</th>
                </tr>
              </thead>
              <tbody>
                {[...visible].sort((a, b) => b.date > a.date ? 1 : -1).map(r => (
                  <tr key={r.id}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {r.type === 'Gelir'
                          ? <ArrowUpRight size={14} style={{ color: 'var(--success)' }} />
                          : <ArrowDownLeft size={14} style={{ color: 'var(--danger)' }} />}
                        <span style={{ fontWeight: '700' }}>{r.desc}</span>
                      </div>
                    </td>
                    <td><span className="badge" style={{ background: 'var(--bg-main)' }}>{r.category}</span></td>
                    <td className="text-dim">{formatDate(r.date)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: r.type === 'Gelir' ? 'var(--success)' : 'var(--danger)' }}>
                      {r.type === 'Gider' ? '-' : '+'}{formatCurrency(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Gider Dağılımı</h3>
          {pieData.length === 0 ? (
            <p className="text-dim" style={{ textAlign: 'center', padding: '4rem 0' }}>Veri yok</p>
          ) : (
            <div style={{ width: '100%', height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <NewREModal
          accounts={accounts}
          onClose={() => setShowAddModal(false)}
          onSave={(data) => {
            addRevenueExpense(data);
            toast.success(`${data.type} kaydedildi: ${formatCurrency(data.amount)}`);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
};

const NewREModal = ({ accounts, onClose, onSave }) => {
  const [form, setForm] = useState({
    type: 'Gider', category: CATEGORIES_GIDER[0], amount: '',
    date: today(), desc: '', accountId: accounts[0]?.id || '',
  });
  const [errors, setErrors] = useState({});

  const categories = form.type === 'Gider' ? CATEGORIES_GIDER : CATEGORIES_GELIR;

  const validate = () => {
    const e = {};
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = 'Tutar girin';
    if (!form.desc) e.desc = 'Açıklama girin';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div style={overlayStyle}>
      <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}>
              <TrendingDown size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem' }}>Yeni Gelir/Gider Hareketi</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
          <FormField label="Tür">
            <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, category: (e.target.value === 'Gider' ? CATEGORIES_GIDER : CATEGORIES_GELIR)[0] }))} style={{ width: '100%' }}>
              <option>Gider</option>
              <option>Gelir</option>
            </select>
          </FormField>
          <FormField label="Kategori">
            <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: '100%' }}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Tutar (₺) *" error={errors.amount}>
            <input className={`input ${errors.amount ? 'input-error' : ''}`} type="number" min="0" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ width: '100%' }} />
          </FormField>
          <FormField label="Tarih">
            <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%' }} />
          </FormField>
          <FormField label="Hesap">
            <select className="input" value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))} style={{ width: '100%' }}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </FormField>
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <FormField label="Açıklama *" error={errors.desc}>
            <input className={`input ${errors.desc ? 'input-error' : ''}`} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="Örn: Nisan ayı yemek bedeli" style={{ width: '100%' }} />
          </FormField>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>İptal</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => {
            if (!validate()) return;
            onSave({ ...form, amount: parseFloat(form.amount) });
          }}>Kaydı Tamamla</button>
        </div>
      </div>
    </div>
  );
};

const REStatCard = ({ title, value, icon, color }) => (
  <div className="card">
    <div style={{ color, marginBottom: '0.75rem' }}>{icon}</div>
    <h3 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>{value}</h3>
    <p className="text-dim" style={{ fontSize: '0.85rem', fontWeight: '600' }}>{title}</p>
  </div>
);

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };

export default RevenueExpense;
