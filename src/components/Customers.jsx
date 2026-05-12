import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  MoreVertical, 
  ChevronRight, 
  Download,
  X,
  User,
  Wallet
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const emptyForm = { name: '', tax_office: '', tax_no: '', phone: '', email: '', address: '', type: 'Tedarikçi', balance: 0 };

const Customers = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [newCustomer, setNewCustomer] = useState(emptyForm);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editCustomer, setEditCustomer] = useState(null);
  const [totalAlacak, setTotalAlacak] = useState(0);
  const [totalBorc, setTotalBorc] = useState(0);

  const fetchCustomers = async () => {
    setLoading(true);
    const [{ data: custs }, { data: invs }, { data: txns }, { data: chks }] = await Promise.all([
      supabase.from('customers').select('*').order('name'),
      supabase.from('invoices').select('customer_id, total_amount'),
      supabase.from('finance_transactions').select('customer_id, amount, type'),
      supabase.from('checks').select('customer_id, amount, type'),
    ]);

    const balMap = {};
    (invs || []).forEach(r => {
      if (!r.customer_id) return;
      balMap[r.customer_id] = (balMap[r.customer_id] || 0) + Number(r.total_amount);
    });
    (txns || []).forEach(r => {
      if (!r.customer_id) return;
      const delta = ['Tahsilat', 'Gelir'].includes(r.type) ? -Number(r.amount) : Number(r.amount);
      balMap[r.customer_id] = (balMap[r.customer_id] || 0) + delta;
    });
    (chks || []).forEach(r => {
      if (!r.customer_id) return;
      const isAlacak = ['Müşteri Çeki', 'Müşteri Senedi'].includes(r.type);
      balMap[r.customer_id] = (balMap[r.customer_id] || 0) + (isAlacak ? -Number(r.amount) : Number(r.amount));
    });

    const enriched = (custs || []).map(c => ({ ...c, computedBalance: balMap[c.id] || 0 }));
    setCustomers(enriched);
    setTotalAlacak(enriched.filter(c => c.computedBalance > 0).reduce((s, c) => s + c.computedBalance, 0));
    setTotalBorc(enriched.filter(c => c.computedBalance < 0).reduce((s, c) => s + Math.abs(c.computedBalance), 0));
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSave = async () => {
    const { error } = await supabase.from('customers').insert([newCustomer]);
    if (error) { alert('Kayıt hatası: ' + error.message); return; }
    setShowAddModal(false);
    fetchCustomers();
    setNewCustomer(emptyForm);
  };

  const handleUpdate = async () => {
    const { id, ...fields } = editCustomer;
    const { error } = await supabase.from('customers').update(fields).eq('id', id);
    if (error) { alert('Güncelleme hatası: ' + error.message); return; }
    setEditCustomer(null);
    fetchCustomers();
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}" silinecek. Emin misin?`)) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) { alert('Silme hatası: ' + error.message); return; }
    fetchCustomers();
  };

  return (
    <div className="customers-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Cari & Müşteri Yönetimi</h1>
          <p className="text-muted">Tedarikçilerinizi, müşterilerinizi ve iş ortaklarınızı tek bir merkezden yönetin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Cari Tanımla
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Toplam Cari</p>
          <h2 style={{ fontSize: '2rem' }}>{customers.length}</h2>
        </div>
        <div className="card">
          <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Toplam Alacak</p>
          <h2 style={{ fontSize: '2rem', color: 'var(--success)' }}>₺{totalAlacak.toLocaleString('tr-TR')}</h2>
        </div>
        <div className="card">
          <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Toplam Borç</p>
          <h2 style={{ fontSize: '2rem', color: 'var(--danger)' }}>₺{totalBorc.toLocaleString('tr-TR')}</h2>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.25rem' }}>Ünvan / Ad Soyad</th>
              <th>Vergi Dairesi / No</th>
              <th>İletişim</th>
              <th>Tür</th>
              <th style={{ textAlign: 'right' }}>Bakiye</th>
              <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Henüz cari kaydı bulunmuyor.</td></tr>
            ) : (
              customers.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '8px', color: 'var(--primary)' }}><Building2 size={18} /></div>
                      <span style={{ fontWeight: '700' }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{c.tax_office} / {c.tax_no}</td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}><Phone size={12} className="text-dim" /> {c.phone}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{c.email}</div>
                  </td>
                  <td><span className={`badge ${c.type === 'Müşteri' ? 'badge-success' : 'badge-primary'}`}>{c.type}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: '800', color: c.computedBalance > 0 ? 'var(--danger)' : c.computedBalance < 0 ? 'var(--success)' : 'var(--text-dim)' }}>
                    ₺{Math.abs(c.computedBalance).toLocaleString('tr-TR')}
                    {c.computedBalance !== 0 && <span style={{ fontSize: '0.72rem', marginLeft: '3px', opacity: 0.8 }}>{c.computedBalance > 0 ? 'B' : 'A'}</span>}
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '1.25rem', position: 'relative' }}>
                    <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === c.id ? null : c.id); }}>
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === c.id && (
                      <div style={{ position: 'absolute', right: '1rem', top: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '140px', overflow: 'hidden' }}
                        onMouseLeave={() => setOpenMenuId(null)}>
                        <button onClick={() => { setEditCustomer({ ...c }); setOpenMenuId(null); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          ✏️ Düzenle
                        </button>
                        <button onClick={() => { setOpenMenuId(null); handleDelete(c.id, c.name); }}
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

      {/* EDIT CUSTOMER MODAL */}
      {editCustomer && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><User size={20} /></div>
                <h2 style={{ fontSize: '1.25rem' }}>Cari Düzenle</h2>
              </div>
              <button onClick={() => setEditCustomer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <InputGroup label="Ünvan / Ad Soyad" placeholder="Tekno Lojistik Ltd." value={editCustomer.name} onChange={e => setEditCustomer({ ...editCustomer, name: e.target.value })} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>Cari Türü</label>
                <select className="input" value={editCustomer.type} onChange={e => setEditCustomer({ ...editCustomer, type: e.target.value })}>
                  <option>Tedarikçi</option><option>Müşteri</option><option>Personel</option>
                </select>
              </div>
              <InputGroup label="Vergi Dairesi" placeholder="Gebze V.D." value={editCustomer.tax_office || ''} onChange={e => setEditCustomer({ ...editCustomer, tax_office: e.target.value })} />
              <InputGroup label="Vergi / TC No" placeholder="123456..." value={editCustomer.tax_no || ''} onChange={e => setEditCustomer({ ...editCustomer, tax_no: e.target.value })} />
              <InputGroup label="Telefon" placeholder="+90 ..." value={editCustomer.phone || ''} onChange={e => setEditCustomer({ ...editCustomer, phone: e.target.value })} />
              <InputGroup label="E-Posta" placeholder="info@company.com" value={editCustomer.email || ''} onChange={e => setEditCustomer({ ...editCustomer, email: e.target.value })} />
            </div>
            <InputGroup label="Adres" placeholder="Tam adres..." value={editCustomer.address || ''} onChange={e => setEditCustomer({ ...editCustomer, address: e.target.value })} />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setEditCustomer(null)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleUpdate}>Güncelle</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW CUSTOMER MODAL */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><User size={20} /></div>
                <h2 style={{ fontSize: '1.25rem' }}>Yeni Cari Tanımla</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <InputGroup label="Ünvan / Ad Soyad" placeholder="Örn: Tekno Lojistik Ltd." value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>Cari Türü</label>
                <select className="input" value={newCustomer.type} onChange={(e) => setNewCustomer({...newCustomer, type: e.target.value})}>
                  <option>Tedarikçi</option>
                  <option>Müşteri</option>
                  <option>Personel</option>
                </select>
              </div>
              <InputGroup label="Vergi Dairesi" placeholder="Gebze V.D." value={newCustomer.tax_office} onChange={(e) => setNewCustomer({...newCustomer, tax_office: e.target.value})} />
              <InputGroup label="Vergi / TC No" placeholder="123456..." value={newCustomer.tax_no} onChange={(e) => setNewCustomer({...newCustomer, tax_no: e.target.value})} />
              <InputGroup label="Telefon" placeholder="+90 ..." value={newCustomer.phone} onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})} />
              <InputGroup label="E-Posta" placeholder="info@company.com" value={newCustomer.email} onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})} />
            </div>
            <InputGroup label="Adres" placeholder="Tam adres..." value={newCustomer.address} onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})} />

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Cariyi Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InputGroup = ({ label, placeholder, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>{label}</label>
    <input className="input" placeholder={placeholder} value={value} onChange={onChange} />
  </div>
);

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modalContentStyle = { width: '100%', maxWidth: '650px', padding: '2rem' };

export default Customers;
