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
    due_date: new Date().toISOString().split('T')[0],
    amount: 0,
    bank_name: '',
    customer_id: '',
    status: 'Portföyde'
  });

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
      setNewCheck({ type: 'Müşteri Çeki', due_date: new Date().toISOString().split('T')[0], amount: 0, bank_name: '', customer_id: '', status: 'Portföyde' });
    }
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
              <th style={{ textAlign: 'right' }}>Tutar</th>
              <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</td></tr>
            ) : checks.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Henüz çek/senet kaydı bulunmuyor.</td></tr>
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
                  <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--primary)' }}>₺{c.amount.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                    <button className="btn btn-ghost"><MoreVertical size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
