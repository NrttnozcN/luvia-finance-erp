import { useState, useEffect, useMemo } from 'react';
import {
  Package, Plus, ArrowUpRight, ArrowDownLeft, MoreVertical, X,
  AlertTriangle, Search, Layers, Warehouse, Tag, Hash, Pencil, Trash2,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip as ReTooltip, Legend,
} from 'recharts';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

const CATEGORY_COLORS = {
  'Yedek Parça':  '#6366F1',
  'Akaryakıt':    '#F43F5E',
  'Lastik':       '#10B981',
  'Yağ':          '#F59E0B',
  'Güvenlik':     '#8B5CF6',
  'Ofis':         '#06B6D4',
  'Sarf Malzeme': '#EC4899',
  'Genel':        '#94a3b8',
};
const catColor = (c) => CATEGORY_COLORS[c] || '#94a3b8';
const fmt      = (n)  => Number(n || 0).toLocaleString('tr-TR');

// ─── Gradient Stat Card ──────────────────────────────────────────────────────
const StockStatCard = ({ title, value, sub, icon, gradient, onClick }) => (
  <div className="dash-stat-card" onClick={onClick}
    style={{ background: gradient, borderRadius: '20px', padding: '1.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', position: 'relative', overflow: 'hidden', cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.18s, box-shadow 0.18s' }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 34px rgba(0,0,0,0.18)'; } }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}>
    <div style={{ position: 'absolute', top: '-18px', right: '-18px', width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,0.09)' }} />
    <div style={{ position: 'absolute', bottom: '-25px', right: '18px', width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
    <div style={{ position: 'relative' }}>
      <div style={{ padding: '0.5rem', borderRadius: '11px', background: 'rgba(255,255,255,0.2)', display: 'inline-flex', marginBottom: '1rem' }}>{icon}</div>
      <h3 style={{ fontSize: '1.65rem', fontWeight: '900', marginBottom: '0.15rem', letterSpacing: '-0.02em' }}>{value}</h3>
      <p style={{ fontSize: '0.88rem', fontWeight: '700', marginBottom: '2px' }}>{title}</p>
      <p style={{ fontSize: '0.74rem', opacity: 0.82 }}>{sub}</p>
    </div>
  </div>
);

// ─── Main ────────────────────────────────────────────────────────────────────
const Stock = () => {
  const currentUser = useAuthStore(s => s.currentUser);
  const cid = currentUser?.company_id;

  const [loading,        setLoading]        = useState(true);
  const [materials,      setMaterials]      = useState([]);
  const [movements,      setMovements]      = useState([]);
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [editRecord,     setEditRecord]     = useState(null);
  const [openMenuId,     setOpenMenuId]     = useState(null);
  const [activeModal,    setActiveModal]    = useState(null);
  const [search,         setSearch]         = useState('');
  const [filterWarehouse,setFilterWarehouse]= useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const [newMov, setNewMov] = useState({
    material_id: '', type: 'Giriş', quantity: '', warehouse: 'Merkez Depo', description: '',
  });

  const fetchData = async () => {
    setLoading(true);
    const [{ data: mats }, { data: movs }] = await Promise.all([
      supabase.from('materials').select('*').eq('company_id', cid),
      supabase.from('stock_movements')
        .select('*, materials(name, category, min_stock_level)')
        .eq('company_id', cid)
        .order('created_at', { ascending: false }),
    ]);
    setMaterials(mats || []);
    setMovements(movs || []);
    setLoading(false);
  };

  useEffect(() => { if (cid) fetchData(); }, [cid]);

  // ── Aggregate net stock per material ──────────────────────────────────────
  const stockMap = useMemo(() => {
    const map = {};
    movements.forEach(m => {
      if (!m.material_id) return;
      if (!map[m.material_id]) {
        const mat = materials.find(mt => mt.id === m.material_id) || {};
        map[m.material_id] = {
          id:       m.material_id,
          name:     m.materials?.name     || mat.name     || 'Bilinmeyen',
          category: m.materials?.category || mat.category || 'Genel',
          minLevel: Number(m.materials?.min_stock_level || mat.min_stock_level || 10),
          total:    0,
          warehouse: m.warehouse,
        };
      }
      const qty = Number(m.quantity) || 0;
      if (m.type === 'Giriş')  map[m.material_id].total += qty;
      if (m.type === 'Çıkış')  map[m.material_id].total -= qty;
      map[m.material_id].warehouse = m.warehouse;
    });
    return map;
  }, [movements, materials]);

  const stockList    = useMemo(() => Object.values(stockMap), [stockMap]);
  const criticalList = useMemo(() => stockList.filter(s => s.total <= s.minLevel), [stockList]);
  const totalQty     = useMemo(() => stockList.reduce((s, i) => s + Math.max(0, i.total), 0), [stockList]);
  const last24h      = useMemo(() => movements.filter(m => new Date(m.created_at) > new Date(Date.now() - 86400000)), [movements]);
  const warehouses   = useMemo(() => [...new Set(movements.map(m => m.warehouse).filter(Boolean))], [movements]);
  const categories   = useMemo(() => [...new Set(stockList.map(s => s.category).filter(Boolean))], [stockList]);

  // ── Category pie ──────────────────────────────────────────────────────────
  const pieData = useMemo(() => {
    const catMap = {};
    stockList.forEach(s => { const c = s.category || 'Genel'; catMap[c] = (catMap[c] || 0) + Math.max(0, s.total); });
    return Object.entries(catMap).map(([name, value]) => ({ name, value, color: catColor(name) })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [stockList]);

  // ── Filtered lists ────────────────────────────────────────────────────────
  const filteredStock = useMemo(() => stockList.filter(s => {
    const q = search.toLowerCase();
    return (!search || s.name.toLowerCase().includes(q))
      && (!filterCategory || s.category === filterCategory)
      && (!filterWarehouse || s.warehouse === filterWarehouse);
  }).sort((a, b) => a.total - b.total), [stockList, search, filterCategory, filterWarehouse]);

  const filteredMovs = useMemo(() => movements.filter(m => {
    const q = search.toLowerCase();
    return (!filterWarehouse || m.warehouse === filterWarehouse)
      && (!search || (m.materials?.name || '').toLowerCase().includes(q));
  }), [movements, search, filterWarehouse]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!newMov.material_id || !newMov.quantity) { alert('Malzeme ve miktar zorunludur.'); return; }
    const { error } = await supabase.from('stock_movements').insert([{
      ...newMov, quantity: Number(newMov.quantity), company_id: cid,
    }]);
    if (error) { alert('Hata: ' + error.message); return; }
    setShowAddModal(false);
    setNewMov({ material_id: '', type: 'Giriş', quantity: '', warehouse: 'Merkez Depo', description: '' });
    fetchData();
  };

  const handleUpdate = async () => {
    const { id, materials: _m, ...fields } = editRecord;
    const { error } = await supabase.from('stock_movements')
      .update({ ...fields, quantity: Number(fields.quantity) }).eq('id', id);
    if (error) { alert('Güncelleme hatası: ' + error.message); return; }
    setEditRecord(null);
    fetchData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu hareketi silmek istediğinizden emin misiniz?')) return;
    const { error } = await supabase.from('stock_movements').delete().eq('id', id);
    if (error) { alert('Silme hatası: ' + error.message); return; }
    fetchData();
  };

  const maxQty = useMemo(() => Math.max(...stockList.map(s => s.total), 1), [stockList]);

  const GRAD = {
    indigo:  'linear-gradient(135deg,#6366F1,#8B5CF6)',
    rose:    'linear-gradient(135deg,#F43F5E,#E11D48)',
    emerald: 'linear-gradient(135deg,#10B981,#059669)',
    amber:   'linear-gradient(135deg,#F59E0B,#D97706)',
  };

  return (
    <div>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Stok & Envanter</h1>
          <p className="text-muted">Yedek parça, akaryakıt ve sarf malzemelerinin takibi.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={18} /> Stok Hareketi Ekle</button>
      </header>

      {/* Gradient Stat Cards */}
      <div className="grid grid-cols-4" style={{ marginBottom: '1.75rem' }}>
        <StockStatCard title="Toplam Kalem"    value={materials.length || stockList.length} sub={`${stockList.length} ürün takipte`}               icon={<Package size={20} />}      gradient={GRAD.indigo}  onClick={() => setActiveModal('total')} />
        <StockStatCard title="Kritik Stok"     value={criticalList.length}                  sub={criticalList.length > 0 ? 'Acil sipariş gerek!' : 'Tüm seviyeler yeterli'} icon={<AlertTriangle size={20} />} gradient={GRAD.rose} onClick={() => setActiveModal('critical')} />
        <StockStatCard title="Son 24s Giriş"   value={last24h.filter(m => m.type === 'Giriş').length} sub={`${last24h.length} toplam hareket`}     icon={<ArrowDownLeft size={20} />} gradient={GRAD.emerald} onClick={() => setActiveModal('recent')} />
        <StockStatCard title="Toplam Miktar"   value={fmt(totalQty)}                        sub="Tüm depolardaki net stok"                         icon={<Layers size={20} />}       gradient={GRAD.amber} />
      </div>

      {/* Charts Row + Stock Summary */}
      <div className="resp-grid-2col" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* Pie Chart */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.25rem', color: 'var(--text-main)' }}>Kategori Dağılımı</h3>
          {pieData.length === 0 ? (
            <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-dim)' }}>
              <Package size={36} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.3 }} />
              <p style={{ fontSize: '0.85rem' }}>Veri yok</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} innerRadius={58} outerRadius={88} paddingAngle={3} dataKey="value">
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip formatter={(v, n) => [`${fmt(v)} adet`, n]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '0.82rem' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                {pieData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: d.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)' }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-main)' }}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Materials summary with progress bars */}
        <div className="card" style={{ padding: 0 }}>
          {/* Filter Bar */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--bg-main)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input className="input" placeholder="Malzeme ara…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }} />
            </div>
            <select className="input" style={{ width: '150px', fontSize: '0.85rem' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">Tüm Kategoriler</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="input" style={{ width: '155px', fontSize: '0.85rem' }} value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)}>
              <option value="">Tüm Depolar</option>
              {warehouses.map(w => <option key={w}>{w}</option>)}
            </select>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Yükleniyor…</div>
          ) : filteredStock.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
              <Package size={36} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.3 }} />
              <p style={{ fontWeight: '600', fontSize: '0.88rem' }}>Eşleşen malzeme bulunamadı.</p>
            </div>
          ) : (
            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {filteredStock.map((s, i) => {
                const pct        = Math.min(100, Math.max(0, (s.total / maxQty) * 100));
                const isCrit     = s.total <= s.minLevel;
                const barColor   = s.total <= 0 ? '#ef4444' : isCrit ? '#f59e0b' : '#10b981';
                const cc         = catColor(s.category);
                return (
                  <div key={s.id}
                    style={{ padding: '0.85rem 1.25rem', borderBottom: i < filteredStock.length - 1 ? '1px solid var(--bg-main)' : 'none', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cc, flexShrink: 0 }} />
                        <span style={{ fontWeight: '600', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                        <span style={{ padding: '0.1rem 0.45rem', borderRadius: '20px', fontSize: '0.67rem', fontWeight: '700', background: cc + '20', color: cc, whiteSpace: 'nowrap', flexShrink: 0 }}>{s.category}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        {isCrit && <AlertTriangle size={12} color={s.total <= 0 ? '#ef4444' : '#f59e0b'} />}
                        <span style={{ fontWeight: '800', fontSize: '0.95rem', color: barColor }}>{fmt(s.total)}</span>
                        {isCrit && (
                          <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '0.1rem 0.4rem', borderRadius: '4px', background: s.total <= 0 ? '#fee2e2' : '#fef3c7', color: s.total <= 0 ? '#991b1b' : '#92400e' }}>
                            {s.total <= 0 ? 'TÜKENDİ' : 'KRİTİK'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ flex: 1, height: '5px', borderRadius: '3px', background: '#f1f5f9', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{s.warehouse}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Movements Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '2px' }}>Stok Hareketleri</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{filteredMovs.length} kayıt{filterWarehouse ? ` · ${filterWarehouse}` : ''}</p>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Malzeme', 'Tür', 'Miktar', 'Depo', 'Açıklama', 'Tarih', ''].map(h => (
                <th key={h} style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>Yükleniyor…</td></tr>
            ) : filteredMovs.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                <Package size={36} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.3 }} />
                <p style={{ fontWeight: '600', fontSize: '0.88rem' }}>Stok hareketi bulunamadı.</p>
              </td></tr>
            ) : filteredMovs.map((m, i) => (
              <tr key={m.id}
                style={{ borderBottom: i < filteredMovs.length - 1 ? '1px solid var(--bg-main)' : 'none', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '0.95rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={14} color="var(--primary)" />
                    </div>
                    <span style={{ fontWeight: '600', fontSize: '0.88rem' }}>{m.materials?.name || 'Bilinmeyen'}</span>
                  </div>
                </td>
                <td style={{ padding: '0.95rem 1.25rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.74rem', fontWeight: '700', background: m.type === 'Giriş' ? '#dcfce7' : m.type === 'Çıkış' ? '#fee2e2' : '#e0f2fe', color: m.type === 'Giriş' ? '#166534' : m.type === 'Çıkış' ? '#991b1b' : '#0369a1' }}>
                    {m.type === 'Giriş' ? <ArrowDownLeft size={11} /> : m.type === 'Çıkış' ? <ArrowUpRight size={11} /> : null} {m.type}
                  </span>
                </td>
                <td style={{ padding: '0.95rem 1.25rem', fontWeight: '800', fontSize: '0.95rem' }}>{fmt(m.quantity)}</td>
                <td style={{ padding: '0.95rem 1.25rem', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Warehouse size={12} style={{ color: 'var(--text-dim)' }} />{m.warehouse || '—'}</div>
                </td>
                <td style={{ padding: '0.95rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.description || <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
                <td style={{ padding: '0.95rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                  {new Date(m.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ padding: '0.95rem 1.25rem', position: 'relative' }}>
                  <button className="btn btn-ghost" style={{ padding: '0.35rem 0.55rem' }} onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === m.id ? null : m.id); }}>
                    <MoreVertical size={15} />
                  </button>
                  {openMenuId === m.id && (
                    <div style={{ position: 'absolute', right: '1rem', top: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '140px', overflow: 'hidden' }}
                      onMouseLeave={() => setOpenMenuId(null)}>
                      <button onClick={() => { setEditRecord({ ...m }); setOpenMenuId(null); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.84rem', fontWeight: '600', color: 'var(--text-main)', fontFamily: 'inherit' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <Pencil size={13} /> Düzenle
                      </button>
                      <button onClick={() => { setOpenMenuId(null); handleDelete(m.id); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.84rem', fontWeight: '600', color: 'var(--danger)', fontFamily: 'inherit' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <Trash2 size={13} /> Sil
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── SUMMARY MODALS ────────────────────────────────────────────────── */}
      {activeModal && (
        <div style={OVERLAY} onClick={() => setActiveModal(null)}>
          <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '3px' }}>
                  {activeModal === 'total'    && 'Tüm Stok Kalemleri'}
                  {activeModal === 'critical' && 'Kritik Stok Uyarısı'}
                  {activeModal === 'recent'   && 'Son 24s Hareketler'}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {activeModal === 'total'    && `${stockList.length} malzeme`}
                  {activeModal === 'critical' && `${criticalList.length} kalem kritik / tükenmiş`}
                  {activeModal === 'recent'   && `${last24h.length} hareket`}
                </p>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '1.25rem 1.75rem' }}>
              {activeModal === 'total' && (
                stockList.length === 0
                  ? <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>Stok hareketi girilmemiş.</p>
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {stockList.sort((a, b) => a.total - b.total).map(s => {
                        const isCrit = s.total <= s.minLevel;
                        const bc = s.total <= 0 ? '#ef4444' : isCrit ? '#f59e0b' : '#10b981';
                        const pct = Math.min(100, Math.max(0, (s.total / maxQty) * 100));
                        return (
                          <div key={s.id} style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'var(--bg-main)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: catColor(s.category) }} />
                                <span style={{ fontWeight: '600', fontSize: '0.88rem' }}>{s.name}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {isCrit && <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '0.1rem 0.4rem', borderRadius: '4px', background: s.total <= 0 ? '#fee2e2' : '#fef3c7', color: s.total <= 0 ? '#991b1b' : '#92400e' }}>{s.total <= 0 ? 'TÜKENDİ' : 'KRİTİK'}</span>}
                                <span style={{ fontWeight: '800', color: bc }}>{fmt(s.total)}</span>
                              </div>
                            </div>
                            <div style={{ height: '5px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: bc, borderRadius: '3px' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
              )}

              {activeModal === 'critical' && (
                criticalList.length === 0
                  ? <div style={{ textAlign: 'center', padding: '3rem' }}>
                      <p style={{ fontSize: '1rem', fontWeight: '700', color: '#16a34a' }}>✓ Kritik stok kalemi yok</p>
                      <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.88rem' }}>Tüm stok seviyeleri yeterli.</p>
                    </div>
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {criticalList.map(s => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', borderRadius: '12px', background: s.total <= 0 ? '#fff5f5' : '#fffbeb', border: `1px solid ${s.total <= 0 ? '#fecaca' : '#fde68a'}` }}>
                          <AlertTriangle size={20} color={s.total <= 0 ? '#ef4444' : '#f59e0b'} style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>{s.name}</p>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{s.warehouse} · Minimum: {s.minLevel}</p>
                          </div>
                          <span style={{ fontWeight: '900', fontSize: '1.2rem', color: s.total <= 0 ? '#ef4444' : '#f59e0b' }}>{s.total}</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '20px', background: s.total <= 0 ? '#fee2e2' : '#fef3c7', color: s.total <= 0 ? '#991b1b' : '#92400e' }}>
                            {s.total <= 0 ? 'TÜKENDİ' : 'KRİTİK'}
                          </span>
                        </div>
                      ))}
                    </div>
              )}

              {activeModal === 'recent' && (
                last24h.length === 0
                  ? <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>Son 24 saatte hareket yok.</p>
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {last24h.map(m => (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', borderRadius: '12px', background: 'var(--bg-main)' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: m.type === 'Giriş' ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {m.type === 'Giriş' ? <ArrowDownLeft size={14} color="#16a34a" /> : <ArrowUpRight size={14} color="#dc2626" />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: '600', fontSize: '0.88rem' }}>{m.materials?.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.warehouse}</p>
                          </div>
                          <span style={{ fontWeight: '800', color: m.type === 'Giriş' ? '#16a34a' : '#dc2626' }}>
                            {m.type === 'Çıkış' ? '-' : '+'}{fmt(m.quantity)}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                            {new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD MOVEMENT MODAL ────────────────────────────────────────────── */}
      {showAddModal && (
        <div style={OVERLAY}>
          <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '500px', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={18} /></div>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: '800' }}>Stok Hareketi Ekle</h2>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Giriş, çıkış veya transfer kaydı</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Package size={13} /> Malzeme *</label>
                <select className="input" value={newMov.material_id} onChange={e => setNewMov(p => ({ ...p, material_id: e.target.value }))}>
                  <option value="">— Malzeme seçiniz —</option>
                  {materials.map(mat => <option key={mat.id} value={mat.id}>{mat.name}{mat.category ? ` · ${mat.category}` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Tag size={13} /> Hareket Türü</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[
                    { label: 'Giriş',    icon: <ArrowDownLeft size={13} />, color: '#16a34a', bg: '#f0fdf4', border: '#16a34a' },
                    { label: 'Çıkış',   icon: <ArrowUpRight size={13} />,  color: '#dc2626', bg: '#fff5f5', border: '#dc2626' },
                    { label: 'Transfer', icon: <Layers size={13} />,        color: '#0284c7', bg: '#f0f9ff', border: '#0284c7' },
                  ].map(t => (
                    <button key={t.label} onClick={() => setNewMov(p => ({ ...p, type: t.label }))}
                      style={{ flex: 1, padding: '0.6rem 0.3rem', borderRadius: '10px', border: `2px solid ${newMov.type === t.label ? t.border : 'var(--border)'}`, background: newMov.type === t.label ? t.bg : 'transparent', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', color: newMov.type === t.label ? t.color : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                      {t.icon}{t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Hash size={13} /> Miktar *</label>
                  <input className="input" type="number" min="1" value={newMov.quantity} onChange={e => setNewMov(p => ({ ...p, quantity: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Warehouse size={13} /> Depo</label>
                  <input className="input" value={newMov.warehouse} onChange={e => setNewMov(p => ({ ...p, warehouse: e.target.value }))} placeholder="Merkez Depo" list="wh-list" />
                  <datalist id="wh-list">{warehouses.map(w => <option key={w} value={w} />)}</datalist>
                </div>
              </div>
              <div>
                <label className="form-label">Açıklama</label>
                <input className="input" value={newMov.description} onChange={e => setNewMov(p => ({ ...p, description: e.target.value }))} placeholder="Opsiyonel açıklama…" />
              </div>
            </div>
            <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid var(--bg-main)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {newMov.type === 'Giriş' ? <ArrowDownLeft size={15} /> : newMov.type === 'Çıkış' ? <ArrowUpRight size={15} /> : <Layers size={15} />}
                {newMov.type} Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT MOVEMENT MODAL ───────────────────────────────────────────── */}
      {editRecord && (
        <div style={OVERLAY}>
          <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '480px', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: '800' }}>Hareketi Düzenle</h2>
              <button onClick={() => setEditRecord(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '1.5rem 1.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Malzeme</label>
                <select className="input" value={editRecord.material_id || ''} onChange={e => setEditRecord(r => ({ ...r, material_id: e.target.value }))}>
                  <option value="">Seçiniz…</option>
                  {materials.map(mat => <option key={mat.id} value={mat.id}>{mat.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Tür</label>
                <select className="input" value={editRecord.type || 'Giriş'} onChange={e => setEditRecord(r => ({ ...r, type: e.target.value }))}>
                  <option>Giriş</option><option>Çıkış</option><option>Transfer</option>
                </select>
              </div>
              <div>
                <label className="form-label">Miktar</label>
                <input className="input" type="number" value={editRecord.quantity} onChange={e => setEditRecord(r => ({ ...r, quantity: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Depo</label>
                <input className="input" value={editRecord.warehouse || ''} onChange={e => setEditRecord(r => ({ ...r, warehouse: e.target.value }))} />
              </div>
            </div>
            <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid var(--bg-main)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setEditRecord(null)}>İptal</button>
              <button className="btn btn-primary" onClick={handleUpdate}>Güncelle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const OVERLAY = {
  position: 'fixed', inset: 0,
  background: 'rgba(15,23,42,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: '1.5rem',
  backdropFilter: 'blur(4px)',
};

export default Stock;
