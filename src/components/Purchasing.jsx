import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MoreVertical, 
  ChevronRight,
  X,
  Package,
  Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Purchasing = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [newRequest, setNewRequest] = useState({
    material_id: '',
    quantity: 1,
    priority: 'Normal',
    description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: reqs } = await supabase.from('purchase_requests').select('*, materials(name)').order('created_at', { ascending: false });
    const { data: mats } = await supabase.from('materials').select('*');
    setRequests(reqs || []);
    setMaterials(mats || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    const { error } = await supabase
      .from('purchase_requests')
      .insert([newRequest]);

    if (error) alert(error.message);
    else {
      setShowAddModal(false);
      fetchData();
      setNewRequest({ material_id: '', quantity: 1, priority: 'Normal', description: '' });
    }
  };

  const handleUpdate = async () => {
    const { id, materials: _m, ...fields } = editRecord;
    const { error } = await supabase.from('purchase_requests').update(fields).eq('id', id);
    if (error) { alert('Güncelleme hatası: ' + error.message); return; }
    setEditRecord(null);
    fetchData();
  };

  const handleDelete = async (id, record) => {
    if (!window.confirm(`"${record.description || id}" silinecek. Emin misin?`)) return;
    const { error } = await supabase.from('purchase_requests').delete().eq('id', id);
    if (error) { alert('Silme hatası: ' + error.message); return; }
    fetchData();
  };

  return (
    <div className="purchasing-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Satın Alma Talepleri</h1>
          <p className="text-muted">Eksik stoklar veya yeni ihtiyaçlar için talep oluşturun ve onay süreçlerini izleyin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Talep Oluştur
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <p className="text-muted">Bekleyen Talepler</p>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--warning)' }}>{requests.filter(r => r.status === 'Onay Bekliyor').length}</h2>
        </div>
        <div className="card">
          <p className="text-muted">Onaylananlar</p>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--success)' }}>{requests.filter(r => r.status === 'Onaylandı').length}</h2>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.25rem' }}>Talep No / Tarih</th>
              <th>Malzeme / Ürün</th>
              <th>Miktar</th>
              <th>Öncelik</th>
              <th>Durum</th>
              <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Henüz satın alma talebi bulunmuyor.</td></tr>
            ) : (
              requests.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <p style={{ fontWeight: '700' }}>#{r.id.slice(0, 8)}</p>
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>{new Date(r.created_at).toLocaleDateString('tr-TR')}</p>
                  </td>
                  <td style={{ fontWeight: '600' }}>{r.materials?.name || 'Bilinmeyen Ürün'}</td>
                  <td style={{ fontWeight: '700' }}>{r.quantity} Adet</td>
                  <td>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: '700', 
                      color: r.priority === 'Acil' ? 'var(--danger)' : 'var(--text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      {r.priority === 'Acil' && <AlertCircle size={14} />} {r.priority}
                    </span>
                  </td>
                  <td><span className="badge badge-warning">{r.status}</span></td>
                  <td style={{ textAlign: 'right', paddingRight: '1.25rem', position: 'relative' }}>
                    <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === r.id ? null : r.id); }}>
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === r.id && (
                      <div style={{ position: 'absolute', right: '1rem', top: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '140px', overflow: 'hidden' }}
                        onMouseLeave={() => setOpenMenuId(null)}>
                        <button onClick={() => { setEditRecord({ ...r }); setOpenMenuId(null); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          ✏️ Düzenle
                        </button>
                        <button onClick={() => { setOpenMenuId(null); handleDelete(r.id, r); }}
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

      {/* EDIT REQUEST MODAL */}
      {editRecord && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><ShoppingCart size={20} /></div>
                <h2 style={{ fontSize: '1.25rem' }}>Satın Alma Talebini Düzenle</h2>
              </div>
              <button onClick={() => setEditRecord(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Malzeme / Ürün</label>
                <select className="input" value={editRecord.material_id || ''} onChange={(e) => setEditRecord({...editRecord, material_id: e.target.value})}>
                  <option value="">Seçiniz...</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <InputGroup label="Miktar" type="number" value={editRecord.quantity} onChange={(e) => setEditRecord({...editRecord, quantity: e.target.value})} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Öncelik</label>
                <select className="input" value={editRecord.priority || 'Normal'} onChange={(e) => setEditRecord({...editRecord, priority: e.target.value})}>
                  <option>Normal</option>
                  <option>Düşük</option>
                  <option>Acil</option>
                </select>
              </div>
            </div>
            <InputGroup label="Talep Nedeni / Açıklama" placeholder="Lütfen detay girin..." value={editRecord.description || ''} onChange={(e) => setEditRecord({...editRecord, description: e.target.value})} />
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setEditRecord(null)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleUpdate}>Güncelle</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW REQUEST MODAL */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><ShoppingCart size={20} /></div>
                <h2 style={{ fontSize: '1.25rem' }}>Yeni Satın Alma Talebi</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Malzeme / Ürün</label>
                <select className="input" value={newRequest.material_id} onChange={(e) => setNewRequest({...newRequest, material_id: e.target.value})}>
                  <option value="">Seçiniz...</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <InputGroup label="Miktar" type="number" value={newRequest.quantity} onChange={(e) => setNewRequest({...newRequest, quantity: e.target.value})} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Öncelik</label>
                <select className="input" value={newRequest.priority} onChange={(e) => setNewRequest({...newRequest, priority: e.target.value})}>
                  <option>Normal</option>
                  <option>Düşük</option>
                  <option>Acil</option>
                </select>
              </div>
            </div>
            <InputGroup label="Talep Nedeni / Açıklama" placeholder="Lütfen detay girin..." value={newRequest.description} onChange={(e) => setNewRequest({...newRequest, description: e.target.value})} />

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Talebi Gönder</button>
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

export default Purchasing;
