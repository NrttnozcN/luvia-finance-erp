import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FileText, Upload, Search, Folder, File, MoreVertical, Download, Trash2, X, Clock } from 'lucide-react';
import useStore from '../store/useStore';
import { formatDate, today } from '../utils/formatters';

const INITIAL_DOCS = [
  { id: 'doc1', name: '34 LUV 001 - Ruhsat.pdf', category: 'Araç', date: '2026-05-08', size: '1.2 MB' },
  { id: 'doc2', name: 'Kira Sözleşmesi 2026.pdf', category: 'Sözleşme', date: '2026-05-05', size: '3.4 MB' },
  { id: 'doc3', name: '06 ERP 99 - Sigorta Poliçesi.pdf', category: 'Araç', date: '2026-04-20', size: '0.8 MB' },
];

const CATEGORIES = ['Araç', 'Personel', 'Sözleşme', 'Muhasebe', 'Diğer'];

const Documents = () => {
  const vehicles = useStore(s => s.vehicles);
  const personnel = useStore(s => s.personnel);
  const [docs, setDocs] = useState(INITIAL_DOCS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Tümü');

  const counts = {
    'Araç': docs.filter(d => d.category === 'Araç').length,
    'Personel': docs.filter(d => d.category === 'Personel').length,
    'Sözleşme': docs.filter(d => d.category === 'Sözleşme').length,
    'Muhasebe': docs.filter(d => d.category === 'Muhasebe').length,
  };

  const visible = docs.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'Tümü' || d.category === catFilter;
    return matchSearch && matchCat;
  });

  const handleDelete = (id) => {
    setDocs(d => d.filter(doc => doc.id !== id));
    toast.success('Döküman silindi');
  };

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Döküman Yönetimi</h1>
          <p className="text-muted">Kurumsal dökümanlarınızı, sözleşmelerinizi ve dijital arşivinizi yönetin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Upload size={20} /> Yeni Döküman Yükle
        </button>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <FolderCard title="Araç Dökümanları" count={`${counts['Araç']} Dosya`} color="var(--primary)" active={catFilter === 'Araç'} onClick={() => setCatFilter(catFilter === 'Araç' ? 'Tümü' : 'Araç')} />
        <FolderCard title="Personel Dosyaları" count={`${counts['Personel']} Dosya`} color="var(--success)" active={catFilter === 'Personel'} onClick={() => setCatFilter(catFilter === 'Personel' ? 'Tümü' : 'Personel')} />
        <FolderCard title="Sözleşmeler" count={`${counts['Sözleşme']} Dosya`} color="var(--warning)" active={catFilter === 'Sözleşme'} onClick={() => setCatFilter(catFilter === 'Sözleşme' ? 'Tümü' : 'Sözleşme')} />
        <FolderCard title="Muhasebe / Fatura" count={`${counts['Muhasebe']} Dosya`} color="var(--text-dim)" active={catFilter === 'Muhasebe'} onClick={() => setCatFilter(catFilter === 'Muhasebe' ? 'Tümü' : 'Muhasebe')} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Tüm Dökümanlar ({visible.length})</h3>
            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-main)', padding: '0.45rem 0.85rem', borderRadius: '8px', alignItems: 'center' }}>
              <Search size={14} className="text-dim" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ara..." style={{ background: 'transparent', border: 'none', fontSize: '0.82rem', outline: 'none', width: '140px' }} />
            </div>
          </div>
          {visible.length === 0 ? (
            <p className="text-dim" style={{ textAlign: 'center', padding: '2rem 0' }}>Döküman bulunamadı</p>
          ) : (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Döküman Adı</th>
                  <th>Kategori</th>
                  <th>Tarih</th>
                  <th>Boyut</th>
                  <th style={{ textAlign: 'right' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(doc => (
                  <tr key={doc.id}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FileText size={16} className="text-dim" />
                        <span style={{ fontWeight: '600', fontSize: '0.88rem' }}>{doc.name}</span>
                      </div>
                    </td>
                    <td><span className="badge" style={{ background: 'var(--bg-main)' }}>{doc.category}</span></td>
                    <td className="text-dim" style={{ fontSize: '0.82rem' }}>{formatDate(doc.date)}</td>
                    <td className="text-dim" style={{ fontSize: '0.82rem' }}>{doc.size}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost" style={{ padding: '0.3rem' }} onClick={() => toast.success('İndiriliyor...')}><Download size={14} /></button>
                        <button className="btn btn-ghost" style={{ padding: '0.3rem' }} onClick={() => handleDelete(doc.id)}><Trash2 size={14} style={{ color: 'var(--danger)' }} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} style={{ color: 'var(--primary)' }} /> Son İşlemler
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {docs.slice(0, 5).map(doc => (
              <div key={doc.id} style={{ padding: '0.85rem 1rem', background: 'var(--bg-main)', borderRadius: '12px' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: '700' }}>{doc.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>{doc.category} · {formatDate(doc.date)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div style={overlayStyle}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Yeni Döküman Yükle</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ border: '2px dashed var(--border)', padding: '3rem', textAlign: 'center', borderRadius: '15px', marginBottom: '1.5rem', cursor: 'pointer' }}
              onClick={() => toast('Dosya seçici yakında açılacak', { icon: '📁' })}>
              <Upload size={48} className="text-dim" style={{ marginBottom: '1rem' }} />
              <p style={{ fontWeight: '700' }}>Dosyayı sürükleyin veya seçin</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>PDF, JPG, PNG (Max 10MB)</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Kategori</label>
                <select className="input" style={{ width: '100%' }}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>İptal</button>
                <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => { toast.success('Döküman yüklendi'); setShowAddModal(false); }}>Yüklemeyi Başlat</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FolderCard = ({ title, count, color, active, onClick }) => (
  <div className="card" style={{ cursor: 'pointer', border: active ? `2px solid ${color}` : undefined, transition: 'all 0.2s' }} onClick={onClick}>
    <div style={{ color, marginBottom: '0.75rem' }}><Folder size={24} /></div>
    <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{title}</h4>
    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{count}</p>
  </div>
);

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };

export default Documents;
