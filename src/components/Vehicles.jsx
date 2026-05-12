import React, { useState, useEffect } from 'react';
import {
  Truck, Plus, MoreVertical, ChevronRight, AlertCircle,
  CheckCircle2, Clock, X, Gauge, Calendar, ShieldCheck,
  ArrowLeft, Wrench, FileText, Trash2, Shield
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '—';
const today = () => new Date().toISOString().split('T')[0];

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
};

const Vehicles = () => {
  const [view, setView] = useState('list');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [activeTab, setActiveTab] = useState('inspections');

  // List
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ plate: '', model: '', model_year: '', vin_no: '', driver_name: '', vehicle_type: 'Çekici', current_km: 0 });

  // Detail
  const [inspections, setInspections] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showInspModal, setShowInspModal] = useState(false);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [newInsp, setNewInsp] = useState({ inspection_date: today(), expiry_date: '', type: 'Muayene', result: 'Geçti', cost: 0, notes: '' });
  const [newMaint, setNewMaint] = useState({ maintenance_date: today(), maintenance_type: 'Periyodik Bakım', km_at_maintenance: 0, next_maintenance_km: '', cost: 0, workshop: '', notes: '' });

  // Sigorta
  const [insurances, setInsurances] = useState([]);
  const [showInsurModal, setShowInsurModal] = useState(false);
  const [newInsur, setNewInsur] = useState({ insurance_type: 'Kasko', company: '', policy_no: '', start_date: today(), expiry_date: '', cost: 0, notes: '' });

  const fetchVehicles = async () => {
    setLoading(true);
    const { data } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
    setVehicles(data || []);
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
    const { error } = await supabase.from('vehicles').insert([newVehicle]);
    if (error) { alert(error.message); return; }
    setShowAddModal(false);
    fetchVehicles();
    setNewVehicle({ plate: '', model: '', model_year: '', vin_no: '', driver_name: '', vehicle_type: 'Çekici', current_km: 0 });
  };

  const handleUpdate = async () => {
    const { id, ...fields } = editRecord;
    const { error } = await supabase.from('vehicles').update(fields).eq('id', id);
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
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>{selectedVehicle.model} · {selectedVehicle.model_year} · {selectedVehicle.vehicle_type}</p>
          </div>
        </div>

        {/* Araç özet kartları */}
        <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
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
              <h3 style={{ fontSize: '1.1rem' }}>Muayene / Sigorta / Egzoz Kayıtları</h3>
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
                <h2 style={{ fontSize: '1.15rem' }}>🔍 Muayene / Sigorta Kaydı Ekle</h2>
                <button onClick={() => setShowInspModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
              </div>
              <div className="grid grid-cols-2" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={col}>
                  <label className="label-sm">Kayıt Türü</label>
                  <select className="input" value={newInsp.type} onChange={e => setNewInsp({ ...newInsp, type: e.target.value })}>
                    <option>Muayene</option><option>Trafik Sigortası</option><option>Kasko</option><option>Egzoz Muayenesi</option>
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
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Araç Tanımla
        </button>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <VehicleStat title="Toplam Araç" value={vehicles.length} sub="Aktif Filo" icon={<Truck size={20} />} color="var(--primary)" />
        <VehicleStat title="Araç Tipi" value={[...new Set(vehicles.map(v => v.vehicle_type))].length} sub="Farklı tip" icon={<Gauge size={20} />} color="var(--warning)" />
        <VehicleStat title="Sürücü Atanan" value={vehicles.filter(v => v.driver_name).length} sub="Araç" icon={<CheckCircle2 size={20} />} color="var(--success)" />
        <VehicleStat title="Muayene / Bakım" icon={<ShieldCheck size={20} />} value="→" sub="Araca tıkla" color="var(--primary)" />
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
            ) : vehicles.map(v => (
              <tr key={v.id} style={{ borderBottom: '1px solid var(--bg-main)', cursor: 'pointer' }}
                onClick={() => openDetail(v)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '8px' }}><Truck size={18} color="var(--primary)" /></div>
                    <span style={{ fontWeight: '700' }}>{v.plate}</span>
                  </div>
                </td>
                <td>
                  <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{v.model}</p>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>{v.model_year} | {v.vehicle_type}</p>
                </td>
                <td className="text-dim" style={{ fontSize: '0.9rem' }}>{v.driver_name || 'Atanmamış'}</td>
                <td style={{ fontWeight: '700' }}>{fmt(v.current_km)} km</td>
                <td><span className="badge badge-success">{v.status || 'Aktif'}</span></td>
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
                      <button onClick={e => { e.stopPropagation(); setEditRecord({ ...v }); setOpenMenuId(null); }}
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

      {/* EDIT MODAL */}
      {editRecord && (
        <div style={overlay}>
          <div className="card" style={modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Aracı Düzenle</h2>
              <button onClick={() => setEditRecord(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <IG label="Plaka" value={editRecord.plate || ''} onChange={e => setEditRecord({ ...editRecord, plate: e.target.value.toUpperCase() })} />
              <IG label="Marka / Model" value={editRecord.model || ''} onChange={e => setEditRecord({ ...editRecord, model: e.target.value })} />
              <IG label="Model Yılı" value={editRecord.model_year || ''} onChange={e => setEditRecord({ ...editRecord, model_year: e.target.value })} />
              <IG label="Şasi No" value={editRecord.vin_no || ''} onChange={e => setEditRecord({ ...editRecord, vin_no: e.target.value })} />
              <IG label="Sürücü" value={editRecord.driver_name || ''} onChange={e => setEditRecord({ ...editRecord, driver_name: e.target.value })} />
              <div style={col}>
                <label className="label-sm">Araç Tipi</label>
                <select className="input" value={editRecord.vehicle_type} onChange={e => setEditRecord({ ...editRecord, vehicle_type: e.target.value })}>
                  <option>Çekici</option><option>Dorse</option><option>Kamyonet</option><option>Binek</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setEditRecord(null)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleUpdate}>Güncelle</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {showAddModal && (
        <div style={overlay}>
          <div className="card" style={modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Yeni Araç Tanımla</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <IG label="Plaka" placeholder="34 LUV ..." value={newVehicle.plate} onChange={e => setNewVehicle({ ...newVehicle, plate: e.target.value.toUpperCase() })} />
              <IG label="Marka / Model" placeholder="Mercedes Actros" value={newVehicle.model} onChange={e => setNewVehicle({ ...newVehicle, model: e.target.value })} />
              <IG label="Model Yılı" placeholder="2023" value={newVehicle.model_year} onChange={e => setNewVehicle({ ...newVehicle, model_year: e.target.value })} />
              <IG label="Şasi No" placeholder="VIN..." value={newVehicle.vin_no} onChange={e => setNewVehicle({ ...newVehicle, vin_no: e.target.value })} />
              <IG label="Sürücü" placeholder="Ad Soyad" value={newVehicle.driver_name} onChange={e => setNewVehicle({ ...newVehicle, driver_name: e.target.value })} />
              <div style={col}>
                <label className="label-sm">Araç Tipi</label>
                <select className="input" value={newVehicle.vehicle_type} onChange={e => setNewVehicle({ ...newVehicle, vehicle_type: e.target.value })}>
                  <option>Çekici</option><option>Dorse</option><option>Kamyonet</option><option>Binek</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
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
    <div style={{ color, marginBottom: '0.75rem' }}>{icon}</div>
    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{value}</h3>
    <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>{title}</p>
    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{sub}</p>
  </div>
);

const IG = ({ label, placeholder, type, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label className="label-sm">{label}</label>
    <input type={type || 'text'} className="input" placeholder={placeholder} value={value} onChange={onChange} />
  </div>
);

const col = { display: 'flex', flexDirection: 'column', gap: '0.5rem' };
const menuBtn = { display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)' };
const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modal = { width: '100%', maxWidth: '650px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' };

export default Vehicles;
