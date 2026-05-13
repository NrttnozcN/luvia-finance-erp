import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Pencil, X, ChevronLeft, ChevronRight,
  Calendar, Plus, Trash2, Save,
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

const calcLeaveEntitlement = (hireDate) => {
  if (!hireDate) return 14;
  const years = (Date.now() - new Date(hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (years >= 15) return 26;
  if (years >= 5)  return 20;
  return 14;
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Personnel = () => {
  const currentUser = useAuthStore(s => s.currentUser);
  const cid = currentUser?.company_id;

  const [personnel, setPersonnel] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFacility, setFilterFacility] = useState('');
  const [editRecord, setEditRecord] = useState(null);
  const [detailRecord, setDetailRecord] = useState(null);
  const [detailTab, setDetailTab] = useState('attendance');

  const fetchPersonnel = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*, facilities(name)')
      .eq('company_id', cid)
      .order('name');
    setPersonnel(data || []);
    setLoading(false);
  }, [cid]);

  const fetchFacilities = useCallback(async () => {
    const { data } = await supabase
      .from('facilities')
      .select('id, name')
      .eq('company_id', cid);
    setFacilities(data || []);
  }, [cid]);

  useEffect(() => { fetchPersonnel(); fetchFacilities(); }, [fetchPersonnel, fetchFacilities]);

  const filtered = personnel.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search || p.name?.toLowerCase().includes(q) || p.job_title?.toLowerCase().includes(q);
    const matchFacility = !filterFacility || p.facility_id === filterFacility;
    return matchSearch && matchFacility;
  });

  const handleEditSave = async () => {
    const { id, job_title, hire_date, salary, facility_id } = editRecord;
    const { error } = await supabase
      .from('profiles')
      .update({ job_title, hire_date: hire_date || null, salary: salary || null, facility_id: facility_id || null })
      .eq('id', id);
    if (error) { alert('Güncelleme hatası: ' + error.message); return; }
    setEditRecord(null);
    fetchPersonnel();
  };

  const handleExport = () => {
    const BOM = '﻿';
    const headers = 'Ad Soyad,Görev,Tesis,İşe Giriş,Maaş';
    const rows = filtered.map(p => [
      `"${p.name || ''}"`,
      `"${p.job_title || ''}"`,
      `"${p.facilities?.name || ''}"`,
      p.hire_date || '',
      p.salary || '',
    ].join(','));
    const csv = BOM + [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'personel.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const totalSalary = filtered.reduce((sum, p) => sum + (Number(p.salary) || 0), 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Personel & Puantaj</h1>
          <p className="text-muted">Çalışan yönetimi, devam takibi ve maaş işlemleri.</p>
        </div>
        <button className="btn btn-outline" onClick={handleExport}>CSV İndir</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        <StatCard label="Toplam Personel"      value={personnel.length}                              color="#0284c7" />
        <StatCard label="Toplam Maaş Gideri"   value={`₺${totalSalary.toLocaleString('tr-TR')}`}    color="#16a34a" />
        <StatCard label="Tesis / Şube Sayısı"  value={facilities.length}                             color="#7c3aed" />
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input className="input" placeholder="İsim veya görev ara…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
          </div>
          {facilities.length > 0 && (
            <select className="input" style={{ minWidth: '180px' }} value={filterFacility} onChange={e => setFilterFacility(e.target.value)}>
              <option value="">Tüm Tesisler</option>
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          )}
          <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{filtered.length} kayıt</span>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Yükleniyor…</div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--bg-main)' }}>
                {['Ad Soyad', 'Görev / Unvan', 'Tesis', 'İşe Giriş', 'Maaş', ''].map(h => (
                  <th key={h} style={{ padding: '1rem 1.25rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr
                  key={p.id}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--bg-main)' : 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.8rem', flexShrink: 0 }}>
                        {getInitials(p.name)}
                      </div>
                      <div>
                        <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{p.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontSize: '0.88rem' }}>
                    {p.job_title || <span style={{ color: 'var(--text-dim)' }}>—</span>}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontSize: '0.88rem' }}>
                    {p.facilities?.name || <span style={{ color: 'var(--text-dim)' }}>Merkez</span>}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontSize: '0.88rem' }}>
                    {p.hire_date
                      ? new Date(p.hire_date + 'T00:00:00').toLocaleDateString('tr-TR')
                      : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontSize: '0.88rem', fontWeight: '600' }}>
                    {p.salary
                      ? `₺${Number(p.salary).toLocaleString('tr-TR')}`
                      : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => setEditRecord({ ...p })}
                      >
                        <Pencil size={13} /> Düzenle
                      </button>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => { setDetailRecord(p); setDetailTab('attendance'); }}
                      >
                        Detay →
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editRecord && (
        <ModalWrapper title="Personel Bilgilerini Düzenle" onClose={() => setEditRecord(null)} onSave={handleEditSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Ad Soyad</label>
              <input className="input" value={editRecord.name || ''} readOnly style={{ opacity: 0.6 }} />
            </div>
            <div>
              <label className="form-label">Görev / Unvan</label>
              <input className="input" value={editRecord.job_title || ''} onChange={e => setEditRecord(r => ({ ...r, job_title: e.target.value }))} placeholder="Örn: Şoför, Muhasebeci" />
            </div>
            <div>
              <label className="form-label">Maaş (₺)</label>
              <input className="input" type="number" value={editRecord.salary || ''} onChange={e => setEditRecord(r => ({ ...r, salary: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">İşe Giriş Tarihi</label>
              <input className="input" type="date" value={editRecord.hire_date || ''} onChange={e => setEditRecord(r => ({ ...r, hire_date: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Tesis / Şube</label>
              <select className="input" value={editRecord.facility_id || ''} onChange={e => setEditRecord(r => ({ ...r, facility_id: e.target.value || null }))}>
                <option value="">Merkez</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* Detail Modal */}
      {detailRecord && (
        <DetailModal
          person={detailRecord}
          tab={detailTab}
          setTab={setDetailTab}
          onClose={() => setDetailRecord(null)}
        />
      )}
    </div>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ person, tab, setTab, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
    <div style={{ background: 'var(--bg-card)', borderRadius: '16px', width: '100%', maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--bg-main)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1rem', flexShrink: 0 }}>
          {getInitials(person.name)}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: '700', fontSize: '1.05rem' }}>{person.name}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            {person.job_title || 'Görev belirtilmemiş'}
            {person.hire_date ? ` · İşe Giriş: ${new Date(person.hire_date + 'T00:00:00').toLocaleDateString('tr-TR')}` : ''}
          </p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '0.5rem' }}>
          <X size={20} />
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--bg-main)', padding: '0 2rem' }}>
        {[
          { key: 'attendance', label: 'Puantaj' },
          { key: 'payroll',    label: 'Maaş & Kesintiler' },
          { key: 'leave',      label: 'Yıllık İzin' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{ padding: '0.85rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: tab === t.key ? '700' : '500', fontSize: '0.88rem', color: tab === t.key ? 'var(--primary)' : 'var(--text-dim)', borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: '-1px', transition: 'color 0.2s' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
        {tab === 'attendance' && <AttendanceTab person={person} />}
        {tab === 'payroll'    && <PayrollTab    person={person} />}
        {tab === 'leave'      && <LeaveTab      person={person} />}
      </div>
    </div>
  </div>
);

// ─── Attendance Tab ───────────────────────────────────────────────────────────
const AttendanceTab = ({ person }) => {
  const today = new Date();
  const [year, setYear]       = useState(today.getFullYear());
  const [month, setMonth]     = useState(today.getMonth() + 1);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ date: today.toISOString().split('T')[0], status: 'Geldi', note: '' });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    const { data } = await supabase
      .from('personnel_attendance')
      .select('*')
      .eq('profile_id', person.id)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false });
    setRecords(data || []);
    setLoading(false);
  }, [person.id, year, month]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handleSave = async () => {
    if (!form.date || !form.status) return;
    setSaving(true);
    const { data: existing } = await supabase
      .from('personnel_attendance')
      .select('id')
      .eq('profile_id', person.id)
      .eq('date', form.date)
      .maybeSingle();

    const payload = { status: form.status, note: form.note || null };
    const { error } = existing
      ? await supabase.from('personnel_attendance').update(payload).eq('id', existing.id)
      : await supabase.from('personnel_attendance').insert({ profile_id: person.id, date: form.date, ...payload });

    setSaving(false);
    if (error) { alert(error.message); return; }
    fetchRecords();
  };

  const counts = ATTENDANCE_STATUSES.reduce((acc, s) => ({ ...acc, [s]: records.filter(r => r.status === s).length }), {});
  const MONTH_NAMES = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Navigator + stats */}
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

      {/* Entry form */}
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

      {/* Records */}
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
                <span style={{ padding: '0.2rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700', background: sc.bg, color: sc.color }}>
                  {r.status}
                </span>
                {r.note && <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{r.note}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Payroll Tab ──────────────────────────────────────────────────────────────
const PayrollTab = ({ person }) => {
  const [deductions, setDeductions] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm] = useState({
    type: 'Kesinti', amount: '', reason: '',
    date: new Date().toISOString().split('T')[0],
  });

  const fetchDeductions = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('personnel_deductions')
      .select('*')
      .eq('profile_id', person.id)
      .order('date', { ascending: false });
    setDeductions(data || []);
    setLoading(false);
  }, [person.id]);

  useEffect(() => { fetchDeductions(); }, [fetchDeductions]);

  const handleAdd = async () => {
    if (!form.amount || !form.reason) { alert('Tutar ve açıklama zorunludur.'); return; }
    setSaving(true);
    const { error } = await supabase.from('personnel_deductions').insert({
      profile_id: person.id,
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
    await supabase.from('personnel_deductions').delete().eq('id', id);
    fetchDeductions();
  };

  const totalDeductions = deductions.filter(d => d.type === 'Kesinti').reduce((s, d) => s + Number(d.amount), 0);
  const totalAdvances   = deductions.filter(d => d.type === 'Avans').reduce((s, d) => s + Number(d.amount), 0);
  const netSalary = (Number(person.salary) || 0) - totalDeductions - totalAdvances;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
        <MiniCard label="Brüt Maaş"             value={`₺${Number(person.salary || 0).toLocaleString('tr-TR')}`}          color="#0284c7" />
        <MiniCard label="Toplam Kesinti & Avans" value={`-₺${(totalDeductions + totalAdvances).toLocaleString('tr-TR')}`} color="#dc2626" />
        <MiniCard label="Net Ödenecek"           value={`₺${netSalary.toLocaleString('tr-TR')}`}                          color="#16a34a" />
      </div>

      {/* Add form */}
      <div className="card" style={{ background: 'var(--bg-main)' }}>
        <p style={{ fontWeight: '700', fontSize: '0.88rem', marginBottom: '1rem' }}>Kesinti / Avans Ekle</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">Tür</label>
            <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: '120px' }}>
              <option>Kesinti</option>
              <option>Avans</option>
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
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
            <Plus size={15} /> Ekle
          </button>
        </div>
      </div>

      {/* List */}
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
const LeaveTab = ({ person }) => {
  const [usedDays, setUsedDays] = useState(0);
  const [loading, setLoading]   = useState(true);
  const currentYear = new Date().getFullYear();
  const entitlement = calcLeaveEntitlement(person.hire_date);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { count } = await supabase
        .from('personnel_attendance')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', person.id)
        .eq('status', 'İzinli')
        .gte('date', `${currentYear}-01-01`)
        .lte('date', `${currentYear}-12-31`);
      setUsedDays(count || 0);
      setLoading(false);
    })();
  }, [person.id, currentYear]);

  const remaining = entitlement - usedDays;
  const usedPct   = entitlement > 0 ? Math.min(100, Math.round((usedDays / entitlement) * 100)) : 0;
  const years     = person.hire_date ? (Date.now() - new Date(person.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25) : 0;
  const barColor  = usedPct >= 100 ? '#dc2626' : usedPct >= 80 ? '#d97706' : 'var(--primary)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Kıdem bilgisi */}
      {person.hire_date && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.25rem', background: 'var(--bg-main)', borderRadius: '10px' }}>
          <Calendar size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.88rem' }}>
            İşe giriş: <strong>{new Date(person.hire_date + 'T00:00:00').toLocaleDateString('tr-TR')}</strong>
          </span>
          <span style={{ marginLeft: 'auto', fontWeight: '700', fontSize: '0.88rem', color: 'var(--primary)' }}>
            {years.toFixed(1)} yıl kıdem
          </span>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
        <MiniCard label={`${currentYear} Yılı Hakkı`} value={`${entitlement} gün`}                         color="#7c3aed" />
        <MiniCard label="Kullanılan"                   value={loading ? '…' : `${usedDays} gün`}           color="#d97706" />
        <MiniCard label="Kalan Bakiye"                 value={loading ? '…' : `${Math.max(0, remaining)} gün`} color={remaining > 0 ? '#16a34a' : '#dc2626'} />
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
          <span>Kullanım Oranı</span>
          <span>{usedPct}%</span>
        </div>
        <div style={{ height: '10px', borderRadius: '5px', background: 'var(--bg-main)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${usedPct}%`, borderRadius: '5px', background: barColor, transition: 'width 0.5s' }} />
        </div>
      </div>

      {/* Entitlement table */}
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
            {row.active && (
              <span style={{ marginLeft: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700', background: 'var(--primary-light)', color: 'var(--primary)' }}>
                Mevcut
              </span>
            )}
          </div>
        ))}
      </div>
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

const ModalWrapper = ({ title, onClose, onSave, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
    <div style={{ background: 'var(--bg-card)', borderRadius: '16px', width: '100%', maxWidth: '560px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
      <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.1rem' }}>{title}</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={20} /></button>
      </div>
      <div style={{ padding: '1.5rem 2rem' }}>{children}</div>
      <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--bg-main)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button className="btn btn-outline" onClick={onClose}>İptal</button>
        <button className="btn btn-primary" onClick={onSave}><Save size={15} /> Kaydet</button>
      </div>
    </div>
  </div>
);

const EmptyState = () => (
  <div style={{ padding: '4rem', textAlign: 'center' }}>
    <Users size={48} style={{ color: 'var(--text-dim)', margin: '0 auto 1rem', display: 'block' }} />
    <p style={{ fontWeight: '700', marginBottom: '0.5rem' }}>Personel bulunamadı</p>
    <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>Personel eklemek için Tanımlamalar → Kullanıcılar bölümünü kullanın.</p>
  </div>
);

export default Personnel;
