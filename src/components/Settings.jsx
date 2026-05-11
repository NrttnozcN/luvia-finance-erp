import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User, Lock, Bell, Shield, Database,
  ChevronRight, Save, Plus, X, Eye, EyeOff,
  Pencil, Trash2, ToggleLeft, ToggleRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);

  // Veritabanından gelen kullanıcılar
  const [profiles, setProfiles] = useState([]);

  // Yeni kullanıcı modal
  const [showAdd, setShowAdd]     = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [newUser, setNewUser]     = useState({ full_name: '', username: '', email: '', role: 'Admin', password: '' });

  // Düzenleme modal
  const [editUser, setEditUser]   = useState(null); // { id, name, username, email, role, password }
  const [showEditPass, setShowEditPass] = useState(false);

  // Silme onayı
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (!error && data) setProfiles(data);
    setLoading(false);
  };

  React.useEffect(() => {
    if (activeTab === 'users') fetchProfiles();
  }, [activeTab]);

  /* ---------- Handlers ---------- */
  const handleAdd = async () => {
    if (!newUser.full_name || !newUser.username || !newUser.email || !newUser.password) {
      alert('Tüm zorunlu alanları doldurun.');
      return;
    }
    const { error } = await supabase.from('profiles').insert([{ 
      full_name: newUser.full_name, 
      username: newUser.username, 
      email: newUser.email, 
      password: newUser.password, 
      role: newUser.role 
    }]);

    if (error) {
      alert('Kayıt başarısız: ' + error.message);
      return;
    }

    setShowAdd(false);
    setNewUser({ full_name: '', username: '', email: '', role: 'Admin', password: '' });
    fetchProfiles();
    alert(`✅ Kullanıcı oluşturuldu!\nKullanıcı Adı: ${newUser.username}\nŞifre: ${newUser.password}`);
  };

  const handleEdit = async () => {
    if (!editUser.name || !editUser.email) {
      alert('Ad Soyad ve E-Posta zorunludur.');
      return;
    }
    const updates = { 
      full_name: editUser.name, 
      username: editUser.username,
      email: editUser.email, 
      role: editUser.role 
    };
    if (editUser.password) updates.password = editUser.password;
    
    await supabase.from('profiles').update(updates).eq('id', editUser.id);
    
    setEditUser(null);
    fetchProfiles();
  };

  const handleDelete = async () => {
    await supabase.from('profiles').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    fetchProfiles();
  };

  const toggleStatus = async (user) => {
    // Profil tablosuna status eklenmediyse diye şimdilik atlıyoruz veya eklendiğini varsayarak güncelliyoruz
    // Eğer profiles tablosunda status sütunu yoksa bunu db'den de eklemen gerekecek.
    // Şimdilik sadece toast mesajı verelim
    alert('Durum değiştirme yakında veritabanına bağlanacak (Şu an tabloda status sütunu yok).');
  };

  /* ---------- UI ---------- */
  return (
    <div className="settings-container">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Sistem Ayarları</h1>
        <p className="text-muted">Kullanıcı yetkileri, sistem parametreleri ve güvenlik ayarlarını yönetin.</p>
      </header>

      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* Sol nav */}
        <div style={{ width: '260px', flexShrink: 0 }}>
          <div className="card" style={{ padding: '0.75rem' }}>
            <TabButton active={activeTab === 'profile'}       onClick={() => setActiveTab('profile')}       icon={<User size={18} />}     label="Profil & Hesap" />
            <TabButton active={activeTab === 'users'}         onClick={() => setActiveTab('users')}         icon={<Shield size={18} />}   label="Kullanıcı Yönetimi" />
            <TabButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={<Bell size={18} />}     label="Bildirim Ayarları" />
            <TabButton active={activeTab === 'system'}        onClick={() => setActiveTab('system')}        icon={<Database size={18} />} label="Sistem Veritabanı" />
          </div>
        </div>

        {/* İçerik */}
        <div style={{ flex: 1 }}>

          {/* --- Profil --- */}
          {activeTab === 'profile' && (
            <div className="card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Profil Bilgileri</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '700' }}>NÖ</div>
                </div>
                <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
                  <InputGroup label="Ad Soyad" defaultValue="Nurettin Ö." />
                  <InputGroup label="E-Posta" defaultValue="nurettin@luviafinance.com" />
                </div>
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}><Save size={18} /> Kaydet</button>
              </div>
            </div>
          )}

          {/* --- Kullanıcı Yönetimi --- */}
          {activeTab === 'users' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>Kullanıcılar & Yetkiler</h2>
                <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                  <Plus size={18} /> Yeni Kullanıcı
                </button>
              </div>

              <table style={{ width: '100%' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ paddingBottom: '1rem' }}>Ad Soyad</th>
                    <th style={{ paddingBottom: '1rem' }}>E-Posta</th>
                    <th style={{ paddingBottom: '1rem' }}>Rol</th>
                    <th style={{ paddingBottom: '1rem' }}>Durum</th>
                    <th style={{ paddingBottom: '1rem', textAlign: 'right' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center' }}>Yükleniyor...</td></tr> : 
                   profiles.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                      <td style={{ padding: '1rem 0' }}>
                        <p style={{ fontWeight: '600' }}>{u.full_name}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>@{u.username || '—'}</p>
                      </td>
                      <td className="text-muted" style={{ fontSize: '0.85rem' }}>{u.email}</td>
                      <td>
                        <span className="badge badge-primary">{u.role}</span>
                      </td>
                      <td>
                        <button
                          onClick={() => toggleStatus(u)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '700', color: 'var(--success)' }}
                          title="Durumu değiştir"
                        >
                          <><ToggleRight size={20} /> Aktif</>
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            onClick={() => setEditUser({ id: u.id, name: u.full_name, username: u.username || '', email: u.email, role: u.role, password: '' })}
                          >
                            <Pencil size={14} /> Düzenle
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            onClick={() => setDeleteTarget(u)}
                          >
                            <Trash2 size={14} /> Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ===== YENİ KULLANICI MODAL ===== */}
      {showAdd && (
        <div style={overlay}>
          <div className="card" style={modal}>
            <div style={modalHeader}>
              <h2 style={{ fontSize: '1.25rem' }}>Yeni Kullanıcı Ekle</h2>
              <button onClick={() => setShowAdd(false)} style={closeBtn}><X size={22} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <InputGroup label="Ad Soyad *" value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="Örn: Kübra Özcan" />
              <InputGroup label="Kullanıcı Adı * (giriş için)" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value.toLowerCase().replace(/\s/g,'') })} placeholder="Örn: kubra.ozcan" />
              <InputGroup label="E-Posta *" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="kubra@luvia.com" />
              <PasswordField label="Şifre *" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} show={showPass} toggle={() => setShowPass(s => !s)} />
              <RoleSelect value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleAdd} style={{ flex: 2 }}><Lock size={15} /> Kullanıcı Oluştur</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DÜZENLEME MODAL ===== */}
      {editUser && (
        <div style={overlay}>
          <div className="card" style={modal}>
            <div style={modalHeader}>
              <h2 style={{ fontSize: '1.25rem' }}>Kullanıcıyı Düzenle</h2>
              <button onClick={() => setEditUser(null)} style={closeBtn}><X size={22} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <InputGroup label="Ad Soyad *" value={editUser.name}     onChange={e => setEditUser({ ...editUser, name: e.target.value })}     placeholder="Ad Soyad" />
              <InputGroup label="Kullanıcı Adı" value={editUser.username || ''} onChange={e => setEditUser({ ...editUser, username: e.target.value.toLowerCase().replace(/\s/g,'') })} placeholder="kullanici.adi" />
              <InputGroup label="E-Posta *"  value={editUser.email}    onChange={e => setEditUser({ ...editUser, email: e.target.value })}    placeholder="E-Posta" />
              <PasswordField
                label="Yeni Şifre (boş bırakılırsa değişmez)"
                value={editUser.password}
                onChange={e => setEditUser({ ...editUser, password: e.target.value })}
                show={showEditPass}
                toggle={() => setShowEditPass(s => !s)}
                placeholder="Değiştirmek istemiyorsanız boş bırakın"
              />
              <RoleSelect value={editUser.role} onChange={e => setEditUser({ ...editUser, role: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setEditUser(null)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleEdit} style={{ flex: 2 }}><Save size={15} /> Değişiklikleri Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== SİLME ONAY MODAL ===== */}
      {deleteTarget && (
        <div style={overlay}>
          <div className="card" style={{ ...modal, maxWidth: '420px', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--danger)' }}>
              <Trash2 size={28} />
            </div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>Kullanıcıyı Sil</h2>
            <p className="text-muted" style={{ marginBottom: '0.5rem' }}>
              <strong>{deleteTarget.full_name}</strong> adlı kullanıcıyı silmek istediğinizden emin misiniz?
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--danger)', marginBottom: '2rem' }}>Bu işlem geri alınamaz.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} style={{ flex: 1 }}>Vazgeç</button>
              <button className="btn" onClick={handleDelete} style={{ flex: 1, background: 'var(--danger)', color: 'white' }}>Evet, Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- Alt bileşenler ---------- */
const TabButton = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', padding: '0.9rem 1rem', border: 'none', background: active ? 'var(--primary-light)' : 'transparent', color: active ? 'var(--primary)' : 'var(--text-dim)', borderRadius: '8px', cursor: 'pointer', fontWeight: active ? '700' : '500', transition: 'all 0.2s' }}>
    {icon} {label}
    <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: active ? 1 : 0 }} />
  </button>
);

const InputGroup = ({ label, value, onChange, placeholder, defaultValue }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>{label}</label>
    <input className="input" value={value} defaultValue={defaultValue} onChange={onChange} placeholder={placeholder} />
  </div>
);

const PasswordField = ({ label, value, onChange, show, toggle, placeholder }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>{label}</label>
    <div style={{ position: 'relative' }}>
      <input type={show ? 'text' : 'password'} className="input" value={value} onChange={onChange} placeholder={placeholder || 'En az 6 karakter'} style={{ paddingRight: '3rem' }} />
      <button type="button" onClick={toggle} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  </div>
);

const RoleSelect = ({ value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>Sistem Rolü</label>
    <select className="input" value={value} onChange={onChange}>
      {ROLES.map(r => <option key={r} value={r}>{r === 'Izleme' ? 'Sadece İzleme' : r}</option>)}
    </select>
  </div>
);

const overlay    = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modal      = { width: '100%', maxWidth: '500px', padding: '2rem' };
const modalHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' };
const closeBtn   = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' };

export default Settings;
