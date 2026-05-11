import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Users, Plus, Search, Briefcase, Calendar, Clock, DollarSign,
  MoreVertical, X, UserPlus, ShieldCheck, CreditCard, ChevronRight
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatCurrency, formatDate, today, isValidPhone } from '../utils/formatters';
import { FormField, EmptyState } from './Invoices';

const PAGE_SIZE = 10;
const POSITIONS = ['Şoför', 'Operasyon', 'Muhasebe', 'Yönetim', 'Bakım', 'Depo', 'Satış'];
const FACILITIES = ['İstanbul Merkez', 'İzmir Depo', 'Ankara Şube'];

const Personnel = () => {
  const personnel = useStore(s => s.personnel);
  const addPersonnel = useStore(s => s.addPersonnel);
  const addAdvance = useStore(s => s.addAdvance);

  const [search, setSearch] = useState('');
  const [filterPos, setFilterPos] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAdvanceModal, setShowAdvanceModal] = useState(null);

  const filtered = personnel.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search || p.name.toLowerCase().includes(q) || p.department?.toLowerCase().includes(q);
    const matchPos = !filterPos || p.position === filterPos;
    return matchSearch && matchPos;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalSalary = personnel.reduce((s, p) => s + (p.salary || 0), 0);
  const activeCount = personnel.filter(p => p.status === 'active').length;
  const totalAdvances = personnel.reduce((s, p) => s + (p.advances || []).reduce((a, adv) => a + adv.amount, 0), 0);

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Personel & Puantaj</h1>
          <p className="text-muted">Çalışanlarınızın özlük bilgilerini, avanslarını ve maaş süreçlerini yönetin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Personel Kaydı
        </button>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <PStatCard title="Toplam Personel" value={personnel.length} sub={`${activeCount} Aktif`} icon={<Users size={20} />} color="var(--primary)" />
        <PStatCard title="Aylık Bordro" value={formatCurrency(totalSalary)} sub="Net Maaş Toplamı" icon={<DollarSign size={20} />} color="var(--success)" />
        <PStatCard title="Açık Avanslar" value={formatCurrency(totalAdvances)} sub="Kapatılmadı" icon={<CreditCard size={20} />} color="var(--warning)" />
        <PStatCard title="Kişi Başı Ort." value={personnel.length > 0 ? formatCurrency(totalSalary / personnel.length) : '₺0,00'} sub="Ortalama Maaş" icon={<Briefcase size={20} />} color="var(--text-dim)" />
      </div>

      {/* Filtreler */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, background: 'var(--bg-main)', padding: '0.6rem 1rem', borderRadius: '10px' }}>
            <Search size={16} className="text-dim" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Ad, departman ara..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', flex: 1 }} />
          </div>
          <select className="input" value={filterPos} onChange={e => { setFilterPos(e.target.value); setPage(1); }} style={{ width: 'auto' }}>
            <option value="">Tüm Pozisyonlar</option>
            {POSITIONS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        {paginated.length === 0 ? (
          <EmptyState icon={<Users size={48} />} title="Personel bulunamadı"
            description={search || filterPos ? 'Filtreleri değiştirin.' : 'Henüz personel kaydı yok.'}
            action={<button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={18} /> Personel Ekle</button>} />
        ) : (
          <>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Ad Soyad</th>
                  <th>Pozisyon / Dep.</th>
                  <th>Tesis</th>
                  <th>İşe Giriş</th>
                  <th>Açık Avans</th>
                  <th style={{ textAlign: 'right' }}>Net Maaş</th>
                  <th style={{ textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(p => {
                  const openAdvances = (p.advances || []).reduce((s, a) => s + a.amount, 0);
                  return (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedEmployee(p)}>
                      <td style={{ padding: '1.1rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--primary)', fontSize: '1rem', flexShrink: 0 }}>
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <p style={{ fontWeight: '700' }}>{p.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{p.position}</p>
                          <p className="text-dim" style={{ fontSize: '0.75rem' }}>{p.department}</p>
                        </div>
                      </td>
                      <td className="text-dim" style={{ fontSize: '0.85rem' }}>{p.facility}</td>
                      <td className="text-dim">{formatDate(p.startDate)}</td>
                      <td style={{ color: openAdvances > 0 ? 'var(--warning)' : 'var(--success)', fontWeight: '700' }}>
                        {openAdvances > 0 ? formatCurrency(openAdvances) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '800' }}>{formatCurrency(p.salary)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={e => { e.stopPropagation(); setShowAdvanceModal(p); }}>
                          <CreditCard size={14} /> Avans
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '0.4rem 1rem' }}>←</button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i + 1} className="btn" onClick={() => setPage(i + 1)}
                    style={{ padding: '0.4rem 0.9rem', background: page === i + 1 ? 'var(--primary)' : 'transparent', color: page === i + 1 ? 'white' : 'var(--text-dim)', border: 'none' }}>
                    {i + 1}
                  </button>
                ))}
                <button className="btn btn-ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '0.4rem 1rem' }}>→</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Yeni Personel Modal */}
      {showAddModal && (
        <NewPersonnelModal
          onClose={() => setShowAddModal(false)}
          onSave={(data) => {
            addPersonnel(data);
            toast.success(`Personel eklendi: ${data.name}`);
            setShowAddModal(false);
          }}
        />
      )}

      {/* Avans Modal */}
      {showAdvanceModal && (
        <AdvanceModal
          employee={showAdvanceModal}
          onClose={() => setShowAdvanceModal(null)}
          onSave={(data) => {
            addAdvance(showAdvanceModal.id, data);
            toast.success(`Avans kaydedildi: ${formatCurrency(data.amount)}`);
            setShowAdvanceModal(null);
          }}
        />
      )}

      {/* Detay Drawer */}
      {selectedEmployee && (
        <EmployeeDrawer employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
      )}
    </div>
  );
};

// ─── Yeni Personel Modal ──────────────────────────────────────────────────────
const NewPersonnelModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ name: '', tcNo: '', position: POSITIONS[0], department: 'Operasyon', facility: FACILITIES[0], salary: '', phone: '', startDate: today(), status: 'active' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Ad soyad girin';
    if (!form.salary || parseFloat(form.salary) <= 0) e.salary = 'Maaş girin';
    if (form.phone && !isValidPhone(form.phone)) e.phone = 'Geçerli telefon girin';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div style={overlayStyle}>
      <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><UserPlus size={20} /></div>
            <h2 style={{ fontSize: '1.25rem' }}>Yeni Personel Kaydı</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
            <FormField label="Ad Soyad *" error={errors.name}>
              <input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn: Ahmet Yılmaz" style={{ width: '100%' }} />
            </FormField>
            <FormField label="T.C. Kimlik No">
              <input className="input" value={form.tcNo} onChange={e => setForm(f => ({ ...f, tcNo: e.target.value }))} placeholder="11 haneli..." style={{ width: '100%' }} />
            </FormField>
            <FormField label="Pozisyon">
              <select className="input" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} style={{ width: '100%' }}>
                {POSITIONS.map(p => <option key={p}>{p}</option>)}
              </select>
            </FormField>
            <FormField label="Departman">
              <select className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} style={{ width: '100%' }}>
                <option>Operasyon</option><option>Finans</option><option>İdari</option><option>Bakım</option>
              </select>
            </FormField>
            <FormField label="Tesis">
              <select className="input" value={form.facility} onChange={e => setForm(f => ({ ...f, facility: e.target.value }))} style={{ width: '100%' }}>
                {FACILITIES.map(f => <option key={f}>{f}</option>)}
              </select>
            </FormField>
            <FormField label="Net Maaş (₺) *" error={errors.salary}>
              <input className={`input ${errors.salary ? 'input-error' : ''}`} type="number" min="0" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="0.00" style={{ width: '100%' }} />
            </FormField>
            <FormField label="Telefon" error={errors.phone}>
              <input className={`input ${errors.phone ? 'input-error' : ''}`} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+90 5..." style={{ width: '100%' }} />
            </FormField>
            <FormField label="İşe Giriş Tarihi">
              <input className="input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={{ width: '100%' }} />
            </FormField>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>İptal</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => { if (!validate()) return; onSave({ ...form, salary: parseFloat(form.salary) }); }}>
            Personeli Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Avans Modal ──────────────────────────────────────────────────────────────
const AdvanceModal = ({ employee, onClose, onSave }) => {
  const [form, setForm] = useState({ amount: '', date: today(), reason: '', status: 'open' });
  const [error, setError] = useState('');

  const existingAdvances = (employee.advances || []);
  const totalAdvance = existingAdvances.reduce((s, a) => s + a.amount, 0);

  const handleSave = () => {
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) { setError('Geçerli tutar girin'); return; }
    if (!form.reason.trim()) { setError('Avans nedeni girin'); return; }
    onSave({ ...form, amount: amt });
  };

  return (
    <div style={overlayStyle}>
      <div className="card" style={{ width: '100%', maxWidth: '460px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem' }}>Avans Talebi: {employee.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
        </div>

        {existingAdvances.length > 0 && (
          <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '12px', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem', fontWeight: '700' }}>MEVCUT AVANSLAR</p>
            {existingAdvances.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.3rem 0' }}>
                <span className="text-dim">{a.reason}</span>
                <span style={{ fontWeight: '700', color: 'var(--warning)' }}>{formatCurrency(a.amount)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
              <span>Toplam</span><span style={{ color: 'var(--warning)' }}>{formatCurrency(totalAdvance)}</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FormField label="Avans Tutarı (₺) *" error={error}>
            <input className={`input ${error ? 'input-error' : ''}`} type="number" min="0" value={form.amount} onChange={e => { setForm(f => ({ ...f, amount: e.target.value })); setError(''); }} style={{ width: '100%' }} />
          </FormField>
          <FormField label="Tarih">
            <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%' }} />
          </FormField>
          <FormField label="Avans Nedeni *">
            <input className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Neden avans talebi?" style={{ width: '100%' }} />
          </FormField>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>İptal</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Avans Kaydet</button>
        </div>
      </div>
    </div>
  );
};

// ─── Çalışan Detay Drawer ─────────────────────────────────────────────────────
const EmployeeDrawer = ({ employee, onClose }) => {
  const advances = employee.advances || [];
  const totalAdvance = advances.reduce((s, a) => s + a.amount, 0);

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', height: '100%', borderRadius: '0', padding: '2.5rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem' }}>Personel Kaydı</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1.25rem', background: 'var(--bg-main)', borderRadius: '15px', marginBottom: '1.5rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--primary)', fontSize: '1.4rem' }}>
            {employee.name.charAt(0)}
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem' }}>{employee.name}</h3>
            <p className="text-dim" style={{ fontSize: '0.8rem' }}>{employee.position} · {employee.facility}</p>
            <p className="text-dim" style={{ fontSize: '0.75rem' }}>{employee.phone}</p>
          </div>
        </div>

        <div className="grid grid-cols-2" style={{ gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ background: 'white', border: '1px solid var(--border)', padding: '1rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-dim)' }}>NET MAAŞ</p>
            <h4 style={{ color: 'var(--success)' }}>{formatCurrency(employee.salary)}</h4>
          </div>
          <div className="card" style={{ background: 'white', border: '1px solid var(--border)', padding: '1rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-dim)' }}>AÇIK AVANS</p>
            <h4 style={{ color: totalAdvance > 0 ? 'var(--warning)' : 'var(--success)' }}>{formatCurrency(totalAdvance)}</h4>
          </div>
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>ÖZLÜK BİLGİLERİ</p>
          <InfoRow label="İşe Giriş" value={formatDate(employee.startDate)} />
          <InfoRow label="Departman" value={employee.department} />
          <InfoRow label="Tesis" value={employee.facility} />
        </div>

        {advances.length > 0 && (
          <>
            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '0.75rem', marginTop: '1.5rem' }}>AVANS GEÇMİŞİ</p>
            {advances.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>{a.reason}</p>
                  <p className="text-dim" style={{ fontSize: '0.75rem' }}>{formatDate(a.date)}</p>
                </div>
                <span style={{ fontWeight: '700', color: 'var(--warning)' }}>{formatCurrency(a.amount)}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
    <span className="text-dim" style={{ fontSize: '0.85rem' }}>{label}</span>
    <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{value}</span>
  </div>
);

const PStatCard = ({ title, value, sub, icon, color }) => (
  <div className="card">
    <div style={{ color, marginBottom: '0.75rem' }}>{icon}</div>
    <h3 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>{value}</h3>
    <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>{title}</p>
    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{sub}</p>
  </div>
);

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };

export default Personnel;
