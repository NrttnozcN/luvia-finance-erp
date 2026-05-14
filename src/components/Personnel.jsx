import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Pencil, X, ChevronLeft, ChevronRight,
  Calendar, Plus, Trash2, Save, UserCheck, ClipboardList, ArrowLeftRight,
  DollarSign, FileText, Star, Receipt, Wallet, Download,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

// ─── Constants ───────────────────────────────────────────────────────────────
const ATTENDANCE_STATUSES = ['Geldi', 'Gelmedi', 'İzinli', 'Raporlu', 'Tatil'];
const STATUS_COLORS = {
  Geldi:   { bg: '#dcfce7', color: '#16a34a' },
  Gelmedi: { bg: '#fee2e2', color: '#dc2626' },
  İzinli:  { bg: '#dbeafe', color: '#2563eb' },
  Raporlu: { bg: '#fef3c7', color: '#d97706' },
  Tatil:   { bg: '#f1f5f9', color: '#64748b' },
};
const DEPARTMENTS  = ['Operasyon', 'Muhasebe', 'İnsan Kaynakları', 'Lojistik', 'Teknik', 'İdari', 'Güvenlik', 'Diğer'];
const EMP_STATUSES = ['Aktif', 'Pasif', 'İzinli', 'Çıkış Yaptı'];
const LEAVE_TYPES  = ['Yıllık', 'Mazeret', 'Ücretsiz', 'Hastalık', 'Doğum', 'Babalık'];
const EXPENSE_CATS = ['Yol', 'Yemek', 'Konaklama', 'Yakıt', 'Temsil', 'Diğer'];
const DOC_TYPES    = ['İş Sözleşmesi', 'Nüfus Cüzdanı', 'Diploma', 'İkametgah', 'Adli Sicil', 'Sağlık Raporu', 'Diğer'];
const MONTH_NAMES  = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// SGK 2024 oranları
const SGK_WORKER          = 0.14;
const SGK_EMPLOYER        = 0.155;
const UNEMPLOYMENT_WORKER = 0.01;
const UNEMPLOYMENT_EMP    = 0.02;
const STAMP_TAX_RATE      = 0.00759;

const calcIncomeTax = (base) => {
  if (base <= 0) return 0;
  const brackets = [[9167, 0.15], [10000, 0.20], [29166, 0.27], [201667, 0.35], [Infinity, 0.40]];
  let tax = 0, rem = base;
  for (const [amt, rate] of brackets) {
    if (rem <= 0) break;
    const chunk = amt === Infinity ? rem : Math.min(rem, amt);
    tax += chunk * rate;
    rem -= chunk;
  }
  return Math.round(tax * 100) / 100;
};

const calcBordro = (gross) => {
  const g    = Number(gross) || 0;
  const sgkW = Math.round(g * SGK_WORKER * 100) / 100;
  const sgkE = Math.round(g * SGK_EMPLOYER * 100) / 100;
  const unemW = Math.round(g * UNEMPLOYMENT_WORKER * 100) / 100;
  const unemE = Math.round(g * UNEMPLOYMENT_EMP * 100) / 100;
  const taxBase   = Math.max(0, g - sgkW - unemW);
  const incomeTax = calcIncomeTax(taxBase);
  const stampTax  = Math.round(g * STAMP_TAX_RATE * 100) / 100;
  const net = Math.max(0, g - sgkW - unemW - incomeTax - stampTax);
  return { gross: g, sgkW, sgkE, unemW, unemE, taxBase, incomeTax, stampTax, net, employerCost: g + sgkE + unemE };
};

const calcLeaveEntitlement = (hireDate) => {
  if (!hireDate) return 14;
  const years = (Date.now() - new Date(hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (years >= 15) return 26;
  if (years >= 5)  return 20;
  return 14;
};

const getInitials = (name) => {
  if (!name) return '?';
  const p = name.trim().split(' ').filter(Boolean);
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

const fmt     = (n) => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('tr-TR') : '—';
const daysBetween = (a, b) => (!a || !b) ? 1 : Math.max(1, Math.ceil((new Date(b) - new Date(a)) / 86400000) + 1);

const EMPTY_EMP = { full_name: '', tc_kimlik: '', phone: '', job_title: '', department: '', hire_date: '', salary: '', facility_id: '', status: 'Aktif' };

// ─── EmpSelect: shared employee picker ───────────────────────────────────────
const EmpSelect = ({ employees, value, onChange }) => (
  <div style={{ marginBottom: '1.5rem' }}>
    <div className="card">
      <label className="form-label">Personel</label>
      <select className="input" value={value} onChange={e => onChange(e.target.value)} style={{ maxWidth: '420px' }}>
        <option value="">— Personel seçiniz —</option>
        {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}{e.job_title ? ` (${e.job_title})` : ''}</option>)}
      </select>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Personnel = ({ initialTab = 'definition' }) => {
  const currentUser = useAuthStore(s => s.currentUser);
  const cid = currentUser?.company_id;
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  const TABS = [
    { key: 'definition', label: 'Personel',    icon: <UserCheck size={15} /> },
    { key: 'payroll',    label: 'Puantaj',      icon: <ClipboardList size={15} /> },
    { key: 'bordro',     label: 'Bordro',       icon: <DollarSign size={15} /> },
    { key: 'izin',       label: 'İzin',         icon: <Calendar size={15} /> },
    { key: 'avans',      label: 'Avans',        icon: <Wallet size={15} /> },
    { key: 'belgeler',   label: 'Belgeler',     icon: <FileText size={15} /> },
    { key: 'performans', label: 'Performans',   icon: <Star size={15} /> },
    { key: 'masraf',     label: 'Masraf',       icon: <Receipt size={15} /> },
    { key: 'position',   label: 'Pozisyon',     icon: <ArrowLeftRight size={15} /> },
  ];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem' }}>İnsan Kaynakları</h1>
        <p className="text-muted">Personel yönetimi, bordro, izin, avans, belge ve performans takibi.</p>
      </div>
      <div style={{ display: 'flex', gap: '0', marginBottom: '2rem', borderBottom: '2px solid var(--bg-main)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.7rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === t.key ? '700' : '500', fontSize: '0.84rem', whiteSpace: 'nowrap', color: activeTab === t.key ? 'var(--primary)' : 'var(--text-dim)', borderBottom: activeTab === t.key ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: '-2px' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {activeTab === 'definition' && <DefinitionTab cid={cid} />}
      {activeTab === 'payroll'    && <PayrollRootTab cid={cid} />}
      {activeTab === 'bordro'     && <BordroTab cid={cid} />}
      {activeTab === 'izin'       && <IzinTab cid={cid} />}
      {activeTab === 'avans'      && <AvansTab cid={cid} />}
      {activeTab === 'belgeler'   && <BelgelerTab cid={cid} />}
      {activeTab === 'performans' && <PerformansTab cid={cid} />}
      {activeTab === 'masraf'     && <MasrafTab cid={cid} />}
      {activeTab === 'position'   && <PositionTab cid={cid} />}
    </div>
  );
};

// ─── Definition Tab ───────────────────────────────────────────────────────────
const DefinitionTab = ({ cid }) => {
  const [employees, setEmployees] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Aktif');
  const [showModal, setShowModal] = useState(false);
  const [editRec, setEditRec] = useState(null);
  const [form, setForm] = useState(EMPTY_EMP);
  const [saving, setSaving] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('employees').select('*').eq('company_id', cid).order('full_name');
    setEmployees((data || []).map(e => ({ ...e, status: e.status || 'Aktif' })));
    setLoading(false);
  }, [cid]);

  const fetchFacilities = useCallback(async () => {
    const { data } = await supabase.from('facilities').select('id, name').eq('company_id', cid);
    setFacilities(data || []);
  }, [cid]);

  useEffect(() => { fetchEmployees(); fetchFacilities(); }, [fetchEmployees, fetchFacilities]);

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    return (!search || e.full_name?.toLowerCase().includes(q) || e.job_title?.toLowerCase().includes(q))
      && (!filterStatus || e.status === filterStatus);
  });

  const openAdd  = () => { setForm(EMPTY_EMP); setEditRec(null); setShowModal(true); };
  const openEdit = (e) => { setForm({ ...EMPTY_EMP, ...e, facility_id: e.facility_id || '' }); setEditRec(e); setShowModal(true); };

  const handleSave = async () => {
    if (!form.full_name.trim()) { alert('Ad Soyad zorunludur.'); return; }
    setSaving(true);
    const payload = { company_id: cid, full_name: form.full_name.trim(), tc_kimlik: form.tc_kimlik || null, phone: form.phone || null, job_title: form.job_title || null, department: form.department || null, hire_date: form.hire_date || null, salary: form.salary ? Number(form.salary) : null, facility_id: form.facility_id || null, status: form.status || 'Aktif' };
    const { error } = editRec
      ? await supabase.from('employees').update(payload).eq('id', editRec.id)
      : await supabase.from('employees').insert(payload);
    setSaving(false);
    if (error) { alert(error.message); return; }
    setShowModal(false);
    fetchEmployees();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu personeli silmek istediğinizden emin misiniz?')) return;
    await supabase.from('employees').delete().eq('id', id);
    fetchEmployees();
  };

  const handleExport = () => {
    const csv = '﻿Ad Soyad,TC Kimlik,Telefon,Görev,Departman,Tesis,İşe Giriş,Maaş,Durum\n'
      + filtered.map(e => [`"${e.full_name||''}"`,`"${e.tc_kimlik||''}"`,`"${e.phone||''}"`,`"${e.job_title||''}"`,`"${e.department||''}"`,`"${facilities.find(f => f.id === e.facility_id)?.name||''}"`, e.hire_date||'', e.salary||'', e.status||''].join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    Object.assign(document.createElement('a'), { href: url, download: 'personel.csv' }).click();
    URL.revokeObjectURL(url);
  };

  const totalSalary = employees.filter(e => e.status === 'Aktif').reduce((s, e) => s + (Number(e.salary) || 0), 0);

  return (
    <div>
      <div className="grid grid-cols-3" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        <StatCard label="Aktif Personel"     value={employees.filter(e => e.status === 'Aktif').length} color="#0284c7" />
        <StatCard label="Toplam Maaş Gideri" value={`₺${totalSalary.toLocaleString('tr-TR')}`}         color="#16a34a" />
        <StatCard label="Tesis / Şube"       value={facilities.length}                                   color="#7c3aed" />
      </div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input className="input" placeholder="İsim veya görev ara…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
          </div>
          <select className="input" style={{ width: '160px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tüm Durumlar</option>
            {EMP_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="btn btn-outline" onClick={handleExport}>CSV İndir</button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Personel Ekle</button>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Yükleniyor…</div>
        : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <Users size={48} style={{ color: 'var(--text-dim)', margin: '0 auto 1rem', display: 'block' }} />
            <p style={{ fontWeight: '700', marginBottom: '0.5rem' }}>Personel bulunamadı</p>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>Yeni personel eklemek için "Personel Ekle" butonunu kullanın.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--bg-main)' }}>
                {['Ad Soyad', 'Görev / Departman', 'Tesis', 'İşe Giriş', 'Maaş', 'Durum', ''].map(h => (
                  <th key={h} style={{ padding: '1rem 1.25rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--bg-main)' : 'none' }}
                  onMouseEnter={el => el.currentTarget.style.background = 'var(--bg-main)'}
                  onMouseLeave={el => el.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.8rem', flexShrink: 0 }}>{getInitials(e.full_name)}</div>
                      <div>
                        <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{e.full_name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{e.phone || e.tc_kimlik || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontSize: '0.88rem' }}>
                    <p>{e.job_title || <span style={{ color: 'var(--text-dim)' }}>—</span>}</p>
                    {e.department && <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{e.department}</p>}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontSize: '0.88rem' }}>{facilities.find(f => f.id === e.facility_id)?.name || <span style={{ color: 'var(--text-dim)' }}>Merkez</span>}</td>
                  <td style={{ padding: '1rem 1.25rem', fontSize: '0.88rem' }}>{e.hire_date ? fmtDate(e.hire_date) : <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
                  <td style={{ padding: '1rem 1.25rem', fontSize: '0.88rem', fontWeight: '600' }}>{e.salary ? `₺${Number(e.salary).toLocaleString('tr-TR')}` : <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span style={{ padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: e.status === 'Aktif' ? '#dcfce7' : '#f1f5f9', color: e.status === 'Aktif' ? '#16a34a' : '#64748b' }}>{e.status}</span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => openEdit(e)}><Pencil size={13} /> Düzenle</button>
                      <button onClick={() => handleDelete(e.id)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--danger)', padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center' }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
              <h2 style={{ fontSize: '1.1rem' }}>{editRec ? 'Personel Düzenle' : 'Yeni Personel Ekle'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '1.5rem 2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Ad Soyad *</label>
                <input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Örn: Ahmet Yılmaz" />
              </div>
              <div><label className="form-label">TC Kimlik No</label><input className="input" value={form.tc_kimlik} onChange={e => setForm(f => ({ ...f, tc_kimlik: e.target.value }))} maxLength={11} /></div>
              <div><label className="form-label">Telefon</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="05xx xxx xx xx" /></div>
              <div><label className="form-label">Görev / Unvan</label><input className="input" value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} /></div>
              <div>
                <label className="form-label">Departman</label>
                <select className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                  <option value="">— Seçiniz —</option>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div><label className="form-label">İşe Giriş Tarihi</label><input className="input" type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} /></div>
              <div><label className="form-label">Maaş (₺)</label><input className="input" type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} /></div>
              <div>
                <label className="form-label">Tesis / Şube</label>
                <select className="input" value={form.facility_id} onChange={e => setForm(f => ({ ...f, facility_id: e.target.value }))}>
                  <option value="">Merkez</option>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Durum</label>
                <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {EMP_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--bg-main)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Save size={15} /> {saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Payroll Root Tab (Puantaj) ───────────────────────────────────────────────
const PayrollRootTab = ({ cid }) => {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState('');
  const [payrollTab, setPayrollTab] = useState('attendance');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('employees').select('id, full_name, job_title, hire_date, salary').eq('company_id', cid).order('full_name');
      setEmployees(data || []);
      setLoading(false);
    })();
  }, [cid]);

  const person = employees.find(e => e.id === selected);

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Personel Seç</label>
            <select className="input" value={selected} onChange={e => { setSelected(e.target.value); setPayrollTab('attendance'); }}>
              <option value="">— Personel seçiniz —</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}{e.job_title ? ` (${e.job_title})` : ''}</option>)}
            </select>
          </div>
          {loading && <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', paddingBottom: '0.75rem' }}>Yükleniyor…</span>}
        </div>
      </div>
      {!selected ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>
          <ClipboardList size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
          <p style={{ fontWeight: '600', fontSize: '0.95rem' }}>Devam kaydı görüntülemek için personel seçin.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.95rem', flexShrink: 0 }}>{getInitials(person?.full_name)}</div>
            <div>
              <p style={{ fontWeight: '700', fontSize: '1rem' }}>{person?.full_name}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{person?.job_title || 'Görev belirtilmemiş'}{person?.hire_date ? ` · İşe Giriş: ${fmtDate(person.hire_date)}` : ''}</p>
            </div>
          </div>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--bg-main)', marginBottom: '1.5rem' }}>
            {[{ key: 'attendance', label: 'Puantaj' }, { key: 'deductions', label: 'Maaş & Kesintiler' }, { key: 'leave', label: 'Yıllık İzin' }].map(t => (
              <button key={t.key} onClick={() => setPayrollTab(t.key)}
                style={{ padding: '0.75rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: payrollTab === t.key ? '700' : '500', fontSize: '0.88rem', color: payrollTab === t.key ? 'var(--primary)' : 'var(--text-dim)', borderBottom: payrollTab === t.key ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: '-1px' }}>
                {t.label}
              </button>
            ))}
          </div>
          {payrollTab === 'attendance' && <AttendanceTab employeeId={selected} />}
          {payrollTab === 'deductions' && <DeductionsTab employee={person} />}
          {payrollTab === 'leave'      && <LeaveTab employee={person} />}
        </>
      )}
    </div>
  );
};

// ─── Attendance Tab ───────────────────────────────────────────────────────────
const AttendanceTab = ({ employeeId }) => {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm] = useState({ date: today.toISOString().split('T')[0], status: 'Geldi', note: '' });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to   = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
    const { data } = await supabase.from('employee_attendance').select('*').eq('employee_id', employeeId).gte('date', from).lte('date', to).order('date', { ascending: false });
    setRecords(data || []);
    setLoading(false);
  }, [employeeId, year, month]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handleSave = async () => {
    if (!form.date || !form.status) return;
    setSaving(true);
    const { data: ex } = await supabase.from('employee_attendance').select('id').eq('employee_id', employeeId).eq('date', form.date).maybeSingle();
    const payload = { status: form.status, note: form.note || null };
    const { error } = ex
      ? await supabase.from('employee_attendance').update(payload).eq('id', ex.id)
      : await supabase.from('employee_attendance').insert({ employee_id: employeeId, date: form.date, ...payload });
    setSaving(false);
    if (error) { alert(error.message); return; }
    fetchRecords();
  };

  const counts = ATTENDANCE_STATUSES.reduce((acc, s) => ({ ...acc, [s]: records.filter(r => r.status === s).length }), {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button className="btn btn-outline" style={{ padding: '0.4rem 0.6rem' }} onClick={prevMonth}><ChevronLeft size={16} /></button>
        <span style={{ fontWeight: '700', minWidth: '130px', textAlign: 'center' }}>{MONTH_NAMES[month - 1]} {year}</span>
        <button className="btn btn-outline" style={{ padding: '0.4rem 0.6rem' }} onClick={nextMonth}><ChevronRight size={16} /></button>
        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {ATTENDANCE_STATUSES.map(s => counts[s] > 0 && (
            <span key={s} style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: STATUS_COLORS[s].bg, color: STATUS_COLORS[s].color }}>{s}: {counts[s]}</span>
          ))}
        </div>
      </div>
      <div className="card" style={{ background: 'var(--bg-main)' }}>
        <p style={{ fontWeight: '700', fontSize: '0.88rem', marginBottom: '1rem' }}>Yoklama Girişi</p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div><label className="form-label">Tarih</label><input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '155px' }} /></div>
          <div><label className="form-label">Durum</label><select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ width: '135px' }}>{ATTENDANCE_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
          <div style={{ flex: 1, minWidth: '150px' }}><label className="form-label">Not</label><input className="input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Açıklama…" /></div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet / Güncelle'}</button>
        </div>
      </div>
      {loading ? <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Yükleniyor…</div>
      : records.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Bu ay kayıt bulunamadı.</div>
      : records.map((r, i) => {
        const sc = STATUS_COLORS[r.status] || { bg: '#f1f5f9', color: '#64748b' };
        return (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 0', borderBottom: i < records.length - 1 ? '1px solid var(--bg-main)' : 'none', gap: '1rem' }}>
            <span style={{ fontWeight: '600', fontSize: '0.88rem', minWidth: '120px' }}>{new Date(r.date + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            <span style={{ padding: '0.2rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700', background: sc.bg, color: sc.color }}>{r.status}</span>
            {r.note && <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{r.note}</span>}
          </div>
        );
      })}
    </div>
  );
};

// ─── Deductions Tab ───────────────────────────────────────────────────────────
const DeductionsTab = ({ employee }) => {
  const [deductions, setDeductions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm] = useState({ type: 'Kesinti', amount: '', reason: '', date: new Date().toISOString().split('T')[0] });

  const fetchDeductions = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('employee_deductions').select('*').eq('employee_id', employee.id).order('date', { ascending: false });
    setDeductions(data || []);
    setLoading(false);
  }, [employee.id]);

  useEffect(() => { fetchDeductions(); }, [fetchDeductions]);

  const handleAdd = async () => {
    if (!form.amount || !form.reason) { alert('Tutar ve açıklama zorunludur.'); return; }
    setSaving(true);
    const { error } = await supabase.from('employee_deductions').insert({ employee_id: employee.id, type: form.type, amount: Number(form.amount), reason: form.reason, date: form.date });
    setSaving(false);
    if (error) { alert(error.message); return; }
    setForm(f => ({ ...f, amount: '', reason: '' }));
    fetchDeductions();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    await supabase.from('employee_deductions').delete().eq('id', id);
    fetchDeductions();
  };

  const totalDeductions = deductions.filter(d => d.type === 'Kesinti').reduce((s, d) => s + Number(d.amount), 0);
  const totalAdvances   = deductions.filter(d => d.type === 'Avans').reduce((s, d) => s + Number(d.amount), 0);
  const netSalary = (Number(employee.salary) || 0) - totalDeductions - totalAdvances;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
        <MiniCard label="Brüt Maaş"             value={`₺${Number(employee.salary || 0).toLocaleString('tr-TR')}`} color="#0284c7" />
        <MiniCard label="Toplam Kesinti & Avans" value={`-₺${(totalDeductions + totalAdvances).toLocaleString('tr-TR')}`} color="#dc2626" />
        <MiniCard label="Net Ödenecek"           value={`₺${netSalary.toLocaleString('tr-TR')}`} color="#16a34a" />
      </div>
      <div className="card" style={{ background: 'var(--bg-main)' }}>
        <p style={{ fontWeight: '700', fontSize: '0.88rem', marginBottom: '1rem' }}>Kesinti / Avans Ekle</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div><label className="form-label">Tür</label><select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: '120px' }}><option>Kesinti</option><option>Avans</option></select></div>
          <div><label className="form-label">Tutar (₺)</label><input className="input" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ width: '130px' }} /></div>
          <div style={{ flex: 1, minWidth: '150px' }}><label className="form-label">Açıklama</label><input className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Sebep…" /></div>
          <div><label className="form-label">Tarih</label><input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '155px' }} /></div>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}><Plus size={15} /> Ekle</button>
        </div>
      </div>
      {loading ? <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '1rem' }}>Yükleniyor…</div>
      : deductions.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '1.5rem' }}>Henüz kesinti veya avans kaydı yok.</div>
      : (
        <div className="card" style={{ padding: 0 }}>
          {deductions.map((d, i) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', padding: '0.85rem 1.25rem', borderBottom: i < deductions.length - 1 ? '1px solid var(--bg-main)' : 'none', gap: '1rem' }}>
              <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: d.type === 'Kesinti' ? '#fee2e2' : '#fef3c7', color: d.type === 'Kesinti' ? '#dc2626' : '#d97706' }}>{d.type}</span>
              <span style={{ flex: 1, fontSize: '0.88rem' }}>{d.reason}</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>{fmtDate(d.date)}</span>
              <span style={{ fontWeight: '700', fontSize: '0.9rem', minWidth: '80px', textAlign: 'right' }}>₺{Number(d.amount).toLocaleString('tr-TR')}</span>
              <button onClick={() => handleDelete(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.25rem' }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Leave Tab (inside Payroll) ───────────────────────────────────────────────
const LeaveTab = ({ employee }) => {
  const [usedDays, setUsedDays] = useState(0);
  const [loading, setLoading]   = useState(true);
  const currentYear = new Date().getFullYear();
  const entitlement = calcLeaveEntitlement(employee.hire_date);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { count } = await supabase.from('employee_attendance').select('id', { count: 'exact', head: true }).eq('employee_id', employee.id).eq('status', 'İzinli').gte('date', `${currentYear}-01-01`).lte('date', `${currentYear}-12-31`);
      setUsedDays(count || 0);
      setLoading(false);
    })();
  }, [employee.id, currentYear]);

  const remaining = entitlement - usedDays;
  const usedPct   = entitlement > 0 ? Math.min(100, Math.round((usedDays / entitlement) * 100)) : 0;
  const years     = employee.hire_date ? (Date.now() - new Date(employee.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25) : 0;
  const barColor  = usedPct >= 100 ? '#dc2626' : usedPct >= 80 ? '#d97706' : 'var(--primary)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {employee.hire_date && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.25rem', background: 'var(--bg-main)', borderRadius: '10px' }}>
          <Calendar size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.88rem' }}>İşe giriş: <strong>{fmtDate(employee.hire_date)}</strong></span>
          <span style={{ marginLeft: 'auto', fontWeight: '700', fontSize: '0.88rem', color: 'var(--primary)' }}>{years.toFixed(1)} yıl kıdem</span>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
        <MiniCard label={`${currentYear} Yılı Hakkı`} value={`${entitlement} gün`} color="#7c3aed" />
        <MiniCard label="Kullanılan" value={loading ? '…' : `${usedDays} gün`} color="#d97706" />
        <MiniCard label="Kalan Bakiye" value={loading ? '…' : `${Math.max(0, remaining)} gün`} color={remaining > 0 ? '#16a34a' : '#dc2626'} />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}><span>Kullanım Oranı</span><span>{usedPct}%</span></div>
        <div style={{ height: '10px', borderRadius: '5px', background: 'var(--bg-main)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${usedPct}%`, borderRadius: '5px', background: barColor, transition: 'width 0.5s' }} />
        </div>
      </div>
    </div>
  );
};

// ─── Bordro Tab ───────────────────────────────────────────────────────────────
const BordroTab = ({ cid }) => {
  const today = new Date();
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected]   = useState('');
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [history, setHistory] = useState([]);
  const [saving, setSaving]   = useState(false);
  const [notes, setNotes]     = useState('');

  useEffect(() => {
    supabase.from('employees').select('id, full_name, job_title, salary').eq('company_id', cid).eq('status', 'Aktif').order('full_name')
      .then(({ data }) => setEmployees(data || []));
  }, [cid]);

  const person = employees.find(e => e.id === selected);
  const calc   = person ? calcBordro(person.salary) : null;

  const fetchHistory = useCallback(async () => {
    if (!selected) return;
    const { data } = await supabase.from('employee_payroll').select('*').eq('employee_id', selected).order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(12);
    setHistory(data || []);
  }, [selected]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleSave = async () => {
    if (!selected || !calc) return;
    setSaving(true);
    const { error } = await supabase.from('employee_payroll').upsert({
      employee_id: selected, company_id: cid,
      period_year: year, period_month: month,
      gross_salary: calc.gross, sgk_employee: calc.sgkW, sgk_employer: calc.sgkE,
      unemployment_employee: calc.unemW, unemployment_employer: calc.unemE,
      income_tax: calc.incomeTax, stamp_tax: calc.stampTax, net_salary: calc.net,
      notes: notes || null, status: 'Onaylı',
    }, { onConflict: 'employee_id,period_year,period_month' });
    setSaving(false);
    if (error) { alert(error.message); return; }
    setNotes('');
    fetchHistory();
  };

  const exportCSV = () => {
    if (!calc || !person) return;
    const rows = [
      ['BORDRO FİŞİ', ''], ['Personel', person.full_name], ['Dönem', `${MONTH_NAMES[month-1]} ${year}`], ['', ''],
      ['Brüt Maaş', `₺${fmt(calc.gross)}`],
      [`SGK İşçi (%${(SGK_WORKER*100).toFixed(0)})`, `-₺${fmt(calc.sgkW)}`],
      [`İşsizlik İşçi (%${(UNEMPLOYMENT_WORKER*100).toFixed(0)})`, `-₺${fmt(calc.unemW)}`],
      ['Gelir Vergisi Matrahı', `₺${fmt(calc.taxBase)}`],
      ['Gelir Vergisi', `-₺${fmt(calc.incomeTax)}`],
      [`Damga Vergisi`, `-₺${fmt(calc.stampTax)}`],
      ['NET MAAŞ', `₺${fmt(calc.net)}`], ['', ''],
      [`SGK İşveren (%${(SGK_EMPLOYER*100).toFixed(1)})`, `₺${fmt(calc.sgkE)}`],
      [`İşsizlik İşveren (%${(UNEMPLOYMENT_EMP*100).toFixed(0)})`, `₺${fmt(calc.unemE)}`],
      ['TOPLAM İŞVEREN MALİYETİ', `₺${fmt(calc.employerCost)}`],
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    Object.assign(document.createElement('a'), { href: url, download: `bordro_${person.full_name.replace(' ','_')}_${year}_${month}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <label className="form-label">Personel</label>
            <select className="input" value={selected} onChange={e => setSelected(e.target.value)}>
              <option value="">— Personel seçiniz —</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}{e.job_title ? ` (${e.job_title})` : ''}</option>)}
            </select>
          </div>
          <div><label className="form-label">Ay</label>
            <select className="input" value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: '130px' }}>
              {MONTH_NAMES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div><label className="form-label">Yıl</label>
            <select className="input" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: '90px' }}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!selected ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>
          <DollarSign size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
          <p style={{ fontWeight: '600' }}>Bordro hesaplamak için personel seçin.</p>
        </div>
      ) : calc && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="card">
              <p style={{ fontWeight: '800', fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>İşçi — {person.full_name}</p>
              <BRow label="Brüt Maaş"                                           value={`₺${fmt(calc.gross)}`}        bold />
              <BRow label={`(-) SGK İşçi (%${(SGK_WORKER*100).toFixed(0)})`}    value={`-₺${fmt(calc.sgkW)}`}       neg />
              <BRow label={`(-) İşsizlik İşçi (%${(UNEMPLOYMENT_WORKER*100).toFixed(0)})`} value={`-₺${fmt(calc.unemW)}`} neg />
              <BRow label="Gelir Vergisi Matrahı"                               value={`₺${fmt(calc.taxBase)}`}      muted />
              <BRow label="(-) Gelir Vergisi"                                   value={`-₺${fmt(calc.incomeTax)}`}   neg />
              <BRow label={`(-) Damga Vergisi (%${(STAMP_TAX_RATE*100).toFixed(3)})`} value={`-₺${fmt(calc.stampTax)}`} neg />
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700' }}>NET MAAŞ</span>
                <span style={{ fontWeight: '900', fontSize: '1.4rem', color: '#16a34a' }}>₺{fmt(calc.net)}</span>
              </div>
            </div>
            <div className="card" style={{ background: 'var(--bg-main)' }}>
              <p style={{ fontWeight: '800', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>İşveren Maliyeti</p>
              <BRow label="Brüt Maaş"                                                  value={`₺${fmt(calc.gross)}`} />
              <BRow label={`(+) SGK İşveren (%${(SGK_EMPLOYER*100).toFixed(1)})`}       value={`+₺${fmt(calc.sgkE)}`} />
              <BRow label={`(+) İşsizlik İşveren (%${(UNEMPLOYMENT_EMP*100).toFixed(0)})`} value={`+₺${fmt(calc.unemE)}`} />
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700' }}>TOPLAM MALİYET</span>
                <span style={{ fontWeight: '900', fontSize: '1.4rem', color: 'var(--danger)' }}>₺{fmt(calc.employerCost)}</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>* 2024 SGK oranları ile hesaplanmıştır.</p>
            </div>
          </div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}><label className="form-label">Not</label><input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Bordro notu…" /></div>
              <button className="btn btn-outline" onClick={exportCSV}><Download size={16} /> CSV</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Save size={16} /> {saving ? 'Kaydediliyor…' : `${MONTH_NAMES[month-1]} ${year} Kaydet`}</button>
            </div>
          </div>
          {history.length > 0 && (
            <div className="card">
              <p style={{ fontWeight: '700', marginBottom: '1rem' }}>Geçmiş Bordrolar</p>
              <table style={{ width: '100%' }}>
                <thead><tr>{['Dönem','Brüt','SGK İşçi','Gelir V.','Damga V.','Net Maaş','Durum'].map(h => <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '700' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {history.map(p => (
                    <tr key={p.id} style={{ borderTop: '1px solid var(--bg-main)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: '600' }}>{MONTH_NAMES[p.period_month-1]} {p.period_year}</td>
                      <td style={{ padding: '0.75rem' }}>₺{fmt(p.gross_salary)}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--danger)' }}>-₺{fmt(p.sgk_employee)}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--danger)' }}>-₺{fmt(p.income_tax)}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--danger)' }}>-₺{fmt(p.stamp_tax)}</td>
                      <td style={{ padding: '0.75rem', fontWeight: '700', color: '#16a34a' }}>₺{fmt(p.net_salary)}</td>
                      <td style={{ padding: '0.75rem' }}><span style={{ padding: '0.15rem 0.5rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700', background: p.status === 'Onaylı' ? '#dcfce7' : '#fef3c7', color: p.status === 'Onaylı' ? '#16a34a' : '#d97706' }}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const BRow = ({ label, value, bold, neg, muted }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--bg-main)' }}>
    <span style={{ fontSize: '0.84rem', color: muted ? 'var(--text-dim)' : 'var(--text)', fontWeight: bold ? '700' : '400' }}>{label}</span>
    <span style={{ fontSize: '0.86rem', fontWeight: bold ? '700' : '600', color: neg ? 'var(--danger)' : muted ? 'var(--text-dim)' : 'var(--text)' }}>{value}</span>
  </div>
);

// ─── İzin Tab ─────────────────────────────────────────────────────────────────
const IzinTab = ({ cid }) => {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected]   = useState('');
  const [leaves, setLeaves]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({ leave_type: 'Yıllık', start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], reason: '', status: 'Onaylı' });

  useEffect(() => {
    supabase.from('employees').select('id, full_name, hire_date').eq('company_id', cid).order('full_name').then(({ data }) => setEmployees(data || []));
  }, [cid]);

  const person = employees.find(e => e.id === selected);

  const fetchLeaves = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    const { data } = await supabase.from('employee_leaves').select('*').eq('employee_id', selected).order('start_date', { ascending: false });
    setLeaves(data || []);
    setLoading(false);
  }, [selected]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const days = daysBetween(form.start_date, form.end_date);

  const handleSave = async () => {
    if (!selected || !form.start_date || !form.end_date) { alert('Zorunlu alanları doldurun.'); return; }
    setSaving(true);
    const { error } = await supabase.from('employee_leaves').insert({ employee_id: selected, company_id: cid, leave_type: form.leave_type, start_date: form.start_date, end_date: form.end_date, days, reason: form.reason || null, status: form.status });
    setSaving(false);
    if (error) { alert(error.message); return; }
    setForm(f => ({ ...f, reason: '' }));
    fetchLeaves();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu izin kaydını silmek istediğinizden emin misiniz?')) return;
    await supabase.from('employee_leaves').delete().eq('id', id);
    fetchLeaves();
  };

  const currentYear = new Date().getFullYear();
  const entitlement = calcLeaveEntitlement(person?.hire_date);
  const usedThisYear = leaves.filter(l => l.leave_type === 'Yıllık' && (l.start_date || '').startsWith(String(currentYear))).reduce((s, l) => s + (l.days || 0), 0);

  return (
    <div>
      <EmpSelect employees={employees} value={selected} onChange={setSelected} />
      {!selected ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>
          <Calendar size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
          <p style={{ fontWeight: '600' }}>İzin kayıtlarını görmek için personel seçin.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <MiniCard label={`${currentYear} Hakkı`} value={`${entitlement} gün`} color="#7c3aed" />
            <MiniCard label="Kullanılan (Yıllık)" value={`${usedThisYear} gün`} color="#d97706" />
            <MiniCard label="Kalan" value={`${Math.max(0, entitlement - usedThisYear)} gün`} color={(entitlement - usedThisYear) > 0 ? '#16a34a' : '#dc2626'} />
          </div>
          <div className="card" style={{ background: 'var(--bg-main)', marginBottom: '1.5rem' }}>
            <p style={{ fontWeight: '700', fontSize: '0.88rem', marginBottom: '1rem' }}>Yeni İzin Ekle</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div><label className="form-label">Tür</label><select className="input" value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))} style={{ width: '130px' }}>{LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label className="form-label">Başlangıç</label><input className="input" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} style={{ width: '155px' }} /></div>
              <div><label className="form-label">Bitiş</label><input className="input" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} style={{ width: '155px' }} /></div>
              <div style={{ padding: '0.55rem 1rem', background: 'white', borderRadius: '10px', border: '1px solid var(--border)', fontWeight: '700', color: 'var(--primary)', fontSize: '0.88rem' }}>{days} gün</div>
              <div><label className="form-label">Durum</label><select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ width: '120px' }}>{['Onaylı','Bekliyor','Reddedildi'].map(s => <option key={s}>{s}</option>)}</select></div>
              <div style={{ flex: 1, minWidth: '150px' }}><label className="form-label">Not</label><input className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Opsiyonel…" /></div>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Plus size={15} /> {saving ? 'Kaydediliyor…' : 'Ekle'}</button>
            </div>
          </div>
          {loading ? <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Yükleniyor…</div>
          : leaves.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Henüz izin kaydı yok.</div>
          : (
            <div className="card" style={{ padding: 0 }}>
              <table style={{ width: '100%' }}>
                <thead><tr style={{ borderBottom: '1px solid var(--bg-main)' }}>{['Tür','Başlangıç','Bitiş','Gün','Not','Durum',''].map(h => <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '700' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {leaves.map((l, i) => (
                    <tr key={l.id} style={{ borderBottom: i < leaves.length - 1 ? '1px solid var(--bg-main)' : 'none' }}>
                      <td style={{ padding: '0.85rem 1rem' }}><span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: '#dbeafe', color: '#2563eb' }}>{l.leave_type}</span></td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem' }}>{fmtDate(l.start_date)}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem' }}>{fmtDate(l.end_date)}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: '700' }}>{l.days}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>{l.reason || '—'}</td>
                      <td style={{ padding: '0.85rem 1rem' }}><span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700', background: l.status==='Onaylı'?'#dcfce7':l.status==='Bekliyor'?'#fef3c7':'#fee2e2', color: l.status==='Onaylı'?'#16a34a':l.status==='Bekliyor'?'#d97706':'#dc2626' }}>{l.status}</span></td>
                      <td style={{ padding: '0.85rem 1rem' }}><button onClick={() => handleDelete(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Avans Tab ────────────────────────────────────────────────────────────────
const AvansTab = ({ cid }) => {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected]   = useState('');
  const [advances, setAdvances]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], reason: '' });

  useEffect(() => {
    supabase.from('employees').select('id, full_name, salary').eq('company_id', cid).order('full_name').then(({ data }) => setEmployees(data || []));
  }, [cid]);

  const fetchAdvances = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    const { data } = await supabase.from('employee_deductions').select('*').eq('employee_id', selected).eq('type', 'Avans').order('date', { ascending: false });
    setAdvances(data || []);
    setLoading(false);
  }, [selected]);

  useEffect(() => { fetchAdvances(); }, [fetchAdvances]);

  const handleAdd = async () => {
    if (!form.amount || !form.reason) { alert('Tutar ve açıklama zorunludur.'); return; }
    setSaving(true);
    const { error } = await supabase.from('employee_deductions').insert({ employee_id: selected, type: 'Avans', amount: Number(form.amount), reason: form.reason, date: form.date });
    setSaving(false);
    if (error) { alert(error.message); return; }
    setForm(f => ({ ...f, amount: '', reason: '' }));
    fetchAdvances();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu avans kaydını silmek istediğinizden emin misiniz?')) return;
    await supabase.from('employee_deductions').delete().eq('id', id);
    fetchAdvances();
  };

  const totalAdvance = advances.reduce((s, a) => s + Number(a.amount), 0);
  const person = employees.find(e => e.id === selected);

  return (
    <div>
      <EmpSelect employees={employees} value={selected} onChange={setSelected} />
      {!selected ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>
          <Wallet size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
          <p style={{ fontWeight: '600' }}>Avans takibi için personel seçin.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <MiniCard label="Toplam Avans" value={`₺${totalAdvance.toLocaleString('tr-TR')}`} color="#dc2626" />
            <MiniCard label="Brüt Maaş" value={`₺${Number(person?.salary||0).toLocaleString('tr-TR')}`} color="#0284c7" />
            <MiniCard label="Kayıt Sayısı" value={`${advances.length} kayıt`} color="#7c3aed" />
          </div>
          <div className="card" style={{ background: 'var(--bg-main)', marginBottom: '1.5rem' }}>
            <p style={{ fontWeight: '700', fontSize: '0.88rem', marginBottom: '1rem' }}>Yeni Avans Ekle</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div><label className="form-label">Tutar (₺)</label><input className="input" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ width: '130px' }} /></div>
              <div><label className="form-label">Tarih</label><input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '155px' }} /></div>
              <div style={{ flex: 1, minWidth: '200px' }}><label className="form-label">Açıklama *</label><input className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Avans nedeni…" /></div>
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving}><Plus size={15} /> {saving ? 'Kaydediliyor…' : 'Ekle'}</button>
            </div>
          </div>
          {loading ? <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Yükleniyor…</div>
          : advances.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Henüz avans kaydı yok.</div>
          : (
            <div className="card" style={{ padding: 0 }}>
              {advances.map((a, i) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', padding: '0.85rem 1.25rem', borderBottom: i < advances.length - 1 ? '1px solid var(--bg-main)' : 'none', gap: '1rem' }}>
                  <Wallet size={16} style={{ color: '#d97706', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '0.88rem' }}>{a.reason}</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>{fmtDate(a.date)}</span>
                  <span style={{ fontWeight: '700', color: '#dc2626', minWidth: '90px', textAlign: 'right' }}>₺{Number(a.amount).toLocaleString('tr-TR')}</span>
                  <button onClick={() => handleDelete(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Belgeler Tab ─────────────────────────────────────────────────────────────
const BelgelerTab = ({ cid }) => {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected]   = useState('');
  const [docs, setDocs]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({ doc_type: 'İş Sözleşmesi', name: '', notes: '' });

  useEffect(() => {
    supabase.from('employees').select('id, full_name').eq('company_id', cid).order('full_name').then(({ data }) => setEmployees(data || []));
  }, [cid]);

  const fetchDocs = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    const { data } = await supabase.from('employee_documents').select('*').eq('employee_id', selected).order('created_at', { ascending: false });
    setDocs(data || []);
    setLoading(false);
  }, [selected]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Belge adı zorunludur.'); return; }
    setSaving(true);
    const { error } = await supabase.from('employee_documents').insert({ employee_id: selected, company_id: cid, doc_type: form.doc_type, file_name: form.name.trim(), notes: form.notes || null });
    setSaving(false);
    if (error) { alert(error.message); return; }
    setForm(f => ({ ...f, name: '', notes: '' }));
    fetchDocs();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) return;
    await supabase.from('employee_documents').delete().eq('id', id);
    fetchDocs();
  };

  return (
    <div>
      <EmpSelect employees={employees} value={selected} onChange={setSelected} />
      {!selected ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>
          <FileText size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
          <p style={{ fontWeight: '600' }}>Belge takibi için personel seçin.</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ background: 'var(--bg-main)', marginBottom: '1.5rem' }}>
            <p style={{ fontWeight: '700', fontSize: '0.88rem', marginBottom: '1rem' }}>Yeni Belge Ekle</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div><label className="form-label">Belge Türü</label><select className="input" value={form.doc_type} onChange={e => setForm(f => ({ ...f, doc_type: e.target.value }))} style={{ width: '180px' }}>{DOC_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div style={{ flex: 1, minWidth: '200px' }}><label className="form-label">Belge Adı *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn: 2024 İş Sözleşmesi" /></div>
              <div style={{ flex: 1, minWidth: '180px' }}><label className="form-label">Not</label><input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opsiyonel…" /></div>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Plus size={15} /> {saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
            </div>
          </div>
          {loading ? <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Yükleniyor…</div>
          : docs.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Henüz belge kaydı yok.</div>
          : (
            <div className="card" style={{ padding: 0 }}>
              {docs.map((d, i) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', padding: '0.85rem 1.25rem', borderBottom: i < docs.length - 1 ? '1px solid var(--bg-main)' : 'none', gap: '1rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={18} /></div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{d.file_name}</p>
                    {d.notes && <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>{d.notes}</p>}
                  </div>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700', background: '#f1f5f9', color: '#475569' }}>{d.doc_type}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{d.created_at ? new Date(d.created_at).toLocaleDateString('tr-TR') : '—'}</span>
                  <button onClick={() => handleDelete(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Performans Tab ───────────────────────────────────────────────────────────
const PerformansTab = ({ cid }) => {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected]   = useState('');
  const [evals, setEvals]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({ period: `${new Date().getFullYear()}-Q1`, score: 3, notes: '', evaluated_by: '' });

  useEffect(() => {
    supabase.from('employees').select('id, full_name, job_title').eq('company_id', cid).order('full_name').then(({ data }) => setEmployees(data || []));
  }, [cid]);

  const fetchEvals = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    const { data } = await supabase.from('employee_performance').select('*').eq('employee_id', selected).order('created_at', { ascending: false });
    setEvals(data || []);
    setLoading(false);
  }, [selected]);

  useEffect(() => { fetchEvals(); }, [fetchEvals]);

  const handleSave = async () => {
    if (!form.period) { alert('Dönem zorunludur.'); return; }
    setSaving(true);
    const { error } = await supabase.from('employee_performance').insert({ employee_id: selected, company_id: cid, period: form.period, score: form.score, notes: form.notes || null, evaluated_by: form.evaluated_by || null });
    setSaving(false);
    if (error) { alert(error.message); return; }
    setForm(f => ({ ...f, notes: '', evaluated_by: '' }));
    fetchEvals();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu değerlendirmeyi silmek istediğinizden emin misiniz?')) return;
    await supabase.from('employee_performance').delete().eq('id', id);
    fetchEvals();
  };

  const avgScore = evals.length > 0 ? (evals.reduce((s, e) => s + (e.score || 0), 0) / evals.length).toFixed(1) : '—';

  return (
    <div>
      <EmpSelect employees={employees} value={selected} onChange={setSelected} />
      {!selected ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>
          <Star size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
          <p style={{ fontWeight: '600' }}>Performans değerlendirmesi için personel seçin.</p>
        </div>
      ) : (
        <>
          {evals.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <MiniCard label="Ortalama Puan" value={`${avgScore} / 5`} color="#f59e0b" />
              <MiniCard label="Değerlendirme" value={`${evals.length} kayıt`} color="#7c3aed" />
              <MiniCard label="Son Dönem" value={evals[0]?.period || '—'} color="#0284c7" />
            </div>
          )}
          <div className="card" style={{ background: 'var(--bg-main)', marginBottom: '1.5rem' }}>
            <p style={{ fontWeight: '700', fontSize: '0.88rem', marginBottom: '1rem' }}>Yeni Değerlendirme Ekle</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div><label className="form-label">Dönem</label><input className="input" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} placeholder="2024-Q2" style={{ width: '120px' }} /></div>
              <div>
                <label className="form-label">Puan</label>
                <div style={{ display: 'flex', gap: '0.2rem' }}>
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setForm(f => ({ ...f, score: s }))} style={{ width: '34px', height: '34px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem', background: form.score >= s ? '#fef3c7' : 'var(--bg-main)', color: form.score >= s ? '#f59e0b' : 'var(--text-dim)' }}>★</button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: '180px' }}><label className="form-label">Notlar</label><input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Değerlendirme notları…" /></div>
              <div style={{ minWidth: '150px' }}><label className="form-label">Değerlendiren</label><input className="input" value={form.evaluated_by} onChange={e => setForm(f => ({ ...f, evaluated_by: e.target.value }))} placeholder="Ad Soyad" /></div>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Plus size={15} /> {saving ? 'Kaydediliyor…' : 'Ekle'}</button>
            </div>
          </div>
          {loading ? <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Yükleniyor…</div>
          : evals.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Henüz performans değerlendirmesi yok.</div>
          : (
            <div className="card" style={{ padding: 0 }}>
              {evals.map((e, i) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', padding: '0.85rem 1.25rem', borderBottom: i < evals.length - 1 ? '1px solid var(--bg-main)' : 'none', gap: '1rem' }}>
                  <span style={{ fontWeight: '700', minWidth: '80px', color: 'var(--primary)', fontSize: '0.9rem' }}>{e.period}</span>
                  <span style={{ fontSize: '1.1rem' }}>{[1,2,3,4,5].map(s => <span key={s} style={{ color: (e.score||0)>=s?'#f59e0b':'#e2e8f0' }}>★</span>)}</span>
                  <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-dim)' }}>{e.notes || '—'}</span>
                  {e.evaluated_by && <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>– {e.evaluated_by}</span>}
                  <button onClick={() => handleDelete(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Masraf Tab ───────────────────────────────────────────────────────────────
const MasrafTab = ({ cid }) => {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected]   = useState('');
  const [expenses, setExpenses]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({ category: 'Yol', amount: '', date: new Date().toISOString().split('T')[0], description: '', status: 'Onaylı' });

  useEffect(() => {
    supabase.from('employees').select('id, full_name').eq('company_id', cid).order('full_name').then(({ data }) => setEmployees(data || []));
  }, [cid]);

  const fetchExpenses = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    const { data } = await supabase.from('employee_expenses').select('*').eq('employee_id', selected).order('date', { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  }, [selected]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleAdd = async () => {
    if (!form.amount || !form.description) { alert('Tutar ve açıklama zorunludur.'); return; }
    setSaving(true);
    const { error } = await supabase.from('employee_expenses').insert({ employee_id: selected, company_id: cid, category: form.category, amount: Number(form.amount), date: form.date, description: form.description, status: form.status });
    setSaving(false);
    if (error) { alert(error.message); return; }
    setForm(f => ({ ...f, amount: '', description: '' }));
    fetchExpenses();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu masraf kaydını silmek istediğinizden emin misiniz?')) return;
    await supabase.from('employee_expenses').delete().eq('id', id);
    fetchExpenses();
  };

  const EXP_SC = { 'Bekliyor': { bg: '#fef3c7', color: '#d97706' }, 'Onaylı': { bg: '#dcfce7', color: '#16a34a' }, 'Ödendi': { bg: '#dbeafe', color: '#2563eb' }, 'Reddedildi': { bg: '#fee2e2', color: '#dc2626' } };
  const totalApproved = expenses.filter(e => e.status==='Onaylı'||e.status==='Ödendi').reduce((s,e) => s+Number(e.amount), 0);
  const totalPending  = expenses.filter(e => e.status==='Bekliyor').reduce((s,e) => s+Number(e.amount), 0);

  return (
    <div>
      <EmpSelect employees={employees} value={selected} onChange={setSelected} />
      {!selected ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>
          <Receipt size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
          <p style={{ fontWeight: '600' }}>Masraf beyanı için personel seçin.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <MiniCard label="Onaylı / Ödendi" value={`₺${totalApproved.toLocaleString('tr-TR')}`} color="#16a34a" />
            <MiniCard label="Bekleyen" value={`₺${totalPending.toLocaleString('tr-TR')}`} color="#d97706" />
            <MiniCard label="Toplam Kayıt" value={`${expenses.length} masraf`} color="#7c3aed" />
          </div>
          <div className="card" style={{ background: 'var(--bg-main)', marginBottom: '1.5rem' }}>
            <p style={{ fontWeight: '700', fontSize: '0.88rem', marginBottom: '1rem' }}>Yeni Masraf Ekle</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div><label className="form-label">Kategori</label><select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: '120px' }}>{EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}</select></div>
              <div><label className="form-label">Tutar (₺) *</label><input className="input" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ width: '120px' }} /></div>
              <div><label className="form-label">Tarih</label><input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '155px' }} /></div>
              <div style={{ flex: 1, minWidth: '200px' }}><label className="form-label">Açıklama *</label><input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Masraf açıklaması…" /></div>
              <div><label className="form-label">Durum</label><select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ width: '120px' }}>{['Bekliyor','Onaylı','Ödendi','Reddedildi'].map(s => <option key={s}>{s}</option>)}</select></div>
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving}><Plus size={15} /> {saving ? 'Kaydediliyor…' : 'Ekle'}</button>
            </div>
          </div>
          {loading ? <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Yükleniyor…</div>
          : expenses.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Henüz masraf kaydı yok.</div>
          : (
            <div className="card" style={{ padding: 0 }}>
              <table style={{ width: '100%' }}>
                <thead><tr style={{ borderBottom: '1px solid var(--bg-main)' }}>{['Kategori','Açıklama','Tarih','Tutar','Durum',''].map(h => <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '700' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {expenses.map((e, i) => {
                    const sc = EXP_SC[e.status] || { bg: '#f1f5f9', color: '#64748b' };
                    return (
                      <tr key={e.id} style={{ borderBottom: i < expenses.length - 1 ? '1px solid var(--bg-main)' : 'none' }}>
                        <td style={{ padding: '0.85rem 1rem' }}><span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: '#f1f5f9', color: '#475569' }}>{e.category}</span></td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem' }}>{e.description}</td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>{fmtDate(e.date)}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: '700' }}>₺{Number(e.amount).toLocaleString('tr-TR')}</td>
                        <td style={{ padding: '0.85rem 1rem' }}><span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700', background: sc.bg, color: sc.color }}>{e.status}</span></td>
                        <td style={{ padding: '0.85rem 1rem' }}><button onClick={() => handleDelete(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={14} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Position Tab ─────────────────────────────────────────────────────────────
const PositionTab = ({ cid }) => {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected]   = useState('');
  const [changes, setChanges]     = useState([]);
  const [loadingChanges, setLoadingChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ new_title: '', change_date: new Date().toISOString().split('T')[0], reason: '' });

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase.from('employees').select('id, full_name, job_title').eq('company_id', cid).order('full_name');
    setEmployees(data || []);
  }, [cid]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const fetchChanges = useCallback(async () => {
    if (!selected) return;
    setLoadingChanges(true);
    const { data } = await supabase.from('employee_position_changes').select('*').eq('employee_id', selected).order('change_date', { ascending: false });
    setChanges(data || []);
    setLoadingChanges(false);
  }, [selected]);

  useEffect(() => { fetchChanges(); }, [fetchChanges]);

  const currentEmployee = employees.find(e => e.id === selected);

  const handleSave = async () => {
    if (!form.new_title.trim() || !form.change_date) { alert('Yeni unvan ve tarih zorunludur.'); return; }
    setSaving(true);
    const { error } = await supabase.from('employee_position_changes').insert({ employee_id: selected, previous_title: currentEmployee?.job_title || null, new_title: form.new_title.trim(), change_date: form.change_date, reason: form.reason || null });
    if (error) { alert(error.message); setSaving(false); return; }
    await supabase.from('employees').update({ job_title: form.new_title.trim() }).eq('id', selected);
    setSaving(false);
    setForm(f => ({ ...f, new_title: '', reason: '' }));
    fetchEmployees();
    fetchChanges();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    await supabase.from('employee_position_changes').delete().eq('id', id);
    fetchChanges();
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <label className="form-label">Personel Seç</label>
        <select className="input" value={selected} onChange={e => setSelected(e.target.value)} style={{ maxWidth: '420px' }}>
          <option value="">— Personel seçiniz —</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}{e.job_title ? ` — ${e.job_title}` : ''}</option>)}
        </select>
      </div>
      {!selected ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>
          <ArrowLeftRight size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
          <p style={{ fontWeight: '600', fontSize: '0.95rem' }}>Pozisyon geçmişini görmek için personel seçin.</p>
        </div>
      ) : (
        <>
          {currentEmployee?.job_title && (
            <div style={{ padding: '1rem 1.25rem', background: 'var(--primary-light)', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: '600' }}>Mevcut Pozisyon:</span>
              <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{currentEmployee.job_title}</span>
            </div>
          )}
          <div className="card" style={{ background: 'var(--bg-main)', marginBottom: '1.5rem' }}>
            <p style={{ fontWeight: '700', fontSize: '0.88rem', marginBottom: '1rem' }}>Pozisyon Değişikliği Ekle</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: '200px' }}><label className="form-label">Yeni Unvan *</label><input className="input" value={form.new_title} onChange={e => setForm(f => ({ ...f, new_title: e.target.value }))} placeholder="Örn: Kıdemli Şoför" /></div>
              <div><label className="form-label">Tarih *</label><input className="input" type="date" value={form.change_date} onChange={e => setForm(f => ({ ...f, change_date: e.target.value }))} style={{ width: '160px' }} /></div>
              <div style={{ flex: 1, minWidth: '180px' }}><label className="form-label">Açıklama</label><input className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Opsiyonel…" /></div>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Plus size={15} /> {saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
            </div>
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>Pozisyon Geçmişi</h3>
          {loadingChanges ? <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Yükleniyor…</div>
          : changes.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Henüz pozisyon değişikliği kaydı yok.</div>
          : (
            <div className="card" style={{ padding: 0 }}>
              {changes.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: i < changes.length - 1 ? '1px solid var(--bg-main)' : 'none', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: c.reason ? '0.25rem' : 0 }}>
                      {c.previous_title && <><span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{c.previous_title}</span><span style={{ color: 'var(--text-dim)' }}>→</span></>}
                      <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--primary)' }}>{c.new_title}</span>
                    </div>
                    {c.reason && <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{c.reason}</p>}
                  </div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{fmtDate(c.change_date)}</span>
                  <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Shared UI ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color }) => (
  <div className="card">
    <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '4px' }}>{label}</p>
    <p style={{ fontWeight: '800', fontSize: '1.25rem', color }}>{value}</p>
  </div>
);

const MiniCard = ({ label, value, color }) => (
  <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '10px' }}>
    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>{label}</p>
    <p style={{ fontWeight: '800', fontSize: '1rem', color }}>{value}</p>
  </div>
);

export default Personnel;
