import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Disc, Plus, Truck, AlertTriangle, X, MoreVertical, History, Wrench } from 'lucide-react';
import useStore from '../store/useStore';
import { formatCurrency, formatDate, today } from '../utils/formatters';
import { FormField, EmptyState } from './Invoices';

const TIRE_BRANDS = ['Michelin', 'Bridgestone', 'Continental', 'Goodyear', 'Pirelli', 'Diğer'];
const TIRE_SIZES = ['315/80 R22.5', '385/65 R22.5', '295/80 R22.5', '11R22.5', '235/75 R17.5'];

const Tires = () => {
  const tireEntries = useStore(s => s.tireEntries);
  const vehicles = useStore(s => s.vehicles);
  const addTireEntry = useStore(s => s.addTireEntry);

  const [showAddModal, setShowAddModal] = useState(false);

  const totalCost = tireEntries.reduce((s, t) => s + t.total, 0);
  const totalQty = tireEntries.reduce((s, t) => s + t.qty, 0);

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Lastik İşlemleri</h1>
          <p className="text-muted">Araçlarınızın lastik ömürlerini, değişimlerini ve stok durumunu izleyin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Lastik Kaydı Ekle
        </button>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <TStatCard title="Toplam İşlem" value={tireEntries.length} sub="Kayıt" icon={<Disc size={20} />} color="var(--primary)" />
        <TStatCard title="Toplam Adet" value={totalQty} sub="Tüm Dönem" icon={<Truck size={20} />} color="var(--success)" />
        <TStatCard title="Toplam Maliyet" value={formatCurrency(totalCost)} sub="Lastik Harcaması" icon={<History size={20} />} color="var(--warning)" />
        <TStatCard title="Araç Başı Ort." value={vehicles.length > 0 ? formatCurrency(totalCost / vehicles.length) : '₺0,00'} sub="Araç / Dönem" icon={<Wrench size={20} />} color="var(--text-dim)" />
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem' }}>Lastik Hareket Listesi</h3>
        {tireEntries.length === 0 ? (
          <EmptyState icon={<Disc size={48} />} title="Lastik kaydı yok" description="Henüz lastik işlemi eklenmemiş."
            action={<button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={18} /> Kayıt Ekle</button>} />
        ) : (
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Plaka</th>
                <th>İşlem</th>
                <th>Marka / Ebat</th>
                <th>Adet</th>
                <th>Birim Fiyat</th>
                <th style={{ textAlign: 'right' }}>Toplam</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...tireEntries].sort((a, b) => b.date > a.date ? 1 : -1).map(t => {
                const v = vehicles.find(v => v.id === t.vehicleId);
                return (
                  <tr key={t.id}>
                    <td style={{ padding: '1rem' }}>{formatDate(t.date)}</td>
                    <td style={{ fontWeight: '700' }}>{v?.plate || '—'}</td>
                    <td><span className="badge" style={{ background: 'var(--bg-main)' }}>{t.type}</span></td>
                    <td className="text-dim">{t.brand} {t.size}</td>
                    <td>{t.qty} Adet</td>
                    <td>{formatCurrency(t.unitPrice)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700' }}>{formatCurrency(t.total)}</td>
                    <td style={{ textAlign: 'right' }}><button className="btn btn-ghost" style={{ padding: '0.4rem' }}><MoreVertical size={16} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <NewTireModal vehicles={vehicles}
          onClose={() => setShowAddModal(false)}
          onSave={(data) => {
            addTireEntry(data);
            toast.success(`Lastik kaydedildi: ${data.qty} adet — ${formatCurrency(data.total)}`);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
};

// ─── Yeni Lastik Modal ────────────────────────────────────────────────────────
const NewTireModal = ({ vehicles, onClose, onSave }) => {
  const [form, setForm] = useState({
    vehicleId: vehicles[0]?.id || '', type: 'Yeni Montaj',
    brand: TIRE_BRANDS[0], size: TIRE_SIZES[0],
    qty: 4, unitPrice: '', date: today(),
  });
  const [errors, setErrors] = useState({});

  const total = (parseFloat(form.qty) || 0) * (parseFloat(form.unitPrice) || 0);

  const validate = () => {
    const e = {};
    if (!form.vehicleId) e.vehicleId = 'Araç seçin';
    if (!form.qty || parseFloat(form.qty) <= 0) e.qty = 'Adet girin';
    if (!form.unitPrice || parseFloat(form.unitPrice) <= 0) e.unitPrice = 'Fiyat girin';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div style={overlayStyle}>
      <div className="card" style={{ width: '100%', maxWidth: '560px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><Disc size={20} /></div>
            <h2 style={{ fontSize: '1.25rem' }}>Yeni Lastik Kaydı</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
            <FormField label="Araç / Plaka *" error={errors.vehicleId}>
              <select className={`input ${errors.vehicleId ? 'input-error' : ''}`} value={form.vehicleId} onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))} style={{ width: '100%' }}>
                <option value="">— Araç Seçin —</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} — {v.brand}</option>)}
              </select>
            </FormField>
            <FormField label="İşlem Türü">
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%' }}>
                <option>Yeni Montaj</option><option>Rotasyon</option><option>Kaplama</option><option>Stok Girişi</option>
              </select>
            </FormField>
            <FormField label="Marka">
              <select className="input" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} style={{ width: '100%' }}>
                {TIRE_BRANDS.map(b => <option key={b}>{b}</option>)}
              </select>
            </FormField>
            <FormField label="Ebat">
              <select className="input" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} style={{ width: '100%' }}>
                {TIRE_SIZES.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Adet *" error={errors.qty}>
              <input className={`input ${errors.qty ? 'input-error' : ''}`} type="number" min="1" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} style={{ width: '100%' }} />
            </FormField>
            <FormField label="Birim Fiyat (₺) *" error={errors.unitPrice}>
              <input className={`input ${errors.unitPrice ? 'input-error' : ''}`} type="number" min="0" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="0,00" style={{ width: '100%' }} />
            </FormField>
            <FormField label="Tarih">
              <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%' }} />
            </FormField>
          </div>

          <div style={{ padding: '1.25rem', background: 'var(--text-main)', color: 'white', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ opacity: 0.7 }}>Toplam Tutar</span>
            <span style={{ fontWeight: '900', fontSize: '1.35rem', color: 'var(--primary)' }}>{formatCurrency(total)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>İptal</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => {
            if (!validate()) return;
            onSave({ ...form, qty: parseFloat(form.qty), unitPrice: parseFloat(form.unitPrice), total });
          }}>Kaydı Tamamla</button>
        </div>
      </div>
    </div>
  );
};

const TStatCard = ({ title, value, sub, icon, color }) => (
  <div className="card">
    <div style={{ color, marginBottom: '0.75rem' }}>{icon}</div>
    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{value}</h3>
    <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>{title}</p>
    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{sub}</p>
  </div>
);

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };

export default Tires;
