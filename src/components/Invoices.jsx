import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  MoreVertical, 
  ArrowLeft,
  Save,
  Trash2,
  Calendar,
  Building2,
  Box,
  Truck,
  Warehouse,
  CheckCircle2,
  Clock,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Invoices = ({ initialView = 'list' }) => {
  const [view, setView] = useState(initialView);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  
  const [newInvoice, setNewInvoice] = useState({
    invoice_no: '',
    customer_id: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    items: []
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: invs } = await supabase.from('invoices').select('*, customers(name)').order('created_at', { ascending: false });
    const { data: custs } = await supabase.from('customers').select('*');
    const { data: mats } = await supabase.from('materials').select('*');
    const { data: vehs } = await supabase.from('vehicles').select('*');
    
    setInvoices(invs || []);
    setCustomers(custs || []);
    setMaterials(mats || []);
    setVehicles(vehs || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { 
        id: Date.now(),
        material_id: '',
        quantity: 1,
        unit_price: 0,
        vat_rate: 20,
        tevkifat_rate: 0,
        allocation_type: 'Depo',
        allocation_id: ''
      }]
    });
  };

  const handleSaveInvoice = async () => {
    if (!newInvoice.customer_id || !newInvoice.invoice_no) {
      alert('Lütfen fatura no ve cari bilgisini doldurun.');
      return;
    }

    const itemCalc = (item) => {
      const matrah = Number(item.quantity) * Number(item.unit_price);
      const kdv    = matrah * item.vat_rate / 100;
      const tevk   = kdv * item.tevkifat_rate;
      return matrah + tevk;
    };
    const total = newInvoice.items.reduce((acc, item) => acc + itemCalc(item), 0);

    // 1. Faturayı Kaydet
    const { data: invData, error: invError } = await supabase
      .from('invoices')
      .insert([{
        invoice_no: newInvoice.invoice_no,
        customer_id: newInvoice.customer_id,
        date: newInvoice.date,
        total_amount: total,
        description: newInvoice.description
      }])
      .select();

    if (invError) {
      alert('Fatura kaydedilemedi: ' + invError.message);
      return;
    }

    // 2. Fatura Kalemlerini Kaydet
    const itemsToInsert = newInvoice.items.map(item => ({
      invoice_id: invData[0].id,
      material_id: item.material_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      vat_rate: item.vat_rate,
      total_price: (() => { const m = Number(item.quantity)*Number(item.unit_price); return m + m*(item.vat_rate/100)*item.tevkifat_rate; })(),
      allocation_type: item.allocation_type,
      allocation_id: item.allocation_id || null
    }));

    const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert);
    
    if (itemsError) alert('Kalemler kaydedilirken hata oluştu: ' + itemsError.message);
    else {
      setView('list');
      fetchData();
      setNewInvoice({ invoice_no: '', customer_id: '', date: new Date().toISOString().split('T')[0], description: '', items: [] });
    }
  };

  if (view === 'create') {
    return (
      <div className="invoice-create">
        <header style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <button className="btn btn-ghost" onClick={() => setView('list')}><ArrowLeft size={20} /></button>
          <h1 style={{ fontSize: '1.75rem' }}>Yeni Fatura İşle</h1>
        </header>

        <div className="grid grid-cols-3" style={{ gap: '2rem' }}>
          <div className="col-span-2">
            <div className="card" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem' }}>Fatura Detayları</h3>
                <button className="btn btn-ghost" style={{ color: 'var(--primary)' }} onClick={handleAddItem}><Plus size={18} /> Satır Ekle</button>
              </div>

              {newInvoice.items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-main)', borderRadius: '12px', border: '2px dashed var(--border)' }}>
                  <p className="text-dim">Faturaya henüz ürün veya hizmet eklenmedi.</p>
                  <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleAddItem}>İlk Satırı Ekle</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {newInvoice.items.map((item, idx) => (
                    <div key={item.id} className="invoice-item-row" style={{ padding: '1.5rem', background: 'var(--bg-main)', borderRadius: '12px' }}>
                      <div className="grid grid-cols-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="col-span-2">
                          <label className="label-sm">Ürün / Hizmet (Gider Kartı)</label>
                          <select
                            className="input"
                            value={item.material_id}
                            onChange={(e) => {
                              const newItems = [...newInvoice.items];
                              newItems[idx].material_id = e.target.value;
                              setNewInvoice({...newInvoice, items: newItems});
                            }}
                          >
                            <option value="">Seçiniz...</option>
                            {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="label-sm">Miktar</label>
                          <input type="number" className="input" value={item.quantity} onChange={(e) => {
                            const newItems = [...newInvoice.items];
                            newItems[idx].quantity = e.target.value;
                            setNewInvoice({...newInvoice, items: newItems});
                          }} />
                        </div>
                        <div>
                          <label className="label-sm">Birim Fiyat (₺)</label>
                          <input type="number" className="input" value={item.unit_price} onChange={(e) => {
                            const newItems = [...newInvoice.items];
                            newItems[idx].unit_price = e.target.value;
                            setNewInvoice({...newInvoice, items: newItems});
                          }} />
                        </div>
                      </div>
                      {/* KDV + Tevkifat satırı */}
                      {(() => {
                        const matrah   = Number(item.quantity) * Number(item.unit_price);
                        const kdvTutar = matrah * item.vat_rate / 100;
                        const tevkTutar= kdvTutar * item.tevkifat_rate;
                        const odenecek = matrah + tevkTutar;
                        const fmt = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'var(--bg-main)', borderRadius: '10px', marginBottom: '0.5rem' }}>
                            {/* KDV seçici */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', minWidth: '80px' }}>KDV Oranı:</span>
                              {[0, 1, 8, 20].map(rate => (
                                <button key={rate} type="button"
                                  onClick={() => { const ni = [...newInvoice.items]; ni[idx].vat_rate = rate; setNewInvoice({...newInvoice, items: ni}); }}
                                  style={{ padding: '0.25rem 0.65rem', borderRadius: '7px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', border: '1.5px solid', background: item.vat_rate === rate ? 'var(--primary)' : 'transparent', color: item.vat_rate === rate ? 'white' : 'var(--text-muted)', borderColor: item.vat_rate === rate ? 'var(--primary)' : 'var(--border)' }}
                                >%{rate}</button>
                              ))}
                              <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>KDV Tutarı: <strong>₺{fmt(kdvTutar)}</strong></span>
                            </div>
                            {/* Tevkifat seçici */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', minWidth: '80px' }}>Tevkifat:</span>
                              {[
                                { label: 'Yok', val: 0 },
                                { label: '2/10', val: 2/10 },
                                { label: '3/10', val: 3/10 },
                                { label: '4/10', val: 4/10 },
                                { label: '5/10', val: 5/10 },
                                { label: '7/10', val: 7/10 },
                                { label: '9/10', val: 9/10 },
                              ].map(opt => (
                                <button key={opt.label} type="button"
                                  onClick={() => { const ni = [...newInvoice.items]; ni[idx].tevkifat_rate = opt.val; setNewInvoice({...newInvoice, items: ni}); }}
                                  style={{ padding: '0.25rem 0.65rem', borderRadius: '7px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', border: '1.5px solid', background: item.tevkifat_rate === opt.val ? '#f59e0b' : 'transparent', color: item.tevkifat_rate === opt.val ? 'white' : 'var(--text-muted)', borderColor: item.tevkifat_rate === opt.val ? '#f59e0b' : 'var(--border)' }}
                                >{opt.label}</button>
                              ))}
                              <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Tevkifat Tutarı: <strong style={{ color: '#f59e0b' }}>₺{fmt(tevkTutar)}</strong></span>
                            </div>
                            {/* Ödenecek */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-muted)' }}>Matrah: ₺{fmt(matrah)}&nbsp;&nbsp;·&nbsp;&nbsp;</span>
                              <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--primary)' }}>Ödenecek: ₺{fmt(odenecek)}</span>
                            </div>
                          </div>
                        );
                      })()}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Gider Ataması:</span>
                          <div style={{ display: 'flex', background: 'var(--card-bg)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <button 
                              className={`btn-toggle ${item.allocation_type === 'Depo' ? 'active' : ''}`}
                              onClick={() => {
                                const newItems = [...newInvoice.items];
                                newItems[idx].allocation_type = 'Depo';
                                newItems[idx].allocation_id = '';
                                setNewInvoice({...newInvoice, items: newItems});
                              }}
                            >
                              <Warehouse size={14} /> Depo
                            </button>
                            <button 
                              className={`btn-toggle ${item.allocation_type === 'Araç' ? 'active' : ''}`}
                              onClick={() => {
                                const newItems = [...newInvoice.items];
                                newItems[idx].allocation_type = 'Araç';
                                setNewInvoice({...newInvoice, items: newItems});
                              }}
                            >
                              <Truck size={14} /> Araç (Plaka)
                            </button>
                          </div>
                          {item.allocation_type === 'Araç' && (
                            <select 
                              className="input-sm"
                              value={item.allocation_id}
                              onChange={(e) => {
                                const newItems = [...newInvoice.items];
                                newItems[idx].allocation_id = e.target.value;
                                setNewInvoice({...newInvoice, items: newItems});
                              }}
                            >
                              <option value="">Plaka Seçiniz...</option>
                              {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                            </select>
                          )}
                        </div>
                        <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => {
                          const newItems = newInvoice.items.filter(it => it.id !== item.id);
                          setNewInvoice({...newInvoice, items: newItems});
                        }}><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-1">
            <div className="card" style={{ position: 'sticky', top: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Fatura Bilgileri</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <InputGroup label="Fatura No" placeholder="Örn: ABC202600001" value={newInvoice.invoice_no} onChange={(e) => setNewInvoice({...newInvoice, invoice_no: e.target.value})} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="label-sm">Cari (Tedarikçi / Müşteri)</label>
                  <select className="input" value={newInvoice.customer_id} onChange={(e) => setNewInvoice({...newInvoice, customer_id: e.target.value})}>
                    <option value="">Cari Seçiniz...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <InputGroup label="Fatura Tarihi" type="date" value={newInvoice.date} onChange={(e) => setNewInvoice({...newInvoice, date: e.target.value})} />
                <InputGroup label="Açıklama" placeholder="Not ekleyin..." value={newInvoice.description} onChange={(e) => setNewInvoice({...newInvoice, description: e.target.value})} />
                
                <div style={{ marginTop: '1rem', padding: '1.5rem', background: 'var(--bg-main)', borderRadius: '12px' }}>
                  {(() => {
                    const fmt = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    const matrahTop  = newInvoice.items.reduce((a, it) => a + Number(it.quantity)*Number(it.unit_price), 0);
                    const kdvTop     = newInvoice.items.reduce((a, it) => a + Number(it.quantity)*Number(it.unit_price)*it.vat_rate/100, 0);
                    const tevkTop    = newInvoice.items.reduce((a, it) => a + Number(it.quantity)*Number(it.unit_price)*it.vat_rate/100*it.tevkifat_rate, 0);
                    const odenecek   = matrahTop + tevkTop;
                    return (<>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span className="text-dim">Matrah</span>
                        <span style={{ fontWeight: '600' }}>₺{fmt(matrahTop)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span className="text-dim">KDV Toplam</span>
                        <span style={{ fontWeight: '600' }}>₺{fmt(kdvTop)}</span>
                      </div>
                      {tevkTop > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span className="text-dim">Tevkifat</span>
                          <span style={{ fontWeight: '600', color: '#f59e0b' }}>₺{fmt(tevkTop)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--border)' }}>
                        <span style={{ fontWeight: '700' }}>Ödenecek Toplam</span>
                        <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.25rem' }}>₺{fmt(odenecek)}</span>
                      </div>
                    </>);
                  })()}
                </div>

                <button className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} onClick={handleSaveInvoice}><Save size={20} /> Faturayı Kaydet ve Bitir</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="invoices-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Fatura & Muhasebe</h1>
          <p className="text-muted">Gelen ve giden faturalarınızı işleyin, cari hesaplarınızı takip edin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setView('create')}>
          <Plus size={20} /> Yeni Fatura İşle
        </button>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <p className="text-muted">Toplam Fatura</p>
          <h2 style={{ fontSize: '2rem' }}>{invoices.length}</h2>
        </div>
        <div className="card">
          <p className="text-muted">Bu Ay İşlenen</p>
          <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>{invoices.filter(i => new Date(i.date).getMonth() === new Date().getMonth()).length}</h2>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.25rem' }}>Fatura No / Tarih</th>
              <th>Cari / Ünvan</th>
              <th>Tutar</th>
              <th>Durum</th>
              <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>Henüz fatura işlenmemiş.</td></tr>
            ) : (
              invoices.map(i => (
                <tr key={i.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <p style={{ fontWeight: '700' }}>{i.invoice_no}</p>
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>{new Date(i.date).toLocaleDateString('tr-TR')}</p>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Building2 size={14} className="text-dim" />
                      <span style={{ fontWeight: '600' }}>{i.customers?.name || 'Bilinmeyen'}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: '800', color: 'var(--primary)' }}>₺{i.total_amount.toLocaleString()}</td>
                  <td><span className="badge badge-success">{i.status}</span></td>
                  <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                    <button className="btn btn-ghost"><MoreVertical size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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

export default Invoices;
