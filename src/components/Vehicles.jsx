import { useState, useEffect } from 'react';
import {
  Truck, Plus, MoreVertical, CheckCircle2,
  ArrowLeft, Trash2, X, Gauge, Building2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '—';
const today = () => new Date().toISOString().split('T')[0];

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
};

const EMPTY_VEHICLE = {
  plate: '', brand: '', model: '', model_year: '', vin_no: '',
  driver_name: '', vehicle_type: 'Çekici', current_km: 0,
  fuel_type: 'Dizel', avg_fuel_consumption: '', ownership: 'Şirkete Ait',
  condition: 'İkinci El', facility_id: '',
};

const validateVehicle = (v) => {
  const e = {};
  if (!v.plate?.trim()) e.plate = true;
  if (!v.brand?.trim()) e.brand = true;
  if (!v.model?.trim()) e.model = true;
  return e;
};

const Vehicles = () => {
  const currentUser = useAuthStore(s => s.currentUser);
  const cid = currentUser?.company_id;

  const [view, setView] = useState('list');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [activeTab, setActiveTab] = useState('inspections');

  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [editErr, setEditErr] = useState({});
  const [filterFacility, setFilterFacility] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ ...EMPTY_VEHICLE });
  const [addErr, setAddErr] = useState({});

  const [inspections, setInspections] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [insurances, setInsurances] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showInspModal, setShowInspModal] = useState(false);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [showInsurModal, setShowInsurModal] = useState(false);
  const [newInsp, setNewInsp] = useState({ inspection_date: today(), expiry_date: '', type: 'Muayene', result: 'Geçti', cost: 0, notes: '' });
  const [newMaint, setNewMaint] = useState({ maintenance_date: today(), maintenance_type: 'Periyodik Bakım', km_at_maintenance: 0, next_maintenance_km: '', cost: 0, workshop: '', notes: '' });
  const [newInsur, setNewInsur] = useState({ insurance_type: 'Kasko', company: '', policy_no: '', start_date: today(), expiry_date: '', cost: 0, notes: '' });

  const filteredVehicles = vehicles.filter(v =>
    (!filterFacility || v.facility_id === filterFacility) &&
    (!filterType || v.vehicle_type === filterType) &&
    (!filterBrand || v.brand === filterBrand) &&
    (!filterModel || (v.model || '').toLowerCase().includes(filterModel.toLowerCase()))
  );

  const exportCSV = () => {
    const headers = ['Plaka', 'Marka', 'Model', 'Yıl', 'Araç Tipi', 'Yakıt', 'Tesis', 'Sürücü', 'Kilometre', 'Sahiplik', 'Durum'];
    const rows = filteredVehicles.map(v => [
      v.plate, v.brand, v.model, v.model_year || '', v.vehicle_type || '', v.fuel_type || '',
      v.facilities?.name || '', v.driver_name || '', v.current_km || 0, v.ownership || '', v.condition || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arac-listesi-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchVehicles = async () => {
    setLoading(true);
    const [{ data: vData }, { data: fData }] = await Promise.all([
      supabase.from('vehicles').select('*, facilities(name)').eq('company_id', cid).order('created_at', { ascending: false }),
      supabase.from('facilities').select('id, name').eq('company_id', cid).order('name'),
    ]);
    setVehicles(vData || []);
    setFacilities(fData || []);
    setLoading(false);
  };

  const fetchDetail = async (vehicleId) => {
    setLoadingDetail(true);
    const [{ data: insps }, { data: maints }, { data: insurs }] = await Promise.all([
      supabase.from('vehicle_inspections').select('*').eq('vehicle_id', vehicleId).order('inspection_date', { ascending: false }),
      supabase.from('vehicle_maintenances').select('*').eq('vehicle_id', vehicleId).order('maintenance_date', { ascending: false }),
      supabase.from('vehicle_insurances').select('*').eq('vehicle_id', vehicleId).order('expiry_date', { ascending: true }),
    ]);
    setInspections(insps || []);
    setMaintenances(maints || []);
    setInsurances(insurs || []);
    setLoadingDetail(false);
  };

  useEffect(() => { fetchVehicles(); }, []);

  const openDetail = (v) => {
    setSelectedVehicle(v);
    setView('detail');
    setActiveTab('inspections');
    fetchDetail(v.id);
  };

  const handleSave = async () => {
    const errs = validateVehicle(newVehicle);
    if (Object.keys(errs).length > 0) { setAddErr(errs); return; }
    setAddErr({});
    const payload = { ...newVehicle, facility_id: newVehicle.facility_id || null, avg_fuel_consumption: newVehicle.avg_fuel_consumption !== '' ? Number(newVehicle.avg_fuel_consumption) : null, company_id: cid };
    const { error } = await supabase.from('vehicles').insert([payload]);
    if (error) { alert(error.message); return; }
    setShowAddModal(false);
    setNewVehicle({ ...EMPTY_VEHICLE });
    fetchVehicles();
  };

  const handleUpdate = async () => {
    const errs = validateVehicle(editRecord);
    if (Object.keys(errs).length > 0) { setEditErr(errs); return; }
    setEditErr({});
    const { id, facilities: _f, ...fields } = editRecord;
    const payload = { ...fields, facility_id: fields.facility_id || null, avg_fuel_consumption: fields.avg_fuel_consumption !== '' ? Number(fields.avg_fuel_consumption) : null };
    const { error } = await supabase.from('vehicles').update(payload).eq('id', id);
    if (error) { alert(error.message); return; }
    setEditRecord(null);
    fetchVehicles();
  };

  const handleDelete = async (id, record) => {
    if (!window.confirm(`"${record.plate}" silinecek. Emin misin?`)) return;
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    fetchVehicles();
  };

  const handleSaveInsp = async () => {
    const { error } = await supabase.from('vehicle_inspections').insert([{ ...newInsp, vehicle_id: selectedVehicle.id, cost: Number(newInsp.cost) }]);
    if (error) { alert(error.message); return; }
    setShowInspModal(false);
    setNewInsp({ inspection_date: today(), expiry_date: '', type: 'Muayene', result: 'Geçti', cost: 0, notes: '' });
    fetchDetail(selectedVehicle.id);
  };

  const handleSaveMaint = async () => {
    const { error } = await supabase.from('vehicle_maintenances').insert([{
      ...newMaint, vehicle_id: selectedVehicle.id,
      cost: Number(newMaint.cost),
      km_at_maintenance: Number(newMaint.km_at_maintenance),
      next_maintenance_km: newMaint.next_maintenance_km ? Number(newMaint.next_maintenance_km) : null,
    }]);
    if (error) { alert(error.message); return; }
    setShowMaintModal(false);
    setNewMaint({ maintenance_date: today(), maintenance_type: 'Periyodik Bakım', km_at_maintenance: 0, next_maintenance_km: '', cost: 0, workshop: '', notes: '' });
    fetchDetail(selectedVehicle.id);
  };

  const handleSaveInsur = async () => {
    if (!newInsur.expiry_date) { alert('Bitiş tarihi zorunludur.'); return; }
    const { error } = await supabase.from('vehicle_insurances').insert([{
      ...newInsur, vehicle_id: selectedVehicle.id, cost: Number(newInsur.cost),
      start_date: newInsur.start_date || null,
    }]);
    if (error) { alert(error.message); return; }
    setShowInsurModal(false);
    setNewInsur({ insurance_type: 'Kasko', company: '', policy_no: '', start_date: today(), expiry_date: '', cost: 0, notes: '' });
    fetchDetail(selectedVehicle.id);
  };

  const handleDeleteInsp = async (id) => {
    if (!window.confirm('Bu muayene kaydı silinecek.')) return;
    await supabase.from('vehicle_inspections').delete().eq('id', id);
    fetchDetail(selectedVehicle.id);
  };

  const handleDeleteMaint = async (id) => {
    if (!window.confirm('Bu bakım kaydı silinecek.')) return;
    await supabase.from('vehicle_maintenances').delete().eq('id', id);
    fetchDetail(selectedVehicle.id);
  };

  const handleDeleteInsur = async (id) => {
    if (!window.confirm('Bu sigorta kaydı silinecek.')) return;
    await supabase.from('vehicle_insurances').delete().eq('id', id);
    fetchDetail(selectedVehicle.id);
  };

  // ── DETAIL VIEW ──────────────────────────────────────────────
  if (view === 'detail' && selectedVehicle) {
    const nextInsp = inspections.find(i => i.expiry_date)?.expiry_date;
    const daysLeft = nextInsp ? daysUntil(nextInsp) : null;
    const nextInsurExpiry = insurances[0]?.expiry_date;
    const daysInsur = nextInsurExpiry ? daysUntil(nextInsurExpiry) : null;

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button className="btn btn-ghost" onClick={() => setView('list')}><ArrowLeft size={18} /> Geri</button>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800' }}>{selectedVehicle.plate}</h1>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              {selectedVehicle.brand} {selectedVehicle.model} · {selectedVehicle.model_year} · {selectedVehicle.vehicle_type}
            </p>
          </div>
        </div>

        {/* Araç özet kartları — 2 satır × 4 */}
        <div className="grid grid-cols-4" style={{ marginBottom: '1rem' }}>
          <div className="card">
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Tesis</p>
            <p style={{ fontWeight: '700', marginTop: '4px' }}>{selectedVehicle.facilities?.name || '—'}</p>
          </div>
          <div className="card">
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Sürücü</p>
            <p style={{ fontWeight: '700', marginTop: '4px' }}>{selectedVehicle.driver_name || '—'}</p>
          </div>
          <div className="card">
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Kilometre</p>
            <p style={{ fontWeight: '700', marginTop: '4px' }}>{fmt(selectedVehicle.current_km)} km</p>
          </div>
          <div className="card">
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Son Muayene Bitiş</p>
            <p style={{ fontWeight: '700', marginTop: '4px', color: daysLeft !== null && daysLeft < 30 ? 'var(--danger)' : 'inherit' }}>
              {nextInsp ? fmtDate(nextInsp) : '—'}
              {daysLeft !== null && <span style={{ fontSize: '0.75rem', marginLeft: '4px', color: daysLeft < 0 ? 'var(--danger)' : daysLeft < 30 ? 'var(--warning)' : 'var(--success)' }}>
                ({daysLeft < 0 ? `${Math.abs(daysLeft)} gün geçti` : `${daysLeft} gün kaldı`})
              </span>}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
          <div className="card">
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Yakıt Tipi</p>
            <p style={{ fontWeight: '700', marginTop: '4px' }}>{selectedVehicle.fuel_type || '—'}</p>
          </div>
          <div className="card">
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Araç Sahipliği</p>
            <p style={{ fontWeight: '700', marginTop: '4px' }}>{selectedVehicle.ownership || '—'}</p>
          </div>
          <div className="card">
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Ort. Yakıt Tüketimi</p>
            <p style={{ fontWeight: '700', marginTop: '4px' }}>{selectedVehicle.avg_fuel_consumption ? `${selectedVehicle.avg_fuel_consumption} L/100km` : '—'}</p>
          </div>
          <div className="card">
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Sigorta Bitiş</p>
            <p style={{ fontWeight: '700', marginTop: '4px', color: daysInsur !== null && daysInsur < 30 ? 'var(--danger)' : 'inherit' }}>
              {nextInsurExpiry ? fmtDate(nextInsurExpiry) : '—'}
              {daysInsur !== null && <span style={{ fontSize: '0.72rem', marginLeft: '4px', color: daysInsur < 0 ? 'var(--danger)' : daysInsur < 30 ? 'var(--warning)' : 'var(--success)' }}>
                ({daysInsur < 0 ? `${Math.abs(daysInsur)} gün geçti` : `${daysInsur} gün kaldı`})
              </span>}
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[
            { key: 'inspections', label: '🔍 Muayene Kayıtları', count: inspections.length },
            { key: 'maintenances', label: '🔧 Bakım Kayıtları', count: maintenances.length },
            { key: 'insurances', label: '🛡️ Sigorta Kayıtları', count: insurances.length },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', border: '1.5px solid', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                background: activeTab === tab.key ? 'var(--primary)' : 'white',
                color: activeTab === tab.key ? 'white' : 'var(--text-muted)',
                borderColor: activeTab === tab.key ? 'var(--primary)' : 'var(--border)' }}>
              {tab.label}
              <span style={{ marginLeft: '6px', fontSize: '0.72rem', background: activeTab === tab.key ? 'rgba(255,255,255,0.25)' : 'var(--bg-main)', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* MUAYENE sekmesi */}
        {activeTab === 'inspections' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Muayene / Egzoz Kayıtları</h3>
              <button className="btn btn-primary" onClick={() => setShowInspModal(true)}><Plus size={16} /> Yeni Ekle</button>
            </div>
            {loadingDetail ? <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Yükleniyor...</p>
              : inspections.length === 0 ? <p className="text-dim" style={{ textAlign: 'center', padding: '2rem' }}>Kayıt bulunamadı.</p>
              : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['Tür', 'İşlem Tarihi', 'Geçerlilik Bitiş', 'Sonuç', 'Maliyet', 'Notlar', ''].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inspections.map(i => {
                      const days = i.expiry_date ? daysUntil(i.expiry_date) : null;
                      return (
                        <tr key={i.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                          <td style={{ padding: '0.9rem 1rem', fontWeight: '700' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '20px', background: 'var(--primary-light)', color: 'var(--primary)' }}>{i.type}</span>
                          </td>
                          <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem' }}>{fmtDate(i.inspection_date)}</td>
                          <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem' }}>
                            {fmtDate(i.expiry_date)}
                            {days !== null && (
                              <span style={{ fontSize: '0.7rem', marginLeft: '4px', color: days < 0 ? 'var(--danger)' : days < 30 ? 'var(--warning)' : 'var(--success)', fontWeight: '700' }}>
                                ({days < 0 ? `${Math.abs(days)}g geçti` : `${days}g kaldı`})
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.9rem 1rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '20px',
                              background: i.result === 'Geçti' ? '#dcfce7' : '#fee2e2',
                              color: i.result === 'Geçti' ? '#166534' : '#991b1b' }}>{i.result}</span>
                          </td>
                          <td style={{ padding: '0.9rem 1rem', fontWeight: '700', color: 'var(--primary)' }}>{i.cost > 0 ? `₺${fmt(i.cost)}` : '—'}</td>
                          <td style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>{i.notes || '—'}</td>
                          <td style={{ padding: '0.9rem 1rem' }}>
                            <button onClick={() => handleDeleteInsp(i.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={15} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
          </div>
        )}

        {/* BAKIM sekmesi */}
        {activeTab === 'maintenances' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Bakım Kayıtları</h3>
              <button className="btn btn-primary" onClick={() => setShowMaintModal(true)}><Plus size={16} /> Yeni Ekle</button>
            </div>
            {loadingDetail ? <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Yükleniyor...</p>
              : maintenances.length === 0 ? <p className="text-dim" style={{ textAlign: 'center', padding: '2rem' }}>Kayıt bulunamadı.</p>
              : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['Bakım Türü', 'Tarih', 'Km', 'Sonraki Bakım Km', 'Servis', 'Maliyet', 'Notlar', ''].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {maintenances.map(m => (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '20px', background: '#fef3c7', color: '#92400e' }}>{m.maintenance_type}</span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem' }}>{fmtDate(m.maintenance_date)}</td>
                        <td style={{ padding: '0.9rem 1rem', fontWeight: '700' }}>{fmt(m.km_at_maintenance)} km</td>
                        <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{m.next_maintenance_km ? `${fmt(m.next_maintenance_km)} km` : '—'}</td>
                        <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem' }}>{m.workshop || '—'}</td>
                        <td style={{ padding: '0.9rem 1rem', fontWeight: '700', color: 'var(--primary)' }}>{m.cost > 0 ? `₺${fmt(m.cost)}` : '—'}</td>
                        <td style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>{m.notes || '—'}</td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <button onClick={() => handleDeleteMaint(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={15} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        )}

        {/* SİGORTA sekmesi */}
        {activeTab === 'insurances' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Sigorta Kayıtları</h3>
              <button className="btn btn-primary" onClick={() => setShowInsurModal(true)}><Plus size={16} /> Yeni Ekle</button>
            </div>
            {loadingDetail ? <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Yükleniyor...</p>
              : insurances.length === 0 ? <p className="text-dim" style={{ textAlign: 'center', padding: '2rem' }}>Kayıt bulunamadı.</p>
              : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['Tür', 'Şirket', 'Poliçe No', 'Başlangıç', 'Bitiş', 'Prim', 'Notlar', ''].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {insurances.map(ins => {
                      const days = ins.expiry_date ? daysUntil(ins.expiry_date) : null;
                      return (
                        <tr key={ins.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                          <td style={{ padding: '0.9rem 1rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '20px',
                              background: ins.insurance_type === 'Kasko' ? '#dbeafe' : '#fef3c7',
                              color: ins.insurance_type === 'Kasko' ? '#1e40af' : '#92400e' }}>
                              {ins.insurance_type}
                            </span>
                          </td>
                          <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', fontWeight: '600' }}>{ins.company || '—'}</td>
                          <td style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{ins.policy_no || '—'}</td>
                          <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem' }}>{fmtDate(ins.start_date)}</td>
                          <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem' }}>
                            {fmtDate(ins.expiry_date)}
                            {days !== null && (
                              <span style={{ fontSize: '0.7rem', marginLeft: '4px', color: days < 0 ? 'var(--danger)' : days < 30 ? 'var(--warning)' : 'var(--success)', fontWeight: '700' }}>
                                ({days < 0 ? `${Math.abs(days)}g geçti` : `${days}g kaldı`})
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.9rem 1rem', fontWeight: '700', color: 'var(--primary)' }}>{ins.cost > 0 ? `₺${fmt(ins.cost)}` : '—'}</td>
                          <td style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>{ins.notes || '—'}</td>
                          <td style={{ padding: '0.9rem 1rem' }}>
                            <button onClick={() => handleDeleteInsur(ins.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={15} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
          </div>
        )}

        {/* MUAYENE EKLE MODAL */}
        {showInspModal && (
          <div style={overlay}>
            <div className="card" style={modal}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.15rem' }}>🔍 Muayene / Egzoz Kaydı Ekle</h2>
                <button onClick={() => setShowInspModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
              </div>
              <div className="grid grid-cols-2" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={col}>
                  <label className="label-sm">Kayıt Türü</label>
                  <select className="input" value={newInsp.type} onChange={e => setNewInsp({ ...newInsp, type: e.target.value })}>
                    <option>Muayene</option><option>Egzoz Muayenesi</option>
                  </select>
                </div>
                <div style={col}>
                  <label className="label-sm">Sonuç</label>
                  <select className="input" value={newInsp.result} onChange={e => setNewInsp({ ...newInsp, result: e.target.value })}>
                    <option>Geçti</option><option>Kaldı</option><option>Yenilendi</option>
                  </select>
                </div>
                <IG label="İşlem Tarihi" type="date" value={newInsp.inspection_date} onChange={e => setNewInsp({ ...newInsp, inspection_date: e.target.value })} />
                <IG label="Geçerlilik Bitiş" type="date" value={newInsp.expiry_date} onChange={e => setNewInsp({ ...newInsp, expiry_date: e.target.value })} />
                <IG label="Maliyet (₺)" type="number" value={newInsp.cost} onChange={e => setNewInsp({ ...newInsp, cost: e.target.value })} />
                <IG label="Notlar" value={newInsp.notes} onChange={e => setNewInsp({ ...newInsp, notes: e.target.value })} placeholder="Opsiyonel..." />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-ghost" onClick={() => setShowInspModal(false)} style={{ flex: 1 }}>İptal</button>
                <button className="btn btn-primary" onClick={handleSaveInsp} style={{ flex: 2 }}>Kaydet</button>
              </div>
            </div>
          </div>
        )}

        {/* BAKIM EKLE MODAL */}
        {showMaintModal && (
          <div style={overlay}>
            <div className="card" style={modal}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.15rem' }}>🔧 Bakım Kaydı Ekle</h2>
                <button onClick={() => setShowMaintModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
              </div>
              <div className="grid grid-cols-2" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={col}>
                  <label className="label-sm">Bakım Türü</label>
                  <select className="input" value={newMaint.maintenance_type} onChange={e => setNewMaint({ ...newMaint, maintenance_type: e.target.value })}>
                    <option>Periyodik Bakım</option><option>Yağ Değişimi</option><option>Fren Bakımı</option>
                    <option>Lastik Değişimi</option><option>Akü Değişimi</option><option>Motor Revizyonu</option><option>Diğer</option>
                  </select>
                </div>
                <IG label="Bakım Tarihi" type="date" value={newMaint.maintenance_date} onChange={e => setNewMaint({ ...newMaint, maintenance_date: e.target.value })} />
                <IG label="Bakımdaki Km" type="number" value={newMaint.km_at_maintenance} onChange={e => setNewMaint({ ...newMaint, km_at_maintenance: e.target.value })} />
                <IG label="Sonraki Bakım Km" type="number" value={newMaint.next_maintenance_km} onChange={e => setNewMaint({ ...newMaint, next_maintenance_km: e.target.value })} placeholder="Opsiyonel" />
                <IG label="Servis / Atölye" value={newMaint.workshop} onChange={e => setNewMaint({ ...newMaint, workshop: e.target.value })} placeholder="Opsiyonel" />
                <IG label="Maliyet (₺)" type="number" value={newMaint.cost} onChange={e => setNewMaint({ ...newMaint, cost: e.target.value })} />
              </div>
              <IG label="Notlar" value={newMaint.notes} onChange={e => setNewMaint({ ...newMaint, notes: e.target.value })} placeholder="Opsiyonel..." />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                <button className="btn btn-ghost" onClick={() => setShowMaintModal(false)} style={{ flex: 1 }}>İptal</button>
                <button className="btn btn-primary" onClick={handleSaveMaint} style={{ flex: 2 }}>Kaydet</button>
              </div>
            </div>
          </div>
        )}

        {/* SİGORTA EKLE MODAL */}
        {showInsurModal && (
          <div style={overlay}>
            <div className="card" style={modal}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.15rem' }}>🛡️ Sigorta Kaydı Ekle</h2>
                <button onClick={() => setShowInsurModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
              </div>
              <div className="grid grid-cols-2" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={col}>
                  <label className="label-sm">Sigorta Türü</label>
                  <select className="input" value={newInsur.insurance_type} onChange={e => setNewInsur({ ...newInsur, insurance_type: e.target.value })}>
                    <option>Kasko</option><option>Trafik</option><option>Zorunlu Trafik</option>
                  </select>
                </div>
                <IG label="Sigorta Şirketi" placeholder="Örn: Allianz" value={newInsur.company} onChange={e => setNewInsur({ ...newInsur, company: e.target.value })} />
                <IG label="Poliçe No" placeholder="Opsiyonel" value={newInsur.policy_no} onChange={e => setNewInsur({ ...newInsur, policy_no: e.target.value })} />
                <IG label="Prim Tutarı (₺)" type="number" value={newInsur.cost} onChange={e => setNewInsur({ ...newInsur, cost: e.target.value })} />
                <IG label="Başlangıç Tarihi" type="date" value={newInsur.start_date} onChange={e => setNewInsur({ ...newInsur, start_date: e.target.value })} />
                <IG label="Bitiş Tarihi *" type="date" value={newInsur.expiry_date} onChange={e => setNewInsur({ ...newInsur, expiry_date: e.target.value })} />
              </div>
              <IG label="Notlar" value={newInsur.notes} onChange={e => setNewInsur({ ...newInsur, notes: e.target.value })} placeholder="Opsiyonel..." />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                <button className="btn btn-ghost" onClick={() => setShowInsurModal(false)} style={{ flex: 1 }}>İptal</button>
                <button className="btn btn-primary" onClick={handleSaveInsur} style={{ flex: 2 }}>Kaydet</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────
  return (
    <div className="vehicles-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Filo & Araç Yönetimi</h1>
          <p className="text-muted">Araç satırına tıklayarak muayene ve bakım kayıtlarına ulaşın.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setNewVehicle({ ...EMPTY_VEHICLE }); setAddErr({}); setShowAddModal(true); }}>
          <Plus size={20} /> Yeni Araç Tanımla
        </button>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <VehicleStat title="Toplam Araç" value={vehicles.length} sub="Aktif Filo" icon={<Truck size={20} />} color="var(--primary)" />
        <VehicleStat title="Araç Tipi" value={[...new Set(vehicles.map(v => v.vehicle_type))].length} sub="Farklı tip" icon={<Gauge size={20} />} color="var(--warning)" />
        <VehicleStat title="Sürücü Atanan" value={vehicles.filter(v => v.driver_name).length} sub="Araç" icon={<CheckCircle2 size={20} />} color="var(--success)" />
        <VehicleStat title="Tesis Sayısı" value={[...new Set(vehicles.filter(v => v.facility_id).map(v => v.facility_id))].length} sub="Bağlı tesis" icon={<Building2 size={20} />} color="var(--primary)" />
      </div>

      {/* Filtre & Aksiyon Çubuğu */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '155px' }}>
            <label className="label-sm">Tesis</label>
            <select className="input" value={filterFacility} onChange={e => setFilterFacility(e.target.value)}>
              <option value="">Tüm Tesisler</option>
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '140px' }}>
            <label className="label-sm">Araç Tipi</label>
            <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">Tüm Tipler</option>
              {[...new Set(vehicles.map(v => v.vehicle_type).filter(Boolean))].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '130px' }}>
            <label className="label-sm">Marka</label>
            <select className="input" value={filterBrand} onChange={e => setFilterBrand(e.target.value)}>
              <option value="">Tüm Markalar</option>
              {[...new Set(vehicles.map(v => v.brand).filter(Boolean))].sort().map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '130px' }}>
            <label className="label-sm">Model</label>
            <input className="input" placeholder="Model ara..." value={filterModel} onChange={e => setFilterModel(e.target.value)} />
          </div>
          {(filterFacility || filterType || filterBrand || filterModel) && (
            <button className="btn btn-ghost" style={{ alignSelf: 'flex-end' }}
              onClick={() => { setFilterFacility(''); setFilterType(''); setFilterBrand(''); setFilterModel(''); }}>
              <X size={14} /> Temizle
            </button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignSelf: 'flex-end' }}>
            <button className="btn btn-ghost" style={{ fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => window.print()}>
              🖨️ Yazdır
            </button>
            <button className="btn btn-ghost" style={{ fontSize: '0.85rem', fontWeight: '700', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={exportCSV}>
              📊 Excel'e Aktar
            </button>
          </div>
        </div>
        {(filterFacility || filterType || filterBrand || filterModel) && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.75rem' }}>
            <strong>{filteredVehicles.length}</strong> / {vehicles.length} araç gösteriliyor
          </p>
        )}
      </div>

      <div className="card" style={{ padding: '0' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.25rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>Plaka / Durum</th>
              <th style={{ padding: '1.25rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>Marka / Model</th>
              <th style={{ padding: '1.25rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>Tesis</th>
              <th style={{ padding: '1.25rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>Sürücü</th>
              <th style={{ padding: '1.25rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>Kilometre</th>
              <th style={{ padding: '1.25rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>Yakıt</th>
              <th style={{ padding: '1.25rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', paddingRight: '1.25rem' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</td></tr>
            ) : filteredVehicles.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                {vehicles.length === 0 ? 'Henüz araç tanımlanmamış.' : 'Filtreyle eşleşen araç bulunamadı.'}
              </td></tr>
            ) : filteredVehicles.map(v => (
              <tr key={v.id} style={{ borderBottom: '1px solid var(--bg-main)', cursor: 'pointer' }}
                onClick={() => openDetail(v)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '8px' }}><Truck size={18} color="var(--primary)" /></div>
                    <div>
                      <p style={{ fontWeight: '700' }}>{v.plate}</p>
                      {v.condition && (
                        <span style={{ fontSize: '0.68rem', fontWeight: '700', padding: '0.1rem 0.4rem', borderRadius: '8px',
                          background: v.condition === 'Sıfır' ? '#dcfce7' : '#f1f5f9',
                          color: v.condition === 'Sıfır' ? '#166534' : '#64748b' }}>
                          {v.condition}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1.25rem' }}>
                  <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{v.brand} {v.model}</p>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>{v.model_year} · {v.vehicle_type}</p>
                </td>
                <td style={{ padding: '1.25rem' }}>
                  {v.facilities?.name
                    ? <span style={{ fontSize: '0.78rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'rgba(255,107,0,0.1)', color: 'var(--primary)' }}>{v.facilities.name}</span>
                    : <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>—</span>}
                </td>
                <td style={{ padding: '1.25rem', color: 'var(--text-dim)', fontSize: '0.9rem' }}>{v.driver_name || 'Atanmamış'}</td>
                <td style={{ padding: '1.25rem', fontWeight: '700' }}>{fmt(v.current_km)} km</td>
                <td style={{ padding: '1.25rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>{v.fuel_type || '—'}</td>
                <td style={{ textAlign: 'right', paddingRight: '1.25rem', position: 'relative' }}>
                  <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === v.id ? null : v.id); }}>
                    <MoreVertical size={16} />
                  </button>
                  {openMenuId === v.id && (
                    <div style={{ position: 'absolute', right: '1rem', top: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}
                      onMouseLeave={() => setOpenMenuId(null)}>
                      <button onClick={e => { e.stopPropagation(); openDetail(v); setOpenMenuId(null); }}
                        style={menuBtn} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        🔍 Muayene / Bakım
                      </button>
                      <button onClick={e => { e.stopPropagation(); setEditRecord({ ...v }); setEditErr({}); setOpenMenuId(null); }}
                        style={menuBtn} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        ✏️ Düzenle
                      </button>
                      <button onClick={e => { e.stopPropagation(); setOpenMenuId(null); handleDelete(v.id, v); }}
                        style={{ ...menuBtn, color: 'var(--danger)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        🗑️ Sil
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <div style={overlay}>
          <div className="card" style={{ ...modal, maxWidth: '700px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Yeni Araç Tanımla</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <SectionLabel>Temel Bilgiler</SectionLabel>
            <div className="grid grid-cols-3" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
              <IG label="Plaka *" placeholder="34 LUV 06" value={newVehicle.plate} onChange={e => setNewVehicle({ ...newVehicle, plate: e.target.value.toUpperCase() })} error={addErr.plate} />
              <IG label="Araç Marka *" placeholder="Mercedes, Ford..." value={newVehicle.brand} onChange={e => setNewVehicle({ ...newVehicle, brand: e.target.value })} error={addErr.brand} />
              <IG label="Araç Model *" placeholder="Actros, Transit..." value={newVehicle.model} onChange={e => setNewVehicle({ ...newVehicle, model: e.target.value })} error={addErr.model} />
              <IG label="Model Yılı" placeholder="2023" value={newVehicle.model_year} onChange={e => setNewVehicle({ ...newVehicle, model_year: e.target.value })} />
              <IG label="Şasi No (VIN)" placeholder="Opsiyonel" value={newVehicle.vin_no} onChange={e => setNewVehicle({ ...newVehicle, vin_no: e.target.value })} />
              <IG label="Sürücü" placeholder="Ad Soyad" value={newVehicle.driver_name} onChange={e => setNewVehicle({ ...newVehicle, driver_name: e.target.value })} />
            </div>

            <SectionLabel>Teknik Detaylar</SectionLabel>
            <div className="grid grid-cols-3" style={{ gap: '1rem', marginBottom: '1.25rem', alignItems: 'end' }}>
              <div style={col}>
                <label className="label-sm">Araç Tipi</label>
                <select className="input" value={newVehicle.vehicle_type} onChange={e => setNewVehicle({ ...newVehicle, vehicle_type: e.target.value })}>
                  <option>Çekici</option><option>Dorse</option><option>Kamyonet</option><option>Kamyon</option><option>Minibüs</option><option>Binek</option>
                </select>
              </div>
              <div style={col}>
                <label className="label-sm">Yakıt Tipi</label>
                <select className="input" value={newVehicle.fuel_type} onChange={e => setNewVehicle({ ...newVehicle, fuel_type: e.target.value })}>
                  <option>Dizel</option><option>Benzin</option><option>Elektrik</option><option>Hibrit</option><option>Benzin/LPG</option>
                </select>
              </div>
              <div style={col}>
                <label className="label-sm">Araç Durumu</label>
                <select className="input" value={newVehicle.condition} onChange={e => setNewVehicle({ ...newVehicle, condition: e.target.value })}>
                  <option>İkinci El</option><option>Sıfır</option>
                </select>
              </div>
              <IG label="Tüketim (L/100km)" type="number" placeholder="Opsiyonel" value={newVehicle.avg_fuel_consumption} onChange={e => setNewVehicle({ ...newVehicle, avg_fuel_consumption: e.target.value })} />
              <IG label="Güncel Kilometre" type="number" value={newVehicle.current_km} onChange={e => setNewVehicle({ ...newVehicle, current_km: e.target.value })} />
            </div>

            <SectionLabel>Operasyonel Bilgiler</SectionLabel>
            <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1.75rem' }}>
              <div style={col}>
                <label className="label-sm">Araç Sahipliği</label>
                <select className="input" value={newVehicle.ownership} onChange={e => setNewVehicle({ ...newVehicle, ownership: e.target.value })}>
                  <option>Şirkete Ait</option><option>Kiralık</option><option>Finansal Kiralama</option><option>Operasyonel Kiralama</option>
                </select>
              </div>
              <div style={col}>
                <label className="label-sm">Tesis</label>
                <select className="input" value={newVehicle.facility_id} onChange={e => setNewVehicle({ ...newVehicle, facility_id: e.target.value })}>
                  <option value="">— Seçiniz —</option>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleSave} style={{ flex: 2 }}>Aracı Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editRecord && (
        <div style={overlay}>
          <div className="card" style={{ ...modal, maxWidth: '700px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Aracı Düzenle</h2>
              <button onClick={() => setEditRecord(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <SectionLabel>Temel Bilgiler</SectionLabel>
            <div className="grid grid-cols-3" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
              <IG label="Plaka *" value={editRecord.plate || ''} onChange={e => setEditRecord({ ...editRecord, plate: e.target.value.toUpperCase() })} error={editErr.plate} />
              <IG label="Araç Marka *" placeholder="Mercedes, Ford..." value={editRecord.brand || ''} onChange={e => setEditRecord({ ...editRecord, brand: e.target.value })} error={editErr.brand} />
              <IG label="Araç Model *" placeholder="Actros, Transit..." value={editRecord.model || ''} onChange={e => setEditRecord({ ...editRecord, model: e.target.value })} error={editErr.model} />
              <IG label="Model Yılı" value={editRecord.model_year || ''} onChange={e => setEditRecord({ ...editRecord, model_year: e.target.value })} />
              <IG label="Şasi No (VIN)" value={editRecord.vin_no || ''} onChange={e => setEditRecord({ ...editRecord, vin_no: e.target.value })} />
              <IG label="Sürücü" value={editRecord.driver_name || ''} onChange={e => setEditRecord({ ...editRecord, driver_name: e.target.value })} />
            </div>

            <SectionLabel>Teknik Detaylar</SectionLabel>
            <div className="grid grid-cols-3" style={{ gap: '1rem', marginBottom: '1.25rem', alignItems: 'end' }}>
              <div style={col}>
                <label className="label-sm">Araç Tipi</label>
                <select className="input" value={editRecord.vehicle_type || 'Çekici'} onChange={e => setEditRecord({ ...editRecord, vehicle_type: e.target.value })}>
                  <option>Çekici</option><option>Dorse</option><option>Kamyonet</option><option>Kamyon</option><option>Minibüs</option><option>Binek</option>
                </select>
              </div>
              <div style={col}>
                <label className="label-sm">Yakıt Tipi</label>
                <select className="input" value={editRecord.fuel_type || 'Dizel'} onChange={e => setEditRecord({ ...editRecord, fuel_type: e.target.value })}>
                  <option>Dizel</option><option>Benzin</option><option>Elektrik</option><option>Hibrit</option><option>Benzin/LPG</option>
                </select>
              </div>
              <div style={col}>
                <label className="label-sm">Araç Durumu</label>
                <select className="input" value={editRecord.condition || 'İkinci El'} onChange={e => setEditRecord({ ...editRecord, condition: e.target.value })}>
                  <option>İkinci El</option><option>Sıfır</option>
                </select>
              </div>
              <IG label="Tüketim (L/100km)" type="number" placeholder="Opsiyonel" value={editRecord.avg_fuel_consumption || ''} onChange={e => setEditRecord({ ...editRecord, avg_fuel_consumption: e.target.value })} />
              <IG label="Güncel Kilometre" type="number" value={editRecord.current_km || 0} onChange={e => setEditRecord({ ...editRecord, current_km: e.target.value })} />
            </div>

            <SectionLabel>Operasyonel Bilgiler</SectionLabel>
            <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1.75rem' }}>
              <div style={col}>
                <label className="label-sm">Araç Sahipliği</label>
                <select className="input" value={editRecord.ownership || 'Şirkete Ait'} onChange={e => setEditRecord({ ...editRecord, ownership: e.target.value })}>
                  <option>Şirkete Ait</option><option>Kiralık</option><option>Finansal Kiralama</option><option>Operasyonel Kiralama</option>
                </select>
              </div>
              <div style={col}>
                <label className="label-sm">Tesis</label>
                <select className="input" value={editRecord.facility_id || ''} onChange={e => setEditRecord({ ...editRecord, facility_id: e.target.value })}>
                  <option value="">— Seçiniz —</option>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setEditRecord(null)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleUpdate} style={{ flex: 2 }}>Güncelle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VehicleStat = ({ title, value, sub, icon, color }) => (
  <div className="card">
    <div style={{ color, marginBottom: '0.75rem' }}>{icon}</div>
    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{value}</h3>
    <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>{title}</p>
    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{sub}</p>
  </div>
);

const IG = ({ label, placeholder, type, value, onChange, error }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
    <label className="label-sm">{label}</label>
    <input
      type={type || 'text'}
      className="input"
      style={error ? { borderColor: 'var(--danger)' } : {}}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
    {error && <p style={{ color: 'var(--danger)', fontSize: '0.72rem', fontWeight: '600', margin: 0 }}>Bu alanın girilmesi zorunludur.</p>}
  </div>
);

const SectionLabel = ({ children }) => (
  <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', marginTop: '0.25rem' }}>{children}</p>
);

const col = { display: 'flex', flexDirection: 'column', gap: '0.35rem' };
const menuBtn = { display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)' };
const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modal = { width: '100%', maxWidth: '650px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' };

export default Vehicles;
