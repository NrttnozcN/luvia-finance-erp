import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Filter, 
  MoreVertical,
  ChevronRight,
  CreditCard,
  Building,
  X,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Finance = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [kasalar, setKasalar] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [newTransaction, setNewTransaction] = useState({
    type: 'Ödeme',
    account_type: 'Kasa',
    account_name: 'Merkez Kasa',
    amount: 0,
    customer_id: '',
    description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: trans } = await supabase.from('finance_transactions').select('*, customers(name)').order('created_at', { ascending: false });
    const { data: custs } = await supabase.from('customers').select('*');
    const { data: kslar } = await supabase.from('kasalar').select('*').order('name');
    setTransactions(trans || []);
    setCustomers(custs || []);
    setKasalar(kslar || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    const { error } = await supabase
      .from('finance_transactions')
      .insert([{ ...newTransaction, customer_id: newTransaction.customer_id || null, amount: Number(newTransaction.amount) }]);

    if (error) alert(error.message);
    else {
      setShowAddModal(false);
      fetchData();
      setNewTransaction({ type: 'Ödeme', account_type: 'Kasa', account_name: '', amount: 0, customer_id: '', description: '' });
    }
  };

  const handleUpdate = async () => {
    const { id, customers: _c, ...fields } = editRecord;
    const { error } = await supabase.from('finance_transactions').update({ ...fields, customer_id: fields.customer_id || null, amount: Number(fields.amount) }).eq('id', id);
    if (error) { alert('Güncelleme hatası: ' + error.message); return; }
    setEditRecord(null);
    fetchData();
  };

  const handleDelete = async (id, record) => {
    if (!window.confirm(`"${record.account_name || id}" silinecek. Emin misin?`)) return;
    const { error } = await supabase.from('finance_transactions').delete().eq('id', id);
    if (error) { alert('Silme hatası: ' + error.message); return; }
    fetchData();
  };

  return (
    <div className="finance-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Kasa & Banka Yönetimi</h1>
          <p className="text-muted">Tüm nakit akışınızı, banka hesaplarınızı ve ödemelerinizi tek bir yerden izleyin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni İşlem / Hesap Ekle
        </button>
      </header>

      {/* Finance Summary */}
      <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <p className="text-muted">Toplam Nakit (Kasa)</p>
          <h2 style={{ fontSize: '1.75rem' }}>₺{transactions.filter(t => t.account_type === 'Kasa').reduce((acc, t) => acc + (t.type === 'Tahsilat' ? Number(t.amount) : -Number(t.amount)), 0).toLocaleString()}</h2>
        </div>
        <div className="card">
          <p className="text-muted">Banka Bakiyeleri</p>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--primary)' }}>₺{transactions.filter(t => t.account_type === 'Banka').reduce((acc, t) => acc + (t.type === 'Tahsilat' ? Number(t.amount) : -Number(t.amount)), 0).toLocaleString()}</h2>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.25rem' }}>İşlem / Hesap</th>
              <th>Tür</th>
              <th>Cari</th>
              <th>Tutar</th>
              <th>Tarih</th>
              <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Henüz finansal işlem bulunmuyor.</td></tr>
            ) : (
              transactions.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ background: 'var(--bg-main)', padding: '0.5rem', borderRadius: '8px' }}>
                        {t.account_type === 'Banka' ? <Building size={18} color="var(--primary)" /> : <Wallet size={18} color="var(--primary)" />}
                      </div>
                      <span style={{ fontWeight: '700' }}>{t.account_name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${t.type === 'Tahsilat' ? 'badge-success' : 'badge-danger'}`}>
                      {t.type === 'Tahsilat' ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {t.type}
                    </span>
                  </td>
                  <td className="text-dim">{t.customers?.name || 'Genel İşlem'}</td>
                  <td style={{ fontWeight: '800', color: t.type === 'Tahsilat' ? 'var(--success)' : 'var(--danger)' }}>
                    {t.type === 'Tahsilat' ? '+' : '-'} ₺{t.amount.toLocaleString()}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{new Date(t.created_at).toLocaleDateString('tr-TR')}</td>
                  <td style={{ textAlign: 'right', paddingRight: '1.25rem', position: 'relative' }}>
                    <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === t.id ? null : t.id); }}>
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === t.id && (
                      <div style={{ position: 'absolute', right: '1rem', top: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '140px', overflow: 'hidden' }}
                        onMouseLeave={() => setOpenMenuId(null)}>
                        <button onClick={() => { setEditRecord({ ...t }); setOpenMenuId(null); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          ✏️ Düzenle
                        </button>
                        <button onClick={() => { setOpenMenuId(null); handleDelete(t.id, t); }}
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

      {/* EDIT FINANCE MODAL */}
      {editRecord && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><Wallet size={20} /></div>
                <h2 style={{ fontSize: '1.25rem' }}>Finansal İşlemi Düzenle</h2>
              </div>
              <button onClick={() => setEditRecord(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">İşlem Türü</label>
                <select className="input" value={editRecord.type} onChange={(e) => setEditRecord({...editRecord, type: e.target.value})}>
                  <option>Ödeme</option>
                  <option>Tahsilat</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Hesap Türü</label>
                <select className="input" value={editRecord.account_type} onChange={(e) => setEditRecord({...editRecord, account_type: e.target.value})}>
                  <option>Kasa</option>
                  <option>Banka</option>
                  <option>Kredi Kartı</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Hesap Adı</label>
                <select className="input" value={editRecord.account_name || ''} onChange={e => {
                  const kasa = kasalar.find(k => k.name === e.target.value);
                  setEditRecord({ ...editRecord, account_name: e.target.value, account_type: kasa?.type || editRecord.account_type });
                }}>
                  <option value="">Seçiniz...</option>
                  {kasalar.map(k => <option key={k.id} value={k.name}>{k.name} ({k.type})</option>)}
                </select>
              </div>
              <InputGroup label="Tutar (₺)" type="number" value={editRecord.amount} onChange={(e) => setEditRecord({...editRecord, amount: e.target.value})} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <label className="label-sm">İlgili Cari (Opsiyonel)</label>
              <select className="input" value={editRecord.customer_id || ''} onChange={(e) => setEditRecord({...editRecord, customer_id: e.target.value})}>
                <option value="">Seçiniz...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <InputGroup label="Açıklama" placeholder="İşlem detayı..." value={editRecord.description || ''} onChange={(e) => setEditRecord({...editRecord, description: e.target.value})} />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setEditRecord(null)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleUpdate}>Güncelle</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW FINANCE MODAL */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><Wallet size={20} /></div>
                <h2 style={{ fontSize: '1.25rem' }}>Yeni Finansal İşlem</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">İşlem Türü</label>
                <select className="input" value={newTransaction.type} onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value})}>
                  <option>Ödeme</option>
                  <option>Tahsilat</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Hesap Türü</label>
                <select className="input" value={newTransaction.account_type} onChange={(e) => setNewTransaction({...newTransaction, account_type: e.target.value})}>
                  <option>Kasa</option>
                  <option>Banka</option>
                  <option>Kredi Kartı</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Hesap Adı</label>
                <select className="input" value={newTransaction.account_name} onChange={e => {
                  const kasa = kasalar.find(k => k.name === e.target.value);
                  setNewTransaction({ ...newTransaction, account_name: e.target.value, account_type: kasa?.type || newTransaction.account_type });
                }}>
                  <option value="">Seçiniz...</option>
                  {kasalar.map(k => <option key={k.id} value={k.name}>{k.name} ({k.type})</option>)}
                </select>
              </div>
              <InputGroup label="Tutar (₺)" type="number" value={newTransaction.amount} onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <label className="label-sm">İlgili Cari (Opsiyonel)</label>
              <select className="input" value={newTransaction.customer_id} onChange={(e) => setNewTransaction({...newTransaction, customer_id: e.target.value})}>
                <option value="">Seçiniz...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <InputGroup label="Açıklama" placeholder="İşlem detayı..." value={newTransaction.description} onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})} />

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>İşlemi Kaydet</button>
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

export default Finance;
