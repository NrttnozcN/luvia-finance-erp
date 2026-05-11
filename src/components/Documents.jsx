import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Upload, 
  Filter, 
  MoreVertical, 
  ChevronRight, 
  File,
  X,
  FileArchive,
  FileImage,
  Clock,
  Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Documents = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);
  const [newDoc, setNewDoc] = useState({ name: '', category: 'Araç' });

  const fetchDocs = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    else setDocs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleSave = async () => {
    const { error } = await supabase.from('documents').insert([newDoc]);
    if (error) alert(error.message);
    else {
      setShowAddModal(false);
      fetchDocs();
      setNewDoc({ name: '', category: 'Araç' });
    }
  };

  return (
    <div className="documents-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Döküman & Arşiv</h1>
          <p className="text-muted">Sözleşmeler, muayene belgeleri ve şirket evraklarını dijital olarak saklayın.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} /> Yeni Döküman Yükle
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <p className="text-muted">Toplam Dosya</p>
          <h2 style={{ fontSize: '1.75rem' }}>{docs.length}</h2>
        </div>
        <div className="card">
          <p className="text-muted">Bu Ay Yüklenen</p>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--primary)' }}>{docs.filter(d => new Date(d.created_at).getMonth() === new Date().getMonth()).length}</h2>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.25rem' }}>Döküman Adı</th>
              <th>Kategori</th>
              <th>Yükleme Tarihi</th>
              <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem' }}>Yükleniyor...</td></tr>
            ) : docs.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem' }}>Henüz döküman kaydı bulunmuyor.</td></tr>
            ) : (
              docs.map(doc => (
                <tr key={doc.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ color: 'var(--primary)' }}><FileText size={20} /></div>
                      <span style={{ fontWeight: '600' }}>{doc.name}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-primary">{doc.category}</span></td>
                  <td className="text-dim" style={{ fontSize: '0.9rem' }}>{new Date(doc.created_at).toLocaleDateString('tr-TR')}</td>
                  <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost" style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                      <button className="btn btn-ghost"><MoreVertical size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* NEW DOC MODAL */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div className="card" style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}><Upload size={20} /></div>
                <h2 style={{ fontSize: '1.25rem' }}>Döküman Kaydı Ekle</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Döküman Adı</label>
                <input className="input" placeholder="Örn: 34 LUV 001 Muayene Belgesi" value={newDoc.name} onChange={(e) => setNewDoc({...newDoc, name: e.target.value})} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="label-sm">Döküman Kategorisi</label>
                <select className="input" value={newDoc.category} onChange={(e) => setNewDoc({...newDoc, category: e.target.value})}>
                  <option>Araç</option>
                  <option>Personel</option>
                  <option>Sözleşme</option>
                  <option>Muhasebe</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Kaydı Tamamla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modalContentStyle = { width: '100%', maxWidth: '500px', padding: '2rem' };

export default Documents;
