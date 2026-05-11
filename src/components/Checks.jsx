import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  FileSpreadsheet, Plus, AlertCircle, CheckCircle2, Clock, X, CreditCard, MoreVertical,
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatCurrency, formatDate, today } from '../utils/formatters';
import { FormField, EmptyState } from './Invoices';

const STATUS_META = {
  portfoy:      { label: 'Portföyde',   cls: 'badge-primary',  color: 'var(--primary)' },
  tahsil:       { label: 'Tahsil Edildi', cls: 'badge-success', color: 'var(--success)' },
  vadesi_gecen: { label: 'Vadesi Geçti', cls: 'badge-danger',  color: 'var(--danger)' },
  odendi:       { label: 'Ödendi',       cls: 'badge-success', color: 'var(--success)' },
};

const Checks = () => {
  const checks = useStore(s => s.checks);
  const customers = useStore(s => s.customers);
  const addCheck = useStore(s => s.addCheck);
  const updateCheckStatus = useStore(s => s.updateCheckStatus);
  const [showAddModal, setShowAddModal] = useState(false);

  const today_ = today();

  const counts = {
    portfoy: checks.filter(c => c.status === 'portfoy').length,
    vadesi_gecen: checks.filter(c => c.status === 'vadesi_gecen' || (c.status === 'portfoy' && c.dueDate < today_)).length,
    tahsil: checks.filter(c => c.status === 'tahsil').length,
    yaklasiyor: checks.filter(c => {
      const in30 = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0];
      return c.status === 'portfoy' && c.dueDate >= today_ && c.dueDate <= in30;
    }).length,
  };

  const portfoyTotal = checks.filter(c => c.status === 'portfoy').reduce((s, c) => s + c.amount, 0);
  const overdueTotal = checks.filter(c => c.status === 'vadesi_gecen').reduce((s, c) => s + c.amount, 0);
  const tahsilTotal = checks.filter(c => c.status === 'tahsil' || c.status === 'odendi').reduce((s, c) => s + c.amount, 0);
  const yaklasiTotal = checks.filter(c => {
    const in30 = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0];
    return c.status === 'portfoy' && c.dueDate >= today_ && c.dueDate <= in30;
  }).reduce((s, c) => s + c.amount, 0);

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Çek & Senet Yönetimi</h1>
          <p className="text-muted">Portföyünüzdeki müşteri ve kendi çeklerinizin vadelerini ve durumlarını takip edin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Çek/Senet Kaydı
        </button>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <CheckStatCard title="Portföydeki Çekler" value={formatCurrency(portfoyTotal)} sub={`${counts.portfoy} Adet`} icon={<FileSpreadsheet size={20} />} color="var(--primary)" />
        <CheckStatCard title="Vadesi Geçen" value={formatCurrency(overdueTotal)} sub={`${counts.vadesi_gecen} Adet`} icon={<AlertCircle size={20} />} color="var(--danger)" />
        <CheckStatCard title="Tahsil / Ödenen" value={formatCurrency(tahsilTotal)} sub="Tümü" icon={<CheckCircle2 size={20} />} color="var(--success)" />
        <CheckStatCard title="Yaklaşan Vade" value={formatCurrency(yaklasiTotal)} sub={`${counts.yaklasiyor} Adet / 30 Gün`} icon={<Clock size={20} />} color="var(--warning)" />
      </div>

      <div className="card">
        {checks.length === 0 ? (
          <EmptyState icon={<FileSpreadsheet size={48} />} title="Çek kaydı yok" description="Henüz çek veya senet eklenmemiş."
            action={<button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={18} /> Kayıt Ekle</button>} />
        ) : (
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Vade</th>
                <th>Cari / Keşideci</th>
                <th>Tür</th>
                <th>Banka / Şube</th>
                <th style={{ textAlign: 'right' }}>Tutar</th>
                <th style={{ textAlign: 'right' }}>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...checks].sort((a, b) => a.dueDate > b.dueDate ? 1 : -1).map(ck => {
                const c = customers.find(c => c.id === ck.customerId);
                const meta = STATUS_META[ck.status] || STATUS_META.portfoy;
                const isOverdue = ck.status === 'portfoy' && ck.dueDate < today_;
                return (
                  <tr key={ck.id}>
                    <td style={{ padding: '1rem', fontWeight: '700', color: isOverdue ? 'var(--danger)' : 'inherit' }}>{formatDate(ck.dueDate)}</td>
                    <td>{c?.name || '—'}</td>
                    <td><span className="badge" style={{ background: 'var(--bg-main)' }}>{ck.type}</span></td>
                    <td className="text-dim">{ck.bank}{ck.branch ? ` / ${ck.branch}` : ''}</td>
                    <td style={{ textAlign: 'right', fontWeight: '800' }}>{formatCurrency(ck.amount)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`badge ${isOverdue ? 'badge-danger' : meta.cls}`}>
                        {isOverdue ? 'Vadesi Geçti' : meta.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <select
                        className="input"
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', width: 'auto' }}
                        value={ck.status}
                        onChange={e => {
                          updateCheckStatus(ck.id, e.target.value);
                          toast.success('Durum güncellendi');
                        }}
                      >
                        <option value="portfoy">Portföyde</option>
                        <option value="tahsil">Tahsil Edildi</option>
                        <option value="odendi">Ödendi</option>
                        <option value="vadesi_gecen">Vadesi Geçti</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <NewCheckModal
          customers={customers}
          onClose={() => setShowAddModal(false)}
          onSave={(data) => {
            addCheck(data);
            toast.success(`Çek kaydedildi: ${formatCurrency(data.amount)}`);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
};

const NewCheckModal = ({ customers, onClose, onSave }) => {
  const [form, setForm] = useState({
    type: 'Müşteri Çeki', customerId: '', dueDate: '', amount: '',
    bank: '', branch: '', note: '', date: today(),
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.customerId) e.customerId = 'Cari seçin';
    if (!form.dueDate) e.dueDate = 'Vade tarihi girin';
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = 'Tutar girin';
    if (!form.bank) e.bank = 'Banka girin';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div style={overlayStyle}>
      <div className="card" style={{ width: '100%', maxWidth: '560px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><CreditCard size={20} /></div>
            <h2 style={{ fontSize: '1.25rem' }}>Yeni Çek / Senet Kaydı</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
          <FormField label="Tür">
            <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%' }}>
              <option>Müşteri Çeki</option>
              <option>Kendi Çekimiz</option>
              <option>Senet</option>
            </select>
          </FormField>
          <FormField label="Cari *" error={errors.customerId}>
            <select className={`input ${errors.customerId ? 'input-error' : ''}`} value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} style={{ width: '100%' }}>
              <option value="">— Seçin —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label="Tutar (₺) *" error={errors.amount}>
            <input className={`input ${errors.amount ? 'input-error' : ''}`} type="number" min="0" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ width: '100%' }} />
          </FormField>
          <FormField label="Vade Tarihi *" error={errors.dueDate}>
            <input className={`input ${errors.dueDate ? 'input-error' : ''}`} type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={{ width: '100%' }} />
          </FormField>
          <FormField label="Banka *" error={errors.bank}>
            <input className={`input ${errors.bank ? 'input-error' : ''}`} value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} placeholder="Örn: Garanti BBVA" style={{ width: '100%' }} />
          </FormField>
          <FormField label="Şube">
            <input className="input" value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} placeholder="Şube adı" style={{ width: '100%' }} />
          </FormField>
          <FormField label="Kayıt Tarihi">
            <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%' }} />
          </FormField>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>İptal</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => {
            if (!validate()) return;
            onSave({ ...form, amount: parseFloat(form.amount) });
          }}>Kaydı Oluştur</button>
        </div>
      </div>
    </div>
  );
};

const CheckStatCard = ({ title, value, sub, icon, color }) => (
  <div className="card">
    <div style={{ color, marginBottom: '0.75rem' }}>{icon}</div>
    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{value}</h3>
    <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>{title}</p>
    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{sub}</p>
  </div>
);

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };

export default Checks;
