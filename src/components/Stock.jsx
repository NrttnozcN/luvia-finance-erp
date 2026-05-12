import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Filter, 
  MoreVertical,
  X,
  AlertTriangle,
  Warehouse
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

const Stock = () => {
  const currentUser = useAuthStore(s => s.currentUser);
  const cid = currentUser?.company_id;
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stockMovements, setStockMovements] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [newMovement, setNewMovement] = useState({
    material_id: '',
    type: 'Giriş',
    quantity: 0,
    warehouse: 'Merkez Depo',
    description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    
    // Malzemeleri çek (Dropdown için)
    const { data: mats } = await supabase.from('materials').select('*').eq('company_id', cid);
    setMaterials(mats || []);

    // Hareketleri çek (Join ile malzeme adını al)
    const { data: moves, error } = await supabase
      .from('stock_movements')
      .select('*, materials(name)')
      .order('created_at', { ascending: false });

    if (error) console.error('Hata:', error);
    else setStockMovements(moves || []);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    const { error } = await supabase
      .from('stock_movements')
      .insert([{ ...newMovement, company_id: cid }]);

    if (error) alert('Hata: ' + error.message);
    else {
      setShowAddModal(false);
      fetchData();
      setNewMovement({ material_id: '', type: 'Giriş', quantity: 0, warehouse: 'Merkez Depo', description: '' });
    }
  };

  const handleUpdate = async () => {
    const { id, materials: _m, ...fields } = editRecord;
    const { error } = await supabase.from('stock_movements').update(fields).eq('id', id);
    if (error) { alert('Güncelleme hatası: ' + error.message); return; }
    setEditRecord(null);
    fetchData();
  };

  const handleDelete = async (id, record) => {
    if (!window.confirm(`"${record.warehouse || id}" silinecek. Emin misin?`)) return;
    const { error } = await supabase.from('stock_movements').delete().eq('id', id);
    if (error) { alert('Silme hatası: ' + error.message); return; }
    fetchData();
  };

  return (
    <div className="stock-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Stok & Envanter Yönetimi</h1>
          <p className="text-muted">Yedek parça, akaryakıt ve diğer sarf malzemelerinizin takibini yapın.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Stok Hareketi
        </button>
      </header>

      {/* Stock Cards */}
      <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Toplam Kalem</p>
          <h2 style={{ fontSize: '2rem' }}>{materials.length}</h2>
        </div>
        <div className="card">
          <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Kritik Stok</p>
          <h2 style={{ fontSize: '2rem', color: 'var(--danger)' }}>3</h2>
        </div>
        <div className="card">
          <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Depo Doluluk</p>
          <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>%64</h2>
        </div>
        <div className="card">
          <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Son 24s Hareket</p>
          <h2 style={{ fontSize: '2rem' }}>{stockMovements.length}</h2>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.25rem' }}>Malzeme / Ürün</th>
              <th>Tür</th>
              <th>Miktar</th>
              <th>Depo</th>
              <th>Tarih</th>
              <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</td></tr>
            ) : stockMovements.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Henüz stok hareketi bulunmuyor.</td></tr>
            ) : (
              stockMovements.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ background: 'var(--bg-main)', padding: '0.5rem', borderRadius: '8px' }}><Package size={18} color="var(--primary)" /></div>
                      <span style={{ fontWeight: '700' }}>{m.materials?.name || 'Bilinmeyen Ürün'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${m.type === 'Giriş' ? 'badge-success' : 'badge-danger'}`}>
                      {m.type === 'Giriş' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />} {m.type}
                    </span>
                  </td>
                  <td style={{ fontWeight: '800' }}>{m.quantity} {m.unit}</td>
                  <td className="text-dim">{m.warehouse}</td>
                  <td style={{ fontSize: '0.85rem' }}>{new Date(m.created_at).toLocaleDateString('tr-TR')}</td>
                  <td style={{ textAlign: 'right', paddingRight: '1.25rem', position: 'relative' }}>
                    <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === m.id ? null : m.id); }}>
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === m.id && (
                      <div style={{ position: 'absolute', right: '1rem', top: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '140px', overflow: 'hidden' }}
                        onMouseLeave={() => setOpenMenuId(null)}>
                        <button onClick={() => { setEditRecord({ ...m }); setOpenMenuId(null); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          ✏️ Düzenle
                        </button>
                        <button onClick={() => { setOpenMenuId(null); handleDelete(m.id, m); }}
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

      {/* EDIT STOCK MODAL */}
      {editRecord && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><Package size={20} /></div>
                <h2 style={{ fontSize: '1.25rem' }}>Stok Hareketini Düzenle</h2>
              </div>
              <button onClick={() => setEditRecord(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>Stok / Malzeme</label>
                <select className="input" value={editRecord.material_id || ''} onChange={(e) => setEditRecord({...editRecord, material_id: e.target.value})}>
                  <option value="">Seçiniz...</option>
                  {materials.map(mat => <option key={mat.id} value={mat.id}>{mat.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>Hareket Türü</label>
                <select className="input" value={editRecord.type || 'Giriş'} onChange={(e) => setEditRecord({...editRecord, type: e.target.value})}>
                  <option>Giriş</option>
                  <option>Çıkış</option>
                  <option>Transfer</option>
                </select>
              </div>
              <InputGroup label="Miktar" type="number" value={editRecord.quantity} onChange={(e) => setEditRecord({...editRecord, quantity: e.target.value})} />
              <InputGroup label="Depo" placeholder="Merkez Depo" value={editRecord.warehouse || ''} onChange={(e) => setEditRecord({...editRecord, warehouse: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setEditRecord(null)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleUpdate}>Güncelle</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW STOCK MODAL */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><Package size={20} /></div>
                <h2 style={{ fontSize: '1.25rem' }}>Yeni Stok Hareketi (Giriş/Çıkış)</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>Stok / Malzeme</label>
                <select className="input" value={newMovement.material_id} onChange={(e) => setNewMovement({...newMovement, material_id: e.target.value})}>
                  <option value="">Seçiniz...</option>
                  {materials.map(mat => <option key={mat.id} value={mat.id}>{mat.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>Hareket Türü</label>
                <select className="input" value={newMovement.type} onChange={(e) => setNewMovement({...newMovement, type: e.target.value})}>
                  <option>Giriş</option>
                  <option>Çıkış</option>
                  <option>Transfer</option>
                </select>
              </div>
              <InputGroup label="Miktar" type="number" value={newMovement.quantity} onChange={(e) => setNewMovement({...newMovement, quantity: e.target.value})} />
              <InputGroup label="Depo" placeholder="Merkez Depo" value={newMovement.warehouse} onChange={(e) => setNewMovement({...newMovement, warehouse: e.target.value})} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Stoku Güncelle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InputGroup = ({ label, placeholder, type, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>{label}</label>
    <input className="input" type={type || 'text'} placeholder={placeholder} value={value} onChange={onChange} />
  </div>
);

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modalContentStyle = { width: '100%', maxWidth: '650px', padding: '2rem' };

export default Stock;
