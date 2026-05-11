import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Building2, Users, Bell, Image as ImageIcon, Plus, X, UserPlus,
  Save, CheckCircle, MoreVertical, ShieldCheck, ToggleLeft, ToggleRight,
  Trash2, Eye, EyeOff, ChevronDown, ChevronUp,
} from 'lucide-react';
import useAuthStore, { ROLE_PERMISSIONS, MODULE_MATRIX } from '../store/authStore';
import { FormField } from './Invoices';
import { today } from '../utils/formatters';

const SETTINGS_TABS = [
  { id: 'company',  label: 'Firma Bilgileri',   icon: <Building2 size={18} /> },
  { id: 'users',    label: 'Kullanıcılar',       icon: <Users size={18} /> },
  { id: 'roles',    label: 'Rol Yetkileri',      icon: <ShieldCheck size={18} /> },
  { id: 'notify',   label: 'SMS & Mail',         icon: <Bell size={18} /> },
];

const Settings = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const currentUser = useAuthStore(s => s.currentUser);

  return (
    <div>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Sistem Ayarları</h1>
        <p className="text-muted">Uygulama genel ayarlarını, kullanıcıları ve yetkileri yönetin.</p>
      </header>

      <div className="grid" style={{ gridTemplateColumns: '260px 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {SETTINGS_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="btn btn-ghost"
              style={{
                justifyContent: 'flex-start', gap: '0.75rem', padding: '1rem',
                background: activeTab === tab.id ? 'white' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
                border: activeTab === tab.id ? '1px solid var(--border)' : '1px solid transparent',
              }}
            >
              {tab.icon}
              <span style={{ fontWeight: '600' }}>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="card" style={{ minHeight: '500px' }}>
          {activeTab === 'company'  && <CompanySettings />}
          {activeTab === 'users'    && <UserManagement currentUser={currentUser} onAdd={() => setShowAddUserModal(true)} />}
          {activeTab === 'roles'    && <RolePermissions />}
          {activeTab === 'notify'   && <NotificationSettings />}
        </div>
      </div>

      {showAddUserModal && <NewUserModal onClose={() => setShowAddUserModal(false)} />}
    </div>
  );
};

// ─── Firma Bilgileri ──────────────────────────────────────────────────────────
const CompanySettings = () => {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: 'Luvia Lojistik A.Ş.', taxOffice: 'Gebze V.D.',
    taxNo: '1234567890', phone: '+90 262 000 0000',
    email: 'info@luvia.com', address: 'Gebze OSB, Kocaeli',
  });

  const handleSave = () => {
    setSaved(true);
    toast.success('Firma bilgileri güncellendi');
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <h3 style={{ marginBottom: '1.75rem' }}>Firma Profili</h3>
      <div className="grid" style={{ gridTemplateColumns: '1fr 200px', gap: '2rem', marginBottom: '1.5rem', alignItems: 'start' }}>
        <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
          <FormField label="Firma Ünvanı">
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%' }} />
          </FormField>
          <FormField label="Vergi Dairesi">
            <input className="input" value={form.taxOffice} onChange={e => setForm(f => ({ ...f, taxOffice: e.target.value }))} style={{ width: '100%' }} />
          </FormField>
          <FormField label="Vergi No">
            <input className="input" value={form.taxNo} onChange={e => setForm(f => ({ ...f, taxNo: e.target.value }))} style={{ width: '100%' }} />
          </FormField>
          <FormField label="Telefon">
            <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={{ width: '100%' }} />
          </FormField>
          <FormField label="E-Posta">
            <input className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ width: '100%' }} />
          </FormField>
          <FormField label="Adres">
            <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={{ width: '100%' }} />
          </FormField>
        </div>
        <div>
          <p style={{ fontSize: '0.83rem', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>Firma Logosu</p>
          <div style={{ border: '2px dashed var(--border)', borderRadius: '12px', padding: '2rem', textAlign: 'center', cursor: 'pointer' }}
            onClick={() => toast('Logo yükleme yakında', { icon: '🖼️' })}>
            <ImageIcon size={36} className="text-dim" style={{ marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Logo Yükle</p>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
        {saved && <span style={{ color: 'var(--success)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle size={15} /> Kaydedildi</span>}
        <button className="btn btn-primary" onClick={handleSave}><Save size={16} /> Kaydet</button>
      </div>
    </div>
  );
};

// ─── Kullanıcı Yönetimi ───────────────────────────────────────────────────────
const UserManagement = ({ currentUser, onAdd }) => {
  const users = useAuthStore(s => s.users);
  const toggleUserStatus = useAuthStore(s => s.toggleUserStatus);
  const deleteUser = useAuthStore(s => s.deleteUser);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h3 style={{ marginBottom: '0.2rem' }}>Kullanıcı Listesi</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>{users.filter(u => u.status === 'active').length} aktif kullanıcı</p>
        </div>
        <button className="btn btn-primary" onClick={onAdd}><Plus size={18} /> Yeni Kullanıcı</button>
      </div>

      <table style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Kullanıcı</th>
            <th>Rol</th>
            <th>Tesis</th>
            <th>Kayıt Tarihi</th>
            <th style={{ textAlign: 'center' }}>Durum</th>
            <th style={{ textAlign: 'right' }}>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => {
            const role = ROLE_PERMISSIONS[u.role];
            const isSelf = currentUser?.id === u.id;
            return (
              <tr key={u.id}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--primary-light)', border: `2px solid ${role?.color || 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', color: role?.color || 'var(--text-dim)', flexShrink: 0 }}>
                      {u.initials}
                    </div>
                    <div>
                      <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>{u.name} {isSelf && <span style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>(Siz)</span>}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{u.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{ padding: '0.25rem 0.7rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '700', ...role?.badgeStyle }}>
                    {role?.label || u.role}
                  </span>
                </td>
                <td className="text-dim" style={{ fontSize: '0.88rem' }}>{u.facility}</td>
                <td className="text-dim" style={{ fontSize: '0.82rem' }}>{u.createdAt}</td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => !isSelf && toggleUserStatus(u.id)}
                    style={{ background: 'none', border: 'none', cursor: isSelf ? 'not-allowed' : 'pointer', opacity: isSelf ? 0.4 : 1, color: u.status === 'active' ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
                    title={isSelf ? 'Kendi hesabınızı devre dışı bırakamazsınız' : u.status === 'active' ? 'Devre Dışı Bırak' : 'Aktif Yap'}
                  >
                    {u.status === 'active' ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => {
                      if (isSelf) { toast.error('Kendi hesabınızı silemezsiniz'); return; }
                      if (window.confirm(`${u.name} silinsin mi?`)) { deleteUser(u.id); toast.success('Kullanıcı silindi'); }
                    }}
                    className="btn btn-ghost"
                    style={{ padding: '0.35rem', color: 'var(--danger)', opacity: isSelf ? 0.3 : 1 }}
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─── Rol Yetkileri Matrisi ────────────────────────────────────────────────────
const RolePermissions = () => {
  const [expanded, setExpanded] = useState(null);
  const roles = Object.entries(ROLE_PERMISSIONS);

  const hasAccess = (roleKey, tabs) => {
    const perm = ROLE_PERMISSIONS[roleKey];
    if (!perm) return false;
    if (perm.modules === 'all') return true;
    return tabs.some(t => perm.modules.includes(t));
  };

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h3 style={{ marginBottom: '0.3rem' }}>Rol & Yetki Matrisi</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Her rolün hangi modül gruplarına erişebildiğini görüntüleyin.</p>
      </div>

      {/* Rol Kartları */}
      <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '2rem' }}>
        {roles.map(([key, meta]) => (
          <div key={key} style={{ padding: '1.25rem', background: 'var(--bg-main)', borderRadius: '14px', border: `1px solid ${meta.color}22` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
              <span style={{ padding: '0.25rem 0.7rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '800', ...meta.badgeStyle }}>{meta.label}</span>
              {meta.canWrite ? <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: '700' }}>✓ Yazma İzni</span> : <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: '700' }}>Sadece Okuma</span>}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: '1.5' }}>{meta.description}</p>
            <p style={{ fontSize: '0.72rem', color: meta.color, fontWeight: '700', marginTop: '0.5rem' }}>
              {meta.modules === 'all' ? 'Tüm modüller' : `${meta.modules.length} modül`}
            </p>
          </div>
        ))}
      </div>

      {/* Detaylı Matris */}
      <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '700' }}>Modül Bazlı Erişim Tablosu</h4>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Modül Grubu</th>
              {roles.map(([key, meta]) => (
                <th key={key} style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: meta.color, fontSize: '0.78rem', minWidth: '90px' }}>{meta.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULE_MATRIX.map(group => {
              const isExp = expanded === group.group;
              return (
                <React.Fragment key={group.group}>
                  <tr
                    style={{ cursor: 'pointer', background: isExp ? 'var(--primary-light)' : 'transparent' }}
                    onClick={() => setExpanded(isExp ? null : group.group)}
                  >
                    <td style={{ padding: '0.85rem 1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isExp ? <ChevronUp size={14} style={{ color: 'var(--primary)' }} /> : <ChevronDown size={14} className="text-dim" />}
                      {group.group}
                    </td>
                    {roles.map(([key]) => (
                      <td key={key} style={{ textAlign: 'center', padding: '0.85rem 0.5rem' }}>
                        {hasAccess(key, group.tabs)
                          ? <span style={{ color: 'var(--success)', fontWeight: '800', fontSize: '1rem' }}>✓</span>
                          : <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>—</span>}
                      </td>
                    ))}
                  </tr>
                  {isExp && group.tabs.map(tab => (
                    <tr key={tab} style={{ background: '#f8fafc' }}>
                      <td style={{ padding: '0.5rem 1rem 0.5rem 2.5rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        {tab}
                      </td>
                      {roles.map(([key]) => {
                        const perm = ROLE_PERMISSIONS[key];
                        const ok = perm.modules === 'all' || perm.modules.includes(tab);
                        return (
                          <td key={key} style={{ textAlign: 'center', padding: '0.5rem' }}>
                            {ok ? <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>✓</span> : <span style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>✕</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Bildirim Ayarları ────────────────────────────────────────────────────────
const NotificationSettings = () => {
  const [saved, setSaved] = useState(false);
  const [s, setS] = useState({ sms: true, email: true, push: false, overdueAlert: true, stockAlert: true, vehicleAlert: true });

  return (
    <div>
      <h3 style={{ marginBottom: '2rem' }}>Bildirim Ayarları</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        <SettingsGroup title="Kanal Ayarları">
          <CheckRow label="SMS ile bilgilendir" checked={s.sms} onChange={v => setS(p => ({ ...p, sms: v }))} />
          <CheckRow label="E-Posta ile bilgilendir" checked={s.email} onChange={v => setS(p => ({ ...p, email: v }))} />
          <CheckRow label="Mobil Bildirim (Push)" checked={s.push} onChange={v => setS(p => ({ ...p, push: v }))} />
        </SettingsGroup>
        <SettingsGroup title="Uyarı Türleri">
          <CheckRow label="Vadesi geçmiş fatura uyarıları" checked={s.overdueAlert} onChange={v => setS(p => ({ ...p, overdueAlert: v }))} />
          <CheckRow label="Kritik stok uyarıları" checked={s.stockAlert} onChange={v => setS(p => ({ ...p, stockAlert: v }))} />
          <CheckRow label="Araç muayene/bakım uyarıları" checked={s.vehicleAlert} onChange={v => setS(p => ({ ...p, vehicleAlert: v }))} />
        </SettingsGroup>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
        {saved && <span style={{ color: 'var(--success)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle size={15} /> Kaydedildi</span>}
        <button className="btn btn-primary" onClick={() => { setSaved(true); toast.success('Bildirim ayarları güncellendi'); setTimeout(() => setSaved(false), 3000); }}>
          <Save size={16} /> Ayarları Güncelle
        </button>
      </div>
    </div>
  );
};

// ─── Yeni Kullanıcı Modal ─────────────────────────────────────────────────────
const NewUserModal = ({ onClose }) => {
  const addUser = useAuthStore(s => s.addUser);
  const facilities = ['İstanbul Merkez', 'İzmir Depo', 'Ankara Şube'];
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'Operasyon', facility: facilities[0], password: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name) e.name = 'Ad Soyad girin';
    if (!form.email || !form.email.includes('@')) e.email = 'Geçerli e-posta girin';
    if (!form.password || form.password.length < 6) e.password = 'Min. 6 karakter';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div style={overlayStyle}>
      <div className="card" style={{ width: '100%', maxWidth: '540px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><UserPlus size={20} /></div>
            <div>
              <h2 style={{ fontSize: '1.25rem' }}>Yeni Kullanıcı Ekle</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Sisteme yeni bir kullanıcı tanımlayın</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div className="grid grid-cols-2" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
          <FormField label="Ad Soyad *" error={errors.name}>
            <input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ahmet Yılmaz" style={{ width: '100%' }} />
          </FormField>
          <FormField label="E-Posta *" error={errors.email}>
            <input className={`input ${errors.email ? 'input-error' : ''}`} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ahmet@luvia.com" style={{ width: '100%' }} />
          </FormField>
          <FormField label="Yetki / Rol">
            <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ width: '100%' }}>
              {Object.entries(ROLE_PERMISSIONS).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Tesis">
            <select className="input" value={form.facility} onChange={e => setForm(f => ({ ...f, facility: e.target.value }))} style={{ width: '100%' }}>
              {facilities.map(fac => <option key={fac}>{fac}</option>)}
            </select>
          </FormField>
          <FormField label="Şifre *" error={errors.password}>
            <div style={{ position: 'relative' }}>
              <input
                className={`input ${errors.password ? 'input-error' : ''}`}
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 6 karakter"
                style={{ width: '100%', paddingRight: '2.5rem', boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 0, display: 'flex' }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </FormField>
        </div>

        {/* Seçilen Rol Açıklaması */}
        {form.role && ROLE_PERMISSIONS[form.role] && (
          <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-main)', borderRadius: '10px', marginBottom: '1.25rem', borderLeft: `3px solid ${ROLE_PERMISSIONS[form.role].color}` }}>
            <p style={{ fontSize: '0.82rem', fontWeight: '700', color: ROLE_PERMISSIONS[form.role].color }}>{ROLE_PERMISSIONS[form.role].label}</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>{ROLE_PERMISSIONS[form.role].description}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>İptal</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => {
            if (!validate()) return;
            addUser(form);
            toast.success(`${form.name} sisteme eklendi`);
            onClose();
          }}>Kullanıcıyı Kaydet</button>
        </div>
      </div>
    </div>
  );
};

// ─── Yardımcı ─────────────────────────────────────────────────────────────────
const SettingsGroup = ({ title, children }) => (
  <div>
    <p style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>{title}</p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>{children}</div>
  </div>
);

const CheckRow = ({ label, checked, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', cursor: 'pointer', padding: '0.5rem 0.75rem', borderRadius: '8px', transition: 'background 0.15s' }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }} />
    <span>{label}</span>
  </label>
);

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };

export default Settings;
