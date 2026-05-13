import { useState, useEffect } from 'react';
import {
  TrendingUp, Plus, MoreVertical, ArrowUpRight, ArrowDownLeft,
  X, ChevronRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

const GIDER_CATS_FALLBACK = ['Araç ve İş Makinesi Giderleri','Akaryakıt Giderleri','Büro Malzemesi Giderleri','Yemek ve Gıda Giderleri','Tesis Giderleri','Personel Giderleri','Diğer Giderler'];
const GELIR_CATS_FALLBACK  = ['Hakediş Geliri','Ürün Satış Geliri','Hizmet Satış Geliri','Diğer Gelirler'];

const emptyForm = () => ({
  type: 'Gider (Çıkış)',
  facility_id: '',
  account_card: '',
  material_id: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  description: '',
});

const RevenueExpense = () => {
  const currentUser = useAuthStore(s => s.currentUser);
  const cid = currentUser?.company_id;

  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [openMenuId, setOpenMenuId]     = useState(null);
  const [editRecord, setEditRecord]     = useState(null);
  const [newTransaction, setNewTransaction] = useState(emptyForm());

  // Lookup lists
  const [facilities, setFacilities]         = useState([]);
  const [accountCardsList, setAccountCardsList] = useState([]);
  const [materialsList, setMaterialsList]   = useState([]);

  const fetchData = async () => {
    setLoading(true);
    const [
      { data: trans },
      { data: facs },
      { data: acCards },
      { data: mats },
    ] = await Promise.all([
      supabase.from('finance_transactions').select('*').eq('company_id', cid).order('created_at', { ascending: false }),
      supabase.from('facilities').select('id, name').eq('company_id', cid).order('name'),
      supabase.from('account_cards').select('*').eq('company_id', cid).order('name'),
      supabase.from('materials').select('id, name, account_card, item_type').eq('company_id', cid).order('name'),
    ]);
    setTransactions(trans || []);
    setFacilities(facs || []);
    setAccountCardsList(acCards || []);
    setMaterialsList(mats || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!newTransaction.amount) { alert('Tutar zorunludur.'); return; }
    const { error } = await supabase.from('finance_transactions').insert([{
      type: newTransaction.type,
      facility_id: newTransaction.facility_id || null,
      account_card: newTransaction.account_card || null,
      material_id: newTransaction.material_id || null,
      category: newTransaction.account_card || 'Genel',
      amount: Number(newTransaction.amount),
      description: newTransaction.description,
      date: newTransaction.date || null,
      company_id: cid,
    }]);
    if (error) { alert(error.message); return; }
    setShowAddModal(false);
    setNewTransaction(emptyForm());
    fetchData();
  };

  const handleUpdate = async () => {
    const { id, ...fields } = editRecord;
    const { error } = await supabase.from('finance_transactions').update({
      ...fields,
      category: fields.account_card || fields.category || 'Genel',
      amount: Number(fields.amount),
    }).eq('id', id);
    if (error) { alert('Güncelleme hatası: ' + error.message); return; }
    setEditRecord(null);
    fetchData();
  };

  const handleDelete = async (id, record) => {
    if (!window.confirm(`"${record.description || record.account_card || record.category || id}" silinecek. Emin misin?`)) return;
    const { error } = await supabase.from('finance_transactions').delete().eq('id', id);
    if (error) { alert('Silme hatası: ' + error.message); return; }
    fetchData();
  };

  const totalGelir = transactions.filter(t => t.type.includes('Gelir') || t.type === 'Tahsilat').reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalGider = transactions.filter(t => t.type.includes('Gider') || t.type === 'Ödeme').reduce((s, t) => s + Number(t.amount || 0), 0);
  const net = totalGelir - totalGider;

  const getFacilityName = (fid) => facilities.find(f => f.id === fid)?.name || null;

  return (
    <div className="revenue-expense-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Gelir & Gider Yönetimi</h1>
          <p className="text-muted">İşletmenizin nakit hareketlerini tesis ve hesap kartı bazlı takip edin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setNewTransaction(emptyForm()); setShowAddModal(true); }}>
          <Plus size={20} /> Yeni Hareket Ekle
        </button>
      </header>

      <div className="grid grid-cols-3" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <p className="text-muted">Toplam Gelir</p>
          <h2 style={{ fontSize: '2rem', color: 'var(--success)' }}>₺{totalGelir.toLocaleString('tr-TR')}</h2>
        </div>
        <div className="card">
          <p className="text-muted">Toplam Gider</p>
          <h2 style={{ fontSize: '2rem', color: 'var(--danger)' }}>₺{totalGider.toLocaleString('tr-TR')}</h2>
        </div>
        <div className="card">
          <p className="text-muted">Net Durum</p>
          <h2 style={{ fontSize: '2rem', color: net >= 0 ? 'var(--success)' : 'var(--danger)' }}>₺{net.toLocaleString('tr-TR')}</h2>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.25rem' }}>Tür</th>
              <th>Tesis</th>
              <th>Hesap Kartı</th>
              <th>Açıklama</th>
              <th>Tutar</th>
              <th>Tarih</th>
              <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>Henüz hareket bulunmuyor.</td></tr>
            ) : (
              transactions.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <span className={`badge ${t.type.includes('Gelir') || t.type === 'Tahsilat' ? 'badge-success' : 'badge-danger'}`}>
                      {t.type.includes('Gelir') || t.type === 'Tahsilat' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />} {t.type}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{getFacilityName(t.facility_id) || '—'}</td>
                  <td style={{ fontWeight: '600', fontSize: '0.85rem' }}>{t.account_card || t.category || '—'}</td>
                  <td className="text-dim" style={{ fontSize: '0.9rem' }}>{t.description || '—'}</td>
                  <td style={{ fontWeight: '800', color: t.type.includes('Gelir') || t.type === 'Tahsilat' ? 'var(--success)' : 'var(--danger)' }}>
                    ₺{Number(t.amount || 0).toLocaleString('tr-TR')}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{t.date ? new Date(t.date).toLocaleDateString('tr-TR') : new Date(t.created_at).toLocaleDateString('tr-TR')}</td>
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

      {/* EDIT MODAL */}
      {editRecord && (
        <TransactionModal
          title="Hareketi Düzenle"
          form={editRecord}
          setForm={setEditRecord}
          onClose={() => setEditRecord(null)}
          onSave={handleUpdate}
          saveLabel="Güncelle"
          facilities={facilities}
          accountCardsList={accountCardsList}
          materialsList={materialsList}
          giderFallback={GIDER_CATS_FALLBACK}
          gelirFallback={GELIR_CATS_FALLBACK}
        />
      )}

      {/* NEW MODAL */}
      {showAddModal && (
        <TransactionModal
          title="Yeni Gelir/Gider Hareketi"
          form={newTransaction}
          setForm={setNewTransaction}
          onClose={() => setShowAddModal(false)}
          onSave={handleSave}
          saveLabel="Kaydı Tamamla"
          facilities={facilities}
          accountCardsList={accountCardsList}
          materialsList={materialsList}
          giderFallback={GIDER_CATS_FALLBACK}
          gelirFallback={GELIR_CATS_FALLBACK}
        />
      )}
    </div>
  );
};

// ─── Cascading Modal ─────────────────────────────────────────────────────────
const TransactionModal = ({ title, form, setForm, onClose, onSave, saveLabel, facilities, accountCardsList, materialsList, giderFallback, gelirFallback }) => {
  const isGider = form.type.includes('Gider') || form.type === 'Ödeme';

  const availableCards = accountCardsList.filter(c => isGider ? c.card_type === 'Gider' : c.card_type === 'Gelir');
  const fallbackCards  = isGider ? giderFallback : gelirFallback;
  const cardOptions    = availableCards.length > 0 ? availableCards.map(c => c.name) : fallbackCards;

  const filteredMats   = materialsList.filter(m =>
    (isGider ? m.item_type === 'Gider' : m.item_type !== 'Gider') &&
    (!form.account_card || m.account_card === form.account_card)
  );

  const Step = ({ num, label, done, children }) => (
    <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, paddingTop: '0.25rem' }}>
        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: done ? 'var(--primary)' : 'var(--border)', color: done ? '#fff' : 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', flexShrink: 0 }}>{num}</div>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
        {children}
      </div>
    </div>
  );

  return (
    <div style={overlayStyle}>
      <div className="card" style={cardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><TrendingUp size={20} /></div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800' }}>{title}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

          {/* Tür */}
          <div>
            <label className="label-sm">TÜR</label>
            <select className="input" value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value, account_card: '', material_id: '' })}>
              <option>Gider (Çıkış)</option>
              <option>Gelir (Giriş)</option>
            </select>
          </div>

          {/* ADIM 1 — Tesis */}
          <Step num={1} label="Tesis (Lokasyon)" done={!!form.facility_id}>
            <select className="input" value={form.facility_id || ''}
              onChange={e => setForm({ ...form, facility_id: e.target.value })}>
              <option value="">Seçiniz... (opsiyonel)</option>
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Step>

          {/* ADIM 2 — Hesap Kartı */}
          <Step num={2} label="Hesap Kartı" done={!!form.account_card}>
            <select className="input" value={form.account_card || ''}
              onChange={e => setForm({ ...form, account_card: e.target.value, material_id: '' })}>
              <option value="">Seçiniz...</option>
              {cardOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Step>

          {/* ADIM 3 — Malzeme/Hizmet */}
          <Step num={3} label="Malzeme / Hizmet Adı" done={!!form.material_id}>
            <select className="input" value={form.material_id || ''} disabled={!form.account_card}
              onChange={e => setForm({ ...form, material_id: e.target.value })}>
              <option value="">Seçiniz... (opsiyonel)</option>
              {filteredMats.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {!form.account_card && <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Önce hesap kartı seçin</p>}
          </Step>

          {/* Tutar + Tarih */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label-sm">TUTAR (₺)</label>
              <input type="number" className="input" placeholder="0.00" value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="label-sm">TARİH</label>
              <input type="date" className="input" value={form.date || ''}
                onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>

          {/* Açıklama */}
          <div>
            <label className="label-sm">AÇIKLAMA</label>
            <input type="text" className="input" placeholder="Opsiyonel not..." value={form.description || ''}
              onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.75rem' }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>İptal</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={onSave}>{saveLabel}</button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const cardStyle    = { width: '100%', maxWidth: '520px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' };

export default RevenueExpense;
