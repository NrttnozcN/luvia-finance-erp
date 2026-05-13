import { useState, useEffect } from 'react';
import { Building2, Plus, MapPin, Warehouse, ChevronRight, X, Package, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

const Facilities = () => {
  const currentUser = useAuthStore(s => s.currentUser);
  const cid = currentUser?.company_id;
  const [facilities, setFacilities] = useState([]);
  const [stockCount, setStockCount] = useState(0);
  const [personnelCount, setPersonnelCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [
      { data: facs },
      { count: stk },
      { count: pers },
    ] = await Promise.all([
      supabase.from('facilities').select('*').eq('company_id', cid).order('created_at', { ascending: false }),
      supabase.from('materials').select('*', { count: 'exact', head: true }).eq('company_id', cid),
      supabase.from('personnel').select('*', { count: 'exact', head: true }).eq('company_id', cid),
    ]);
    setFacilities(facs || []);
    setStockCount(stk || 0);
    setPersonnelCount(pers || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveFacility = async (form) => {
    const { error } = await supabase.from('facilities').insert([{ ...form, status: 'Aktif', company_id: cid }]);
    if (error) alert(error.message);
    else {
      setShowAddModal(false);
      fetchData();
    }
  };

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
        <FacStatCard title="Toplam Stok Kalemi" value={stockCount} sub="Tüm Tesisler" icon={<Package size={20} />} color="var(--warning)" />
        <FacStatCard title="Toplam Personel" value={personnelCount} sub="Aktif Çalışan" icon={<Users size={20} />} color="var(--text-dim)" />
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</div>
      ) : facilities.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <Building2 size={48} style={{ color: 'var(--text-dim)', margin: '0 auto 1rem', display: 'block' }} />
          <p style={{ fontWeight: '700', marginBottom: '0.5rem' }}>Tesis tanımlanmamış</p>
          <p className="text-dim" style={{ marginBottom: '1.5rem' }}>Henüz tesis eklenmemiş.</p>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={18} /> Tesis Ekle</button>
        </div>
      ) : (
        <div className="grid grid-cols-3" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
          {facilities.map(f => (
            <div key={f.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '12px' }}>
                  <Building2 size={24} />
                </div>
                <span className={`badge ${f.status === 'Aktif' ? 'badge-success' : 'badge-danger'}`}>{f.status}</span>
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{f.name}</h3>
              <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>{f.type}</p>
              {f.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  <MapPin size={13} className="text-dim" /> <span>{f.address}</span>
                </div>
              )}
              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--bg-main)', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>Detay <ChevronRight size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <NewFacilityModal onClose={() => setShowAddModal(false)} onSave={handleSaveFacility} />
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="label-sm">Tesis Adı *</label>
            <input
              className={`input ${errors.name ? 'input-error' : ''}`}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Örn: Bursa Lojistik Merkezi"
            />
            {errors.name && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.name}</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="label-sm">Tesis Türü</label>
            <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option>Depo</option>
              <option>Şube</option>
              <option>Ofis</option>
              <option>İstasyon</option>
              <option>Genel Merkez</option>
              <option>Lojistik Merkezi</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="label-sm">Adres</label>
            <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Tesis adresi..." />
          </div>
          <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="label-sm">Şehir</label>
              <input className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="İstanbul" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="label-sm">Telefon</label>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+90 ..." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>İptal</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => { if (!validate()) return; onSave(form); }}>
              Tesisi Kaydet
            </button>
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
