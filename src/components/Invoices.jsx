import { useState, useEffect } from 'react';
import {
  Plus, MoreVertical, ArrowLeft, Save, Trash2,
  Building2, Truck, Warehouse, ChevronRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';


const GIDER_CARDS  = ['Araç ve İş Makinesi Giderleri', 'Akaryakıt Giderleri', 'Büro Malzemesi Giderleri', 'Yemek ve Gıda Giderleri', 'Tesis Giderleri', 'Personel Giderleri', 'Diğer Giderler'];
const GELIR_CARDS  = ['Hakediş Geliri', 'Ürün Satış Geliri', 'Hizmet Satış Geliri', 'Diğer Gelirler'];
const MALZEME_CATS = ['Yedek Parça', 'Akaryakıt', 'Yağ & Filtre', 'Lastik', 'Büro Malzemesi', 'Gıda', 'Hizmet', 'Personel', 'Diğer'];

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
  const [facilities, setFacilities] = useState([]);
  const [itemErrors, setItemErrors] = useState([]);
  const [detailInvoice, setDetailInvoice] = useState(null);
  const [detailItems, setDetailItems] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Filtre State'leri
  const [filters, setFilters] = useState({
    customer_id: '',
    facility_id: '',
    startDate: '',
    endDate: '',
    type: ''
  });
  
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
    let query = supabase.from('invoices').select('*, customers(name)').eq('company_id', cid).order('date', { ascending: false });

    if (filters.customer_id)  query = query.eq('customer_id', filters.customer_id);
    if (filters.facility_id)  query = query.eq('facility_id', filters.facility_id);
    if (filters.startDate)    query = query.gte('date', filters.startDate);
    if (filters.endDate)      query = query.lte('date', filters.endDate);
    if (filters.type)         query = query.eq('islem_turu', filters.type);

    const { data: invs } = await query;
    const { data: custs } = await supabase.from('customers').select('*').eq('company_id', cid).order('name');
    const { data: mats } = await supabase.from('materials').select('*').eq('company_id', cid).order('name');
    const { data: vehs } = await supabase.from('vehicles').select('*').eq('company_id', cid).order('plate');
    const { data: facs } = await supabase.from('facilities').select('id, name').eq('company_id', cid).order('name');

    setInvoices(invs || []);
    setCustomers(custs || []);
    setMaterials(mats || []);
    setVehicles(vehs || []);
    setFacilities(facs || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleNewInvoice = () => {
    setNewInvoice({
      invoice_no: '',
      customer_id: '',
      facility_id: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      islem_turu: 'Satış Faturası',
      fatura_tipi: 'Ticari',
      items: [],
    });
    setItemErrors([]);
    setView('create');
  };

  const handleOpenDetail = async (invoice) => {
    setDetailInvoice(invoice);
    setDetailLoading(true);
    setView('detail');
    const { data } = await supabase
      .from('invoice_items')
      .select('*, materials(name, unit, category)')
      .eq('invoice_id', invoice.id);
    setDetailItems(data || []);
    setDetailLoading(false);
  };

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
    if (!newInvoice.customer_id || !newInvoice.invoice_no || !newInvoice.facility_id) {
      alert('Lütfen fatura no, cari ve tesis bilgisini doldurun.');
      return;
    }

    // Aynı cariye ait bu fatura numarası sistemde kayıtlı mı?
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('company_id', cid)
      .eq('customer_id', newInvoice.customer_id)
      .eq('invoice_no', newInvoice.invoice_no)
      .limit(1);
    if (existing && existing.length > 0) {
      alert('Bu fatura sistemde kayıtlıdır.');
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
      return matrah + kdv - tevk;
    };
    const total = newInvoice.items.reduce((acc, item) => acc + itemCalc(item), 0);

    // 1. Faturayı Kaydet
    const { data: invData, error: invError } = await supabase
      .from('invoices')
      .insert([{
        invoice_no: newInvoice.invoice_no,
        customer_id: newInvoice.customer_id,
        facility_id: newInvoice.facility_id,
        date: newInvoice.date,
        total_amount: total,
        description: newInvoice.description,
        islem_turu: newInvoice.islem_turu,
        fatura_tipi: newInvoice.fatura_tipi,
        company_id: cid,
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
      total_price: (() => { const m = Number(item.quantity)*Number(item.unit_price); const kdv = m*(item.vat_rate/100); return m + kdv - kdv*item.tevkifat_rate; })(),
      allocation_type: item.allocation_type,
      allocation_id: item.allocation_id || null
    }));

    const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert);
    
    if (itemsError) alert('Kalemler kaydedilirken hata oluştu: ' + itemsError.message);
    else {
      setView('list');
      fetchData();
      setNewInvoice({ invoice_no: '', customer_id: '', facility_id: '', date: new Date().toISOString().split('T')[0], description: '', islem_turu: 'Satış Faturası', fatura_tipi: 'Ticari', items: [] });
    }
  };

  if (view === 'detail' && detailInvoice) {
    const fmt = (n) => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const inv = detailInvoice;
    const isSatis = inv.islem_turu === 'Satış Faturası';
    const matrahTop = detailItems.reduce((a, it) => a + Number(it.quantity) * Number(it.unit_price), 0);
    const kdvTop    = detailItems.reduce((a, it) => a + Number(it.quantity) * Number(it.unit_price) * (it.vat_rate || 0) / 100, 0);
    const odenecek  = matrahTop + kdvTop;

    return (
      <div style={{ maxWidth: '1100px' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
          <button className="btn btn-ghost" onClick={() => { setView('list'); setDetailInvoice(null); setDetailItems([]); }}>
            <ArrowLeft size={20} /> Geri
          </button>
          <div>
            <h1 style={{ fontSize: '1.75rem' }}>Fatura Detayı</h1>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>{inv.invoice_no}</p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', padding: '0.3rem 0.9rem', borderRadius: '20px',
              background: isSatis ? '#dcfce7' : '#fee2e2', color: isSatis ? '#166534' : '#991b1b' }}>
              {isSatis ? '↑ Satış Faturası' : '↓ Alış Faturası'}
            </span>
          </div>
        </header>

        {/* Fatura Bilgileri */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            Fatura Bilgileri
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
            {[
              { label: 'Fatura No',    value: inv.invoice_no },
              { label: 'Cari / Ünvan', value: inv.customers?.name || '—' },
              { label: 'Tesis',        value: facilities.find(f => f.id === inv.facility_id)?.name || '—' },
              { label: 'Tarih',        value: inv.date ? new Date(inv.date).toLocaleDateString('tr-TR') : '—' },
              { label: 'Fatura Tipi',  value: inv.fatura_tipi || '—' },
            ].map(f => (
              <div key={f.label}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '600', marginBottom: '4px' }}>{f.label}</p>
                <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>{f.value}</p>
              </div>
            ))}
            {inv.description && (
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '600', marginBottom: '4px' }}>Açıklama</p>
                <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{inv.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Fatura Kalemleri */}
        <div className="card" style={{ padding: '0', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Fatura Kalemleri</p>
          </div>
          {detailLoading ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>Yükleniyor...</p>
          ) : detailItems.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>Kalem bulunamadı.</p>
          ) : (
            <table style={{ width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-main)' }}>
                  {['Ürün / Hizmet', 'Açıklama', 'Miktar', 'Birim Fiyat', 'KDV %', 'Matrah', 'KDV', 'KDV Dahil'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detailItems.map((it, idx) => {
                  const matrah = Number(it.quantity) * Number(it.unit_price);
                  const kdv    = matrah * (it.vat_rate || 0) / 100;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.88rem', display: 'block' }}>{it.materials?.name || '—'}</span>
                        {it.materials?.category && <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '2px' }}>{it.materials.category}</span>}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', display: 'block' }}>{it.description || '—'}</span>
                        {it.allocation_type === 'Araç'
                          ? <span style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: '600', display: 'block', marginTop: '3px' }}>Araç: {vehicles.find(v => v.id === it.allocation_id)?.plate || '?'}</span>
                          : <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '600', display: 'block', marginTop: '3px' }}>Depoya</span>
                        }
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem' }}>{it.quantity} {it.materials?.unit || ''}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem' }}>₺{fmt(it.unit_price)}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem' }}>%{it.vat_rate || 0}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem' }}>₺{fmt(matrah)}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem', color: '#f59e0b' }}>₺{fmt(kdv)}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: '800', fontSize: '0.95rem', color: isSatis ? '#16a34a' : '#dc2626' }}>₺{fmt(matrah + kdv)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Toplam */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '3rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '600', marginBottom: '4px' }}>KDV Hariç</p>
              <p style={{ fontWeight: '700', fontSize: '1.1rem' }}>₺{fmt(matrahTop)}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '600', marginBottom: '4px' }}>KDV Toplamı</p>
              <p style={{ fontWeight: '700', fontSize: '1.1rem' }}>₺{fmt(kdvTop)}</p>
            </div>
            <div style={{ paddingLeft: '2rem', borderLeft: '2px solid var(--border)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '600', marginBottom: '4px' }}>Ödenecek Tutar</p>
              <p style={{ fontWeight: '800', fontSize: '1.75rem', color: 'var(--primary)' }}>₺{fmt(odenecek)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'create') {
    const fmt = (n) => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const matrahTop = newInvoice.items.reduce((a, it) => a + Number(it.quantity) * Number(it.unit_price), 0);
    const kdvTop    = newInvoice.items.reduce((a, it) => a + Number(it.quantity) * Number(it.unit_price) * it.vat_rate / 100, 0);
    const tevkTop   = newInvoice.items.reduce((a, it) => a + Number(it.quantity) * Number(it.unit_price) * it.vat_rate / 100 * it.tevkifat_rate, 0);
    const odenecek  = matrahTop + kdvTop - tevkTop;

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

          <div className="grid grid-cols-3" style={{ gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="label-sm">Cari (Tedarikçi / Müşteri) *</label>
              <select className="input" value={newInvoice.customer_id} onChange={(e) => setNewInvoice({...newInvoice, customer_id: e.target.value})}>
                <option value="">— Cari Seçiniz —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="label-sm">Tesis *</label>
              <select className="input" value={newInvoice.facility_id} onChange={(e) => setNewInvoice({...newInvoice, facility_id: e.target.value})}
                style={!newInvoice.facility_id ? { borderColor: 'var(--border)' } : {}}>
                <option value="">— Tesis Seçiniz —</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
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
                const matrah      = Number(item.quantity) * Number(item.unit_price);
                const kdvTutar    = matrah * item.vat_rate / 100;
                const tevkTutar   = kdvTutar * item.tevkifat_rate;
                const kdvDahil    = matrah + kdvTutar - tevkTutar;
                const err = itemErrors[idx] || {};
                return (
                  <div key={item.id} style={{ padding: '1.5rem', background: 'var(--bg-main)', borderRadius: '12px', border: `1px solid ${Object.values(err).some(v=>v) ? '#ef4444' : 'var(--border)'}` }}>

                    {/* Satır 1: Hiyerarşik ürün seçimi */}
                    <div style={{ marginBottom: '1rem' }}>
                      <label className="label-sm" style={{ marginBottom: '0.4rem', display: 'block' }}>Ürün / Hizmet Seçimi *</label>
                      <SteppedSelect
                        value={item.material_id}
                        materials={materials}
                        hasError={!!err.material_id}
                        invoiceType={newInvoice.islem_turu}
                        onChange={(id) => { const ni = [...newInvoice.items]; ni[idx].material_id = id; setNewInvoice({...newInvoice, items: ni}); }}
                      />
                      {err.material_id && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>{err.material_id}</span>}
                    </div>

                    {/* Satır 2: Miktar + Birim Fiyat + Açıklama */}
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 160px 1fr', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label className="label-sm">İşlem Açıklaması</label>
                        <input className="input" placeholder="Opsiyonel açıklama..."
                          value={item.description || ''}
                          onChange={(e) => { const ni = [...newInvoice.items]; ni[idx].description = e.target.value; setNewInvoice({...newInvoice, items: ni}); }} />
                      </div>
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
                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.6rem', borderTop: '1px solid var(--border)', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                          KDV Hariç: <strong>₺{fmt(matrah)}</strong>
                        </span>
                        <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                          KDV: <strong>₺{fmt(kdvTutar)}</strong>
                        </span>
                        {tevkTutar > 0 && (
                          <span style={{ fontSize: '0.88rem', color: '#f59e0b', fontWeight: '600' }}>
                            Tevkifat: <strong>₺{fmt(tevkTutar)}</strong>
                          </span>
                        )}
                        <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--primary)', borderLeft: '2px solid var(--border)', paddingLeft: '1rem' }}>
                          KDV Dahil: ₺{fmt(kdvDahil)}
                        </span>
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
          <div style={{ flex: 1, display: 'flex', gap: '2.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.25rem', fontWeight: '600' }}>KDV Hariç</p>
              <p style={{ fontWeight: '700', fontSize: '1.05rem' }}>₺{fmt(matrahTop)}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.25rem', fontWeight: '600' }}>KDV Toplamı</p>
              <p style={{ fontWeight: '700', fontSize: '1.05rem' }}>₺{fmt(kdvTop)}</p>
            </div>
            {tevkTop > 0 && (
              <div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.25rem', fontWeight: '600' }}>Tevkifat</p>
                <p style={{ fontWeight: '700', fontSize: '1.05rem', color: '#f59e0b' }}>₺{fmt(tevkTop)}</p>
              </div>
            )}
            <div style={{ paddingLeft: '2rem', borderLeft: '2px solid var(--border)' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.25rem', fontWeight: '600' }}>Ödenecek Tutar</p>
              <p style={{ fontWeight: '800', fontSize: '1.5rem', color: 'var(--primary)' }}>₺{fmt(odenecek)}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>KDV Hariç + KDV{tevkTop > 0 ? ' - Tevkifat' : ''}</p>
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
        <button className="btn btn-primary" onClick={handleNewInvoice}>
          <Plus size={20} /> Yeni Fatura İşle
        </button>
      </header>

      {/* Filtre Paneli */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--bg-main)', border: '1.5px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label className="label-sm" style={{ marginBottom: '0.4rem', display: 'block' }}>Cari Seçimi</label>
            <select className="input" style={{ fontSize: '0.82rem' }} value={filters.customer_id} onChange={e => setFilters({...filters, customer_id: e.target.value})}>
              <option value="">Tüm Cariler</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-sm" style={{ marginBottom: '0.4rem', display: 'block' }}>Tesis</label>
            <select className="input" style={{ fontSize: '0.82rem' }} value={filters.facility_id} onChange={e => setFilters({...filters, facility_id: e.target.value})}>
              <option value="">Tüm Tesisler</option>
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-sm" style={{ marginBottom: '0.4rem', display: 'block' }}>Başlangıç</label>
            <input type="date" className="input" style={{ fontSize: '0.82rem' }} value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
          </div>
          <div>
            <label className="label-sm" style={{ marginBottom: '0.4rem', display: 'block' }}>Bitiş</label>
            <input type="date" className="input" style={{ fontSize: '0.82rem' }} value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
          </div>
          <div>
            <label className="label-sm" style={{ marginBottom: '0.4rem', display: 'block' }}>Tür</label>
            <select className="input" style={{ fontSize: '0.82rem' }} value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
              <option value="">Tümü</option>
              <option value="Satış Faturası">Satış</option>
              <option value="Alış Faturası">Alış</option>
            </select>
          </div>
          <button className="btn btn-ghost" style={{ padding: '0.65rem', fontSize: '0.78rem', color: 'var(--danger)' }} 
            onClick={() => setFilters({ customer_id: '', facility_id: '', startDate: '', endDate: '', type: '' })}>
            ❌ Filtreleri Temizle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <p className="text-muted">Bulunan Fatura</p>
          <h2 style={{ fontSize: '2rem' }}>{invoices.length}</h2>
        </div>
        <div className="card">
          <p className="text-muted">Toplam Tutar</p>
          <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>
            ₺{invoices.reduce((sum, i) => sum + (i.islem_turu === 'Satış Faturası' ? i.total_amount : -i.total_amount), 0).toLocaleString()}
          </h2>
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
                <tr key={i.id} onClick={() => handleOpenDetail(i)} style={{ borderBottom: '1px solid var(--bg-main)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
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

const SteppedSelect = ({ value, materials, onChange, hasError, invoiceType }) => {
  const isAlis = invoiceType === 'Alış Faturası';
  const selectedMat = materials.find(m => m.id === value);
  const [selCat, setSelCat] = useState(selectedMat?.category || '');

  useEffect(() => { setSelCat(''); }, [invoiceType]);

  const availableMats = selCat ? materials.filter(m => m.category === selCat) : [];
  const handleCat = (c) => { setSelCat(c); onChange(''); };

  const selStyle = (active) => ({
    fontSize: '0.82rem',
    borderColor: active ? 'var(--primary)' : undefined,
    background: active ? 'var(--primary-light)' : undefined,
    fontWeight: active ? '600' : undefined,
  });

  // Dinamik kategorileri materials listesinden çıkar ve sabitlerle birleştir
  const dynamicGiderCats = [...new Set(materials.filter(m => m.item_type === 'Gider').map(m => m.category).filter(Boolean))];
  const dynamicGelirCats = [...new Set(materials.filter(m => m.item_type === 'Gelir').map(m => m.category).filter(Boolean))];
  const dynamicMalzemeCats = [...new Set(materials.filter(m => m.item_type === 'Malzeme').map(m => m.category).filter(Boolean))];

  const finalGider = [...new Set([...GIDER_CARDS, ...dynamicGiderCats])];
  const finalGelir = [...new Set([...GELIR_CARDS, ...dynamicGelirCats])];
  const finalMalzeme = [...new Set([...MALZEME_CATS, ...dynamicMalzemeCats])];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      {/* Adım 1 — Kart / Kategori */}
      <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>1 · Kart / Kategori</span>
        <select className="input" style={selStyle(!!selCat)} value={selCat} onChange={e => handleCat(e.target.value)}>
          <option value="">Seçiniz...</option>
          {isAlis ? (
            <>
              <optgroup label="── Gider Kartları ──">
                {finalGider.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="── Malzeme Kategorileri ──">
                {finalMalzeme.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            </>
          ) : (
            <>
              <optgroup label="── Gelir Kartları ──">
                {finalGelir.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="── Malzeme Kategorileri ──">
                {finalMalzeme.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            </>
          )}
        </select>
      </div>

      <ChevronRight size={14} style={{ color: selCat ? 'var(--primary)' : 'var(--border)', flexShrink: 0, marginTop: '16px' }} />

      {/* Adım 2 — Ürün/Hizmet */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: '700', color: selCat ? 'var(--primary)' : 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2 · Ürün / Hizmet</span>
        <select className="input" style={{ ...(hasError ? { borderColor: '#ef4444' } : selStyle(!!value)) }} value={value} onChange={e => onChange(e.target.value)} disabled={!selCat}>
          <option value="">Seçiniz...</option>
          {availableMats.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
    </div>
  );
};

export default Invoices;
