import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Pencil, X, ChevronLeft, ChevronRight,
  Calendar, Plus, Trash2, Save, UserCheck, ClipboardList, ArrowLeftRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

const ATTENDANCE_STATUSES = ['Geldi', 'Gelmedi', 'İzinli', 'Raporlu', 'Tatil'];
const STATUS_COLORS = {
  Geldi:   { bg: '#dcfce7', color: '#16a34a' },
  Gelmedi: { bg: '#fee2e2', color: '#dc2626' },
  İzinli:  { bg: '#dbeafe', color: '#2563eb' },
  Raporlu: { bg: '#fef3c7', color: '#d97706' },
  Tatil:   { bg: '#f1f5f9', color: '#64748b' },
};

const DEPARTMENTS = ['Operasyon', 'Muhasebe', 'İnsan Kaynakları', 'Lojistik', 'Teknik', 'İdari', 'Güvenlik', 'Diğer'];
const EMP_STATUSES = ['Aktif', 'Pasif', 'İzinli', 'Çıkış Yaptı'];

const calcLeaveEntitlement = (hireDate) => {
  if (!hireDate) return 14;
  const years = (Date.now() - new Date(hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (years >= 15) return 26;
  if (years >= 5) return 20;
  return 14;
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const EMPTY_EMP = {
  full_name: '', tc_kimlik: '', phone: '', job_title: '', department: '',
  hire_date: '', salary: '', facility_id: '', status: 'Aktif',
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Personnel = ({ initialTab = 'definition' }) => {
  const currentUser = useAuthStore(s => s.currentUser);
  const cid = currentUser?.company_id;
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  const TABS = [
    { key: 'definition', label: 'Personel Tanımlama',   icon: <UserCheck size={16} /> },
    { key: 'payroll',    label: 'Pusula & Puantaj',      icon: <ClipboardList size={16} /> },
    { key: 'position',   label: 'Pozisyon Değişikliği',  icon: <ArrowLeftRight size={16} /> },
  ];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem' }}>İnsan Kaynakları</h1>
        <p className="text-muted">Personel tanımlama, devam takibi ve pozisyon yönetimi.</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid var(--bg-main)' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
              fontWeight: activeTab === t.key ? '700' : '500', fontSize: '0.9rem',
              color: activeTab === t.key ? 'var(--primary)' : 'var(--text-dim)',
              borderBottom: activeTab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: '-2px', transition: 'color 0.2s',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'definition' && <DefinitionTab cid={cid} />}
      {activeTab === 'payroll'    && <PayrollRootTab cid={cid} />}
      {activeTab === 'position'   && <PositionTab cid={cid} />}
    </div>
  );
};

// ─── Definition Tab (Personel Tanımlama) ─────────────────────────────────────
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
    const { data } = await supabase
      .from('employees')
      .select('*, facilities(name)')
      .eq('company_id', cid)
      .order('full_name');
    setEmployees(data || []);
    setLoading(false);
  }, [cid]);

  const fetchFacilities = useCallback(async () => {
    const { data } = await supabase.from('facilities').select('id, name').eq('company_id', cid);
    setFacilities(data || []);
  }, [cid]);

  useEffect(() => { fetchEmployees(); fetchFacilities(); }, [fetchEmployees, fetchFacilities]);

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !search || e.full_name?.toLowerCase().includes(q) || e.job_title?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openAdd = () => { setForm(EMPTY_EMP); setEditRec(null); setShowModal(true); };
  const openEdit = (e) => { setForm({ ...EMPTY_EMP, ...e, facility_id: e.facility_id || '' }); setEditRec(e); setShowModal(true); };

  const handleSave = async () => {
    if (!form.full_name.trim()) { alert('Ad Soyad zorunludur.'); return; }
    setSaving(true);
    const payload = {
      company_id: cid,
      full_name: form.full_name.trim(),
      tc_kimlik: form.tc_kimlik || null,
      phone: form.phone || null,
      job_title: form.job_title || null,
      department: form.department || null,
      hire_date: form.hire_date || null,
      salary: form.salary ? Number(form.salary) : null,
      facility_id: form.facility_id || null,
      status: form.status || 'Aktif',
    };
    if (editRec) {
      const { error } = await supabase.from('employees').update(payload).eq('id', editRec.id);
      if (error) { alert(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('employees').insert(payload);
      if (error) { alert(error.message); setSaving(false); return; }
    }
    setSaving(false);
    setShowModal(false);
    fetchEmployees();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu personeli silmek istediğinizden emin misiniz?')) return;
    await supabase.from('employees').delete().eq('id', id);
    fetchEmployees();
  };

  const handleExport = () => {
    const BOM = '﻿';
    const headers = 'Ad Soyad,TC Kimlik,Telefon,Görev,Departman,Tesis,İşe Giriş,Maaş,Durum';
    const rows = filtered.map(e => [
      `"${e.full_name || ''}"`, `"${e.tc_kimlik || ''}"`, `"${e.phone || ''}"`,
      `"${e.job_title || ''}"`, `"${e.department || ''}"`, `"${e.facilities?.name || ''}"`,
      e.hire_date || '', e.salary || '', e.status || '',
    ].join(','));
    const csv = BOM + [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'personel.csv'; a.click();
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
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Yükleniyor…</div>
        ) : filtered.length === 0 ? (
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
                  <th key={h} style={{ padding: '1rem 1.25rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={e.id}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--bg-main)' : 'none', transition: 'background 0.15s' }}
                  onMouseEnter={el => el.currentTarget.style.background = 'var(--bg-main)'}
                  onMouseLeave={el => el.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.8rem', flexShrink: 0 }}>
                        {getInitials(e.full_name)}
                      </div>
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
                  <td style={{ padding: '1rem 1.25rem', fontSize: '0.88rem' }}>{e.facilities?.name || <span style={{ color: 'var(--text-dim)' }}>Merkez</span>}</td>
                  <td style={{ padding: '1rem 1.25rem', fontSize: '0.88rem' }}>
                    {e.hire_date ? new Date(e.hire_date + 'T00:00:00').toLocaleDateString('tr-TR') : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontSize: '0.88rem', fontWeight: '600' }}>
                    {e.salary ? `₺${Number(e.salary).toLocaleString('tr-TR')}` : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span style={{ padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: e.status === 'Aktif' ? '#dcfce7' : '#f1f5f9', color: e.status === 'Aktif' ? '#16a34a' : '#64748b' }}>
                      {e.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => openEdit(e)}>
                        <Pencil size={13} /> Düzenle
                      </button>
                      <button onClick={() => handleDelete(e.id)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--danger)', padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={14} />
                      </button>
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
              <div>
                <label className="form-label">TC Kimlik No</label>
                <input className="input" value={form.tc_kimlik} onChange={e => setForm(f => ({ ...f, tc_kimlik: e.target.value }))} placeholder="11 haneli TC no" maxLength={11} />
              </div>
              <div>
                <label className="form-label">Telefon</label>
                <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="05xx xxx xx xx" />
              </div>
              <div>
                <label className="form-label">Görev / Unvan</label>
                <input className="input" value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} placeholder="Örn: Şoför, Muhasebeci" />
              </div>
              <div>
                <label className="form-label">Departman</label>
                <select className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                  <option value="">— Seçiniz —</option>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">İşe Giriş Tarihi</label>
                <input className="input" type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Maaş (₺)</label>
                <input className="input" type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="Aylık brüt maaş" />
              </div>
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

// ─── Payroll Root Tab (Pusula & Puantaj) ─────────────────────────────────────
const PayrollRootTab = ({ cid }) => {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState('');
  const [payrollTab, setPayrollTab] = useState('attendance');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('employees')
        .select('id, full_name, job_title, hire_date, salary')
        .eq('company_id', cid)
        .order('full_name');
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
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.95rem', flexShrink: 0 }}>
              {getInitials(person?.full_name)}
            </div>
            <div>
              <p style={{ fontWeight: '700', fontSize: '1rem' }}>{person?.full_name}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                {person?.job_title || 'Görev belirtilmemiş'}
                {person?.hire_date ? ` · İşe Giriş: ${new Date(person.hire_date + 'T00:00:00').toLocaleDateString('tr-TR')}` : ''}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid var(--bg-main)', marginBottom: '1.5rem' }}>
            {[
              { key: 'attendance', label: 'Puantaj' },
              { key: 'deductions', label: 'Maaş & Kesintiler' },
              { key: 'leave',      label: 'Yıllık İzin' },
            ].map(t => (
              <button key={t.key} onClick={() => setPayrollTab(t.key)}
                style={{ padding: '0.75rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: payrollTab === t.key ? '700' : '500', fontSize: '0.88rem', color: payrollTab === t.key ? 'var(--primary)' : 'var(--text-dim)', borderBottom: payrollTab === t.key ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: '-1px' }}
              >{t.label}</button>
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
  const [year, setYear]       = useState(today.getFullYear());
  const [month, setMonth]     = useState(today.getMonth() + 1);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ date: today.toISOString().split('T')[0], status: 'Geldi', note: '' });
  const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    const { data } = await supabase
      .from('employee_attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false });
    setRecords(data || []);
    setLoading(false);
  }, [employeeId, year, month]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handleSave = async () => {
    if (!form.date || !form.status) return;
    setSaving(true);
    const { data: existing } = await supabase
      .from('employee_attendance').select('id').eq('employee_id', employeeId).eq('date', form.date).maybeSingle();
    const payload = { status: form.status, note: form.note || null };
    const { error } = existing
      ? await supabase.from('employee_attendance').update(payload).eq('id', existing.id)
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
            <span key={s} style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: STATUS_COLORS[s].bg, color: STATUS_COLORS[s].color }}>
              {s}: {counts[s]}
            </span>
          ))}
        </div>
      </div>

      <div className="card" style={{ background: 'var(--bg-main)' }}>
        <p style={{ fontWeight: '700', fontSize: '0.88rem', marginBottom: '1rem' }}>Yoklama Girişi</p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label">Tarih</label>
            <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '155px' }} />
          </div>
          <div>
            <label className="form-label">Durum</label>
            <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ width: '135px' }}>
              {ATTENDANCE_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label className="form-label">Not (opsiyonel)</label>
            <input className="input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Açıklama…" />
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ whiteSpace: 'nowrap' }}>
            {saving ? 'Kaydediliyor…' : 'Kaydet / Güncelle'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Yükleniyor…</div>
      ) : records.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Bu ay kayıt bulunamadı.</div>
      ) : (
        <div>
          {records.map((r, i) => {
            const sc = STATUS_COLORS[r.status] || { bg: '#f1f5f9', color: '#64748b' };
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 0', borderBottom: i < records.length - 1 ? '1px solid var(--bg-main)' : 'none', gap: '1rem' }}>
                <span style={{ fontWeight: '600', fontSize: '0.88rem', minWidth: '120px' }}>
                  {new Date(r.date + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                <span style={{ padding: '0.2rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700', background: sc.bg, color: sc.color }}>{r.status}</span>
                {r.note && <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{r.note}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Deductions Tab (Maaş & Kesintiler) ──────────────────────────────────────
const DeductionsTab = ({ employee }) => {
  const [deductions, setDeductions] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm] = useState({
    type: 'Kesinti', amount: '', reason: '', date: new Date().toISOString().split('T')[0],
  });

  const fetchDeductions = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('employee_deductions')
      .select('*')
      .eq('employee_id', employee.id)
      .order('date', { ascending: false });
    setDeductions(data || []);
    setLoading(false);
  }, [employee.id]);

  useEffect(() => { fetchDeductions(); }, [fetchDeductions]);

  const handleAdd = async () => {
    if (!form.amount || !form.reason) { alert('Tutar ve açıklama zorunludur.'); return; }
    setSaving(true);
    const { error } = await supabase.from('employee_deductions').insert({
      employee_id: employee.id,
      type: form.type,
      amount: Number(form.amount),
      reason: form.reason,
      date: form.date,
    });
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
        <MiniCard label="Brüt Maaş"             value={`₺${Number(employee.salary || 0).toLocaleString('tr-TR')}`}          color="#0284c7" />
        <MiniCard label="Toplam Kesinti & Avans" value={`-₺${(totalDeductions + totalAdvances).toLocaleString('tr-TR')}`}   color="#dc2626" />
        <MiniCard label="Net Ödenecek"           value={`₺${netSalary.toLocaleString('tr-TR')}`}                            color="#16a34a" />
      </div>

      <div className="card" style={{ background: 'var(--bg-main)' }}>
        <p style={{ fontWeight: '700', fontSize: '0.88rem', marginBottom: '1rem' }}>Kesinti / Avans Ekle</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">Tür</label>
            <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: '120px' }}>
              <option>Kesinti</option><option>Avans</option>
            </select>
          </div>
          <div>
            <label className="form-label">Tutar (₺)</label>
            <input className="input" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ width: '130px' }} />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label className="form-label">Açıklama</label>
            <input className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Sebep…" />
          </div>
          <div>
            <label className="form-label">Tarih</label>
            <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '155px' }} />
          </div>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}><Plus size={15} /> Ekle</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '1rem' }}>Yükleniyor…</div>
      ) : deductions.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '1.5rem' }}>Henüz kesinti veya avans kaydı yok.</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {deductions.map((d, i) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', padding: '0.85rem 1.25rem', borderBottom: i < deductions.length - 1 ? '1px solid var(--bg-main)' : 'none', gap: '1rem' }}>
              <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: d.type === 'Kesinti' ? '#fee2e2' : '#fef3c7', color: d.type === 'Kesinti' ? '#dc2626' : '#d97706' }}>{d.type}</span>
              <span style={{ flex: 1, fontSize: '0.88rem' }}>{d.reason}</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>{new Date(d.date + 'T00:00:00').toLocaleDateString('tr-TR')}</span>
              <span style={{ fontWeight: '700', fontSize: '0.9rem', minWidth: '80px', textAlign: 'right' }}>₺{Number(d.amount).toLocaleString('tr-TR')}</span>
              <button onClick={() => handleDelete(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.25rem' }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Leave Tab ────────────────────────────────────────────────────────────────
const LeaveTab = ({ employee }) => {
  const [usedDays, setUsedDays] = useState(0);
  const [loading, setLoading]   = useState(true);
  const currentYear = new Date().getFullYear();
  const entitlement = calcLeaveEntitlement(employee.hire_date);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { count } = await supabase
        .from('employee_attendance')
        .select('id', { count: 'exact', head: true })
        .eq('employee_id', employee.id)
        .eq('status', 'İzinli')
        .gte('date', `${currentYear}-01-01`)
        .lte('date', `${currentYear}-12-31`);
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
          <span style={{ fontSize: '0.88rem' }}>
            İşe giriş: <strong>{new Date(employee.hire_date + 'T00:00:00').toLocaleDateString('tr-TR')}</strong>
          </span>
          <span style={{ marginLeft: 'auto', fontWeight: '700', fontSize: '0.88rem', color: 'var(--primary)' }}>{years.toFixed(1)} yıl kıdem</span>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
        <MiniCard label={`${currentYear} Yılı Hakkı`} value={`${entitlement} gün`}                            color="#7c3aed" />
        <MiniCard label="Kullanılan"                   value={loading ? '…' : `${usedDays} gün`}              color="#d97706" />
        <MiniCard label="Kalan Bakiye"                 value={loading ? '…' : `${Math.max(0, remaining)} gün`} color={remaining > 0 ? '#16a34a' : '#dc2626'} />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
          <span>Kullanım Oranı</span><span>{usedPct}%</span>
        </div>
        <div style={{ height: '10px', borderRadius: '5px', background: 'var(--bg-main)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${usedPct}%`, borderRadius: '5px', background: barColor, transition: 'width 0.5s' }} />
        </div>
      </div>
      <div className="card">
        <p style={{ fontWeight: '700', fontSize: '0.88rem', marginBottom: '1rem' }}>İzin Hakkı Tablosu</p>
        {[
          { label: '1 – 5 yıl arası',  days: 14, active: years >= 1 && years < 5 },
          { label: '5 – 15 yıl arası', days: 20, active: years >= 5 && years < 15 },
          { label: '15 yıl ve üzeri',  days: 26, active: years >= 15 },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '0.65rem 0', borderBottom: i < 2 ? '1px solid var(--bg-main)' : 'none' }}>
            <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: row.active ? '700' : '400', color: row.active ? 'var(--text)' : 'var(--text-dim)' }}>{row.label}</span>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: row.active ? 'var(--primary)' : 'var(--text-dim)' }}>{row.days} gün</span>
            {row.active && <span style={{ marginLeft: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700', background: 'var(--primary-light)', color: 'var(--primary)' }}>Mevcut</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Position Tab (Personel Pozisyon Değişikliği) ─────────────────────────────
const PositionTab = ({ cid }) => {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState('');
  const [changes, setChanges] = useState([]);
  const [loadingChanges, setLoadingChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ new_title: '', change_date: new Date().toISOString().split('T')[0], reason: '' });

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, full_name, job_title')
      .eq('company_id', cid)
      .order('full_name');
    setEmployees(data || []);
  }, [cid]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const fetchChanges = useCallback(async () => {
    if (!selected) return;
    setLoadingChanges(true);
    const { data } = await supabase
      .from('employee_position_changes')
      .select('*')
      .eq('employee_id', selected)
      .order('change_date', { ascending: false });
    setChanges(data || []);
    setLoadingChanges(false);
  }, [selected]);

  useEffect(() => { fetchChanges(); }, [fetchChanges]);

  const currentEmployee = employees.find(e => e.id === selected);

  const handleSave = async () => {
    if (!form.new_title.trim() || !form.change_date) { alert('Yeni unvan ve tarih zorunludur.'); return; }
    setSaving(true);
    const { error } = await supabase.from('employee_position_changes').insert({
      employee_id: selected,
      previous_title: currentEmployee?.job_title || null,
      new_title: form.new_title.trim(),
      change_date: form.change_date,
      reason: form.reason || null,
    });
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
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className="form-label">Yeni Unvan / Pozisyon *</label>
                <input className="input" value={form.new_title} onChange={e => setForm(f => ({ ...f, new_title: e.target.value }))} placeholder="Örn: Kıdemli Şoför, Muhasebe Müdürü" />
              </div>
              <div>
                <label className="form-label">Değişiklik Tarihi *</label>
                <input className="input" type="date" value={form.change_date} onChange={e => setForm(f => ({ ...f, change_date: e.target.value }))} style={{ width: '160px' }} />
              </div>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label className="form-label">Açıklama / Neden</label>
                <input className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Opsiyonel…" />
              </div>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ whiteSpace: 'nowrap' }}>
                <Plus size={15} /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>

          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>Pozisyon Geçmişi</h3>
          {loadingChanges ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Yükleniyor…</div>
          ) : changes.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Henüz pozisyon değişikliği kaydı yok.</div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              {changes.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: i < changes.length - 1 ? '1px solid var(--bg-main)' : 'none', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: c.reason ? '0.25rem' : 0 }}>
                      {c.previous_title && (
                        <>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{c.previous_title}</span>
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>→</span>
                        </>
                      )}
                      <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--primary)' }}>{c.new_title}</span>
                    </div>
                    {c.reason && <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{c.reason}</p>}
                  </div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                    {new Date(c.change_date + 'T00:00:00').toLocaleDateString('tr-TR')}
                  </span>
                  <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.25rem', display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Shared UI helpers ────────────────────────────────────────────────────────
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
