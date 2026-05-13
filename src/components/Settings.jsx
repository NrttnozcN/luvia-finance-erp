import { useState } from 'react';
import {
  User, Bell, Database, ChevronRight, Save,
  Mail, MessageSquare, AlertTriangle, HardDrive,
  Clock, Server, Table2, Activity,
} from 'lucide-react';
import useAuthStore from '../store/authStore';

const Settings = () => {
  const currentUser = useAuthStore(s => s.currentUser);
  const [activeTab, setActiveTab] = useState('profile');

  // ── Bildirim ayarları (localStorage'da tutulur) ──
  const [notifSettings, setNotifSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('luvia_notif_settings') || '{}'); }
    catch { return {}; }
  });

  const toggleNotif = (key) => {
    const updated = { ...notifSettings, [key]: !notifSettings[key] };
    setNotifSettings(updated);
    localStorage.setItem('luvia_notif_settings', JSON.stringify(updated));
  };

  const notifOn = (key) => !!notifSettings[key];

  return (
    <div className="settings-container">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Sistem Ayarları</h1>
        <p className="text-muted">Profil bilgileri, bildirim tercihleri ve sistem durumunu yönetin.</p>
      </header>

      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* Sol nav */}
        <div style={{ width: '260px', flexShrink: 0 }}>
          <div className="card" style={{ padding: '0.75rem' }}>
            <TabButton active={activeTab==='profile'}       onClick={()=>setActiveTab('profile')}       icon={<User size={18}/>}     label="Profil & Hesap" />
            <TabButton active={activeTab==='notifications'} onClick={()=>setActiveTab('notifications')} icon={<Bell size={18}/>}     label="Bildirim Ayarları" />
            <TabButton active={activeTab==='system'}        onClick={()=>setActiveTab('system')}        icon={<Database size={18}/>} label="Sistem Veritabanı" />
          </div>
        </div>

        {/* İçerik */}
        <div style={{ flex: 1 }}>

          {/* ── Profil ── */}
          {activeTab === 'profile' && (
            <div className="card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Profil Bilgileri</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '800', border: '3px solid var(--primary)' }}>
                    {getInitials(currentUser?.name)}
                  </div>
                  <div>
                    <p style={{ fontWeight: '700', fontSize: '1.1rem' }}>{currentUser?.name}</p>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{currentUser?.email}</p>
                    <p style={{ color: 'var(--primary)', fontSize: '0.78rem', fontWeight: '700', marginTop: '2px' }}>{currentUser?.roleLabel || currentUser?.role}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
                  <InputGroup label="Ad Soyad" defaultValue={currentUser?.name || ''} />
                  <InputGroup label="E-Posta"   defaultValue={currentUser?.email || ''} />
                  <InputGroup label="Kullanıcı Adı" defaultValue={currentUser?.username || ''} />
                  <InputGroup label="Firma" defaultValue={currentUser?.companyName || '—'} readOnly />
                </div>
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                  <Save size={16} /> Kaydet
                </button>
              </div>
            </div>
          )}

          {/* ── Bildirim Ayarları ── */}
          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
                  <div style={{ padding: '0.6rem', background: '#e0f2fe', borderRadius: '10px', color: '#0284c7' }}><Mail size={20} /></div>
                  <div>
                    <h2 style={{ fontSize: '1.1rem' }}>E-Posta Bildirimleri</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Sisteme kayıtlı e-posta adresinize bildirimler gönderilir.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <NotifRow label="Lisans sona erme uyarıları" desc="Lisans bitimine 15, 7 ve 1 gün kala bildirim" on={notifOn('email_license')} onToggle={() => toggleNotif('email_license')} />
                  <NotifRow label="Yeni destek talebi" desc="Yeni talep açıldığında admin'e e-posta gönder" on={notifOn('email_support')} onToggle={() => toggleNotif('email_support')} />
                  <NotifRow label="Muayene & sigorta hatırlatıcıları" desc="Süresi yaklaşan araç belgesi bildirimi" on={notifOn('email_alerts')} onToggle={() => toggleNotif('email_alerts')} />
                </div>
              </div>

              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
                  <div style={{ padding: '0.6rem', background: '#dcfce7', borderRadius: '10px', color: '#16a34a' }}><MessageSquare size={20} /></div>
                  <div>
                    <h2 style={{ fontSize: '1.1rem' }}>Tarayıcı / Push Bildirimleri</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Sistem içi anlık bildirimler.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <NotifRow label="Anlık destek talebi bildirimi" desc="Yeni talep geldiğinde tarayıcıda bildirim" on={notifOn('push_support')} onToggle={() => toggleNotif('push_support')} />
                  <NotifRow label="Kritik stok uyarısı" desc="Stok eşiği aşıldığında uyar" on={notifOn('push_stock')} onToggle={() => toggleNotif('push_stock')} />
                </div>
              </div>

              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
                  <div style={{ padding: '0.6rem', background: '#fef3c7', borderRadius: '10px', color: '#d97706' }}><AlertTriangle size={20} /></div>
                  <div>
                    <h2 style={{ fontSize: '1.1rem' }}>Sistem Uyarıları</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Kritik sistem olaylarında bildiri alın.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <NotifRow label="Yetkisiz giriş denemesi" desc="Başarısız giriş denemeleri loglanır ve bildirilir" on={notifOn('sys_auth')} onToggle={() => toggleNotif('sys_auth')} />
                  <NotifRow label="Lisans durumu değişikliği" desc="Firma aktif/pasif geçişlerinde uyar" on={notifOn('sys_license')} onToggle={() => toggleNotif('sys_license')} />
                </div>
              </div>
            </div>
          )}

          {/* ── Sistem Veritabanı ── */}
          {activeTab === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
                <DbStatCard icon={<HardDrive size={22} />} color="#0284c7" bg="#e0f2fe" label="Veritabanı Boyutu" value="~6.4 MB" sub="PostgreSQL (Supabase)" />
                <DbStatCard icon={<Clock size={22} />} color="#16a34a" bg="#dcfce7" label="Son Yedekleme" value="Bugün 03:00" sub="Otomatik günlük yedek" />
                <DbStatCard icon={<Server size={22} />} color="#7c3aed" bg="#ede9fe" label="Bağlı İstemci" value="1 aktif" sub="Anlık bağlantı sayısı" />
                <DbStatCard icon={<Activity size={22} />} color="#d97706" bg="#fef3c7" label="Supabase Bölgesi" value="EU West-2" sub="Sunucu konumu" />
              </div>

              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
                  <div style={{ padding: '0.6rem', background: '#f1f5f9', borderRadius: '10px', color: '#475569' }}><Table2 size={20} /></div>
                  <h2 style={{ fontSize: '1.1rem' }}>Tablo Özeti</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {DB_TABLES.map((t, i) => (
                    <div key={t.name} style={{ display: 'flex', alignItems: 'center', padding: '0.85rem 0', borderBottom: i < DB_TABLES.length - 1 ? '1px solid var(--bg-main)' : 'none' }}>
                      <span style={{ flex: 1, fontWeight: '600', fontSize: '0.9rem' }}>{t.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{t.desc}</span>
                      <span style={{ marginLeft: '2rem', fontWeight: '700', fontSize: '0.85rem', color: 'var(--primary)', minWidth: '60px', textAlign: 'right' }}>{t.rows}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <Server size={20} style={{ color: '#94a3b8' }} />
                  <h2 style={{ fontSize: '1rem', color: '#94a3b8' }}>Supabase Proje Bilgileri</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {[
                    ['Platform', 'Supabase (PostgreSQL 15)'],
                    ['Veritabanı', 'PostgreSQL + Realtime'],
                    ['Storage', 'Supabase Storage (S3 uyumlu)'],
                    ['Auth', 'Custom (profiles tablosu)'],
                    ['Deployment', 'Vercel (Auto-deploy — main branch)'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem' }}>
                      <span style={{ color: '#64748b', minWidth: '100px' }}>{k}</span>
                      <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// ─── Yardımcı bileşenler ─────────────────────────────────────────────────────
const TabButton = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', padding: '0.9rem 1rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: active ? '700' : '500', transition: 'all 0.2s',
    background: active ? 'var(--primary-light)' : 'transparent',
    color: active ? 'var(--primary)' : 'var(--text-dim)' }}>
  {icon} {label}
  <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: active ? 1 : 0 }} />
  </button>
);

const InputGroup = ({ label, defaultValue, readOnly }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>{label}</label>
    <input className="input" defaultValue={defaultValue} readOnly={readOnly} style={readOnly ? { opacity: 0.6 } : {}} />
  </div>
);

const NotifRow = ({ label, desc, on, onToggle }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{ flex: 1 }}>
      <p style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '2px' }}>{label}</p>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{desc}</p>
    </div>
    <button type="button" onClick={onToggle} style={{ width: '46px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.25s',
      background: on ? 'var(--primary)' : '#cbd5e1' }}>
      <span style={{ position: 'absolute', top: '3px', left: on ? '23px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.25s' }} />
    </button>
  </div>
);

const DbStatCard = ({ icon, color, bg, label, value, sub }) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '3px' }}>{label}</p>
      <p style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--text)' }}>{value}</p>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '1px' }}>{sub}</p>
    </div>
  </div>
);

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const DB_TABLES = [
  { name: 'companies',           desc: 'Firma kayıtları',          rows: '—' },
  { name: 'profiles',            desc: 'Kullanıcı hesapları',       rows: '—' },
  { name: 'roles',               desc: 'Dinamik roller',            rows: '—' },
  { name: 'customers',           desc: 'Cari hesaplar',             rows: '—' },
  { name: 'invoices',            desc: 'Faturalar',                 rows: '—' },
  { name: 'vehicles',            desc: 'Araç kayıtları',            rows: '—' },
  { name: 'stock_movements',     desc: 'Stok hareketleri',          rows: '—' },
  { name: 'fuel_logs',           desc: 'Akaryakıt kayıtları',       rows: '—' },
  { name: 'documents',           desc: 'Yüklenen dökümanlar',       rows: '—' },
  { name: 'document_categories', desc: 'Döküman kategorileri',      rows: '—' },
];

export default Settings;
