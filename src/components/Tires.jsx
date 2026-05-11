import React, { useState, useEffect } from 'react';
import { 
  Disc, 
  Plus, 
  Search, 
  Settings as SettingsIcon, 
  Truck, 
  Calendar, 
  History, 
  Wrench, 
  ChevronRight, 
  MoreVertical,
  AlertTriangle,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Tires = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tireMovements, setTireMovements] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [newMovement, setNewMovement] = useState({
    vehicle_id: '',
    position: 'Ön Sağ',
    brand_model: '',
    km_reading: 0,
    action_type: 'Yeni Kayıt'
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: moves } = await supabase.from('tire_movements').select('*, vehicles(plate)').order('created_at', { ascending: false });
    const { data: vehs } = await supabase.from('vehicles').select('*');
    setTireMovements(moves || []);
    setVehicles(vehs || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    const { error } = await supabase
      .from('tire_movements')
      .insert([newMovement]);

    if (error) alert(error.message);
    else {
      setShowAddModal(false);
      fetchData();
      setNewMovement({ vehicle_id: '', position: 'Ön Sağ', brand_model: '', km_reading: 0, action_type: 'Yeni Kayıt' });
    }
  };

  return (
    <div className="tires-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Lastik İşlemleri</h1>
          <p className="text-muted">Araçlarınızın lastik ömürlerini, değişimlerini ve stok durumunu izleyin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Lastik Stok Girişi / Değişimi
        </button>
      </header>

      {/* Tire Stats */}
      <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <div style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}><Disc size={20} /></div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{tireMovements.length} Kayıt</h3>
          <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>Toplam Hareket</p>
        </div>
        <div className="card">
          <div style={{ color: 'var(--success)', marginBottom: '0.75rem' }}><Truck size={20} /></div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{vehicles.length} Araç</h3>
          <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>Takip Edilen Filo</p>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <h3 style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>Son Değişim & Bakım Hareketleri</h3>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.25rem' }}>Tarih</th>
              <th>Plaka</th>
              <th>Pozisyon</th>
              <th>Marka / Model</th>
              <th style={{ textAlign: 'right' }}>Kilometre</th>
              <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</td></tr>
            ) : tireMovements.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Henüz lastik hareketi bulunmuyor.</td></tr>
            ) : (
              tireMovements.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <span style={{ fontWeight: '700' }}>{new Date(m.created_at).toLocaleDateString('tr-TR')}</span>
                  </td>
                  <td style={{ fontWeight: '700' }}>{m.vehicles?.plate || 'Stok'}</td>
                  <td style={{ fontSize: '0.85rem' }}>{m.position}</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{m.brand_model}</td>
                  <td style={{ textAlign: 'right', fontWeight: '800' }}>{m.km_reading?.toLocaleString()} km</td>
                  <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                    <button className="btn btn-ghost"><MoreVertical size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* NEW TIRE MODAL */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><Disc size={20} /></div>
                <h2 style={{ fontSize: '1.25rem' }}>Yeni Lastik Kaydı / Değişimi</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">İlgili Araç</label>
                <select className="input" value={newMovement.vehicle_id} onChange={(e) => setNewMovement({...newMovement, vehicle_id: e.target.value})}>
                  <option value="">Stok Girişi (Araçsız)</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">İşlem Türü</label>
                <select className="input" value={newMovement.action_type} onChange={(e) => setNewMovement({...newMovement, action_type: e.target.value})}>
                  <option>Yeni Kayıt</option>
                  <option>Değişim</option>
                  <option>Kaplama</option>
                  <option>Tamir</option>
                </select>
              </div>
              <InputGroup label="Marka / Model" placeholder="Örn: Bridgestone R150" value={newMovement.brand_model} onChange={(e) => setNewMovement({...newMovement, brand_model: e.target.value})} />
              <InputGroup label="Km Okuma" type="number" value={newMovement.km_reading} onChange={(e) => setNewMovement({...newMovement, km_reading: e.target.value})} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Pozisyon</label>
                <select className="input" value={newMovement.position} onChange={(e) => setNewMovement({...newMovement, position: e.target.value})}>
                  <option>Ön Sağ</option>
                  <option>Ön Sol</option>
                  <option>Arka Sağ İç</option>
                  <option>Arka Sağ Dış</option>
                  <option>Arka Sol İç</option>
                  <option>Arka Sol Dış</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Kaydı Tamamla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InputGroup = ({ label, placeholder, type, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label className="label-sm">{label}</label>
    <input type={type || 'text'} className="input" placeholder={placeholder} value={value} onChange={onChange} />
  </div>
);

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modalContentStyle = { width: '100%', maxWidth: '650px', padding: '2rem' };

export default Tires;
