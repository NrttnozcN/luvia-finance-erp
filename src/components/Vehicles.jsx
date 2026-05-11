import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  X,
  Gauge,
  Calendar,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Vehicles = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [newVehicle, setNewVehicle] = useState({
    plate: '',
    model: '',
    model_year: '',
    vin_no: '',
    driver_name: '',
    vehicle_type: 'Çekici',
    current_km: 0
  });

  // VERİLERİ SQL'DEN ÇEK
  const fetchVehicles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Hata:', error);
    } else {
      setVehicles(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // YENİ ARAÇ KAYDET
  const handleSave = async () => {
    const { error } = await supabase
      .from('vehicles')
      .insert([newVehicle]);

    if (error) {
      alert('Kayıt sırasında bir hata oluştu: ' + error.message);
    } else {
      setShowAddModal(false);
      fetchVehicles(); // Listeyi yenile
      setNewVehicle({ plate: '', model: '', model_year: '', vin_no: '', driver_name: '', vehicle_type: 'Çekici', current_km: 0 });
    }
  };

  return (
    <div className="vehicles-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Filo & Araç Yönetimi</h1>
          <p className="text-muted">Filonuzdaki araçların bakım, muayene ve operasyonel durumlarını izleyin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Araç Tanımla
        </button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <VehicleStat title="Toplam Araç" value={vehicles.length} sub="Aktif Filo" icon={<Truck size={20} />} color="var(--primary)" />
        <VehicleStat title="Bakımı Yaklaşan" value="3" sub="Gelecek 7 Gün" icon={<AlertCircle size={20} />} color="var(--warning)" />
        <VehicleStat title="Muayene / Sigorta" value="2" sub="Kritik" icon={<ShieldCheck size={20} />} color="var(--danger)" />
        <VehicleStat title="Seferde" value="14" sub="Anlık" icon={<CheckCircle2 size={20} />} color="var(--success)" />
      </div>

      <div className="card" style={{ padding: '0' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.25rem' }}>Plaka</th>
              <th>Marka / Model</th>
              <th>Sürücü</th>
              <th>Kilometre</th>
              <th>Durum</th>
              <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</td></tr>
            ) : vehicles.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Henüz araç tanımlanmamış.</td></tr>
            ) : (
              vehicles.map(v => (
                <tr key={v.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ background: 'var(--bg-main)', padding: '0.5rem', borderRadius: '8px' }}><Truck size={18} color="var(--primary)" /></div>
                      <span style={{ fontWeight: '700' }}>{v.plate}</span>
                    </div>
                  </td>
                  <td>
                    <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{v.model}</p>
                    <p className="text-muted" style={{ fontSize: '0.75rem' }}>{v.model_year} | {v.vehicle_type}</p>
                  </td>
                  <td className="text-dim" style={{ fontSize: '0.9rem' }}>{v.driver_name || 'Atanmamış'}</td>
                  <td style={{ fontWeight: '700' }}>{v.current_km.toLocaleString()} km</td>
                  <td><span className="badge badge-success">{v.status}</span></td>
                  <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                    <button className="btn btn-ghost"><MoreVertical size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* NEW VEHICLE MODAL */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><Truck size={20} /></div>
                <h2 style={{ fontSize: '1.25rem' }}>Yeni Araç Tanımla</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <InputGroup 
                label="Plaka" 
                placeholder="34 LUV ..." 
                value={newVehicle.plate}
                onChange={(e) => setNewVehicle({...newVehicle, plate: e.target.value.toUpperCase()})}
              />
              <InputGroup 
                label="Marka / Model" 
                placeholder="Örn: Mercedes Actros" 
                value={newVehicle.model}
                onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})}
              />
              <InputGroup 
                label="Model Yılı" 
                placeholder="2023" 
                value={newVehicle.model_year}
                onChange={(e) => setNewVehicle({...newVehicle, model_year: e.target.value})}
              />
              <InputGroup 
                label="Şasi No" 
                placeholder="VIN..." 
                value={newVehicle.vin_no}
                onChange={(e) => setNewVehicle({...newVehicle, vin_no: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <InputGroup 
                label="Şoför Seçin" 
                placeholder="Ad Soyad"
                value={newVehicle.driver_name}
                onChange={(e) => setNewVehicle({...newVehicle, driver_name: e.target.value})}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>Araç Tipi</label>
                <select 
                  className="input" 
                  value={newVehicle.vehicle_type}
                  onChange={(e) => setNewVehicle({...newVehicle, vehicle_type: e.target.value})}
                >
                  <option>Çekici</option>
                  <option>Dorse</option>
                  <option>Kamyonet</option>
                  <option>Binek</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Aracı Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VehicleStat = ({ title, value, sub, icon, color }) => (
  <div className="card">
    <div style={{ color: color, marginBottom: '0.75rem' }}>{icon}</div>
    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{value}</h3>
    <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>{title}</p>
    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{sub}</p>
  </div>
);

const InputGroup = ({ label, placeholder, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>{label}</label>
    <input 
      className="input" 
      placeholder={placeholder} 
      value={value}
      onChange={onChange}
    />
  </div>
);

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modalContentStyle = { width: '100%', maxWidth: '650px', padding: '2rem' };

export default Vehicles;
