import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Truck, Plus, Search, AlertCircle, Calendar, Wrench, X,
  ShieldCheck, Fuel, MoreVertical, TrendingUp, DollarSign
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatCurrency, formatDate, today } from '../utils/formatters';
import { FormField, EmptyState } from './Invoices';

const Vehicles = () => {
  const vehicles = useStore(s => s.vehicles);
  const personnel = useStore(s => s.personnel);
  const fuelEntries = useStore(s => s.fuelEntries);
  const tireEntries = useStore(s => s.tireEntries);
  const invoices = useStore(s => s.invoices);
  const addVehicle = useStore(s => s.addVehicle);
  const updateVehicle = useStore(s => s.updateVehicle);
  const getVehicleTotalCost = useStore(s => s.getVehicleTotalCost);

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const today_ = today();
  const in7Days = new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0];

  const filtered = vehicles.filter(v =>
    !search || v.plate.toLowerCase().includes(search.toLowerCase()) || v.brand.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'Seferde').length,
    maintenance: vehicles.filter(v => v.nextMaintenance && v.nextMaintenance <= in7Days).length,
    inspection: vehicles.filter(v => v.nextInspection && v.nextInspection <= in7Days).length,
  };

  const getVehicleFuelConsumption = (vehicleId) =>
    fuelEntries.filter(f => f.vehicleId === vehicleId).reduce((s, f) => s + f.liters, 0);

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Araç Yönetimi</h1>
          <p className="text-muted">Filonuzdaki araçların bakım, muayene, sigorta ve maliyet durumlarını izleyin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Araç Ekle
        </button>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <VStatCard title="Toplam Araç" value={stats.total} sub="Filo" icon={<Truck size={20} />} color="var(--primary)" />
        <VStatCard title="Seferde" value={stats.active} sub="Aktif" icon={<TrendingUp size={20} />} color="var(--success)" />
        <VStatCard title="Bakım Gerekli" value={stats.maintenance} sub="7 Gün İçinde" icon={<Wrench size={20} />} color="var(--warning)" />
        <VStatCard title="Muayene Yakın" value={stats.inspection} sub="Kritik" icon={<AlertCircle size={20} />} color="var(--danger)" />
      </div>

      {/* Arama */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-main)', padding: '0.6rem 1rem', borderRadius: '10px', width: 'fit-content', minWidth: '300px' }}>
          <Search size={16} className="text-dim" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Plaka veya marka ara..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', flex: 1 }} />
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon={<Truck size={48} />} title="Araç bulunamadı"
            description="Henüz araç kaydı yok veya arama eşleşmedi."
            action={<button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={18} /> Araç Ekle</button>} />
        ) : (
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Plaka / Marka</th>
                <th>Şoför</th>
                <th>Durum</th>
                <th>Bakım / Muayene</th>
                <th style={{ textAlign: 'right' }}>Toplam Maliyet</th>
                <th style={{ textAlign: 'right' }}>Yakıt (Lt)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => {
                const driver = personnel.find(p => p.id === v.driverId);
                const totalCost = getVehicleTotalCost(v.id);
                const fuelTotal = getVehicleFuelConsumption(v.id);
                const inspAlert = v.nextInspection && v.nextInspection <= today_;
                const maintAlert = v.nextMaintenance && v.nextMaintenance <= in7Days;
                const insAlert = v.insuranceExpiry && v.insuranceExpiry <= new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0];

                return (
                  <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedVehicle(v)}>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <div>
                        <p style={{ fontWeight: '700', fontSize: '1rem' }}>{v.plate}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.brand} {v.model} · {v.year}</p>
                      </div>
                    </td>
                    <td>{driver?.name || '—'}</td>
                    <td>
                      <span className={`badge ${v.status === 'Seferde' ? 'badge-primary' : 'badge-success'}`}
                        style={{ color: v.status === 'Seferde' ? 'var(--primary)' : 'var(--success)' }}>
                        {v.status}
                      </span>
                    </td>
                    <td>
                      <div>
                        <div style={{ width: '100px', height: '5px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', marginBottom: '0.3rem' }}>
                          <div style={{ width: `${v.health}%`, height: '100%', background: v.health < 50 ? 'var(--danger)' : v.health < 75 ? 'var(--warning)' : 'var(--success)' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {inspAlert && <span style={{ fontSize: '0.65rem', color: 'var(--danger)', fontWeight: '700' }}>⚠ Muayene Geçmiş</span>}
                          {!inspAlert && maintAlert && <span style={{ fontSize: '0.65rem', color: 'var(--warning)', fontWeight: '700' }}>⚠ Bakım Yakın</span>}
                          {insAlert && <span style={{ fontSize: '0.65rem', color: 'var(--warning)', fontWeight: '700' }}>⚠ Sigorta Bitiyor</span>}
                          {!inspAlert && !maintAlert && !insAlert && <span style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: '700' }}>✓ Sorun Yok</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700' }}>{formatCurrency(totalCost)}</td>
                    <td style={{ textAlign: 'right' }}>{fuelTotal.toLocaleString('tr-TR')} Lt</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={e => { e.stopPropagation(); setSelectedVehicle(v); }}><MoreVertical size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <NewVehicleModal personnel={personnel}
          onClose={() => setShowAddModal(false)}
          onSave={(data) => {
            addVehicle(data);
            toast.success(`Araç eklendi: ${data.plate}`);
            setShowAddModal(false);
          }}
        />
      )}

      {selectedVehicle && (
        <VehicleDetailDrawer
          vehicle={selectedVehicle}
          personnel={personnel}
          totalCost={getVehicleTotalCost(selectedVehicle.id)}
          fuelEntries={fuelEntries.filter(f => f.vehicleId === selectedVehicle.id)}
          tireEntries={tireEntries.filter(t => t.vehicleId === selectedVehicle.id)}
          invoiceCosts={invoices.filter(i => i.vehicleId === selectedVehicle.id)}
          onClose={() => setSelectedVehicle(null)}
          onUpdate={(data) => { updateVehicle(selectedVehicle.id, data); toast.success('Araç güncellendi.'); setSelectedVehicle(null); }}
        />
      )}
    </div>
  );
};

// ─── Araç Detay Drawer ────────────────────────────────────────────────────────
const VehicleDetailDrawer = ({ vehicle, personnel, totalCost, fuelEntries, tireEntries, invoiceCosts, onClose, onUpdate }) => {
  const driver = personnel.find(p => p.id === vehicle.driverId);
  const [statusEdit, setStatusEdit] = useState(vehicle.status);

  const fuelCost = fuelEntries.reduce((s, f) => s + f.total, 0);
  const tireCost = tireEntries.reduce((s, t) => s + t.total, 0);
  const invCost = invoiceCosts.reduce((s, i) => s + i.total, 0);

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '460px', height: '100%', borderRadius: '0', padding: '2.5rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem' }}>{vehicle.plate}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div style={{ padding: '1.25rem', background: 'var(--bg-main)', borderRadius: '15px', marginBottom: '1.5rem' }}>
          <p style={{ fontWeight: '800', fontSize: '1.1rem' }}>{vehicle.brand} {vehicle.model}</p>
          <p className="text-dim" style={{ fontSize: '0.85rem' }}>Model Yılı: {vehicle.year} · Şasi: {vehicle.vin}</p>
          <p className="text-dim" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Şoför: {driver?.name || '—'} · Tip: {vehicle.type}</p>
        </div>

        {/* Bakım sağlık çubuğu */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>Araç Sağlığı</span>
            <span style={{ fontWeight: '800', color: vehicle.health < 50 ? 'var(--danger)' : vehicle.health < 75 ? 'var(--warning)' : 'var(--success)' }}>{vehicle.health}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${vehicle.health}%`, height: '100%', background: vehicle.health < 50 ? 'var(--danger)' : vehicle.health < 75 ? 'var(--warning)' : 'var(--success)', borderRadius: '10px', transition: 'width 0.5s' }} />
          </div>
        </div>

        {/* Kritik tarihler */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <DateRow label="Sonraki Bakım" date={vehicle.nextMaintenance} warnDays={7} />
          <DateRow label="Muayene Tarihi" date={vehicle.nextInspection} warnDays={7} />
          <DateRow label="Sigorta Bitişi" date={vehicle.insuranceExpiry} warnDays={30} />
        </div>

        {/* Maliyet dağılımı */}
        <h4 style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: '700' }}>MALİYET DAĞILIMI</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <CostRow label="Akaryakıt" amount={fuelCost} total={totalCost} color="var(--primary)" />
          <CostRow label="Lastik" amount={tireCost} total={totalCost} color="var(--warning)" />
          <CostRow label="Bakım / Fatura" amount={invCost} total={totalCost} color="var(--danger)" />
          <div style={{ borderTop: '2px solid var(--border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
            <span>Toplam Maliyet</span>
            <span style={{ color: 'var(--primary)' }}>{formatCurrency(totalCost)}</span>
          </div>
        </div>

        {/* Durum güncelle */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {['Seferde', 'Garajda', 'Bakımda'].map(s => (
            <button key={s} onClick={() => { setStatusEdit(s); onUpdate({ status: s }); }}
              style={{ flex: 1, padding: '0.75rem', border: vehicle.status === s ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: '10px', background: vehicle.status === s ? 'var(--primary-light)' : 'white', color: vehicle.status === s ? 'var(--primary)' : 'var(--text-dim)', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const DateRow = ({ label, date, warnDays }) => {
  const today_ = today();
  const warnDate = new Date(Date.now() + warnDays * 864e5).toISOString().split('T')[0];
  const isExpired = date && date < today_;
  const isWarning = date && !isExpired && date <= warnDate;
  const color = isExpired ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-main)', borderRadius: '10px' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: '700', color }}>
        {isExpired && '⚠ '}{date ? formatDate(date) : '—'}
      </span>
    </div>
  );
};

const CostRow = ({ label, amount, total, color }) => {
  const pct = total > 0 ? (amount / total * 100).toFixed(0) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '0.85rem' }}>{label}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{formatCurrency(amount)} <span className="text-dim">(%{pct})</span></span>
      </div>
      <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px' }} />
      </div>
    </div>
  );
};

// ─── Yeni Araç Modal ──────────────────────────────────────────────────────────
const NewVehicleModal = ({ personnel, onClose, onSave }) => {
  const [form, setForm] = useState({
    plate: '', brand: '', model: '', year: new Date().getFullYear().toString(),
    vin: '', driverId: personnel[0]?.id || '', type: 'Çekici',
    nextMaintenance: '', nextInspection: '', insuranceExpiry: '', health: 100, status: 'Garajda'
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.plate.trim()) e.plate = 'Plaka girin';
    if (!form.brand.trim()) e.brand = 'Marka girin';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div style={overlayStyle}>
      <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><Truck size={20} /></div>
            <h2 style={{ fontSize: '1.25rem' }}>Yeni Araç Tanımla</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
            <FormField label="Plaka *" error={errors.plate}>
              <input className={`input ${errors.plate ? 'input-error' : ''}`} value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value.toUpperCase() }))} placeholder="34 LUV 001" style={{ width: '100%' }} />
            </FormField>
            <FormField label="Marka *" error={errors.brand}>
              <input className={`input ${errors.brand ? 'input-error' : ''}`} value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Mercedes, Ford..." style={{ width: '100%' }} />
            </FormField>
            <FormField label="Model">
              <input className="input" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="Actros, Cargo..." style={{ width: '100%' }} />
            </FormField>
            <FormField label="Model Yılı">
              <input className="input" type="number" min="2000" max="2030" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} style={{ width: '100%' }} />
            </FormField>
            <FormField label="Şasi No (VIN)">
              <input className="input" value={form.vin} onChange={e => setForm(f => ({ ...f, vin: e.target.value }))} placeholder="VIN..." style={{ width: '100%' }} />
            </FormField>
            <FormField label="Araç Tipi">
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%' }}>
                <option>Çekici</option><option>Dorse</option><option>Kamyon</option><option>Binek</option><option>Minibüs</option>
              </select>
            </FormField>
            <FormField label="Şoför">
              <select className="input" value={form.driverId} onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))} style={{ width: '100%' }}>
                <option value="">— Atanmadı —</option>
                {personnel.filter(p => p.position === 'Şoför').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </FormField>
          </div>

          <h4 style={{ fontWeight: '700', color: 'var(--text-dim)', fontSize: '0.85rem' }}>KRİTİK TARİHLER</h4>
          <div className="grid grid-cols-3" style={{ gap: '1.25rem' }}>
            <FormField label="Sonraki Bakım">
              <input className="input" type="date" value={form.nextMaintenance} onChange={e => setForm(f => ({ ...f, nextMaintenance: e.target.value }))} style={{ width: '100%' }} />
            </FormField>
            <FormField label="Muayene Tarihi">
              <input className="input" type="date" value={form.nextInspection} onChange={e => setForm(f => ({ ...f, nextInspection: e.target.value }))} style={{ width: '100%' }} />
            </FormField>
            <FormField label="Sigorta Bitişi">
              <input className="input" type="date" value={form.insuranceExpiry} onChange={e => setForm(f => ({ ...f, insuranceExpiry: e.target.value }))} style={{ width: '100%' }} />
            </FormField>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>İptal</button>
          <button className="btn btn-primary" onClick={() => { if (!validate()) return; onSave(form); }}>Aracı Kaydet</button>
        </div>
      </div>
    </div>
  );
};

const VStatCard = ({ title, value, sub, icon, color }) => (
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

export default Vehicles;
