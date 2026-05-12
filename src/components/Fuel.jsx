import React, { useState, useEffect } from 'react';
import {
  Fuel as FuelIcon, Plus, MoreVertical, X,
  ArrowRightLeft, Building2, Filter, Droplets,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

const Fuel = () => {
  const currentUser = useAuthStore(s => s.currentUser);
  const cid = currentUser?.company_id;
  const userFacilityId = currentUser?.facility_id;
  const isFullAccess = !userFacilityId ||
    currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin';

  const [activeView, setActiveView]       = useState('logs');
  const [loading, setLoading]             = useState(true);
  const [fuelLogs, setFuelLogs]           = useState([]);
  const [vehicles, setVehicles]           = useState([]);
  const [facilities, setFacilities]       = useState([]);
  const [transfers, setTransfers]         = useState([]);
  const [filterFacility, setFilterFacility] = useState('');
  const [openMenuId, setOpenMenuId]       = useState(null);
  const [editRecord, setEditRecord]       = useState(null);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const [newLog, setNewLog] = useState({
    vehicle_id: '', litres: 0, total_amount: 0, km_reading: 0, station_name: 'Opet',
  });
  const [transferForm, setTransferForm] = useState({
    from_facility_id: '', to_facility_id: '',
    amount: 0, transfer_date: new Date().toISOString().split('T')[0], notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    const [{ data: logs }, { data: vehs }, { data: facs }] = await Promise.all([
      supabase.from('fuel_logs')
        .select('*, vehicles(plate, facility_id, facilities(name))')
        .eq('company_id', cid).order('created_at', { ascending: false }),
      supabase.from('vehicles').select('*, facilities(name)').eq('company_id', cid),
      supabase.from('facilities').select('id, name').eq('company_id', cid),
    ]);
    setFuelLogs(logs || []);
    setVehicles(vehs || []);
    setFacilities(facs || []);
    setLoading(false);
  };

  const fetchTransfers = async () => {
    const { data } = await supabase.from('fuel_transfers')
      .select('*, from:from_facility_id(name), to:to_facility_id(name)')
      .eq('company_id', cid).order('transfer_date', { ascending: false });
    setTransfers(data || []);
  };

  useEffect(() => { fetchData(); fetchTransfers(); }, []);

  const handleSave = async () => {
    if (!newLog.vehicle_id) { alert('Araç seçin.'); return; }
    const { error } = await supabase.from('fuel_logs').insert([{ ...newLog, company_id: cid }]);
    if (error) { alert(error.message); return; }
    setShowAddModal(false);
    setNewLog({ vehicle_id: '', litres: 0, total_amount: 0, km_reading: 0, station_name: 'Opet' });
    fetchData();
  };

  const handleUpdate = async () => {
    const { id, vehicles: _v, ...fields } = editRecord;
    const { error } = await supabase.from('fuel_logs').update(fields).eq('id', id);
    if (error) { alert(error.message); return; }
    setEditRecord(null); fetchData();
  };

  const handleDelete = async (id, record) => {
    if (!window.confirm(`"${record.station_name || id}" silinecek. Emin misin?`)) return;
    await supabase.from('fuel_logs').delete().eq('id', id);
    fetchData();
  };

  const handleSaveTransfer = async () => {
    if (!transferForm.from_facility_id || !transferForm.to_facility_id || !transferForm.amount) {
      alert('Tüm alanları doldurun.'); return;
    }
    if (transferForm.from_facility_id === transferForm.to_facility_id) {
      alert('Çıkış ve varış tesisi aynı olamaz.'); return;
    }
    const { error } = await supabase.from('fuel_transfers').insert([{ ...transferForm, company_id: cid }]);
    if (error) { alert(error.message); return; }
    setShowTransferModal(false);
    setTransferForm({ from_facility_id: '', to_facility_id: '', amount: 0, transfer_date: new Date().toISOString().split('T')[0], notes: '' });
    fetchTransfers();
  };

  const availableVehicles = isFullAccess
    ? vehicles
    : vehicles.filter(v => v.facility_id === userFacilityId);

  const filteredLogs = fuelLogs.filter(l =>
    !filterFacility || l.vehicles?.facility_id === filterFacility
  );

  const totalLitres = filteredLogs.reduce((s, l) => s + Number(l.litres || 0), 0);
  const totalCost   = filteredLogs.reduce((s, l) => s + Number(l.total_amount || 0), 0);

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Akaryakıt Yönetimi</h1>
          <p className="text-muted">Yakıt tüketimi, maliyet takibi ve tesis transferleri.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--bg-main)', borderRadius: '10px', padding: '0.25rem' }}>
            <ViewBtn active={activeView === 'logs'}      onClick={() => setActiveView('logs')}      label="Yakıt Fişleri" />
            <ViewBtn active={activeView === 'transfers'} onClick={() => setActiveView('transfers')} label="Transferler" />
          </div>
          {activeView === 'logs' ? (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={18} /> Yeni Yakıt Fişi
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowTransferModal(true)}>
              <ArrowRightLeft size={18} /> Yeni Transfer
            </button>
          )}
        </div>
      </header>

      {/* Stats */}
      {activeView === 'logs' && (
        <div className="grid grid-cols-4" style={{ marginBottom: '1.5rem' }}>
          <StatCard label="Toplam Tüketim"   value={`${totalLitres.toLocaleString()} Lt`} color="var(--primary)" bg="var(--primary-light)" />
          <StatCard label="Toplam Maliyet"   value={`₺${totalCost.toLocaleString()}`}     color="var(--danger)"  bg="#fee2e2" />
          <StatCard label="Kayıt Sayısı"     value={filteredLogs.length}                  color="#7c3aed"        bg="#ede9fe" />
          <StatCard label="Ort. Lt Fiyatı"   value={totalLitres > 0 ? `₺${(totalCost / totalLitres).toFixed(2)}` : '—'} color="#d97706" bg="#fef3c7" />
        </div>
      )}

      {/* Tesis filtresi */}
      {activeView === 'logs' && facilities.length > 0 && (
        <div className="card" style={{ padding: '0.9rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Filter size={15} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>Tesis:</span>
          <select className="input" style={{ width: '200px' }} value={filterFacility} onChange={e => setFilterFacility(e.target.value)}>
            <option value="">Tüm Tesisler</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {filterFacility && <button className="btn btn-ghost" onClick={() => setFilterFacility('')} style={{ fontSize: '0.8rem' }}>Temizle</button>}
        </div>
      )}

      {/* Logs tablosu */}
      {activeView === 'logs' && (
        <div className="card" style={{ padding: 0 }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Plaka / Tarih', 'Miktar', 'Tutar', 'Km', 'İstasyon', 'Tesis', ''].map((h, i) => (
                  <th key={i} style={{ padding: i === 0 ? '1rem 1.5rem' : '1rem', textAlign: i === 6 ? 'right' : 'left', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                  {fuelLogs.length === 0 ? 'Henüz yakıt kaydı yok.' : 'Bu tesis için kayıt bulunamadı.'}
                </td></tr>
              ) : filteredLogs.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--bg-main)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <p style={{ fontWeight: '700' }}>{l.vehicles?.plate || '—'}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{new Date(l.created_at).toLocaleDateString('tr-TR')}</p>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: '700' }}>{l.litres} Lt</td>
                  <td style={{ padding: '1rem', fontWeight: '800', color: 'var(--primary)' }}>₺{Number(l.total_amount).toLocaleString()}</td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>{l.km_reading?.toLocaleString()} km</td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{l.station_name}</td>
                  <td style={{ padding: '1rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>{l.vehicles?.facilities?.name || '—'}</td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right', position: 'relative' }}>
                    <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === l.id ? null : l.id); }}>
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === l.id && (
                      <div style={{ position: 'absolute', right: '1rem', top: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '130px', overflow: 'hidden' }}
                        onMouseLeave={() => setOpenMenuId(null)}>
                        <MenuBtn label="Düzenle" onClick={() => { setEditRecord({ ...l }); setOpenMenuId(null); }} />
                        <MenuBtn label="Sil" danger onClick={() => { setOpenMenuId(null); handleDelete(l.id, l); }} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transfers tablosu */}
      {activeView === 'transfers' && (
        <div className="card" style={{ padding: 0 }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Tarih', 'Çıkış Tesisi', '', 'Varış Tesisi', 'Miktar', 'Notlar'].map((h, i) => (
                  <th key={i} style={{ padding: i === 0 ? '1rem 1.5rem' : '1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>Henüz transfer kaydı yok.</td></tr>
              ) : transfers.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: '600', fontSize: '0.85rem' }}>{new Date(t.transfer_date).toLocaleDateString('tr-TR')}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', fontSize: '0.9rem' }}>
                      <Building2 size={14} style={{ color: 'var(--danger)' }} />{t.from?.name || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem', color: 'var(--text-dim)', fontSize: '1.1rem' }}>→</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', fontSize: '0.9rem' }}>
                      <Building2 size={14} style={{ color: 'var(--success)' }} />{t.to?.name || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: '800', color: 'var(--primary)' }}>{t.amount} Lt</td>
                  <td style={{ padding: '1rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>{t.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ YENİ YAKIT FİŞİ MODAL ═══ */}
      {showAddModal && (
        <div style={ovl} onClick={() => setShowAddModal(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '620px', padding: '2rem' }} onClick={e => e.stopPropagation()}>
            <MHeader title="Yeni Akaryakıt Fişi" onClose={() => setShowAddModal(false)} />
            {!isFullAccess && (
              <div style={{ padding: '0.65rem 1rem', background: 'var(--primary-light)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '1.25rem', fontWeight: '600' }}>
                Tesis izolasyonu aktif — yalnızca kendi tesisinizdeki araçlar listeleniyor.
              </div>
            )}
            <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={lbl}>Araç Seçin *</label>
                <select className="input" value={newLog.vehicle_id} onChange={e => setNewLog({ ...newLog, vehicle_id: e.target.value })}>
                  <option value="">Plaka seçin...</option>
                  {availableVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.plate}{v.facilities?.name ? ` — ${v.facilities.name}` : ''}</option>
                  ))}
                </select>
                {availableVehicles.length === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--danger)' }}>Bu tesise bağlı araç bulunamadı.</p>}
              </div>
              <FField label="İstasyon" value={newLog.station_name} onChange={e => setNewLog({ ...newLog, station_name: e.target.value })} placeholder="Opet, Shell..." />
              <FField label="Miktar (Litre)" type="number" value={newLog.litres} onChange={e => setNewLog({ ...newLog, litres: e.target.value })} />
              <FField label="Toplam Tutar (₺)" type="number" value={newLog.total_amount} onChange={e => setNewLog({ ...newLog, total_amount: e.target.value })} />
              <FField label="Km Okuma" type="number" value={newLog.km_reading} onChange={e => setNewLog({ ...newLog, km_reading: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleSave} style={{ flex: 2 }}>Fişi Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DÜZENLE MODAL ═══ */}
      {editRecord && (
        <div style={ovl} onClick={() => setEditRecord(null)}>
          <div className="card" style={{ width: '100%', maxWidth: '620px', padding: '2rem' }} onClick={e => e.stopPropagation()}>
            <MHeader title="Yakıt Fişini Düzenle" onClose={() => setEditRecord(null)} />
            <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={lbl}>Araç</label>
                <select className="input" value={editRecord.vehicle_id || ''} onChange={e => setEditRecord({ ...editRecord, vehicle_id: e.target.value })}>
                  <option value="">Seçin...</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                </select>
              </div>
              <FField label="İstasyon" value={editRecord.station_name || ''} onChange={e => setEditRecord({ ...editRecord, station_name: e.target.value })} />
              <FField label="Miktar (Lt)" type="number" value={editRecord.litres} onChange={e => setEditRecord({ ...editRecord, litres: e.target.value })} />
              <FField label="Tutar (₺)" type="number" value={editRecord.total_amount} onChange={e => setEditRecord({ ...editRecord, total_amount: e.target.value })} />
              <FField label="Km Okuma" type="number" value={editRecord.km_reading} onChange={e => setEditRecord({ ...editRecord, km_reading: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setEditRecord(null)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleUpdate} style={{ flex: 2 }}>Güncelle</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TRANSFEr MODAL ═══ */}
      {showTransferModal && (
        <div style={ovl} onClick={() => setShowTransferModal(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '2rem' }} onClick={e => e.stopPropagation()}>
            <MHeader title="Tesisler Arası Yakıt Transferi" onClose={() => setShowTransferModal(false)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={lbl}>Çıkış Tesisi *</label>
                  <select className="input" value={transferForm.from_facility_id} onChange={e => setTransferForm({ ...transferForm, from_facility_id: e.target.value })}>
                    <option value="">Seçin...</option>
                    {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <ArrowRightLeft size={18} style={{ color: 'var(--text-dim)', flexShrink: 0, marginBottom: '0.75rem' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={lbl}>Varış Tesisi *</label>
                  <select className="input" value={transferForm.to_facility_id} onChange={e => setTransferForm({ ...transferForm, to_facility_id: e.target.value })}>
                    <option value="">Seçin...</option>
                    {facilities.filter(f => f.id !== transferForm.from_facility_id).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                <FField label="Miktar (Litre) *" type="number" value={transferForm.amount} onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })} />
                <FField label="Transfer Tarihi" type="date" value={transferForm.transfer_date} onChange={e => setTransferForm({ ...transferForm, transfer_date: e.target.value })} />
              </div>
              <FField label="Notlar" value={transferForm.notes} onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })} placeholder="İsteğe bağlı açıklama" />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowTransferModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleSaveTransfer} style={{ flex: 2 }}>Transferi Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Yardımcı bileşenler ──────────────────────────────────────────────────────
const ViewBtn = ({ active, onClick, label }) => (
  <button onClick={onClick} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700', transition: 'all 0.2s',
    background: active ? 'white' : 'transparent', color: active ? 'var(--primary)' : 'var(--text-dim)',
    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
  {label}
  </button>
);

const StatCard = ({ label, value, color, bg }) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Droplets size={20} />
    </div>
    <div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '2px' }}>{label}</p>
      <p style={{ fontWeight: '800', fontSize: '1.1rem', color }}>{value}</p>
    </div>
  </div>
);

const MenuBtn = ({ label, onClick, danger }) => (
  <button onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: danger ? 'var(--danger)' : 'var(--text)' }}
    onMouseEnter={e => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.07)' : 'var(--bg-main)'}
    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
  {label}
  </button>
);

const MHeader = ({ title, onClose }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
    <h2 style={{ fontSize: '1.2rem' }}>{title}</h2>
    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={22} /></button>
  </div>
);

const FField = ({ label, type, value, onChange, placeholder }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label style={lbl}>{label}</label>
    <input type={type || 'text'} className="input" value={value} onChange={onChange} placeholder={placeholder} />
  </div>
);

const lbl = { fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-dim)' };
const ovl = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };

export default Fuel;
