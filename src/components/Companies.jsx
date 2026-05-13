import { useState, useEffect } from 'react';
import { Building2, Plus, X, AlertTriangle, Edit2, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

const daysUntil = (d) => {
  if (!d) return null;
  return Math.ceil((new Date(d).setHours(23, 59, 59, 999) - Date.now()) / 86400000);
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '—';

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', tax_no: '', address: '', phone: '', license_end_date: '' });
  const [newAdmin, setNewAdmin] = useState({ full_name: '', username: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});

  const fetchCompanies = async () => {
    setLoading(true);
    const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
    setCompanies(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCompanies(); }, []);

  // Lisansı 15 günden az kalmış veya dolmuş ve aktif firmalar
  const warningCompanies = companies.filter(c => {
    if (c.status === 'passive') return false;
    const days = daysUntil(c.license_end_date);
    return days !== null && days <= 15;
  });

  const resetAddModal = () => {
    setNewCompany({ name: '', tax_no: '', address: '', phone: '', license_end_date: '' });
    setNewAdmin({ full_name: '', username: '', email: '', password: '' });
    setErrors({});
    setShowAddModal(false);
  };

  const validateAdd = () => {
    const e = {};
    if (!newCompany.name.trim()) e.name = true;
    if (!newAdmin.full_name.trim()) e.full_name = true;
    if (!newAdmin.username.trim()) e.username = true;
    if (!newAdmin.password.trim()) e.password = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validateAdd()) return;
    setSaving(true);

    const { data: company, error: compError } = await supabase
      .from('companies')
      .insert([{
        name: newCompany.name.trim(),
        tax_no: newCompany.tax_no.trim() || null,
        address: newCompany.address.trim() || null,
        phone: newCompany.phone.trim() || null,
        license_end_date: newCompany.license_end_date || null,
        status: 'active',
      }])
      .select()
      .single();

    if (compError) {
      alert('Firma eklenemedi: ' + compError.message);
      setSaving(false);
      return;
    }

    const { error: profError } = await supabase.from('profiles').insert([{
      full_name: newAdmin.full_name.trim(),
      username: newAdmin.username.trim().toLowerCase(),
      email: newAdmin.email.trim().toLowerCase() || null,
      password: newAdmin.password,
      role: 'Admin',
      company_id: company.id,
      status: 'Aktif',
    }]);

    if (profError) {
      await supabase.from('companies').delete().eq('id', company.id);
      alert('Yönetici eklenemedi: ' + profError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    resetAddModal();
    fetchCompanies();
  };

  const handleUpdate = async () => {
    const e = {};
    if (!editRecord.name?.trim()) e.name = true;
    setEditErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    const { error } = await supabase.from('companies').update({
      name: editRecord.name.trim(),
      license_end_date: editRecord.license_end_date || null,
      status: editRecord.status || 'active',
    }).eq('id', editRecord.id);

    if (error) {
      alert('Güncelleme hatası: ' + error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditRecord(null);
    fetchCompanies();
  };

  const activeCount = companies.filter(c => c.status === 'active').length;
  const passiveCount = companies.filter(c => c.status === 'passive').length;

  return (
    <div>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Müşteri Firmalar</h1>
          <p className="text-muted">Platforma kayıtlı tüm müşteri firmalarını, lisansları ve erişim durumlarını yönetin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Firma Ekle
        </button>
      </header>

      {/* Lisans Uyarı Banner'ı */}
      {warningCompanies.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.875rem',
          background: 'linear-gradient(135deg, #fff7ed, #fef3c7)',
          border: '1px solid #f59e0b',
          borderLeft: '4px solid #f59e0b',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '2rem',
        }}>
          <AlertTriangle size={20} style={{ color: '#d97706', flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: '800', fontSize: '0.9rem', color: '#92400e' }}>
              Dikkat: {warningCompanies.length} firmanın lisans süresi dolmak üzere veya bitti!
            </p>
            <p style={{ fontSize: '0.8rem', color: '#b45309', marginTop: '2px' }}>
              {warningCompanies.map(c => {
                const d = daysUntil(c.license_end_date);
                return `${c.name} (${d < 0 ? 'Süresi doldu' : d + ' gün kaldı'})`;
              }).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--primary-light)', borderRadius: '8px', color: 'var(--primary)' }}><Building2 size={18} /></div>
            <p className="text-muted">Toplam Firma</p>
          </div>
          <h2 style={{ fontSize: '2rem' }}>{companies.length}</h2>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: '#dcfce7', borderRadius: '8px', color: '#16a34a' }}><CheckCircle size={18} /></div>
            <p className="text-muted">Aktif Firma</p>
          </div>
          <h2 style={{ fontSize: '2rem', color: 'var(--success)' }}>{activeCount}</h2>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: '#fee2e2', borderRadius: '8px', color: '#dc2626' }}><XCircle size={18} /></div>
            <p className="text-muted">Pasif Firma</p>
          </div>
          <h2 style={{ fontSize: '2rem', color: 'var(--danger)' }}>{passiveCount}</h2>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: '#fef3c7', borderRadius: '8px', color: '#d97706' }}><AlertTriangle size={18} /></div>
            <p className="text-muted">Lisans Uyarısı</p>
          </div>
          <h2 style={{ fontSize: '2rem', color: warningCompanies.length > 0 ? '#d97706' : 'var(--text)' }}>{warningCompanies.length}</h2>
        </div>
      </div>

      {/* Firma Tablosu */}
      <div className="card" style={{ padding: '0' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.25rem' }}>Firma Adı</th>
              <th>Vergi No</th>
              <th>Telefon</th>
              <th>Lisans Bitiş</th>
              <th>Durum</th>
              <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</td></tr>
            ) : companies.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Henüz firma kaydı bulunmuyor.</td></tr>
            ) : companies.map(c => {
              const days = daysUntil(c.license_end_date);
              const isExpired = days !== null && days < 0;
              const isWarning = days !== null && days >= 0 && days <= 15;
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        background: c.status === 'passive' ? '#f1f5f9' : 'var(--primary-light)',
                        padding: '0.5rem', borderRadius: '8px',
                        color: c.status === 'passive' ? '#94a3b8' : 'var(--primary)'
                      }}>
                        <Building2 size={18} />
                      </div>
                      <div>
                        <p style={{ fontWeight: '700', color: c.status === 'passive' ? 'var(--text-dim)' : 'var(--text)' }}>{c.name}</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                          {new Date(c.created_at).toLocaleDateString('tr-TR')} tarihinde eklendi
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="text-dim" style={{ fontSize: '0.85rem' }}>{c.tax_no || '—'}</td>
                  <td className="text-dim" style={{ fontSize: '0.85rem' }}>{c.phone || '—'}</td>
                  <td>
                    {!c.license_end_date ? (
                      <span className="text-dim" style={{ fontSize: '0.85rem' }}>—</span>
                    ) : isExpired ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--danger)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--danger)' }}>
                          Süresi Doldu · {fmtDate(c.license_end_date)}
                        </span>
                      </div>
                    ) : isWarning ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#d97706' }}>
                          {days} gün kaldı · {fmtDate(c.license_end_date)}
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.85rem' }}>{fmtDate(c.license_end_date)}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    {c.status === 'passive' ? (
                      <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', width: 'fit-content' }}>
                        <XCircle size={11} /> Pasif
                      </span>
                    ) : (
                      <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', width: 'fit-content' }}>
                        <CheckCircle size={11} /> Aktif
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                    <button
                      className="btn btn-ghost"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '700' }}
                      onClick={() => setEditRecord({ ...c, license_end_date: c.license_end_date || '' })}
                    >
                      <Edit2 size={14} /> Düzenle
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* DÜZENLE MODAL */}
      {editRecord && (
        <div style={modalOverlayStyle}>
          <div className="card" style={{ ...modalContentStyle, maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}>
                  <Edit2 size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem' }}>Firmayı Düzenle</h2>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>{editRecord.name}</p>
                </div>
              </div>
              <button onClick={() => { setEditRecord(null); setEditErrors({}); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              <IG
                label="Firma Adı *"
                placeholder="Firma adı"
                value={editRecord.name}
                onChange={e => setEditRecord({ ...editRecord, name: e.target.value })}
                error={editErrors.name}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={13} /> Lisans Bitiş Tarihi
                </label>
                <input
                  className="input"
                  type="date"
                  value={editRecord.license_end_date || ''}
                  onChange={e => setEditRecord({ ...editRecord, license_end_date: e.target.value })}
                />
                {editRecord.license_end_date && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {(() => {
                      const d = daysUntil(editRecord.license_end_date);
                      if (d === null) return '';
                      if (d < 0) return `⚠️ Lisans ${Math.abs(d)} gün önce sona erdi.`;
                      if (d === 0) return '⚠️ Lisans bugün sona eriyor.';
                      return `✓ Lisansa ${d} gün kaldı.`;
                    })()}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>Firma Durumu</label>
                <select
                  className="input"
                  value={editRecord.status || 'active'}
                  onChange={e => setEditRecord({ ...editRecord, status: e.target.value })}
                  style={editRecord.status === 'passive' ? { borderColor: 'var(--danger)', color: 'var(--danger)' } : {}}
                >
                  <option value="active">✓ Aktif — Firma sisteme erişebilir</option>
                  <option value="passive">✗ Pasif — Tüm girişler engellenir</option>
                </select>
                {editRecord.status === 'passive' && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: '600' }}>
                    Pasife alındığında bu firmadaki tüm kullanıcıların girişi engellenecektir.
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setEditRecord(null); setEditErrors({}); }}>İptal</button>
              <button
                className="btn btn-primary"
                style={{ flex: 2, background: editRecord.status === 'passive' ? 'var(--danger)' : undefined }}
                onClick={handleUpdate}
                disabled={saving}
              >
                {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YENİ FİRMA EKLE MODAL */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}>
                  <Building2 size={20} />
                </div>
                <h2 style={{ fontSize: '1.25rem' }}>Yeni Firma & Yönetici Ekle</h2>
              </div>
              <button onClick={resetAddModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <SectionLabel label="Firma Bilgileri" />
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.75rem' }}>
              <IG label="Firma Adı *" placeholder="Örn: ABC Lojistik A.Ş." value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value})} error={errors.name} />
              <IG label="Vergi No" placeholder="10 haneli..." value={newCompany.tax_no} onChange={e => setNewCompany({...newCompany, tax_no: e.target.value})} />
              <IG label="Telefon" placeholder="05xx xxx xx xx" value={newCompany.phone} onChange={e => setNewCompany({...newCompany, phone: e.target.value})} />
              <IG label="Adres" placeholder="İl / İlçe" value={newCompany.address} onChange={e => setNewCompany({...newCompany, address: e.target.value})} />
              <div style={{ gridColumn: 'span 2' }}>
                <IG
                  label="Lisans Bitiş Tarihi (opsiyonel)"
                  type="date"
                  value={newCompany.license_end_date}
                  onChange={e => setNewCompany({...newCompany, license_end_date: e.target.value})}
                />
              </div>
            </div>

            <SectionLabel label="İlk Yönetici (Admin) Bilgileri" />
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.75rem' }}>
              <IG label="Ad Soyad *" placeholder="Örn: Ahmet Yılmaz" value={newAdmin.full_name} onChange={e => setNewAdmin({...newAdmin, full_name: e.target.value})} error={errors.full_name} />
              <IG label="Kullanıcı Adı *" placeholder="ahmetyilmaz" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} error={errors.username} />
              <IG label="E-posta" type="email" placeholder="admin@firma.com" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} />
              <IG label="Şifre *" type="password" placeholder="Güçlü bir şifre..." value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} error={errors.password} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={resetAddModal}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Firmayı Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SectionLabel = ({ label }) => (
  <p style={{
    fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)'
  }}>
    {label}
  </p>
);

const IG = ({ label, placeholder, type, value, onChange, error }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>{label}</label>
    <input
      className="input"
      type={type || 'text'}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={error ? { borderColor: 'var(--danger)' } : {}}
    />
    {error && <span style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: '600' }}>Bu alanın girilmesi zorunludur.</span>}
  </div>
);

const modalOverlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, backdropFilter: 'blur(4px)'
};
const modalContentStyle = { width: '100%', maxWidth: '650px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' };

export default Companies;
