import React, { useState, useEffect } from 'react';
import { Building2, Plus, X, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', tax_no: '', address: '', phone: '' });
  const [newAdmin, setNewAdmin] = useState({ full_name: '', username: '', email: '', password: '' });
  const [errors, setErrors] = useState({});

  const fetchCompanies = async () => {
    setLoading(true);
    const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
    setCompanies(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCompanies(); }, []);

  const resetModal = () => {
    setNewCompany({ name: '', tax_no: '', address: '', phone: '' });
    setNewAdmin({ full_name: '', username: '', email: '', password: '' });
    setErrors({});
    setShowAddModal(false);
  };

  const validate = () => {
    const e = {};
    if (!newCompany.name.trim()) e.name = true;
    if (!newAdmin.full_name.trim()) e.full_name = true;
    if (!newAdmin.username.trim()) e.username = true;
    if (!newAdmin.password.trim()) e.password = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const { data: company, error: compError } = await supabase
      .from('companies')
      .insert([{
        name: newCompany.name.trim(),
        tax_no: newCompany.tax_no.trim() || null,
        address: newCompany.address.trim() || null,
        phone: newCompany.phone.trim() || null,
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
    resetModal();
    fetchCompanies();
  };

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Müşteri Firmalar</h1>
          <p className="text-muted">Platforma kayıtlı tüm müşteri firmalarını ve admin kullanıcılarını yönetin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Firma Ekle
        </button>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Toplam Firma</p>
          <h2 style={{ fontSize: '2rem' }}>{companies.length}</h2>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.25rem' }}>Firma Adı</th>
              <th>Vergi No</th>
              <th>Telefon</th>
              <th>Kayıt Tarihi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</td></tr>
            ) : companies.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem' }}>Henüz firma kaydı bulunmuyor.</td></tr>
            ) : companies.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                <td style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '8px', color: 'var(--primary)' }}>
                      <Building2 size={18} />
                    </div>
                    <span style={{ fontWeight: '700' }}>{c.name}</span>
                  </div>
                </td>
                <td className="text-dim">{c.tax_no || '—'}</td>
                <td className="text-dim">{c.phone || '—'}</td>
                <td style={{ fontSize: '0.85rem' }}>{new Date(c.created_at).toLocaleDateString('tr-TR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
              <button onClick={resetModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <SectionLabel label="Firma Bilgileri" />
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.75rem' }}>
              <IG label="Firma Adı *" placeholder="Örn: ABC Lojistik A.Ş." value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value})} error={errors.name} />
              <IG label="Vergi No" placeholder="10 haneli..." value={newCompany.tax_no} onChange={e => setNewCompany({...newCompany, tax_no: e.target.value})} />
              <IG label="Telefon" placeholder="05xx xxx xx xx" value={newCompany.phone} onChange={e => setNewCompany({...newCompany, phone: e.target.value})} />
              <IG label="Adres" placeholder="İl / İlçe" value={newCompany.address} onChange={e => setNewCompany({...newCompany, address: e.target.value})} />
            </div>

            <SectionLabel label="İlk Yönetici (Admin) Bilgileri" />
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.75rem' }}>
              <IG label="Ad Soyad *" placeholder="Örn: Ahmet Yılmaz" value={newAdmin.full_name} onChange={e => setNewAdmin({...newAdmin, full_name: e.target.value})} error={errors.full_name} />
              <IG label="Kullanıcı Adı *" placeholder="ahmetyilmaz" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} error={errors.username} />
              <IG label="E-posta" type="email" placeholder="admin@firma.com" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} />
              <IG label="Şifre *" type="password" placeholder="Güçlü bir şifre..." value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} error={errors.password} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={resetModal}>İptal</button>
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
  <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
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

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modalContentStyle = { width: '100%', maxWidth: '650px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' };

export default Companies;
