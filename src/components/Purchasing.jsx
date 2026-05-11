import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  ShoppingBag, Plus, Search, Clock, CheckCircle2, XCircle,
  MoreVertical, X, Package, ChevronDown, AlertTriangle, Truck
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatDate, today } from '../utils/formatters';
import { FormField, EmptyState } from './Invoices';

const PAGE_SIZE = 10;

const Purchasing = () => {
  const purchaseRequests = useStore(s => s.purchaseRequests);
  const personnel = useStore(s => s.personnel);
  const stockItems = useStore(s => s.stockItems);
  const addPurchaseRequest = useStore(s => s.addPurchaseRequest);
  const approvePurchaseRequest = useStore(s => s.approvePurchaseRequest);
  const rejectPurchaseRequest = useStore(s => s.rejectPurchaseRequest);
  const addStockMovement = useStore(s => s.addStockMovement);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [showReceiveModal, setShowReceiveModal] = useState(null); // onaylı talepler için teslim alma

  const filtered = purchaseRequests.filter(r => {
    const matchSearch = !search || r.item.toLowerCase().includes(search.toLowerCase()) || r.no.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {
    pending: purchaseRequests.filter(r => r.status === 'pending').length,
    approved: purchaseRequests.filter(r => r.status === 'approved').length,
    rejected: purchaseRequests.filter(r => r.status === 'rejected').length,
    received: purchaseRequests.filter(r => r.status === 'received').length,
  };

  const totalBudget = purchaseRequests.filter(r => r.status !== 'rejected').reduce((s, r) => s + (r.estimatedCost || 0), 0);

  const handleApprove = (id) => {
    approvePurchaseRequest(id, 'p4'); // p4 = Fatma Kaya (Muhasebe)
    toast.success('Talep onaylandı.');
  };

  const handleReject = (id) => {
    rejectPurchaseRequest(id);
    toast.error('Talep reddedildi.');
  };

  const handleReceive = (req) => {
    // Malzeme teslim alındı → stok güncelle
    addStockMovement({ itemName: req.item, qty: req.qty, type: 'giriş', ref: req.no, note: `Satın alma: ${req.no}` });
    // Talebi "received" olarak işaretle
    useStore.getState().purchaseRequests = purchaseRequests.map(r => r.id === req.id ? { ...r, status: 'received' } : r);
    // Zustand state güncellemesi için set kullanıyoruz
    toast.success(`${req.item} stoka işlendi.`);
    setShowReceiveModal(null);
  };

  const statusBadge = (status) => {
    const map = {
      pending: <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={12} /> Bekliyor</span>,
      approved: <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><CheckCircle2 size={12} /> Onaylandı</span>,
      rejected: <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><XCircle size={12} /> Reddedildi</span>,
      received: <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Package size={12} /> Teslim Alındı</span>,
    };
    return map[status] || null;
  };

  const priorityColor = (p) => p === 'Kritik' ? 'var(--danger)' : p === 'Acil' ? 'var(--warning)' : 'var(--text-dim)';

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Satın Alma Yönetimi</h1>
          <p className="text-muted">Malzeme ve hizmet taleplerini, onay süreçlerini ve stok girişlerini yönetin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Talep Oluştur
        </button>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <PStatCard title="Bekleyen" value={counts.pending} sub="Onay Bekliyor" icon={<Clock size={20} />} color="var(--warning)" />
        <PStatCard title="Onaylanan" value={counts.approved} sub="Bu Dönem" icon={<CheckCircle2 size={20} />} color="var(--success)" />
        <PStatCard title="Reddedilen" value={counts.rejected} sub="İptal" icon={<XCircle size={20} />} color="var(--danger)" />
        <PStatCard title="Teslim Alınan" value={counts.received} sub="Stoka İşlendi" icon={<Package size={20} />} color="var(--primary)" />
      </div>

      {/* Filtreler */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, background: 'var(--bg-main)', padding: '0.6rem 1rem', borderRadius: '10px' }}>
            <Search size={16} className="text-dim" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Talep no, malzeme ara..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', flex: 1 }} />
          </div>
          <select className="input" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={{ width: 'auto' }}>
            <option value="">Tüm Durumlar</option>
            <option value="pending">Bekliyor</option>
            <option value="approved">Onaylandı</option>
            <option value="rejected">Reddedildi</option>
            <option value="received">Teslim Alındı</option>
          </select>
        </div>
      </div>

      <div className="card">
        {paginated.length === 0 ? (
          <EmptyState icon={<ShoppingBag size={48} />} title="Talep bulunamadı" description="Henüz satın alma talebi yok veya filtreler boş sonuç döndürüyor."
            action={<button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={18} /> Yeni Talep</button>} />
        ) : (
          <>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Talep No</th>
                  <th>Malzeme / Hizmet</th>
                  <th>Talep Eden</th>
                  <th>Öncelik</th>
                  <th>Tarih</th>
                  <th>Durum</th>
                  <th style={{ textAlign: 'right' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(r => {
                  const user = personnel.find(p => p.id === r.userId);
                  return (
                    <tr key={r.id}>
                      <td style={{ padding: '1rem' }}><span style={{ fontWeight: '700' }}>{r.no}</span></td>
                      <td>
                        <div>
                          <p style={{ fontWeight: '600' }}>{r.item}</p>
                          <p className="text-dim" style={{ fontSize: '0.75rem' }}>{r.qty} {r.unit} · {r.type}</p>
                        </div>
                      </td>
                      <td>{user?.name || r.userId}</td>
                      <td>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: priorityColor(r.priority) }}>
                          {r.priority === 'Kritik' && <AlertTriangle size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />}
                          {r.priority}
                        </span>
                      </td>
                      <td className="text-dim">{formatDate(r.date)}</td>
                      <td>{statusBadge(r.status)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          {r.status === 'pending' && (
                            <>
                              <button className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: 'var(--success)', border: '1px solid var(--success)' }} onClick={() => handleApprove(r.id)}>Onayla</button>
                              <button className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: 'var(--danger)', border: '1px solid var(--danger)' }} onClick={() => handleReject(r.id)}>Reddet</button>
                            </>
                          )}
                          {r.status === 'approved' && (
                            <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setShowReceiveModal(r)}>
                              <Package size={14} /> Teslim Al
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '0.4rem 1rem' }}>←</button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i + 1} className="btn" onClick={() => setPage(i + 1)}
                    style={{ padding: '0.4rem 0.9rem', background: page === i + 1 ? 'var(--primary)' : 'transparent', color: page === i + 1 ? 'white' : 'var(--text-dim)', border: 'none' }}>
                    {i + 1}
                  </button>
                ))}
                <button className="btn btn-ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '0.4rem 1rem' }}>→</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Yeni Talep Modal */}
      {showAddModal && (
        <NewRequestModal personnel={personnel} stockItems={stockItems}
          onClose={() => setShowAddModal(false)}
          onSave={(data) => {
            addPurchaseRequest(data);
            toast.success('Satın alma talebi oluşturuldu.');
            setShowAddModal(false);
          }}
        />
      )}

      {/* Teslim Alma Onay */}
      {showReceiveModal && (
        <div style={overlayStyle}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Malzeme Teslim Al</h2>
            <p style={{ marginBottom: '1.5rem' }}>
              <strong>{showReceiveModal.item}</strong> ({showReceiveModal.qty} {showReceiveModal.unit}) stoka işlenecek. Onaylıyor musunuz?
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowReceiveModal(null)}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => handleReceive(showReceiveModal)}>
                <Package size={16} /> Stoka İşle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Yeni Talep Modal ─────────────────────────────────────────────────────────
const NewRequestModal = ({ personnel, stockItems, onClose, onSave }) => {
  const [form, setForm] = useState({
    type: 'Malzeme Alımı', item: '', qty: 1, unit: 'Adet',
    priority: 'Normal', reason: '', userId: personnel[0]?.id || '',
    estimatedCost: '', date: today(),
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.item.trim()) e.item = 'Malzeme adı girin';
    if (!form.qty || parseFloat(form.qty) <= 0) e.qty = 'Miktar > 0';
    if (!form.userId) e.userId = 'Talep eden seçin';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div style={overlayStyle}>
      <div className="card" style={{ width: '100%', maxWidth: '580px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><ShoppingBag size={20} /></div>
            <h2 style={{ fontSize: '1.25rem' }}>Yeni Satın Alma Talebi</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
            <FormField label="Talep Türü *">
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%' }}>
                <option>Malzeme Alımı</option><option>Hizmet Alımı</option><option>Demirbaş</option>
              </select>
            </FormField>
            <FormField label="Öncelik *">
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{ width: '100%' }}>
                <option>Normal</option><option>Acil</option><option>Kritik</option>
              </select>
            </FormField>
          </div>

          <FormField label="Malzeme / Hizmet Adı *" error={errors.item}>
            <input className={`input ${errors.item ? 'input-error' : ''}`} value={form.item} onChange={e => setForm(f => ({ ...f, item: e.target.value }))} placeholder="Örn: 4 Adet Kışlık Lastik 315/80" style={{ width: '100%' }} />
          </FormField>

          <div className="grid grid-cols-3" style={{ gap: '1.25rem' }}>
            <FormField label="Miktar *" error={errors.qty}>
              <input className={`input ${errors.qty ? 'input-error' : ''}`} type="number" min="1" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} style={{ width: '100%' }} />
            </FormField>
            <FormField label="Birim">
              <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={{ width: '100%' }}>
                <option>Adet</option><option>Litre</option><option>Kg</option><option>Set</option>
              </select>
            </FormField>
            <FormField label="Tahmini Maliyet (₺)">
              <input className="input" type="number" min="0" value={form.estimatedCost} onChange={e => setForm(f => ({ ...f, estimatedCost: e.target.value }))} placeholder="0,00" style={{ width: '100%' }} />
            </FormField>
          </div>

          <FormField label="Talep Eden *" error={errors.userId}>
            <select className={`input ${errors.userId ? 'input-error' : ''}`} value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} style={{ width: '100%' }}>
              {personnel.map(p => <option key={p.id} value={p.id}>{p.name} — {p.position}</option>)}
            </select>
          </FormField>

          <FormField label="Talep Nedeni / Açıklama">
            <textarea className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Lütfen detay girin..." style={{ width: '100%', height: '80px', resize: 'vertical' }} />
          </FormField>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>İptal</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => { if (!validate()) return; onSave({ ...form, qty: parseFloat(form.qty), estimatedCost: parseFloat(form.estimatedCost) || 0 }); }}>
            Talebi Gönder
          </button>
        </div>
      </div>
    </div>
  );
};

const PStatCard = ({ title, value, sub, icon, color }) => (
  <div className="card">
    <div style={{ color, marginBottom: '0.75rem' }}>{icon}</div>
    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{value}</h3>
    <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>{title}</p>
    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{sub}</p>
  </div>
);

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };

export default Purchasing;
