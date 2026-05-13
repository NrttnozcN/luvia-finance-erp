import { useState, useEffect, useRef } from 'react';
import {
  FileText, Search, Upload, Download, Trash2,
  FolderOpen, FileImage, FileArchive, File, X, HardDrive,
  Calendar, User,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

const formatBytes = (b) => {
  if (!b || b === 0) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  const imgStyle = { borderRadius: '8px', padding: '0.4rem' };
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext))
    return <div style={{ ...imgStyle, background: '#dcfce7', color: '#16a34a' }}><FileImage size={20} /></div>;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext))
    return <div style={{ ...imgStyle, background: '#fef3c7', color: '#d97706' }}><FileArchive size={20} /></div>;
  if (['pdf'].includes(ext))
    return <div style={{ ...imgStyle, background: '#fee2e2', color: '#dc2626' }}><FileText size={20} /></div>;
  if (['xlsx', 'xls', 'csv'].includes(ext))
    return <div style={{ ...imgStyle, background: '#dcfce7', color: '#16a34a' }}><File size={20} /></div>;
  if (['docx', 'doc'].includes(ext))
    return <div style={{ ...imgStyle, background: '#e0f2fe', color: '#0284c7' }}><FileText size={20} /></div>;
  return <div style={{ ...imgStyle, background: 'var(--primary-light)', color: 'var(--primary)' }}><FileText size={20} /></div>;
};

const Documents = () => {
  const currentUser = useAuthStore(s => s.currentUser);
  const cid = currentUser?.company_id;

  const [docs, setDocs]           = useState([]);
  const [docCats, setDocCats]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch]       = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docForm, setDocForm]     = useState({ name: '', category_id: '' });
  const [dragOver, setDragOver]   = useState(false);
  const fileRef = useRef(null);

  const fetchDocs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('documents')
      .select('*, document_categories(name)')
      .eq('company_id', cid)
      .order('created_at', { ascending: false });
    setDocs(data || []);
    setLoading(false);
  };

  const fetchDocCats = async () => {
    if (!cid) return;
    const { data } = await supabase
      .from('document_categories')
      .select('*')
      .eq('company_id', cid)
      .order('name');
    setDocCats(data || []);
  };

  useEffect(() => {
    if (cid) { fetchDocs(); fetchDocCats(); }
    else setLoading(false);
  }, [cid]);

  const handleFileSelect = (file) => {
    if (!file) return;
    setSelectedFile(file);
    setDocForm(prev => ({ ...prev, name: prev.name || file.name.replace(/\.[^.]+$/, '') }));
  };

  const handleUpload = async () => {
    if (!selectedFile) { alert('Lütfen dosya seçin.'); return; }
    if (!docForm.name.trim()) { alert('Döküman adı zorunludur.'); return; }
    setUploading(true);

    const ext = selectedFile.name.split('.').pop();
    const path = `${cid}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: storageErr } = await supabase.storage
      .from('documents')
      .upload(path, selectedFile);

    if (storageErr) {
      alert('Dosya yükleme hatası: ' + storageErr.message);
      setUploading(false);
      return;
    }

    const { error: dbErr } = await supabase.from('documents').insert([{
      company_id:       cid,
      name:             docForm.name.trim(),
      original_name:    selectedFile.name,
      category_id:      docForm.category_id || null,
      file_path:        path,
      file_size:        selectedFile.size,
      uploaded_by_name: currentUser?.name,
    }]);

    if (dbErr) {
      alert('Kayıt hatası: ' + dbErr.message);
      await supabase.storage.from('documents').remove([path]);
      setUploading(false);
      return;
    }

    setUploading(false);
    setShowModal(false);
    setSelectedFile(null);
    setDocForm({ name: '', category_id: '' });
    fetchDocs();
  };

  const handleDownload = async (doc) => {
    if (!doc.file_path) { alert('Bu kayıt için dosya bulunamadı.'); return; }
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 3600);
    if (error) { alert('İndirme bağlantısı alınamadı.'); return; }
    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = doc.original_name || doc.name;
    a.click();
  };

  const handleDelete = async (doc) => {
    setDeleteTarget(null);
    if (doc.file_path) {
      await supabase.storage.from('documents').remove([doc.file_path]);
    }
    await supabase.from('documents').delete().eq('id', doc.id);
    fetchDocs();
  };

  const filteredDocs = docs.filter(d =>
    (!filterCat || d.category_id === filterCat) &&
    (!search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.original_name?.toLowerCase().includes(search.toLowerCase()))
  );

  const totalSize = docs.reduce((sum, d) => sum + (d.file_size || 0), 0);
  const thisMonth = docs.filter(d => new Date(d.created_at).getMonth() === new Date().getMonth()).length;

  return (
    <div>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Döküman & Arşiv</h1>
          <p className="text-muted">Sözleşmeler, muayene belgeleri ve şirket evraklarını yönetin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Upload size={18} /> Dosya Yükle
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <StatCard icon={<FileText size={20} />} label="Toplam Dosya" value={docs.length} color="var(--primary)" bg="var(--primary-light)" />
        <StatCard icon={<Upload size={20} />}   label="Bu Ay Yüklenen" value={thisMonth} color="#16a34a" bg="#dcfce7" />
        <StatCard icon={<FolderOpen size={20} />} label="Kategori" value={docCats.length} color="#7c3aed" bg="#ede9fe" />
        <StatCard icon={<HardDrive size={20} />}  label="Toplam Boyut" value={formatBytes(totalSize)} color="#d97706" bg="#fef3c7" />
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: '200px' }}>
          <Search size={16} className="text-dim" />
          <input type="text" placeholder="Dosya adında ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: '200px' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Tüm Kategoriler</option>
          {docCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(search || filterCat) && (
          <button className="btn btn-ghost" onClick={() => { setSearch(''); setFilterCat(''); }} style={{ fontSize: '0.82rem' }}>Temizle</button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '700', fontSize: '0.82rem', color: 'var(--text-dim)' }}>Dosya Adı</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '0.82rem', color: 'var(--text-dim)' }}>Kategori</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '0.82rem', color: 'var(--text-dim)' }}>Boyut</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '0.82rem', color: 'var(--text-dim)' }}>Yükleyen</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '0.82rem', color: 'var(--text-dim)' }}>Tarih</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '700', fontSize: '0.82rem', color: 'var(--text-dim)' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>Yükleniyor...</td></tr>
            ) : filteredDocs.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
                <FileText size={40} style={{ opacity: 0.2, display: 'block', margin: '0 auto 1rem' }} />
                {docs.length === 0 ? 'Henüz döküman yüklenmemiş.' : 'Filtreyle eşleşen döküman yok.'}
              </td></tr>
            ) : filteredDocs.map(doc => (
              <tr key={doc.id} style={{ borderBottom: '1px solid var(--bg-main)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {getFileIcon(doc.original_name || doc.name)}
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{doc.name}</p>
                      {doc.original_name && doc.original_name !== doc.name && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{doc.original_name}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  {doc.document_categories?.name
                    ? <span className="badge badge-primary">{doc.document_categories.name}</span>
                    : <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>—</span>}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>{formatBytes(doc.file_size)}</td>
                <td style={{ padding: '1rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <User size={13} /> {doc.uploaded_by_name || '—'}
                  </div>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Calendar size={13} /> {new Date(doc.created_at).toLocaleDateString('tr-TR')}
                  </div>
                </td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    {doc.file_path && (
                      <button className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => handleDownload(doc)}>
                        <Download size={14} /> İndir
                      </button>
                    )}
                    <button className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => setDeleteTarget(doc)}>
                      <Trash2 size={14} /> Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══ UPLOAD MODAL ═══════════════════════════════════════════════════════ */}
      {showModal && (
        <div style={overlayStyle} onClick={() => !uploading && setShowModal(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '2rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Dosya Yükle</h2>
              {!uploading && <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={22} /></button>}
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '12px', padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1.5rem', transition: 'all 0.2s',
                background: dragOver ? 'var(--primary-light)' : 'var(--bg-main)' }}>
              <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files[0])} />
              {selectedFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
                  {getFileIcon(selectedFile.name)}
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>{selectedFile.name}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{formatBytes(selectedFile.size)}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setSelectedFile(null); setDocForm(prev => ({ ...prev, name: '' })); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', marginLeft: 'auto' }}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={32} style={{ color: 'var(--primary)', marginBottom: '0.75rem' }} />
                  <p style={{ fontWeight: '700', marginBottom: '0.25rem' }}>Dosyayı sürükleyin veya tıklayın</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>PDF, Word, Excel, resim ve diğer formatlar</p>
                </>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>Döküman Adı *</label>
                <input className="input" placeholder="Dökümanı tanımlayan bir ad girin" value={docForm.name} onChange={e => setDocForm({ ...docForm, name: e.target.value })} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>Kategori</label>
                <select className="input" value={docForm.category_id} onChange={e => setDocForm({ ...docForm, category_id: e.target.value })}>
                  <option value="">Kategori seçin (isteğe bağlı)</option>
                  {docCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {docCats.length === 0 && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Tanımlamalar &gt; Doküman Kategorileri'nden kategori ekleyebilirsiniz.
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }} disabled={uploading}>İptal</button>
              <button className="btn btn-primary" onClick={handleUpload} style={{ flex: 2 }} disabled={uploading || !selectedFile}>
                {uploading ? 'Yükleniyor...' : <><Upload size={16} /> Yükle & Kaydet</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SİLME ONAY MODAL ═══════════════════════════════════════════════════ */}
      {deleteTarget && (
        <div style={overlayStyle}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--danger)' }}>
              <Trash2 size={28} />
            </div>
            <h2 style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>Dökümanı Sil</h2>
            <p className="text-muted" style={{ marginBottom: '0.5rem' }}>
              <strong>{deleteTarget.name}</strong> silinsin mi?
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--danger)', marginBottom: '2rem' }}>
              Dosya Storage'dan da kalıcı olarak silinir.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} style={{ flex: 1 }}>Vazgeç</button>
              <button className="btn" onClick={() => handleDelete(deleteTarget)} style={{ flex: 1, background: 'var(--danger)', color: 'white' }}>Evet, Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, color, bg }) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '2px' }}>{label}</p>
      <p style={{ fontWeight: '800', fontSize: '1.2rem' }}>{value}</p>
    </div>
  </div>
);

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };

export default Documents;
