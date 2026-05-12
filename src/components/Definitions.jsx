import React, { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  Search,
  Trash2,
  Edit2,
  ChevronRight,
  Tag,
  Layers,
  Package,
  MapPin,
  Wallet,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Definitions = () => {
  const [activeTab, setActiveTab] = useState('materials');
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'Gider', unit: 'Adet' });

  // Kasalar
  const [kasalar, setKasalar] = useState([]);
  const [showKasaModal, setShowKasaModal] = useState(false);
  const [newKasa, setNewKasa] = useState({ name: '', type: 'Kasa' });

  const fetchMaterials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('name', { ascending: true });

    if (error) console.error(error);
    else setMaterials(data || []);
    setLoading(false);
  };

  const fetchKasalar = async () => {
    const { data } = await supabase.from('kasalar').select('*').order('name');
    setKasalar(data || []);
  };

  const handleSaveKasa = async () => {
    if (!newKasa.name.trim()) { alert('Kasa adı zorunludur.'); return; }
    const { error } = await supabase.from('kasalar').insert([{ name: newKasa.name.trim(), type: newKasa.type }]);
    if (error) { alert(error.message); return; }
    setShowKasaModal(false);
    setNewKasa({ name: '', type: 'Kasa' });
    fetchKasalar();
  };

  const deleteKasa = async (id) => {
    if (!window.confirm('Bu kasayı silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('kasalar').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchKasalar();
  };

  useEffect(() => {
    fetchMaterials();
    fetchKasalar();
  }, []);

  const handleSave = async () => {
    const { error } = await supabase
      .from('materials')
      .insert([newItem]);

    if (error) alert(error.message);
    else {
      setShowAddModal(false);
      fetchMaterials();
      setNewItem({ name: '', category: 'Gider', unit: 'Adet' });
    }
  };

  const deleteMaterial = async (id) => {
    if (window.confirm('Bu kartı silmek istediğinize emin misiniz?')) {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) alert(error.message);
      else fetchMaterials();
    }
  };

  return (
    <div className="definitions-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Sistem Tanımlamaları</h1>
          <p className="text-muted">Gider kartları, malzeme kategorileri ve sabit tanımları yönetin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => activeTab === 'kasalar' ? setShowKasaModal(true) : setShowAddModal(true)}>
          <Plus size={20} /> {activeTab === 'kasalar' ? 'Yeni Kasa Ekle' : 'Yeni Tanım Ekle'}
        </button>
      </header>

      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* Sidebar Tabs */}
        <div style={{ width: '280px', flexShrink: 0 }}>
          <div className="card" style={{ padding: '0.75rem' }}>
            <TabButton active={activeTab === 'materials'} onClick={() => setActiveTab('materials')} icon={<Tag size={18} />} label="Gider & Malzeme Kartları" />
            <TabButton active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={<Layers size={18} />} label="Kategoriler" />
            <TabButton active={activeTab === 'warehouses'} onClick={() => setActiveTab('warehouses')} icon={<MapPin size={18} />} label="Depo & Şube Tanımları" />
            <TabButton active={activeTab === 'kasalar'} onClick={() => setActiveTab('kasalar')} icon={<Wallet size={18} />} label="Kasalar & Hesaplar" />
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>{activeTab === 'materials' ? 'Malzeme Listesi' : activeTab === 'kasalar' ? 'Kasalar & Hesaplar' : 'Tanımlamalar'}</h2>
              <div className="search-box" style={{ width: '300px' }}>
                <Search size={18} className="text-dim" />
                <input type="text" placeholder="Tanımlarda ara..." />
              </div>
            </div>

            {activeTab === 'kasalar' ? (
              kasalar.length === 0 ? (
                <p className="text-dim" style={{ textAlign: 'center', padding: '3rem' }}>Henüz kasa/hesap tanımı yok.</p>
              ) : (
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ paddingBottom: '1rem' }}>Kasa / Hesap Adı</th>
                      <th style={{ paddingBottom: '1rem' }}>Tür</th>
                      <th style={{ paddingBottom: '1rem', textAlign: 'right' }}>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kasalar.map(k => (
                      <tr key={k.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                        <td style={{ padding: '1rem 0', fontWeight: '700' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Wallet size={16} style={{ color: 'var(--primary)' }} />
                            {k.name}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '20px',
                            background: k.type === 'Banka' ? '#e0f2fe' : '#fef3c7',
                            color: k.type === 'Banka' ? '#075985' : '#92400e' }}>
                            {k.type}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-ghost" style={{ padding: '0.5rem', color: 'var(--danger)' }} onClick={() => deleteKasa(k.id)}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : loading ? (
              <p style={{ textAlign: 'center', padding: '2rem' }}>Yükleniyor...</p>
            ) : (
              <table style={{ width: '100%' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ paddingBottom: '1rem' }}>Tanım Adı</th>
                    <th style={{ paddingBottom: '1rem' }}>Kategori</th>
                    <th style={{ paddingBottom: '1rem' }}>Birim</th>
                    <th style={{ paddingBottom: '1rem', textAlign: 'right' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                      <td style={{ padding: '1rem 0', fontWeight: '600' }}>{m.name}</td>
                      <td><span className="badge badge-primary">{m.category}</span></td>
                      <td className="text-dim">{m.unit}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost" style={{ padding: '0.5rem' }}><Edit2 size={16} /></button>
                          <button className="btn btn-ghost" style={{ padding: '0.5rem', color: 'var(--danger)' }} onClick={() => deleteMaterial(m.id)}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* KASA EKLE MODAL */}
      {showKasaModal && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Yeni Kasa / Hesap</h2>
              <button onClick={() => setShowKasaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>Kasa / Hesap Adı</label>
                <input className="input" placeholder="Örn: Merkez Kasa, Garanti Bankası" value={newKasa.name} onChange={e => setNewKasa({ ...newKasa, name: e.target.value })} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>Tür</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {['Kasa', 'Banka'].map(t => (
                    <button key={t} type="button" onClick={() => setNewKasa({ ...newKasa, type: t })}
                      style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', border: '1.5px solid',
                        background: newKasa.type === t ? 'var(--primary)' : 'transparent',
                        color: newKasa.type === t ? 'white' : 'var(--text-muted)',
                        borderColor: newKasa.type === t ? 'var(--primary)' : 'var(--border)' }}>
                      {t === 'Kasa' ? '💵 Kasa' : '🏦 Banka'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowKasaModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveKasa}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Yeni Malzeme / Gider Tanımı</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>Tanım Adı</label>
                <input className="input" placeholder="Örn: Motor Yağı 10W-40" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>Kategori</label>
                <select className="input" value={newItem.category} onChange={(e) => setNewItem({...newItem, category: e.target.value})}>
                  <option>Gider</option>
                  <option>Yedek Parça</option>
                  <option>Akaryakıt</option>
                  <option>Hizmet</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>Birim</label>
                <select className="input" value={newItem.unit} onChange={(e) => setNewItem({...newItem, unit: e.target.value})}>
                  <option>Adet</option>
                  <option>Litre</option>
                  <option>Kg</option>
                  <option>Saat</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      width: '100%',
      padding: '1rem',
      border: 'none',
      background: active ? 'var(--primary-light)' : 'transparent',
      color: active ? 'var(--primary)' : 'var(--text-dim)',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: active ? '700' : '500',
      transition: 'all 0.2s'
    }}
  >
    {icon}
    {label}
    <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: active ? 1 : 0 }} />
  </button>
);

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modalContentStyle = { width: '100%', maxWidth: '500px', padding: '2rem' };

export default Definitions;
