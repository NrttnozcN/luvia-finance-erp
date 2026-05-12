import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Calendar, 
  Building2, 
  MoreVertical, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownLeft,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Checks = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [newCheck, setNewCheck] = useState({
    type: 'Müşteri Çeki',
    check_no: '',
    due_date: new Date().toISOString().split('T')[0],
    amount: 0,
    bank_name: '',
    customer_id: '',
    status: 'Portföyde'
  });
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editCheck, setEditCheck] = useState(null);
  const [ciroModal, setCiroModal] = useState({ show: false, check: null, toCustId: '' });

  const fetchData = async () => {
    setLoading(true);
    const { data: chks } = await supabase.from('checks').select('*, customers(name)').order('due_date', { ascending: true });
    const { data: custs } = await supabase.from('customers').select('*');
    setChecks(chks || []);
    setCustomers(custs || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!newCheck.due_date || !newCheck.amount) {
      alert('Vade tarihi ve tutar zorunludur.');
      return;
    }
    const payload = {
      type: newCheck.type,
      check_no: newCheck.check_no || null,
      due_date: newCheck.due_date,
      amount: Number(newCheck.amount),
      bank_name: newCheck.bank_name,
      customer_id: newCheck.customer_id || null,
      status: newCheck.status,
    };
    const { error } = await supabase.from('checks').insert([payload]);
    if (error) alert(error.message);
    else {
      setShowAddModal(false);
      fetchData();
      setNewCheck({ type: 'Müşteri Çeki', check_no: '', due_date: new Date().toISOString().split('T')[0], amount: 0, bank_name: '', customer_id: '', status: 'Portföyde' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu çek/senet kaydı silinecek. Emin misin?')) return;
    const { error } = await supabase.from('checks').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchData();
  };

  const handleUpdate = async () => {
    const { id, customers: _c, ...fields } = editCheck;
    const { error } = await supabase.from('checks').update({
      ...fields,
      amount: Number(fields.amount),
      customer_id: fields.customer_id || null,
    }).eq('id', id);
    if (error) alert(error.message);
    else { setEditCheck(null); fetchData(); }
  };

  const handleCiroSubmit = async () => {
    if (!ciroModal.toCustId) { alert('Lütfen ciro edilecek firmayı seçin.'); return; }
    const chk = ciroModal.check;
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('checks').update({ status: 'Ciro Edildi', ciro_to_customer_id: ciroModal.toCustId }).eq('id', chk.id),
      supabase.from('checks').insert([{
        type: 'Kendi Çekimiz',
        due_date: chk.due_date,
        amount: chk.amount,
        bank_name: chk.bank_name,
        customer_id: ciroModal.toCustId,
        status: 'Ciro Edildi',
      }]),
    ]);
    if (e1 || e2) alert((e1 || e2).message);
    else { setCiroModal({ show: false, check: null, toCustId: '' }); fetchData(); }
  };

  return (
    <div className="checks-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Çek & Senet Yönetimi</h1>
          <p className="text-muted">Alınan ve verilen çeklerin vade takiplerini, ciro işlemlerini ve durumlarını yönetin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Çek/Senet Kaydı
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <p className="text-muted">Portföydeki Çekler</p>
          <h2 style={{ fontSize: '1.75rem' }}>₺{checks.filter(c => c.status === 'Portföyde').reduce((acc, c) => acc + Number(c.amount), 0).toLocaleString()}</h2>
        </div>
        <div className="card">
          <p className="text-muted">Vadesi Geçen</p>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--danger)' }}>₺0</h2>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.25rem' }}>Vade Tarihi</th>
              <th>Tür</th>
              <th>Cari / Keşideci</th>
              <th>Banka</th>
              <th>Çek No</th>
              <th style={{ textAlign: 'right' }}>Tutar</th>
              <th>Durum</th>
              <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</td></tr>
            ) : checks.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>Henüz çek/senet kaydı bulunmuyor.</td></tr>
            ) : (
              checks.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Calendar size={18} className="text-primary" />
                      <span style={{ fontWeight: '700' }}>{new Date(c.due_date).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </td>
                  <td><span className={`badge ${c.type === 'Müşteri Çeki' ? 'badge-primary' : 'badge-warning'}`}>{c.type}</span></td>
                  <td style={{ fontWeight: '600' }}>{c.customers?.name || 'Genel'}</td>
                  <td className="text-dim">{c.bank_name}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{c.check_no || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--primary)' }}>₺{c.amount.toLocaleString()}</td>
                  <td>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '20px',
                      background: c.status === 'Ciro Edildi' ? '#e0f2fe' : c.status === 'Tahsil Edildi' || c.status === 'Ödendi' ? '#dcfce7' : '#fef3c7',
                      color: c.status === 'Ciro Edildi' ? '#075985' : c.status === 'Tahsil Edildi' || c.status === 'Ödendi' ? '#166534' : '#92400e' }}>
                      {c.status || 'Portföyde'}
                    </span>
                    {c.status === 'Ciro Edildi' && c.ciro_to_customer_id && (
                      <div style={{ fontSize: '0.75rem', color: '#075985', fontWeight: '600', marginTop: '3px' }}>
                        → {customers.find(x => x.id === c.ciro_to_customer_id)?.name || '—'}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '1.25rem', position: 'relative' }}>
                    <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === c.id ? null : c.id); }}>
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === c.id && (
                      <div style={{ position: 'absolute', right: '1rem', top: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}
                        onMouseLeave={() => setOpenMenuId(null)}>
                        <button onClick={() => { setEditCheck({ ...c }); setOpenMenuId(null); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          ✏️ Düzenle
                        </button>
                        {['Müşteri Çeki', 'Müşteri Senedi'].includes(c.type) && c.status !== 'Ciro Edildi' && (
                          <button onClick={() => { setCiroModal({ show: true, check: c, toCustId: '' }); setOpenMenuId(null); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,0,0.07)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                            🔄 Ciro Et
                          </button>
                        )}
                        <button onClick={() => { setOpenMenuId(null); handleDelete(c.id); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: 'var(--danger)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          🗑️ Sil
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* EDIT CHECK MODAL */}
      {editCheck && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><CreditCard size={20} /></div>
                <h2 style={{ fontSize: '1.25rem' }}>Çek/Senet Düzenle</h2>
              </div>
              <button onClick={() => setEditCheck(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Evrak Türü</label>
                <select className="input" value={editCheck.type} onChange={e => setEditCheck({ ...editCheck, type: e.target.value })}>
                  <option>Müşteri Çeki</option><option>Kendi Çekimiz</option>
                  <option>Müşteri Senedi</option><option>Kendi Senedimiz</option>
                </select>
              </div>
              <InputGroup label="Vade Tarihi" type="date" value={editCheck.due_date} onChange={e => setEditCheck({ ...editCheck, due_date: e.target.value })} />
              <InputGroup label="Tutar (₺)" type="number" value={editCheck.amount} onChange={e => setEditCheck({ ...editCheck, amount: e.target.value })} />
              <InputGroup label="Banka / Şube" placeholder="Garanti BBVA" value={editCheck.bank_name || ''} onChange={e => setEditCheck({ ...editCheck, bank_name: e.target.value })} />
              <InputGroup label="Çek No / Senet No" placeholder="Opsiyonel" value={editCheck.check_no || ''} onChange={e => setEditCheck({ ...editCheck, check_no: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <label className="label-sm">Keşideci / Cari</label>
              <select className="input" value={editCheck.customer_id || ''} onChange={e => setEditCheck({ ...editCheck, customer_id: e.target.value })}>
                <option value="">Seçiniz...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <label className="label-sm">Durum</label>
              <select className="input" value={editCheck.status || 'Portföyde'} onChange={e => setEditCheck({ ...editCheck, status: e.target.value })}>
                <option>Portföyde</option><option>Bankada</option><option>Tahsil Edildi</option>
                <option>Ödendi</option><option>Ciro Edildi</option><option>İade Edildi</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setEditCheck(null)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleUpdate}>Güncelle</button>
            </div>
          </div>
        </div>
      )}

      {/* CİRO MODAL */}
      {ciroModal.show && ciroModal.check && (
        <div style={modalOverlayStyle}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem' }}>🔄 Çeki Ciro Et</h2>
              <button onClick={() => setCiroModal({ show: false, check: null, toCustId: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ background: 'var(--bg-main)', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Ciro edilecek çek:</p>
              <p style={{ fontWeight: '800', fontSize: '1.1rem' }}>₺{Number(ciroModal.check.amount).toLocaleString('tr-TR')}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{ciroModal.check.bank_name} · Vade: {new Date(ciroModal.check.due_date).toLocaleDateString('tr-TR')}</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Keşideci: {ciroModal.check.customers?.name || '—'}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <label className="label-sm">Ciro Edilecek Firma *</label>
              <select className="input" value={ciroModal.toCustId} onChange={e => setCiroModal({ ...ciroModal, toCustId: e.target.value })}>
                <option value="">Seçiniz...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '1.25rem' }}>
              Onayladığında mevcut çek "Ciro Edildi" olarak işaretlenir ve seçilen firmaya yeni bir ödeme kaydı oluşturulur.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setCiroModal({ show: false, check: null, toCustId: '' })} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleCiroSubmit} style={{ flex: 2 }}>Ciroyu Onayla</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW CHECK MODAL */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><CreditCard size={20} /></div>
                <h2 style={{ fontSize: '1.25rem' }}>Yeni Çek/Senet Kaydı</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Evrak Türü</label>
                <select className="input" value={newCheck.type} onChange={(e) => setNewCheck({...newCheck, type: e.target.value})}>
                  <option>Müşteri Çeki</option>
                  <option>Kendi Çekimiz</option>
                  <option>Müşteri Senedi</option>
                  <option>Kendi Senedimiz</option>
                </select>
              </div>
              <InputGroup label="Vade Tarihi" type="date" value={newCheck.due_date} onChange={(e) => setNewCheck({...newCheck, due_date: e.target.value})} />
              <InputGroup label="Tutar (₺)" type="number" value={newCheck.amount} onChange={(e) => setNewCheck({...newCheck, amount: e.target.value})} />
              <InputGroup label="Banka / Şube" placeholder="Örn: Garanti BBVA" value={newCheck.bank_name} onChange={(e) => setNewCheck({...newCheck, bank_name: e.target.value})} />
              <InputGroup label="Çek No / Senet No" placeholder="Opsiyonel" value={newCheck.check_no} onChange={(e) => setNewCheck({...newCheck, check_no: e.target.value})} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <label className="label-sm">Keşideci / Cari</label>
              <select className="input" value={newCheck.customer_id} onChange={(e) => setNewCheck({...newCheck, customer_id: e.target.value})}>
                <option value="">Seçiniz...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Kaydı Oluştur</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InputGroup = ({ label, placeholder, type, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label className="label-sm">{label}</label>
    <input type={type || 'text'} className="input" placeholder={placeholder} value={value} onChange={onChange} />
  </div>
);

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modalContentStyle = { width: '100%', maxWidth: '650px', padding: '2rem' };

export default Checks;
