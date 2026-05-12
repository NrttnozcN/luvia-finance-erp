import React, { useState, useEffect } from 'react';
import {
  Package, Plus, ArrowUpRight, ArrowDownLeft,
  MoreVertical, X, AlertTriangle, Warehouse
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
  const [activeModal, setActiveModal] = useState(null); // 'total' | 'critical' | 'recent' | null
  const [newMovement, setNewMovement] = useState({
    material_id: '', type: 'Giriş', quantity: 0, warehouse: 'Merkez Depo', description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: mats } = await supabase.from('materials').select('*').eq('company_id', cid);
    setMaterials(mats || []);
    const { data: moves, error } = await supabase
      .from('stock_movements')
      .select('*, materials(name)')
      .eq('company_id', cid)
      .order('created_at', { ascending: false });
    if (error) console.error('Hata:', error);
    else setStockMovements(moves || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Net stok hesaplama (hareket bazlı)
  const stockMap = {};
  stockMovements.forEach(m => {
    if (!m.material_id) return;
    if (!stockMap[m.material_id]) {
      stockMap[m.material_id] = { id: m.material_id, name: m.materials?.name || 'Bilinmeyen', total: 0, warehouse: m.warehouse, count: 0 };
    }
    const qty = Number(m.quantity) || 0;
    if (m.type === 'Giriş') stockMap[m.material_id].total += qty;
    else if (m.type === 'Çıkış') stockMap[m.material_id].total -= qty;
    stockMap[m.material_id].warehouse = m.warehouse;
    stockMap[m.material_id].count++;
  });
  const stockList = Object.values(stockMap);
  const criticalList = stockList.filter(s => s.total <= 10);
  const last24h = stockMovements.filter(m => new Date(m.created_at) > new Date(Date.now() - 86400000));

  const handleSave = async () => {
    const { error } = await supabase.from('stock_movements').insert([{ ...newMovement, company_id: cid }]);
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

  const clickableCard = {
    cursor: 'pointer',
    transition: 'all 0.18s',
    border: '1.5px solid transparent',
    userSelect: 'none',
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

      {/* Tıklanabilir Özet Kartları */}
      <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <div className="card" style={clickableCard}
          onClick={() => setActiveModal('total')}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,107,0,0.13)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}>
          <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Toplam Kalem</p>
          <h2 style={{ fontSize: '2rem' }}>{materials.length}</h2>
          <p style={{ fontSize: '0.72rem', color: 'var(--primary)', marginTop: '0.5rem', fontWeight: '700' }}>Stok detayları →</p>
        </div>
        <div className="card" style={clickableCard}
          onClick={() => setActiveModal('critical')}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(239,68,68,0.13)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}>
          <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Kritik Stok</p>
          <h2 style={{ fontSize: '2rem', color: criticalList.length > 0 ? 'var(--danger)' : 'var(--text)' }}>{criticalList.length}</h2>
          <p style={{ fontSize: '0.72rem', color: criticalList.length > 0 ? 'var(--danger)' : 'var(--text-dim)', marginTop: '0.5rem', fontWeight: '700' }}>
            {criticalList.length > 0 ? 'Uyarı listesi →' : 'Stok yeterli ✓'}
          </p>
        </div>
        <div className="card" style={{ cursor: 'default' }}>
          <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Depo Doluluk</p>
          <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>%64</h2>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>Merkez Depo</p>
        </div>
        <div className="card" style={clickableCard}
          onClick={() => setActiveModal('recent')}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,107,0,0.13)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}>
          <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Son 24s Hareket</p>
          <h2 style={{ fontSize: '2rem' }}>{last24h.length}</h2>
          <p style={{ fontSize: '0.72rem', color: 'var(--primary)', marginTop: '0.5rem', fontWeight: '700' }}>Hareketleri gör →</p>
        </div>
      </div>

      {/* Ana Tablo */}
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

      {/* ÖZET KART MODALLERİ */}
      {activeModal && (
        <div style={modalOverlayStyle} onClick={() => setActiveModal(null)}>
          <div className="card" style={{ width: '100%', maxWidth: '740px', padding: '2rem', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                  {activeModal === 'total'    && '📦 Tüm Stok Kalemleri'}
                  {activeModal === 'critical' && '⚠️ Kritik Stok Uyarısı'}
                  {activeModal === 'recent'   && '🕐 Son 24 Saatteki Hareketler'}
                </h2>
                <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                  {activeModal === 'total'    && `${stockList.length} farklı malzeme — net stok hesaplanmış`}
                  {activeModal === 'critical' && 'Net stok miktarı 10 ve altında olan malzemeler'}
                  {activeModal === 'recent'   && `${last24h.length} hareket bulundu`}
                </p>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={24} /></button>
            </div>

            {/* TOPLAM KALEM */}
            {activeModal === 'total' && (
              stockList.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>Henüz stok hareketi girilmemiş.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['Malzeme Adı', 'Net Stok', 'Son Depo', 'Hareket Sayısı'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stockList.sort((a, b) => a.total - b.total).map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Package size={14} color="var(--primary)" />
                            <span style={{ fontWeight: '600' }}>{s.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span style={{ fontWeight: '800', fontSize: '1rem', color: s.total <= 0 ? 'var(--danger)' : s.total <= 10 ? 'var(--warning)' : 'var(--success)' }}>
                            {s.total}
                          </span>
                          {s.total <= 10 && (
                            <span style={{ marginLeft: '6px', fontSize: '0.68rem', background: s.total <= 0 ? '#fee2e2' : '#fef3c7', color: s.total <= 0 ? '#991b1b' : '#92400e', fontWeight: '700', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                              {s.total <= 0 ? 'TÜKENDİ' : 'KRİTİK'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.9rem 1rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>{s.warehouse || '—'}</td>
                        <td style={{ padding: '0.9rem 1rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>{s.count} hareket</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {/* KRİTİK STOK */}
            {activeModal === 'critical' && (
              criticalList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--success)' }}>✓ Kritik stok kalemi bulunmuyor</p>
                  <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Tüm malzemelerin stok seviyeleri yeterli görünüyor.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['Malzeme Adı', 'Mevcut Stok', 'Son Bulunduğu Depo', 'Durum'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {criticalList.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--bg-main)', background: s.total <= 0 ? 'rgba(239,68,68,0.03)' : 'rgba(245,158,11,0.03)' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <AlertTriangle size={15} color={s.total <= 0 ? 'var(--danger)' : '#d97706'} />
                            <span style={{ fontWeight: '700' }}>{s.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ fontWeight: '800', fontSize: '1.1rem', color: s.total <= 0 ? 'var(--danger)' : '#d97706' }}>{s.total}</span>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>{s.warehouse || '—'}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.25rem 0.6rem', borderRadius: '20px',
                            background: s.total <= 0 ? '#fee2e2' : '#fef3c7',
                            color: s.total <= 0 ? '#991b1b' : '#92400e' }}>
                            {s.total <= 0 ? '🔴 Tükendi' : '🟡 Sipariş Ver'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {/* SON 24S */}
            {activeModal === 'recent' && (
              last24h.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>Son 24 saatte hareket kaydı bulunmuyor.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['Malzeme', 'Tür', 'Miktar', 'Depo', 'Saat'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {last24h.map(m => (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                        <td style={{ padding: '0.9rem 1rem', fontWeight: '600' }}>{m.materials?.name || 'Bilinmeyen'}</td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span className={`badge ${m.type === 'Giriş' ? 'badge-success' : 'badge-danger'}`}>
                            {m.type === 'Giriş' ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />} {m.type}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', fontWeight: '700' }}>{m.quantity}</td>
                        <td style={{ padding: '0.9rem 1rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>{m.warehouse}</td>
                        <td style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                          {new Date(m.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>
      )}

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
                  <option>Giriş</option><option>Çıkış</option><option>Transfer</option>
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
                  <option>Giriş</option><option>Çıkış</option><option>Transfer</option>
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
