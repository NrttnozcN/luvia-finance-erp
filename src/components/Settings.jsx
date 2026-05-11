import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Lock, 
  Bell, 
  Shield, 
  Monitor, 
  Database, 
  Globe, 
  ChevronRight,
  Save,
  Plus,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: '', email: '', role: 'Admin', password: '' });
  const [showPass, setShowPass] = useState(false);
  const addUser = useAuthStore(s => s.addUser);
  const authUsers = useAuthStore(s => s.users);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    else setProfiles(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleSaveUser = async () => {
    if (!newUser.full_name || !newUser.email || !newUser.password) {
      alert('Ad Soyad, E-Posta ve Şifre alanları zorunludur.');
      return;
    }
    // authStore'a ekle (giriş yapabilsin diye)
    addUser({
      name: newUser.full_name,
      email: newUser.email,
      password: newUser.password,
      role: newUser.role,
      facility: 'İstanbul Merkez',
    });
    // Supabase profiles tablosuna da kaydet
    await supabase.from('profiles').insert([{ full_name: newUser.full_name, email: newUser.email, role: newUser.role }]);
    setShowUserModal(false);
    fetchProfiles();
    setNewUser({ full_name: '', email: '', role: 'Admin', password: '' });
    alert(`Kullanıcı oluşturuldu!\nE-Posta: ${newUser.email}\nŞifre: ${newUser.password}`);
  };

  return (
    <div className="settings-container">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Sistem Ayarları</h1>
        <p className="text-muted">Kullanıcı yetkileri, sistem parametreleri ve güvenlik ayarlarını yönetin.</p>
      </header>

      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* Settings Navigation */}
        <div style={{ width: '280px', flexShrink: 0 }}>
          <div className="card" style={{ padding: '0.75rem' }}>
            <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={18} />} label="Profil & Hesap" />
            <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Shield size={18} />} label="Kullanıcı Yönetimi" />
            <TabButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={<Bell size={18} />} label="Bildirim Ayarları" />
            <TabButton active={activeTab === 'system'} onClick={() => setActiveTab('system')} icon={<Database size={18} />} label="Sistem Veritabanı" />
          </div>
        </div>

        {/* Settings Content */}
        <div style={{ flex: 1 }}>
          {activeTab === 'profile' && (
            <div className="card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Profil Bilgileri</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: '700' }}>NÖ</div>
                  <button className="btn btn-ghost">Fotoğrafı Değiştir</button>
                </div>
                <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
                  <InputGroup label="Ad Soyad" value="Nurettin Ö." />
                  <InputGroup label="E-Posta" value="nurettin@luviafinance.com" />
                  <InputGroup label="Telefon" value="+90 532 ..." />
                  <InputGroup label="Göreviniz" value="Yönetici" />
                </div>
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}><Save size={18} /> Değişiklikleri Kaydet</button>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>Kullanıcılar & Yetkiler</h2>
                <button className="btn btn-primary btn-sm" onClick={() => setShowUserModal(true)}><Plus size={18} /> Yeni Kullanıcı</button>
              </div>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ paddingBottom: '1rem' }}>Ad Soyad</th>
                    <th style={{ paddingBottom: '1rem' }}>E-Posta</th>
                    <th style={{ paddingBottom: '1rem' }}>Rol</th>
                    <th style={{ paddingBottom: '1rem' }}>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {authUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                      <td style={{ padding: '1rem 0', fontWeight: '600' }}>{u.name}</td>
                      <td className="text-muted" style={{ fontSize: '0.85rem' }}>{u.email}</td>
                      <td><span className="badge badge-primary">{u.role}</span></td>
                      <td><span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{u.status === 'active' ? 'Aktif' : 'Pasif'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* NEW USER MODAL */}
      {showUserModal && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Yeni Kullanıcı Ekle</h2>
              <button onClick={() => setShowUserModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <InputGroup label="Ad Soyad *" value={newUser.full_name} onChange={(e) => setNewUser({...newUser, full_name: e.target.value})} placeholder="Örn: Ahmet Yılmaz" />
              <InputGroup label="E-Posta *" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} placeholder="ahmet@luvia.com" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Şifre *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input"
                    placeholder="En az 6 karakter"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    style={{ paddingRight: '3rem' }}
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Sistem Rolü</label>
                <select className="input" value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})}>
                  <option value="Admin">Admin</option>
                  <option value="Muhasebe">Muhasebe</option>
                  <option value="Operasyon">Operasyon</option>
                  <option value="Izleme">Sadece İzleme</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowUserModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveUser}><Lock size={16} /> Kullanıcı Oluştur</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      width: '100%',
      padding: '1rem',
      border: 'none',
      background: active ? 'var(--primary-light)' : 'transparent',
      color: active ? 'var(--primary)' : 'var(--text-dim)',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: active ? '700' : '500',
      transition: 'all 0.2s'
    }}
  >
    {icon}
    {label}
    <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: active ? 1 : 0 }} />
  </button>
);

const InputGroup = ({ label, value, onChange, placeholder }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>{label}</label>
    <input className="input" value={value} onChange={onChange} placeholder={placeholder} />
  </div>
);

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modalContentStyle = { width: '100%', maxWidth: '500px', padding: '2rem' };

export default Settings;
