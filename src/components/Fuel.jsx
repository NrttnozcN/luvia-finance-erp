import React, { useState, useEffect } from 'react';
import { 
  Fuel as FuelIcon, 
  Plus, 
  Search, 
  TrendingUp, 
  Truck, 
  Calendar, 
  MapPin, 
  MoreVertical, 
  ChevronRight,
  X,
  Gauge,
  Droplets
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Fuel = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [newLog, setNewLog] = useState({
    vehicle_id: '',
    litres: 0,
    total_amount: 0,
    km_reading: 0,
    station_name: 'Opet'
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: logs } = await supabase.from('fuel_logs').select('*, vehicles(plate)').order('created_at', { ascending: false });
    const { data: vehs } = await supabase.from('vehicles').select('*');
    setFuelLogs(logs || []);
    setVehicles(vehs || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    const { error } = await supabase
      .from('fuel_logs')
      .insert([newLog]);

    if (error) alert(error.message);
    else {
      setShowAddModal(false);
      fetchData();
      setNewLog({ vehicle_id: '', litres: 0, total_amount: 0, km_reading: 0, station_name: 'Opet' });
    }
  };

  return (
    <div className="fuel-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Akaryakıt Yönetimi</h1>
          <p className="text-muted">Araçlarınızın yakıt tüketimini, maliyetlerini ve verimliliğini izleyin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Akaryakıt Fişi
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <p className="text-muted">Toplam Tüketim</p>
          <h2 style={{ fontSize: '1.75rem' }}>{fuelLogs.reduce((acc, l) => acc + Number(l.litres), 0).toLocaleString()} Lt</h2>
        </div>
        <div className="card">
          <p className="text-muted">Toplam Maliyet</p>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--danger)' }}>₺{fuelLogs.reduce((acc, l) => acc + Number(l.total_amount), 0).toLocaleString()}</h2>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.25rem' }}>Plaka / Tarih</th>
              <th>Miktar (Lt)</th>
              <th>Tutar</th>
              <th>Km Okuma</th>
              <th>İstasyon</th>
              <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</td></tr>
            ) : fuelLogs.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Henüz yakıt kaydı bulunmuyor.</td></tr>
            ) : (
              fuelLogs.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <p style={{ fontWeight: '700' }}>{l.vehicles?.plate}</p>
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>{new Date(l.created_at).toLocaleDateString('tr-TR')}</p>
                  </td>
                  <td style={{ fontWeight: '700' }}>{l.litres} Lt</td>
                  <td style={{ fontWeight: '800', color: 'var(--primary)' }}>₺{l.total_amount.toLocaleString()}</td>
                  <td className="text-dim">{l.km_reading?.toLocaleString()} km</td>
                  <td style={{ fontSize: '0.9rem' }}>{l.station_name}</td>
                  <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                    <button className="btn btn-ghost"><MoreVertical size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* NEW FUEL MODAL */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><FuelIcon size={20} /></div>
                <h2 style={{ fontSize: '1.25rem' }}>Yeni Akaryakıt Fişi Ekle</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Araç Seçin</label>
                <select className="input" value={newLog.vehicle_id} onChange={(e) => setNewLog({...newLog, vehicle_id: e.target.value})}>
                  <option value="">Plaka Seçiniz...</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                </select>
              </div>
              <InputGroup label="İstasyon" placeholder="Opet, Shell vb." value={newLog.station_name} onChange={(e) => setNewLog({...newLog, station_name: e.target.value})} />
              <InputGroup label="Miktar (Litre)" type="number" value={newLog.litres} onChange={(e) => setNewLog({...newLog, litres: e.target.value})} />
              <InputGroup label="Toplam Tutar (₺)" type="number" value={newLog.total_amount} onChange={(e) => setNewLog({...newLog, total_amount: e.target.value})} />
              <InputGroup label="Km Okuma" type="number" value={newLog.km_reading} onChange={(e) => setNewLog({...newLog, km_reading: e.target.value})} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Fişi Kaydet</button>
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

export default Fuel;
