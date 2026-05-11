import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownLeft,
  X,
  Calendar,
  Wallet
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const RevenueExpense = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [newTransaction, setNewTransaction] = useState({
    type: 'Gider (Çıkış)',
    category: 'Diğer',
    amount: 0,
    description: ''
  });

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('finance_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else setTransactions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSave = async () => {
    const { error } = await supabase
      .from('finance_transactions')
      .insert([newTransaction]);

    if (error) alert(error.message);
    else {
      setShowAddModal(false);
      fetchTransactions();
      setNewTransaction({ type: 'Gider (Çıkış)', category: 'Diğer', amount: 0, description: '' });
    }
  };

  return (
    <div className="revenue-expense-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Gelir & Gider Yönetimi</h1>
          <p className="text-muted">İşletmenizin genel nakit hareketlerini ve kategori bazlı giderlerini takip edin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Hareket Ekle
        </button>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-3" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <p className="text-muted">Bu Ay Toplam Gelir</p>
          <h2 style={{ fontSize: '2rem', color: 'var(--success)' }}>₺{transactions.filter(t => t.type === 'Gelir (Giriş)' || t.type === 'Tahsilat').reduce((acc, t) => acc + Number(t.amount), 0).toLocaleString()}</h2>
        </div>
        <div className="card">
          <p className="text-muted">Bu Ay Toplam Gider</p>
          <h2 style={{ fontSize: '2rem', color: 'var(--danger)' }}>₺{transactions.filter(t => t.type === 'Gider (Çıkış)' || t.type === 'Ödeme').reduce((acc, t) => acc + Number(t.amount), 0).toLocaleString()}</h2>
        </div>
        <div className="card">
          <p className="text-muted">Net Durum</p>
          <h2 style={{ fontSize: '2rem' }}>₺{(transactions.filter(t => t.type === 'Gelir (Giriş)' || t.type === 'Tahsilat').reduce((acc, t) => acc + Number(t.amount), 0) - transactions.filter(t => t.type === 'Gider (Çıkış)' || t.type === 'Ödeme').reduce((acc, t) => acc + Number(t.amount), 0)).toLocaleString()}</h2>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.25rem' }}>Tür</th>
              <th>Kategori</th>
              <th>Açıklama</th>
              <th>Tutar</th>
              <th>Tarih</th>
              <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Henüz hareket bulunmuyor.</td></tr>
            ) : (
              transactions.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <span className={`badge ${t.type.includes('Gelir') || t.type === 'Tahsilat' ? 'badge-success' : 'badge-danger'}`}>
                      {t.type.includes('Gelir') || t.type === 'Tahsilat' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />} {t.type}
                    </span>
                  </td>
                  <td><span style={{ fontWeight: '600' }}>{t.category || 'Genel'}</span></td>
                  <td className="text-dim" style={{ fontSize: '0.9rem' }}>{t.description}</td>
                  <td style={{ fontWeight: '800', color: t.type.includes('Gelir') || t.type === 'Tahsilat' ? 'var(--success)' : 'var(--danger)' }}>
                    ₺{t.amount.toLocaleString()}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{new Date(t.created_at).toLocaleDateString('tr-TR')}</td>
                  <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                    <button className="btn btn-ghost"><MoreVertical size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* NEW TRANSACTION MODAL */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><TrendingUp size={20} /></div>
                <h2 style={{ fontSize: '1.25rem' }}>Yeni Gelir/Gider Hareketi</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Tür</label>
                <select className="input" value={newTransaction.type} onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value})}>
                  <option>Gider (Çıkış)</option>
                  <option>Gelir (Giriş)</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Kategori</label>
                <select className="input" value={newTransaction.category} onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}>
                  <option>Yemek/Mutfak</option>
                  <option>Kira</option>
                  <option>Elektrik/Su/Doğalgaz</option>
                  <option>Harcırah</option>
                  <option>Tamir/Bakım</option>
                  <option>Diğer</option>
                </select>
              </div>
              <InputGroup label="Tutar" type="number" value={newTransaction.amount} onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})} />
              <InputGroup label="Açıklama" placeholder="Örn: Nisan ayı yemek bedeli" value={newTransaction.description} onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Kaydı Tamamla</button>
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
const modalContentStyle = { width: '100%', maxWidth: '500px', padding: '2rem' };

export default RevenueExpense;
