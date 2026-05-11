import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Package, Plus, Search, ArrowLeftRight, Warehouse, History,
  AlertTriangle, ChevronRight, MoreVertical, X, Layers, ArrowUp, ArrowDown, Edit2
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatCurrency, formatDate, today, stockStatusColor } from '../utils/formatters';
import { FormField, EmptyState } from './Invoices';

const PAGE_SIZE = 10;
const CATEGORIES = ['Bakım Malzemeleri', 'Yedek Parça', 'Lastik', 'Akaryakıt', 'Demirbaş', 'Diğer'];

const Stock = () => {
  const stockItems = useStore(s => s.stockItems);
  const addStockItem = useStore(s => s.addStockItem);
  const addStockMovement = useStore(s => s.addStockMovement);
  const updateStockItem = useStore(s => s.updateStockItem);

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(null);

  const filtered = stockItems.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = !search || i.name.toLowerCase().includes(q);
    const matchCat = !filterCat || i.category === filterCat;
    const matchStatus = !filterStatus || (
      filterStatus === 'critical' ? i.qty <= i.minQty && i.qty > 0 :
      filterStatus === 'empty' ? i.qty <= 0 : i.qty > i.minQty
    );
    return matchSearch && matchCat && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    critical: stockItems.filter(i => i.qty > 0 && i.qty <= i.minQty).length,
    empty: stockItems.filter(i => i.qty <= 0).length,
    total: stockItems.length,
    totalValue: stockItems.reduce((s, i) => s + i.qty * (i.unitCost || 0), 0),
  };

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Depo & Stok Yönetimi</h1>
          <p className="text-muted">Tesis bazlı stok seviyelerini, malzeme hareketlerini ve demirbaşları yönetin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Malzeme Tanımla
        </button>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <SStatCard title="Kritik Stok" value={stats.critical} sub="Minimum Altında" icon={<AlertTriangle size={20} />} color="var(--warning)" onClick={() => { setFilterStatus('critical'); setPage(1); }} />
        <SStatCard title="Stok Tükendi" value={stats.empty} sub="Acil Tedarik" icon={<Package size={20} />} color="var(--danger)" onClick={() => { setFilterStatus('empty'); setPage(1); }} />
        <SStatCard title="Aktif Malzeme" value={stats.total} sub="Kayıtlı" icon={<Layers size={20} />} color="var(--primary)" onClick={() => { setFilterStatus(''); setPage(1); }} />
        <SStatCard title="Stok Değeri" value={formatCurrency(stats.totalValue)} sub="Birim Maliyet" icon={<Warehouse size={20} />} color="var(--success)" />
      </div>

      {/* Filtreler */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '180px', background: 'var(--bg-main)', padding: '0.6rem 1rem', borderRadius: '10px' }}>
            <Search size={16} className="text-dim" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Malzeme ara..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', flex: 1 }} />
          </div>
          <select className="input" value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }} style={{ width: 'auto' }}>
            <option value="">Tüm Kategoriler</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="input" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={{ width: 'auto' }}>
            <option value="">Tüm Durumlar</option>
            <option value="ok">Normal</option>
            <option value="critical">Kritik</option>
            <option value="empty">Tükendi</option>
          </select>
          {(filterStatus || filterCat || search) && (
            <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => { setSearch(''); setFilterCat(''); setFilterStatus(''); setPage(1); }}>Filtreleri Temizle ×</button>
          )}
        </div>
      </div>

      <div className="card">
        {paginated.length === 0 ? (
          <EmptyState icon={<Package size={48} />} title="Stok bulunamadı"
            description={search || filterCat || filterStatus ? 'Filtreleri değiştirin.' : 'Henüz malzeme kaydı yok.'}
            action={<button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={18} /> Malzeme Ekle</button>} />
        ) : (
          <>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Malzeme Adı</th>
                  <th>Kategori</th>
                  <th>Tesis</th>
                  <th>Min Stok</th>
                  <th style={{ textAlign: 'right' }}>Mevcut</th>
                  <th style={{ textAlign: 'right' }}>Birim Maliyet</th>
                  <th style={{ textAlign: 'right' }}>Toplam Değer</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(item => {
                  const statusColor = stockStatusColor(item.qty, item.minQty);
                  const isEmpty = item.qty <= 0;
                  return (
                    <tr key={item.id}>
                      <td style={{ padding: '1.1rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                          <div>
                            <p style={{ fontWeight: '700' }}>{item.name}</p>
                            {isEmpty && <p style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: '700' }}>⚠ STOK TÜKENDİ</p>}
                            {!isEmpty && item.qty <= item.minQty && <p style={{ fontSize: '0.7rem', color: 'var(--warning)', fontWeight: '700' }}>⚠ KRİTİK SEVİYE</p>}
                          </div>
                        </div>
                      </td>
                      <td><span className="badge" style={{ background: 'var(--bg-main)' }}>{item.category}</span></td>
                      <td className="text-dim" style={{ fontSize: '0.85rem' }}>{item.facility}</td>
                      <td className="text-dim">{item.minQty} {item.unit}</td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: statusColor }}>
                        {item.qty} {item.unit}
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(item.unitCost || 0)}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700' }}>{formatCurrency(item.qty * (item.unitCost || 0))}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }} onClick={() => setShowMovementModal(item)}>
                          <ArrowLeftRight size={14} /> Hareket
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
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <button key={pg} className="btn" onClick={() => setPage(pg)}
                      style={{ padding: '0.4rem 0.9rem', background: page === pg ? 'var(--primary)' : 'transparent', color: page === pg ? 'white' : 'var(--text-dim)', border: 'none' }}>
                      {pg}
                    </button>
                  );
                })}
                <button className="btn btn-ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '0.4rem 1rem' }}>→</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Yeni Malzeme Modal */}
      {showAddModal && (
        <NewStockModal
          onClose={() => setShowAddModal(false)}
          onSave={(data) => {
            addStockItem(data);
            toast.success(`Malzeme tanımlandı: ${data.name}`);
            setShowAddModal(false);
          }}
        />
      )}

      {/* Stok Hareketi Modal */}
      {showMovementModal && (
        <StockMovementModal
          item={showMovementModal}
          onClose={() => setShowMovementModal(null)}
          onSave={({ type, qty, note }) => {
            addStockMovement({ itemName: showMovementModal.name, qty, type, ref: `MHK-${Date.now()}`, note });
            toast.success(`${type === 'giriş' ? 'Giriş' : 'Çıkış'} kaydedildi: ${qty} ${showMovementModal.unit}`);
            setShowMovementModal(null);
          }}
        />
      )}
    </div>
  );
};

// ─── Yeni Malzeme Modal ───────────────────────────────────────────────────────
const NewStockModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ name: '', category: 'Bakım Malzemeleri', unit: 'Adet', qty: 0, minQty: 5, unitCost: '', facility: 'İstanbul Merkez' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Malzeme adı girin';
    if (form.unitCost && parseFloat(form.unitCost) < 0) e.unitCost = 'Negatif olamaz';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div style={overlayStyle}>
      <div className="card" style={{ width: '100%', maxWidth: '580px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><Package size={20} /></div>
            <h2 style={{ fontSize: '1.25rem' }}>Yeni Malzeme Tanımla</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <FormField label="Malzeme Adı *" error={errors.name}>
            <input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn: Motor Yağı Castrol 5W30" style={{ width: '100%' }} />
          </FormField>

          <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
            <FormField label="Kategori">
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: '100%' }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Birim">
              <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={{ width: '100%' }}>
                <option>Adet</option><option>Litre</option><option>Kg</option><option>Set</option><option>Metre</option>
              </select>
            </FormField>
            <FormField label="Açılış Stoku">
              <input className="input" type="number" min="0" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} style={{ width: '100%' }} />
            </FormField>
            <FormField label="Min. Stok (Alarm)">
              <input className="input" type="number" min="0" value={form.minQty} onChange={e => setForm(f => ({ ...f, minQty: e.target.value }))} style={{ width: '100%' }} />
            </FormField>
            <FormField label="Birim Maliyet (₺)" error={errors.unitCost}>
              <input className={`input ${errors.unitCost ? 'input-error' : ''}`} type="number" min="0" value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))} placeholder="0,00" style={{ width: '100%' }} />
            </FormField>
            <FormField label="Tesis">
              <select className="input" value={form.facility} onChange={e => setForm(f => ({ ...f, facility: e.target.value }))} style={{ width: '100%' }}>
                <option>İstanbul Merkez</option><option>İzmir Depo</option><option>Ankara Şube</option>
              </select>
            </FormField>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>İptal</button>
          <button className="btn btn-primary" onClick={() => { if (!validate()) return; onSave({ ...form, qty: parseFloat(form.qty) || 0, minQty: parseFloat(form.minQty) || 0, unitCost: parseFloat(form.unitCost) || 0 }); }}>
            Malzemeyi Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Stok Hareketi Modal ──────────────────────────────────────────────────────
const StockMovementModal = ({ item, onClose, onSave }) => {
  const [type, setType] = useState('giriş');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    const q = parseFloat(qty);
    if (!qty || isNaN(q) || q <= 0) { setError('Geçerli miktar girin'); return; }
    if (type === 'çıkış' && q > item.qty) { setError(`Stok yetersiz (Mevcut: ${item.qty} ${item.unit})`); return; }
    onSave({ type, qty: q, note });
  };

  return (
    <div style={overlayStyle}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem' }}>Stok Hareketi: {item.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
        </div>

        <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
          <span className="text-dim">Mevcut Stok</span>
          <span style={{ fontWeight: '800', color: stockStatusColor(item.qty, item.minQty) }}>{item.qty} {item.unit}</span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          {[{ val: 'giriş', label: 'Giriş', icon: <ArrowUp size={16} />, color: 'var(--success)' },
            { val: 'çıkış', label: 'Çıkış', icon: <ArrowDown size={16} />, color: 'var(--danger)' }].map(opt => (
            <button key={opt.val} onClick={() => setType(opt.val)}
              style={{ flex: 1, padding: '0.85rem', border: type === opt.val ? `2px solid ${opt.color}` : '1px solid var(--border)', borderRadius: '12px', background: type === opt.val ? `${opt.color}15` : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: type === opt.val ? opt.color : 'var(--text-dim)', fontWeight: '700' }}>
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FormField label={`Miktar (${item.unit}) *`} error={error}>
            <input className={`input ${error ? 'input-error' : ''}`} type="number" min="0" value={qty} onChange={e => { setQty(e.target.value); setError(''); }} style={{ width: '100%' }} />
          </FormField>
          <FormField label="Not (İsteğe Bağlı)">
            <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Hareket açıklaması..." style={{ width: '100%' }} />
          </FormField>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>İptal</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Hareketi Kaydet</button>
        </div>
      </div>
    </div>
  );
};

const SStatCard = ({ title, value, sub, icon, color, onClick }) => (
  <div className="card" style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
    <div style={{ color, marginBottom: '1rem' }}>{icon}</div>
    <h2 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>{value}</h2>
    <p className="text-dim" style={{ fontSize: '0.9rem', fontWeight: '600' }}>{title}</p>
    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{sub}</p>
  </div>
);

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };

export default Stock;
