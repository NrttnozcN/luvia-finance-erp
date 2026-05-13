import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  MoreVertical,
  ArrowLeft,
  Save,
  Trash2,
  Building2,
  Truck,
  Warehouse,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

const Invoices = ({ initialView = 'list' }) => {
  const currentUser = useAuthStore(s => s.currentUser);
  const cid = currentUser?.company_id;

  const [view, setView] = useState(initialView);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [itemErrors, setItemErrors] = useState([]);
  
  const [newInvoice, setNewInvoice] = useState({
    invoice_no: '',
    customer_id: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    islem_turu: 'Satış Faturası',
    fatura_tipi: 'Ticari',
    items: []
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: invs } = await supabase.from('invoices').select('*, customers(name)').eq('company_id', cid).order('created_at', { ascending: false });
    const { data: custs } = await supabase.from('customers').select('*').eq('company_id', cid);
    const { data: mats } = await supabase.from('materials').select('*').eq('company_id', cid);
    const { data: vehs } = await supabase.from('vehicles').select('*').eq('company_id', cid);
    
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
        description: '',
        quantity: 1,
        unit_price: 0,
        vat_rate: 20,
        tevkifat_rate: 0,
        allocation_type: 'Depo',
        allocation_id: ''
      }]
    });
  };

  const handleDelete = async (id, record) => {
    if (!window.confirm(`"${record.invoice_no || id}" silinecek. Emin misin?`)) return;
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) { alert('Silme hatası: ' + error.message); return; }
    fetchData();
  };

  const handleSaveInvoice = async () => {
    if (!newInvoice.customer_id || !newInvoice.invoice_no) {
      alert('Lütfen fatura no ve cari bilgisini doldurun.');
      return;
    }

    // Kalem validasyonu
    const errs = newInvoice.items.map(item => ({
      material_id:   !item.material_id          ? 'Bu alanın doldurulması zorunludur.' : '',
      quantity:      Number(item.quantity) <= 0  ? 'Bu alanın doldurulması zorunludur.' : '',
      unit_price:    Number(item.unit_price) <= 0 ? 'Bu alanın doldurulması zorunludur.' : '',
      allocation_id: item.allocation_type === 'Araç' && !item.allocation_id ? 'Bu alanın doldurulması zorunludur.' : '',
    }));
    const hasErr = errs.some(e => Object.values(e).some(v => v));
    if (hasErr) { setItemErrors(errs); return; }
    setItemErrors([]);

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
        description: newInvoice.description,
        islem_turu: newInvoice.islem_turu,
        fatura_tipi: newInvoice.fatura_tipi,
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
      description: item.description || null,
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
      setNewInvoice({ invoice_no: '', customer_id: '', date: new Date().toISOString().split('T')[0], description: '', islem_turu: 'Satış Faturası', fatura_tipi: 'Ticari', items: [] });
    }
  };

  if (view === 'create') {
    const fmt = (n) => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const matrahTop = newInvoice.items.reduce((a, it) => a + Number(it.quantity) * Number(it.unit_price), 0);
    const kdvTop    = newInvoice.items.reduce((a, it) => a + Number(it.quantity) * Number(it.unit_price) * it.vat_rate / 100, 0);
    const tevkTop   = newInvoice.items.reduce((a, it) => a + Number(it.quantity) * Number(it.unit_price) * it.vat_rate / 100 * it.tevkifat_rate, 0);
    const odenecek  = matrahTop + tevkTop;

    return (
      <div className="invoice-create" style={{ maxWidth: '1100px' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
          <button className="btn btn-ghost" onClick={() => setView('list')}><ArrowLeft size={20} /> Geri</button>
          <div>
            <h1 style={{ fontSize: '1.75rem' }}>Yeni Fatura İşle</h1>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Fatura bilgilerini doldurun, kalem ekleyin ve kaydedin.</p>
          </div>
        </header>

        {/* BÖLÜM 1: Fatura Bilgileri */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            📋 Fatura Bilgileri
          </p>

          <div className="grid grid-cols-4" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* İşlem Türü */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="label-sm">İşlem Türü</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['Satış Faturası', 'Alış Faturası'].map(t => (
                  <button key={t} type="button" onClick={() => setNewInvoice({ ...newInvoice, islem_turu: t })}
                    style={{ flex: 1, padding: '0.6rem 0.4rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', border: '1.5px solid',
                      background: newInvoice.islem_turu === t ? (t === 'Satış Faturası' ? 'var(--success)' : 'var(--danger)') : 'transparent',
                      color: newInvoice.islem_turu === t ? 'white' : 'var(--text-muted)',
                      borderColor: newInvoice.islem_turu === t ? (t === 'Satış Faturası' ? 'var(--success)' : 'var(--danger)') : 'var(--border)' }}>
                    {t === 'Satış Faturası' ? '↑ Satış' : '↓ Alış'}
                  </button>
                ))}
              </div>
            </div>
            {/* Fatura Tipi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="label-sm">Fatura Tipi</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['Ticari', 'Temel'].map(t => (
                  <button key={t} type="button" onClick={() => setNewInvoice({ ...newInvoice, fatura_tipi: t })}
                    style={{ flex: 1, padding: '0.6rem 0.4rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', border: '1.5px solid',
                      background: newInvoice.fatura_tipi === t ? 'var(--primary)' : 'transparent',
                      color: newInvoice.fatura_tipi === t ? 'white' : 'var(--text-muted)',
                      borderColor: newInvoice.fatura_tipi === t ? 'var(--primary)' : 'var(--border)' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <InputGroup label="Fatura No *" placeholder="Örn: ABC202600001" value={newInvoice.invoice_no} onChange={(e) => setNewInvoice({...newInvoice, invoice_no: e.target.value})} />
            <InputGroup label="Fatura Tarihi" type="date" value={newInvoice.date} onChange={(e) => setNewInvoice({...newInvoice, date: e.target.value})} />
          </div>

          <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="label-sm">Cari (Tedarikçi / Müşteri) *</label>
              <select className="input" value={newInvoice.customer_id} onChange={(e) => setNewInvoice({...newInvoice, customer_id: e.target.value})}>
                <option value="">— Cari Seçiniz —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <InputGroup label="Açıklama / Not" placeholder="Opsiyonel not ekleyin..." value={newInvoice.description} onChange={(e) => setNewInvoice({...newInvoice, description: e.target.value})} />
          </div>
        </div>

        {/* BÖLÜM 2: Fatura Kalemleri */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>📦 Fatura Kalemleri</p>
            <button className="btn btn-ghost" style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '0.85rem' }} onClick={handleAddItem}>
              <Plus size={16} /> Satır Ekle
            </button>
          </div>

          {newInvoice.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-main)', borderRadius: '12px', border: '2px dashed var(--border)' }}>
              <p className="text-dim" style={{ marginBottom: '1rem' }}>Faturaya henüz ürün veya hizmet eklenmedi.</p>
              <button className="btn btn-primary" onClick={handleAddItem}><Plus size={16} /> İlk Satırı Ekle</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {newInvoice.items.map((item, idx) => {
                const matrah    = Number(item.quantity) * Number(item.unit_price);
                const kdvTutar  = matrah * item.vat_rate / 100;
                const tevkTutar = kdvTutar * item.tevkifat_rate;
                const odenecekItem = matrah + tevkTutar;
                const err = itemErrors[idx] || {};
                return (
                  <div key={item.id} style={{ padding: '1.5rem', background: 'var(--bg-main)', borderRadius: '12px', border: `1px solid ${Object.values(err).some(v=>v) ? '#ef4444' : 'var(--border)'}` }}>
                    <div className="grid grid-cols-4" style={{ gap: '1rem', marginBottom: '1rem' }}>
                      <div className="col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label className="label-sm">Ürün / Hizmet (Gider Kartı)</label>
                        <MaterialSelect
                          value={item.material_id}
                          materials={materials}
                          hasError={!!err.material_id}
                          onChange={(id) => { const ni = [...newInvoice.items]; ni[idx].material_id = id; setNewInvoice({...newInvoice, items: ni}); }}
                        />
                        {err.material_id && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{err.material_id}</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label className="label-sm">Miktar</label>
                        <input type="number" className="input" value={item.quantity}
                          style={err.quantity ? { borderColor: '#ef4444' } : {}}
                          onChange={(e) => { const ni = [...newInvoice.items]; ni[idx].quantity = e.target.value; setNewInvoice({...newInvoice, items: ni}); }} />
                        {err.quantity && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{err.quantity}</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label className="label-sm">Birim Fiyat (₺)</label>
                        <input type="number" className="input" value={item.unit_price}
                          style={err.unit_price ? { borderColor: '#ef4444' } : {}}
                          onChange={(e) => { const ni = [...newInvoice.items]; ni[idx].unit_price = e.target.value; setNewInvoice({...newInvoice, items: ni}); }} />
                        {err.unit_price && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{err.unit_price}</span>}
                      </div>
                    </div>

                    {/* Açıklama */}
                    <div style={{ marginBottom: '1rem' }}>
                      <label className="label-sm">İşlem Açıklaması</label>
                      <input
                        className="input"
                        placeholder="Bu kalem için açıklama girin (opsiyonel)..."
                        value={item.description || ''}
                        onChange={(e) => { const ni = [...newInvoice.items]; ni[idx].description = e.target.value; setNewInvoice({...newInvoice, items: ni}); }}
                        style={{ marginTop: '0.4rem' }}
                      />
                    </div>

                    <div style={{ background: 'white', borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', minWidth: '80px' }}>KDV Oranı:</span>
                        {[0, 1, 8, 10, 20].map(rate => (
                          <button key={rate} type="button"
                            onClick={() => { const ni = [...newInvoice.items]; ni[idx].vat_rate = rate; setNewInvoice({...newInvoice, items: ni}); }}
                            style={{ padding: '0.25rem 0.65rem', borderRadius: '7px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', border: '1.5px solid',
                              background: item.vat_rate === rate ? 'var(--primary)' : 'transparent',
                              color: item.vat_rate === rate ? 'white' : 'var(--text-muted)',
                              borderColor: item.vat_rate === rate ? 'var(--primary)' : 'var(--border)' }}>%{rate}</button>
                        ))}
                        <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>KDV: <strong>₺{fmt(kdvTutar)}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', minWidth: '80px' }}>Tevkifat:</span>
                        {[{label:'Yok',val:0},{label:'2/10',val:2/10},{label:'3/10',val:3/10},{label:'4/10',val:4/10},{label:'5/10',val:5/10},{label:'7/10',val:7/10},{label:'9/10',val:9/10}].map(opt => (
                          <button key={opt.label} type="button"
                            onClick={() => { const ni = [...newInvoice.items]; ni[idx].tevkifat_rate = opt.val; setNewInvoice({...newInvoice, items: ni}); }}
                            style={{ padding: '0.25rem 0.65rem', borderRadius: '7px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', border: '1.5px solid',
                              background: item.tevkifat_rate === opt.val ? '#f59e0b' : 'transparent',
                              color: item.tevkifat_rate === opt.val ? 'white' : 'var(--text-muted)',
                              borderColor: item.tevkifat_rate === opt.val ? '#f59e0b' : 'var(--border)' }}>{opt.label}</button>
                        ))}
                        <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Tevkifat: <strong style={{ color: '#f59e0b' }}>₺{fmt(tevkTutar)}</strong></span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.6rem', borderTop: '1px solid var(--border)', gap: '1.5rem' }}>
                        <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: '600' }}>Matrah: ₺{fmt(matrah)}</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--primary)' }}>Kalem Toplam: ₺{fmt(odenecekItem)}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Gider Ataması:</span>
                        <div style={{ display: 'flex', background: 'white', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <button className={`btn-toggle ${item.allocation_type === 'Depo' ? 'active' : ''}`}
                            onClick={() => { const ni = [...newInvoice.items]; ni[idx].allocation_type = 'Depo'; ni[idx].allocation_id = ''; setNewInvoice({...newInvoice, items: ni}); }}>
                            <Warehouse size={14} /> Depo
                          </button>
                          <button className={`btn-toggle ${item.allocation_type === 'Araç' ? 'active' : ''}`}
                            onClick={() => { const ni = [...newInvoice.items]; ni[idx].allocation_type = 'Araç'; setNewInvoice({...newInvoice, items: ni}); }}>
                            <Truck size={14} /> Araç
                          </button>
                        </div>
                        {item.allocation_type === 'Araç' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <select className="input-sm" value={item.allocation_id}
                              style={err.allocation_id ? { borderColor: '#ef4444' } : {}}
                              onChange={(e) => { const ni = [...newInvoice.items]; ni[idx].allocation_id = e.target.value; setNewInvoice({...newInvoice, items: ni}); }}>
                              <option value="">Plaka Seçiniz...</option>
                              {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                            </select>
                            {err.allocation_id && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{err.allocation_id}</span>}
                          </div>
                        )}
                      </div>
                      <button className="btn btn-ghost" style={{ color: 'var(--danger)' }}
                        onClick={() => setNewInvoice({...newInvoice, items: newInvoice.items.filter(it => it.id !== item.id)})}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* BÖLÜM 3: Özet + Kaydet */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.25rem', fontWeight: '600' }}>Matrah</p>
              <p style={{ fontWeight: '700', fontSize: '1.05rem' }}>₺{fmt(matrahTop)}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.25rem', fontWeight: '600' }}>KDV Toplam</p>
              <p style={{ fontWeight: '700', fontSize: '1.05rem' }}>₺{fmt(kdvTop)}</p>
            </div>
            {tevkTop > 0 && (
              <div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.25rem', fontWeight: '600' }}>Tevkifat</p>
                <p style={{ fontWeight: '700', fontSize: '1.05rem', color: '#f59e0b' }}>₺{fmt(tevkTop)}</p>
              </div>
            )}
            <div style={{ paddingLeft: '2rem', borderLeft: '2px solid var(--border)' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.25rem', fontWeight: '600' }}>Ödenecek Toplam</p>
              <p style={{ fontWeight: '800', fontSize: '1.5rem', color: 'var(--primary)' }}>₺{fmt(odenecek)}</p>
            </div>
          </div>
          <button className="btn btn-primary" style={{ padding: '0.9rem 2.5rem', fontSize: '1rem', fontWeight: '800', flexShrink: 0 }} onClick={handleSaveInvoice}>
            <Save size={20} /> Faturayı Kaydet
          </button>
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
                  <td style={{ fontWeight: '800', color: i.islem_turu === 'Alış Faturası' ? 'var(--danger)' : 'var(--success)' }}>
                    ₺{i.total_amount.toLocaleString()}
                  </td>
                  <td>
                    {i.islem_turu && (
                      <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '20px', marginRight: '4px',
                        background: i.islem_turu === 'Alış Faturası' ? '#fee2e2' : '#dcfce7',
                        color: i.islem_turu === 'Alış Faturası' ? '#991b1b' : '#166534' }}>
                        {i.islem_turu === 'Alış Faturası' ? '↓ Alış' : '↑ Satış'}
                      </span>
                    )}
                    {i.fatura_tipi && (
                      <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '20px',
                        background: '#f1f5f9', color: '#475569' }}>
                        {i.fatura_tipi}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '1.25rem', position: 'relative' }}>
                    <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === i.id ? null : i.id); }}>
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === i.id && (
                      <div style={{ position: 'absolute', right: '1rem', top: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '140px', overflow: 'hidden' }}
                        onMouseLeave={() => setOpenMenuId(null)}>
                        <button onClick={() => { setOpenMenuId(null); handleDelete(i.id, i); }}
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
    </div>
  );
};

const InputGroup = ({ label, placeholder, type, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label className="label-sm" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>{label}</label>
    <input type={type || 'text'} className="input" placeholder={placeholder} value={value} onChange={onChange} />
  </div>
);

const MaterialSelect = ({ value, materials, onChange, hasError }) => {
  const [query, setQuery]   = useState('');
  const [open, setOpen]     = useState(false);
  const ref                 = useRef(null);

  const selected  = materials.find(m => m.id === value);
  const filtered  = query.trim()
    ? materials.filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
    : materials;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (m) => {
    onChange(m.id);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        className="input"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'text', padding: '0', ...(hasError ? { borderColor: '#ef4444' } : {}) }}
        onClick={() => setOpen(true)}
      >
        {open ? (
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ara..."
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '0.6rem 0.85rem', fontSize: '0.9rem', width: '100%' }}
          />
        ) : (
          <span style={{ flex: 1, padding: '0.6rem 0.85rem', fontSize: '0.9rem', color: selected ? 'var(--text)' : 'var(--text-dim)' }}>
            {selected ? selected.name : 'Seçiniz...'}
          </span>
        )}
        <span style={{ paddingRight: '0.75rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>▼</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 999,
          background: 'white', border: '1px solid var(--border)', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '240px', overflowY: 'auto',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '1rem', color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center' }}>Sonuç bulunamadı</div>
          ) : filtered.map(m => (
            <div
              key={m.id}
              onMouseDown={() => handleSelect(m)}
              style={{
                padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.88rem',
                background: m.id === value ? 'var(--primary-light)' : 'transparent',
                color: m.id === value ? 'var(--primary)' : 'var(--text)',
                fontWeight: m.id === value ? '700' : '400',
                borderBottom: '1px solid var(--bg-main)',
              }}
              onMouseEnter={e => { if (m.id !== value) e.currentTarget.style.background = 'var(--bg-main)'; }}
              onMouseLeave={e => { if (m.id !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              {m.name}
              {m.category && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>{m.category}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Invoices;
