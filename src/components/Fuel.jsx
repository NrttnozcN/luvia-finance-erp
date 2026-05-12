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
import useAuthStore from '../store/authStore';

const Fuel = () => {
  const currentUser = useAuthStore(s => s.currentUser);
  const cid = currentUser?.company_id;
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [newLog, setNewLog] = useState({
    vehicle_id: '',
    litres: 0,
    total_amount: 0,
    km_reading: 0,
    station_name: 'Opet'
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: logs } = await supabase.from('fuel_logs').select('*, vehicles(plate)').eq('company_id', cid).order('created_at', { ascending: false });
    const { data: vehs } = await supabase.from('vehicles').select('*').eq('company_id', cid);
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
      .insert([{ ...newLog, company_id: cid }]);

    if (error) alert(error.message);
    else {
      setShowAddModal(false);
      fetchData();
      setNewLog({ vehicle_id: '', litres: 0, total_amount: 0, km_reading: 0, station_name: 'Opet' });
    }
  };

  const handleUpdate = async () => {
    const { id, vehicles: _v, ...fields } = editRecord;
    const { error } = await supabase.from('fuel_logs').update(fields).eq('id', id);
    if (error) { alert('Güncelleme hatası: ' + error.message); return; }
    setEditRecord(null);
    fetchData();
  };

  const handleDelete = async (id, record) => {
    if (!window.confirm(`"${record.station_name || id}" silinecek. Emin misin?`)) return;
    const { error } = await supabase.from('fuel_logs').delete().eq('id', id);
    if (error) { alert('Silme hatası: ' + error.message); return; }
    fetchData();
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
                  <td style={{ textAlign: 'right', paddingRight: '1.25rem', position: 'relative' }}>
                    <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === l.id ? null : l.id); }}>
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === l.id && (
                      <div style={{ position: 'absolute', right: '1rem', top: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '140px', overflow: 'hidden' }}
                        onMouseLeave={() => setOpenMenuId(null)}>
                        <button onClick={() => { setEditRecord({ ...l }); setOpenMenuId(null); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          ✏️ Düzenle
                        </button>
                        <button onClick={() => { setOpenMenuId(null); handleDelete(l.id, l); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: 'var(--danger)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          🗑️ Sil
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* EDIT FUEL MODAL */}
      {editRecord && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><FuelIcon size={20} /></div>
                <h2 style={{ fontSize: '1.25rem' }}>Yakıt Fişini Düzenle</h2>
              </div>
              <button onClick={() => setEditRecord(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Araç Seçin</label>
                <select className="input" value={editRecord.vehicle_id || ''} onChange={(e) => setEditRecord({...editRecord, vehicle_id: e.target.value})}>
                  <option value="">Plaka Seçiniz...</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                </select>
              </div>
              <InputGroup label="İstasyon" placeholder="Opet, Shell vb." value={editRecord.station_name || ''} onChange={(e) => setEditRecord({...editRecord, station_name: e.target.value})} />
              <InputGroup label="Miktar (Litre)" type="number" value={editRecord.litres} onChange={(e) => setEditRecord({...editRecord, litres: e.target.value})} />
              <InputGroup label="Toplam Tutar (₺)" type="number" value={editRecord.total_amount} onChange={(e) => setEditRecord({...editRecord, total_amount: e.target.value})} />
              <InputGroup label="Km Okuma" type="number" value={editRecord.km_reading} onChange={(e) => setEditRecord({...editRecord, km_reading: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setEditRecord(null)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleUpdate}>Güncelle</button>
            </div>
          </div>
        </div>
      )}

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
