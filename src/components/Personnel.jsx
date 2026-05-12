import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  UserPlus, 
  Mail, 
  Phone, 
  MapPin, 
  MoreVertical, 
  ChevronRight, 
  Briefcase,
  X,
  CreditCard,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Personnel = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [newStaff, setNewStaff] = useState({
    full_name: '',
    tc_no: '',
    position: 'Şoför',
    branch: 'Merkez',
    salary: 0,
    start_date: new Date().toISOString().split('T')[0]
  });

  const fetchPersonnel = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('personnel')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) console.error(error);
    else setStaff(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPersonnel();
  }, []);

  const handleSave = async () => {
    const { error } = await supabase
      .from('personnel')
      .insert([newStaff]);

    if (error) alert(error.message);
    else {
      setShowAddModal(false);
      fetchPersonnel();
      setNewStaff({ full_name: '', tc_no: '', position: 'Şoför', branch: 'Merkez', salary: 0, start_date: new Date().toISOString().split('T')[0] });
    }
  };

  const handleUpdate = async () => {
    const { id, ...fields } = editRecord;
    const { error } = await supabase.from('personnel').update(fields).eq('id', id);
    if (error) { alert('Güncelleme hatası: ' + error.message); return; }
    setEditRecord(null);
    fetchPersonnel();
  };

  const handleDelete = async (id, record) => {
    if (!window.confirm(`"${record.full_name || id}" silinecek. Emin misin?`)) return;
    const { error } = await supabase.from('personnel').delete().eq('id', id);
    if (error) { alert('Silme hatası: ' + error.message); return; }
    fetchPersonnel();
  };

  return (
    <div className="personnel-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Personel & Özlük Yönetimi</h1>
          <p className="text-muted">Ekibinizin maaş, izin ve özlük bilgilerini güvenli bir şekilde takip edin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Personel Kaydı
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <p className="text-muted">Toplam Personel</p>
          <h2 style={{ fontSize: '2rem' }}>{staff.length}</h2>
        </div>
        <div className="card">
          <p className="text-muted">Aktif Çalışan</p>
          <h2 style={{ fontSize: '2rem', color: 'var(--success)' }}>{staff.filter(s => s.status === 'Aktif').length}</h2>
        </div>
        <div className="card">
          <p className="text-muted">Saha Ekibi</p>
          <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>{staff.filter(s => s.position === 'Şoför').length}</h2>
        </div>
        <div className="card">
          <p className="text-muted">Bu Ay Katılan</p>
          <h2 style={{ fontSize: '2rem' }}>{staff.filter(s => new Date(s.start_date).getMonth() === new Date().getMonth()).length}</h2>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.25rem' }}>Ad Soyad</th>
              <th>Görev / Unvan</th>
              <th>Şube / Bölüm</th>
              <th>Maaş</th>
              <th>Durum</th>
              <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</td></tr>
            ) : staff.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Henüz personel kaydı bulunmuyor.</td></tr>
            ) : (
              staff.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '50%' }}><Users size={18} /></div>
                      <div>
                        <p style={{ fontWeight: '700' }}>{s.full_name}</p>
                        <p className="text-muted" style={{ fontSize: '0.75rem' }}>{s.tc_no}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Briefcase size={14} className="text-dim" />
                      <span>{s.position}</span>
                    </div>
                  </td>
                  <td>{s.branch}</td>
                  <td style={{ fontWeight: '700' }}>₺{s.salary.toLocaleString()}</td>
                  <td><span className="badge badge-success">{s.status}</span></td>
                  <td style={{ textAlign: 'right', paddingRight: '1.25rem', position: 'relative' }}>
                    <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === s.id ? null : s.id); }}>
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === s.id && (
                      <div style={{ position: 'absolute', right: '1rem', top: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '140px', overflow: 'hidden' }}
                        onMouseLeave={() => setOpenMenuId(null)}>
                        <button onClick={() => { setEditRecord({ ...s }); setOpenMenuId(null); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          ✏️ Düzenle
                        </button>
                        <button onClick={() => { setOpenMenuId(null); handleDelete(s.id, s); }}
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

      {/* EDIT PERSONNEL MODAL */}
      {editRecord && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><UserPlus size={20} /></div>
                <h2 style={{ fontSize: '1.25rem' }}>Personeli Düzenle</h2>
              </div>
              <button onClick={() => setEditRecord(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <InputGroup label="Ad Soyad" placeholder="Örn: Ahmet Yılmaz" value={editRecord.full_name || ''} onChange={(e) => setEditRecord({...editRecord, full_name: e.target.value})} />
              <InputGroup label="TC Kimlik No" placeholder="11 haneli..." value={editRecord.tc_no || ''} onChange={(e) => setEditRecord({...editRecord, tc_no: e.target.value})} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Görev</label>
                <select className="input" value={editRecord.position || 'Şoför'} onChange={(e) => setEditRecord({...editRecord, position: e.target.value})}>
                  <option>Şoför</option>
                  <option>Operasyon Uzmanı</option>
                  <option>Muhasebe</option>
                  <option>Yönetici</option>
                </select>
              </div>
              <InputGroup label="Maaş (Net)" type="number" value={editRecord.salary} onChange={(e) => setEditRecord({...editRecord, salary: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setEditRecord(null)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleUpdate}>Güncelle</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW PERSONNEL MODAL */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><UserPlus size={20} /></div>
                <h2 style={{ fontSize: '1.25rem' }}>Yeni Personel Kaydı</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <InputGroup label="Ad Soyad" placeholder="Örn: Ahmet Yılmaz" value={newStaff.full_name} onChange={(e) => setNewStaff({...newStaff, full_name: e.target.value})} />
              <InputGroup label="TC Kimlik No" placeholder="11 haneli..." value={newStaff.tc_no} onChange={(e) => setNewStaff({...newStaff, tc_no: e.target.value})} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Görev</label>
                <select className="input" value={newStaff.position} onChange={(e) => setNewStaff({...newStaff, position: e.target.value})}>
                  <option>Şoför</option>
                  <option>Operasyon Uzmanı</option>
                  <option>Muhasebe</option>
                  <option>Yönetici</option>
                </select>
              </div>
              <InputGroup label="Maaş (Net)" type="number" value={newStaff.salary} onChange={(e) => setNewStaff({...newStaff, salary: e.target.value})} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Personeli Kaydet</button>
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

export default Personnel;
