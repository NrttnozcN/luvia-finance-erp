import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Fuel as FuelIcon, Plus, TrendingUp, History, MoreVertical, X, Truck, Droplet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useStore from '../store/useStore';
import { formatCurrency, formatDate, today } from '../utils/formatters';
import { FormField, EmptyState } from './Invoices';

const STATIONS = ['Merkez İstasyon', 'Petrol Ofisi', 'Shell', 'BP', 'Opet', 'Total'];

const Fuel = () => {
  const fuelEntries = useStore(s => s.fuelEntries);
  const vehicles = useStore(s => s.vehicles);
  const customers = useStore(s => s.customers);
  const addFuelEntry = useStore(s => s.addFuelEntry);

  const [showAddModal, setShowAddModal] = useState(false);

  // Son 7 gün tüketim grafiği
  const weeklyChart = (() => {
    const days = [];
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5);
      const key = d.toISOString().split('T')[0];
      const litre = fuelEntries.filter(f => f.date === key).reduce((s, f) => s + f.liters, 0);
      days.push({ name: dayNames[d.getDay()], litre });
    }
    return days;
  })();

  const stats = {
    weeklyTotal: fuelEntries.reduce((s, f) => {
      const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0];
      return f.date >= weekAgo ? s + f.liters : s;
    }, 0),
    totalCost: fuelEntries.reduce((s, f) => s + f.total, 0),
    avgPrice: fuelEntries.length > 0
      ? fuelEntries.reduce((s, f) => s + f.pricePerLiter, 0) / fuelEntries.length
      : 0,
    entries: fuelEntries.length,
  };

  // Son 10 giriş
  const recent = [...fuelEntries].sort((a, b) => b.date > a.date ? 1 : -1).slice(0, 10);

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Akaryakıt Takibi</h1>
          <p className="text-muted">Araç bazlı yakıt tüketimini, fiyatları ve istasyon depo seviyelerini izleyin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Yakıt Fişi Gir
        </button>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <FStatCard title="Haftalık Tüketim" value={`${stats.weeklyTotal.toLocaleString('tr-TR')} L`} sub="Son 7 Gün" icon={<Droplet size={20} />} color="var(--primary)" />
        <FStatCard title="Ort. Litre Fiyatı" value={formatCurrency(stats.avgPrice)} sub="Ortalama" icon={<TrendingUp size={20} />} color="var(--success)" />
        <FStatCard title="Toplam Harcama" value={formatCurrency(stats.totalCost)} sub="Tüm Dönem" icon={<FuelIcon size={20} />} color="var(--warning)" />
        <FStatCard title="Toplam Kayıt" value={stats.entries} sub="Fiş Sayısı" icon={<History size={20} />} color="var(--text-dim)" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Son 7 Gün Tüketim Analizi (Litre)</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip cursor={{ fill: 'var(--bg-main)' }} formatter={(v) => [`${v} L`, 'Tüketim']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                <Bar dataKey="litre" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Son Yakıt Alımları</h3>
          {recent.length === 0 ? (
            <p className="text-dim" style={{ textAlign: 'center', padding: '2rem 0' }}>Henüz yakıt kaydı yok.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recent.map(f => {
                const v = vehicles.find(v => v.id === f.vehicleId);
                return (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: 'var(--bg-main)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Truck size={16} className="text-dim" />
                      <div>
                        <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>{v?.plate || '—'}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{f.liters} L · {formatDate(f.date)}</p>
                      </div>
                    </div>
                    <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{formatCurrency(f.total)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tüm Hareketler */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Yakıt Hareket Listesi</h3>
        {fuelEntries.length === 0 ? (
          <EmptyState icon={<FuelIcon size={48} />} title="Yakıt kaydı yok" description="Henüz yakıt fişi işlenmemiş."
            action={<button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={18} /> Fiş Ekle</button>} />
        ) : (
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Araç</th>
                <th>İstasyon</th>
                <th>Tarih</th>
                <th>Miktar</th>
                <th>L. Fiyatı</th>
                <th style={{ textAlign: 'right' }}>Toplam</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...fuelEntries].sort((a, b) => b.date > a.date ? 1 : -1).map(f => {
                const v = vehicles.find(v => v.id === f.vehicleId);
                return (
                  <tr key={f.id}>
                    <td style={{ padding: '1rem', fontWeight: '700' }}>{v?.plate || '—'}</td>
                    <td className="text-dim">{f.station}</td>
                    <td className="text-dim">{formatDate(f.date)}</td>
                    <td>{f.liters} L</td>
                    <td>{formatCurrency(f.pricePerLiter)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700' }}>{formatCurrency(f.total)}</td>
                    <td style={{ textAlign: 'right' }}><button className="btn btn-ghost" style={{ padding: '0.4rem' }}><MoreVertical size={16} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <NewFuelModal vehicles={vehicles} customers={customers}
          onClose={() => setShowAddModal(false)}
          onSave={(data) => {
            addFuelEntry(data);
            toast.success(`Yakıt fişi kaydedildi: ${data.liters} L — ${formatCurrency(data.total)}`);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
};

// ─── Yeni Yakıt Fişi Modal ────────────────────────────────────────────────────
const NewFuelModal = ({ vehicles, customers, onClose, onSave }) => {
  const [form, setForm] = useState({
    vehicleId: vehicles[0]?.id || '', station: STATIONS[0], fuelType: 'Motorin (Dizel)',
    liters: '', pricePerLiter: '', date: today(), customerId: '',
  });
  const [errors, setErrors] = useState({});

  const total = (parseFloat(form.liters) || 0) * (parseFloat(form.pricePerLiter) || 0);

  const validate = () => {
    const e = {};
    if (!form.vehicleId) e.vehicleId = 'Araç seçin';
    if (!form.liters || parseFloat(form.liters) <= 0) e.liters = 'Geçerli litre girin';
    if (!form.pricePerLiter || parseFloat(form.pricePerLiter) <= 0) e.pricePerLiter = 'Fiyat girin';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div style={overlayStyle}>
      <div className="card" style={{ width: '100%', maxWidth: '560px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><Droplet size={20} /></div>
            <h2 style={{ fontSize: '1.25rem' }}>Yeni Yakıt Fişi İşle</h2>
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
            <FormField label="İstasyon">
              <select className="input" value={form.station} onChange={e => setForm(f => ({ ...f, station: e.target.value }))} style={{ width: '100%' }}>
                {STATIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Yakıt Türü">
              <select className="input" value={form.fuelType} onChange={e => setForm(f => ({ ...f, fuelType: e.target.value }))} style={{ width: '100%' }}>
                <option>Motorin (Dizel)</option><option>Benzin</option><option>LPG</option><option>AdBlue</option>
              </select>
            </FormField>
            <FormField label="Tarih">
              <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%' }} />
            </FormField>
            <FormField label="Alınan Litre *" error={errors.liters}>
              <input className={`input ${errors.liters ? 'input-error' : ''}`} type="number" min="0" step="0.01" placeholder="0.00" value={form.liters} onChange={e => setForm(f => ({ ...f, liters: e.target.value }))} style={{ width: '100%' }} />
            </FormField>
            <FormField label="Litre Fiyatı (₺) *" error={errors.pricePerLiter}>
              <input className={`input ${errors.pricePerLiter ? 'input-error' : ''}`} type="number" min="0" step="0.01" placeholder="0.00" value={form.pricePerLiter} onChange={e => setForm(f => ({ ...f, pricePerLiter: e.target.value }))} style={{ width: '100%' }} />
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
            onSave({ ...form, liters: parseFloat(form.liters), pricePerLiter: parseFloat(form.pricePerLiter), total });
          }}>Fişi Kaydet</button>
        </div>
      </div>
    </div>
  );
};

const FStatCard = ({ title, value, sub, icon, color }) => (
  <div className="card">
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
      <div style={{ padding: '0.6rem', background: 'var(--bg-main)', color, borderRadius: '10px' }}>{icon}</div>
      <p className="text-dim" style={{ fontSize: '0.9rem', fontWeight: '600' }}>{title}</p>
    </div>
    <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{value}</h2>
    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{sub}</p>
  </div>
);

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };

export default Fuel;
