import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Building2, Plus, MapPin, Warehouse, MoreVertical, ChevronRight, X, Package, Users } from 'lucide-react';
import useStore from '../store/useStore';
import { FormField, EmptyState } from './Invoices';

const Facilities = () => {
  const facilities = useStore(s => s.facilities);
  const stockItems = useStore(s => s.stockItems);
  const personnel = useStore(s => s.personnel);
  const addFacility = useStore(s => s.addFacility);
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Tesis & Lokasyon Yönetimi</h1>
          <p className="text-muted">Şirketinize bağlı tüm depo, şube ve tesislerin operasyonel durumunu izleyin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Tesis Ekle
        </button>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <FacStatCard title="Toplam Tesis" value={facilities.length} sub="Lokasyon" icon={<Building2 size={20} />} color="var(--primary)" />
        <FacStatCard title="Aktif Tesis" value={facilities.filter(f => f.status === 'Aktif').length} sub="Çalışıyor" icon={<Warehouse size={20} />} color="var(--success)" />
        <FacStatCard title="Toplam Stok Kalemi" value={stockItems.length} sub="Tüm Tesisler" icon={<Package size={20} />} color="var(--warning)" />
        <FacStatCard title="Toplam Personel" value={personnel.length} sub="Aktif Çalışan" icon={<Users size={20} />} color="var(--text-dim)" />
      </div>

      {facilities.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Building2 size={48} />} title="Tesis tanımlanmamış" description="Henüz tesis eklenmemiş."
            action={<button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={18} /> Tesis Ekle</button>} />
        </div>
      ) : (
        <div className="grid grid-cols-3" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
          {facilities.map(f => {
            const facilityStock = stockItems.filter(s => s.facility === f.name).length;
            const facilityPersonnel = personnel.filter(p => p.facility === f.name).length;
            return (
              <div key={f.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '12px' }}>
                    <Building2 size={24} />
                  </div>
                  <span className={`badge ${f.status === 'Aktif' ? 'badge-success' : 'badge-danger'}`}>{f.status}</span>
                </div>

                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{f.name}</h3>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>{f.type}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
                  {f.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <MapPin size={13} className="text-dim" /> <span>{f.address}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                    <span><Package size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />{facilityStock} Stok Kalemi</span>
                    <span><Users size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />{facilityPersonnel} Personel</span>
                  </div>
                </div>

                <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--bg-main)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>Detay <ChevronRight size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <NewFacilityModal
          onClose={() => setShowAddModal(false)}
          onSave={(data) => {
            addFacility(data);
            toast.success(`Tesis eklendi: ${data.name}`);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
};

const NewFacilityModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ name: '', type: 'Depo', address: '', city: '', phone: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name) e.name = 'Tesis adı girin';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div style={overlayStyle}>
      <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><Building2 size={20} /></div>
            <h2 style={{ fontSize: '1.25rem' }}>Yeni Tesis Tanımla</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <FormField label="Tesis Adı *" error={errors.name}>
            <input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn: Bursa Lojistik Merkezi" style={{ width: '100%' }} />
          </FormField>
          <FormField label="Tesis Türü">
            <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%' }}>
              <option>Depo</option><option>Şube</option><option>Ofis</option><option>İstasyon</option><option>Genel Merkez / Depo</option><option>Lojistik Merkezi</option>
            </select>
          </FormField>
          <FormField label="Adres">
            <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Tesis adresi..." style={{ width: '100%' }} />
          </FormField>
          <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
            <FormField label="Şehir">
              <input className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="İstanbul" style={{ width: '100%' }} />
            </FormField>
            <FormField label="Telefon">
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+90 ..." style={{ width: '100%' }} />
            </FormField>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>İptal</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => {
              if (!validate()) return;
              onSave(form);
            }}>Tesisi Kaydet</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FacStatCard = ({ title, value, sub, icon, color }) => (
  <div className="card">
    <div style={{ color, marginBottom: '0.75rem' }}>{icon}</div>
    <h3 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{value}</h3>
    <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>{title}</p>
    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{sub}</p>
  </div>
);

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };

export default Facilities;
