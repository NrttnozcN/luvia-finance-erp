import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, LogIn, Lock, Mail, ShieldCheck, Zap, BarChart3 } from 'lucide-react';
import useAuthStore from '../store/authStore';

const FEATURES = [
  { icon: <Zap size={18} />, title: 'Gerçek Zamanlı Veri', desc: 'Tüm modüller anlık senkronize çalışır' },
  { icon: <ShieldCheck size={18} />, title: 'Rol Tabanlı Erişim', desc: 'Admin, Muhasebe, Operasyon yetki seviyeleri' },
  { icon: <BarChart3 size={18} />, title: 'Çift Taraflı Muhasebe', desc: 'Fatura → Defter entegrasyonu otomatik' },
];

const QUICK_LOGINS = [
  { role: 'Admin',     label: '🔑 Admin',      email: 'admin@luvia.com',     color: '#FF6B00' },
  { role: 'Muhasebe',  label: '💼 Muhasebe',   email: 'muhasebe@luvia.com',  color: '#22C55E' },
  { role: 'Operasyon', label: '🚛 Operasyon',  email: 'operasyon@luvia.com', color: '#F59E0B' },
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  const login = useAuthStore(s => s.login);
  const loginError = useAuthStore(s => s.loginError);
  const clearError = useAuthStore(s => s.clearError);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
    const saved = localStorage.getItem('luvia_remember_email');
    if (saved) { setEmail(saved); setRemember(true); }
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    clearError();
    if (remember) localStorage.setItem('luvia_remember_email', email);
    else localStorage.removeItem('luvia_remember_email');
    setLoading(true);
    await new Promise(r => setTimeout(r, 400)); // hafif efekt
    login(email, password);
    setLoading(false);
  };

  const handleQuickLogin = (ql) => {
    clearError();
    setEmail(ql.email);
    setPassword('123456');
    setLoading(true);
    setTimeout(() => { login(ql.email, '123456'); setLoading(false); }, 300);
  };

  const inputStyle = (hasError) => ({
    width: '100%',
    padding: '0.8rem 1rem 0.8rem 2.85rem',
    border: `1.5px solid ${hasError ? '#ef4444' : '#e2e8f0'}`,
    borderRadius: '12px',
    fontSize: '0.95rem',
    outline: 'none',
    background: 'white',
    color: '#0f172a',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'none' : 'translateY(18px)',
      transition: 'opacity 0.55s ease, transform 0.55s ease',
    }}>

      {/* ── Sol Panel ── */}
      <div style={{
        flex: '0 0 44%',
        background: 'linear-gradient(150deg, #0f172a 0%, #1a2744 55%, #0f172a 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '2.75rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Dekoratif daireler */}
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '350px', height: '350px', borderRadius: '50%', background: 'rgba(255,107,0,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-80px', left: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(255,107,0,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '38%', right: '-50px', width: '180px', height: '180px', borderRadius: '50%', border: '1px solid rgba(255,107,0,0.12)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '55%', left: '30px', width: '80px', height: '80px', borderRadius: '50%', border: '1px solid rgba(255,107,0,0.08)', pointerEvents: 'none' }} />

        {/* Logo + Başlık */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '3.5rem' }}>
            <div style={{ width: '46px', height: '46px', background: 'linear-gradient(135deg, #FF6B00, #e55a00)', borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(255,107,0,0.45)', flexShrink: 0 }}>
              <span style={{ color: 'white', fontWeight: '900', fontSize: '1.6rem', lineHeight: 1 }}>L</span>
            </div>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: 'white', letterSpacing: '-0.05em', lineHeight: 1 }}>Luvia</h1>
              <p style={{ fontSize: '0.62rem', color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: '2px' }}>Enterprise ERP</p>
            </div>
          </div>

          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: 'white', lineHeight: 1.25, marginBottom: '1rem' }}>
            İşlerinizi tek<br />
            <span style={{ color: '#FF6B00' }}>platformda</span> yönetin.
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.65, maxWidth: '310px', marginBottom: '2.75rem' }}>
            Filo, stok, finans ve muhasebe operasyonlarınızı gerçek zamanlı izleyin.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '38px', height: '38px', background: 'rgba(255,107,0,0.13)', border: '1px solid rgba(255,107,0,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6B00', flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <p style={{ fontWeight: '700', color: 'white', fontSize: '0.88rem', lineHeight: 1 }}>{f.title}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '0.72rem', color: '#334155' }}>© 2026 Luvia Software. Tüm hakları saklıdır.</p>
      </div>

      {/* ── Sağ Panel ── */}
      <div style={{ flex: 1, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.4rem' }}>Hoş Geldiniz</h2>
            <p style={{ color: '#64748b', fontSize: '0.93rem' }}>Devam etmek için hesabınıza giriş yapın.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

            {/* E-posta */}
            <div>
              <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: '700', color: '#374151', marginBottom: '0.45rem' }}>Kullanıcı Adı veya E-posta</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearError(); }}
                  placeholder="kullanici.adi veya email@luvia.com"
                  autoComplete="email"
                  style={inputStyle(!!loginError)}
                  onFocus={e => { e.target.style.borderColor = '#FF6B00'; e.target.style.boxShadow = '0 0 0 3px rgba(255,107,0,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = loginError ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {/* Şifre */}
            <div>
              <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: '700', color: '#374151', marginBottom: '0.45rem' }}>Şifre</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearError(); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ ...inputStyle(!!loginError), paddingRight: '3rem' }}
                  onFocus={e => { e.target.style.borderColor = '#FF6B00'; e.target.style.boxShadow = '0 0 0 3px rgba(255,107,0,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = loginError ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px', display: 'flex' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Beni Hatırla + Şifremi Unuttum */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#374151', userSelect: 'none' }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: '#FF6B00', width: '15px', height: '15px' }} />
                Beni Hatırla
              </label>
              <button type="button" onClick={() => alert('Şifre sıfırlama linki gönderildi: ' + email)} style={{ background: 'none', border: 'none', color: '#FF6B00', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700' }}>
                Şifremi Unuttum
              </button>
            </div>

            {/* Hata Mesajı */}
            {loginError && (
              <div style={{ padding: '0.8rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#dc2626', fontSize: '0.875rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ⚠️ {loginError}
              </div>
            )}

            {/* Giriş Butonu */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                width: '100%', padding: '0.9rem',
                background: loading ? '#f97316' : 'linear-gradient(135deg, #FF6B00, #e55a00)',
                color: 'white', border: 'none', borderRadius: '12px',
                fontWeight: '800', fontSize: '1rem', cursor: loading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                boxShadow: '0 4px 18px rgba(255,107,0,0.35)',
                transition: 'opacity 0.2s, transform 0.15s',
                opacity: (!email || !password) ? 0.65 : 1,
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  Giriş yapılıyor...
                </span>
              ) : (
                <><LogIn size={18} /> Giriş Yap</>
              )}
            </button>
          </form>

          {/* Demo Hesapları */}
          <div style={{ marginTop: '1.75rem', padding: '1.2rem', background: 'rgba(255,107,0,0.05)', border: '1px dashed rgba(255,107,0,0.22)', borderRadius: '14px' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: '800', color: '#94a3b8', marginBottom: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Demo Hesapları — Şifre: <span style={{ color: '#FF6B00' }}>123456</span>
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {QUICK_LOGINS.map(ql => (
                <button
                  key={ql.role}
                  onClick={() => handleQuickLogin(ql)}
                  style={{
                    padding: '0.38rem 0.8rem',
                    border: `1.5px solid ${ql.color}33`,
                    background: `${ql.color}0f`,
                    borderRadius: '8px',
                    color: ql.color,
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${ql.color}22`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${ql.color}0f`; e.currentTarget.style.transform = 'none'; }}
                >
                  {ql.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.75rem', justifyContent: 'center' }}>
            <ShieldCheck size={13} />
            <span>256-bit şifreleme ile korunmaktadır</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Login;
