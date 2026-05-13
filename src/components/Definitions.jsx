import { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Trash2, Edit2, ChevronRight,
  Package, Wallet, X, Shield, Users, FolderOpen,
  Eye, EyeOff, Pencil, CheckSquare, Square,
  DollarSign, Upload, FileSpreadsheet,
} from 'lucide-react';
// xlsx dinamik import — yalnızca kullanıldığında yüklenir
const getXLSX = () => import('xlsx');
import { supabase } from '../lib/supabase';
import useAuthStore, { MODULE_MATRIX, MODULE_LABELS } from '../store/authStore';

// ─── Sabit Kategoriler ───────────────────────────────────────────────────────
const GIDER_CARDS   = ['Araç ve İş Makinesi Giderleri', 'Akaryakıt Giderleri', 'Büro Malzemesi Giderleri', 'Yemek ve Gıda Giderleri', 'Tesis Giderleri', 'Personel Giderleri', 'Diğer Giderler'];
const GELIR_CARDS   = ['Hakediş Geliri', 'Ürün Satış Geliri', 'Hizmet Satış Geliri', 'Diğer Gelirler'];
const MALZEME_CATS  = ['Yedek Parça', 'Akaryakıt', 'Yağ & Filtre', 'Lastik', 'Büro Malzemesi', 'Gıda', 'Hizmet', 'Diğer'];
const UNITS         = ['Adet', 'Litre', 'Kg', 'Saat', 'Metre', 'Kutu', 'Gün'];

const CARD_META = {
  'Araç ve İş Makinesi Giderleri': { color: '#3b82f6', bg: '#eff6ff',  emoji: '🚗' },
  'Akaryakıt Giderleri':           { color: '#f97316', bg: '#fff7ed',  emoji: '⛽' },
  'Büro Malzemesi Giderleri':      { color: '#8b5cf6', bg: '#f5f3ff',  emoji: '📎' },
  'Yemek ve Gıda Giderleri':       { color: '#ec4899', bg: '#fdf2f8',  emoji: '🍽️' },
  'Tesis Giderleri':               { color: '#06b6d4', bg: '#ecfeff',  emoji: '🏢' },
  'Personel Giderleri':            { color: '#16a34a', bg: '#f0fdf4',  emoji: '👥' },
  'Diğer Giderler':                { color: '#64748b', bg: '#f8fafc',  emoji: '📦' },
  'Hakediş Geliri':                { color: '#16a34a', bg: '#f0fdf4',  emoji: '💰' },
  'Ürün Satış Geliri':             { color: '#f59e0b', bg: '#fffbeb',  emoji: '🛒' },
  'Hizmet Satış Geliri':           { color: '#3b82f6', bg: '#eff6ff',  emoji: '⚙️' },
  'Diğer Gelirler':                { color: '#64748b', bg: '#f8fafc',  emoji: '📊' },
  'Yedek Parça':   { color: '#3b82f6', bg: '#eff6ff', emoji: '🔧' },
  'Akaryakıt':     { color: '#f97316', bg: '#fff7ed', emoji: '⛽' },
  'Yağ & Filtre':  { color: '#8b5cf6', bg: '#f5f3ff', emoji: '🛢️' },
  'Lastik':        { color: '#64748b', bg: '#f8fafc', emoji: '⭕' },
  'Büro Malzemesi':{ color: '#06b6d4', bg: '#ecfeff', emoji: '📎' },
  'Gıda':          { color: '#ec4899', bg: '#fdf2f8', emoji: '🥤' },
  'Hizmet':        { color: '#16a34a', bg: '#f0fdf4', emoji: '⚙️' },
  'Diğer':         { color: '#64748b', bg: '#f8fafc', emoji: '📦' },
};

const Definitions = () => {
  const currentUser = useAuthStore(s => s.currentUser);
  const cid = currentUser?.company_id;

  const [activeTab, setActiveTab] = useState('gider');
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');

  // Hiyerarşik navigasyon
  const [drillCard, setDrillCard] = useState(null); // account_card (gider) veya category (malzeme)
  const [drillCat,  setDrillCat]  = useState(null); // category (yalnızca gider 2. seviye)

  const [materials, setMaterials]         = useState([]);
  const [showMatModal, setShowMatModal]   = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkPreview, setBulkPreview]     = useState([]);
  const [bulkFileName, setBulkFileName]   = useState('');
  const fileInputRef                      = useRef(null);
  const [matForm, setMatForm]             = useState({ name: '', category: 'Gider', unit: 'Adet', item_type: 'Gider' });
  const [editMaterial, setEditMaterial]   = useState(null);

  // ── Kasalar ──
  const [kasalar, setKasalar]           = useState([]);
  const [showKasaModal, setShowKasaModal] = useState(false);
  const [kasaForm, setKasaForm]         = useState({ name: '', type: 'Kasa' });

  // ── Users ──
  const [users, setUsers]             = useState([]);
  const [roles, setRoles]             = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPass, setShowPass]       = useState(false);
  const [showEditPass, setShowEditPass] = useState(false);
  const [userForm, setUserForm]       = useState({ full_name: '', username: '', email: '', password: '', roleType: 'admin' });
  const [editUser, setEditUser]       = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── Roles ──
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editRole, setEditRole]           = useState(null);
  const [roleForm, setRoleForm]           = useState({ name: '', permissions: [] });

  // ── Document Categories ──
  const [docCats, setDocCats]               = useState([]);
  const [showDocCatModal, setShowDocCatModal] = useState(false);
  const [docCatForm, setDocCatForm]         = useState({ name: '' });

  // ─── Fetch helpers ───────────────────────────────────────────────────────────
  const fetchMaterials = async (type) => {
    setLoading(true);
    const { data } = await supabase
      .from('materials')
      .select('*')
      .eq('company_id', cid)
      .eq('item_type', type)
      .order('name');
    setMaterials(data || []);
    setLoading(false);
  };

  const fetchKasalar = async () => {
    const { data } = await supabase.from('kasalar').select('*').order('name');
    setKasalar(data || []);
  };

  const fetchUsers = async () => {
    if (!cid) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', cid)
      .order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  const fetchRoles = async () => {
    if (!cid) return;
    const { data } = await supabase
      .from('roles')
      .select('*')
      .eq('company_id', cid)
      .order('name');
    setRoles(data || []);
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
    setDrillCard(null);
    setDrillCat(null);
    setSearch('');
    if (activeTab === 'gider')         fetchMaterials('Gider');
    else if (activeTab === 'malzeme')  fetchMaterials('Malzeme');
    else if (activeTab === 'kasalar')  fetchKasalar();
    else if (activeTab === 'users')    { fetchUsers(); fetchRoles(); }
    else if (activeTab === 'roles')    { fetchRoles(); }
    else if (activeTab === 'doc_cats') fetchDocCats();
    
    console.log('Definitions - Active Tab:', activeTab, 'Company ID:', cid);
  }, [activeTab, cid]);

  useEffect(() => {
    if (materials.length > 0) {
      console.log('Definitions - Materials Loaded:', materials.length);
    }
  }, [materials]);

  // ─── Material CRUD ───────────────────────────────────────────────────────────
  const handleSaveMaterial = async () => {
    if (!matForm.name.trim()) { alert('Tanım adı zorunludur.'); return; }
    let error;
    if (editMaterial) {
      ({ error } = await supabase.from('materials').update({ ...matForm }).eq('id', editMaterial.id));
    } else {
      ({ error } = await supabase.from('materials').insert([{ ...matForm, company_id: cid }]));
    }
    if (error) { alert(error.message); return; }
    setShowMatModal(false);
    setEditMaterial(null);
    setMatForm({ name: '', account_card: '', category: 'Diğer', unit: 'Adet', item_type: activeTab === 'gider' ? 'Gider' : 'Malzeme' });
    fetchMaterials(activeTab === 'gider' ? 'Gider' : 'Malzeme');
  };

  const handleEditMaterial = (m) => {
    setEditMaterial(m);
    setMatForm({ name: m.name, unit: m.unit, item_type: m.item_type, account_card: m.account_card || '', category: m.category || '' });
    setShowMatModal(true);
  };

  const handleExcelFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBulkFileName(file.name);
    const XLSX = await getXLSX();
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const isHeader = rows[0] && String(rows[0][0]).toLowerCase().includes('ad');
    const dataRows = isHeader ? rows.slice(1) : rows;
    const items = dataRows
      .filter(r => String(r[0] || '').trim())
      .map(r => ({
        name:       String(r[0] || '').trim(),
        category:   String(r[1] || '').trim() || (activeTab === 'gider' ? 'Gider' : 'Yedek Parça'),
        unit:       String(r[2] || '').trim() || 'Adet',
        item_type:  activeTab === 'gider' ? 'Gider' : 'Malzeme',
        company_id: cid,
      }));
    setBulkPreview(items);
  };

  const handleBulkMaterialUpload = async () => {
    if (bulkPreview.length === 0) { alert('Önce bir Excel dosyası seçin.'); return; }
    setLoading(true);
    const { error } = await supabase.from('materials').insert(bulkPreview);
    if (error) {
      alert('Toplu yükleme hatası: ' + error.message);
    } else {
      setShowBulkModal(false);
      setBulkPreview([]);
      setBulkFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchMaterials(activeTab === 'gider' ? 'Gider' : 'Malzeme');
    }
    setLoading(false);
  };

  const downloadSampleExcel = async () => {
    const XLSX = await getXLSX();
    const isGider = activeTab === 'gider';
    const wb = XLSX.utils.book_new();
    const data = [
      ['Malzeme Adı', 'Kategori', 'Birim'],
      isGider
        ? ['Ofis Kırtasiyesi', 'Kırtasiye', 'Adet']
        : ['Fren Balatası', 'Yedek Parça', 'Adet'],
      isGider
        ? ['Yemek Gideri', 'İkram', 'Adet']
        : ['Motor Yağı 15W40', 'Yağ & Filtre', 'Litre'],
      isGider
        ? ['Akaryakıt', 'Gider', 'Litre']
        : ['Lastik 315/80R22', 'Lastik', 'Adet'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Malzemeler');
    XLSX.writeFile(wb, `ornek_${isGider ? 'gider' : 'malzeme'}_listesi.xlsx`);
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm('Bu kartı silmek istediğinizden emin misiniz?')) return;
    await supabase.from('materials').delete().eq('id', id);
    fetchMaterials(activeTab === 'gider' ? 'Gider' : 'Malzeme');
  };

  // ─── Kasa CRUD ───────────────────────────────────────────────────────────────
  const handleSaveKasa = async () => {
    if (!kasaForm.name.trim()) { alert('Kasa adı zorunludur.'); return; }
    const { error } = await supabase.from('kasalar').insert([{ ...kasaForm }]);
    if (error) { alert(error.message); return; }
    setShowKasaModal(false);
    setKasaForm({ name: '', type: 'Kasa' });
    fetchKasalar();
  };

  const handleDeleteKasa = async (id) => {
    if (!window.confirm('Bu kasayı silmek istediğinizden emin misiniz?')) return;
    await supabase.from('kasalar').delete().eq('id', id);
    fetchKasalar();
  };

  // ─── User CRUD ───────────────────────────────────────────────────────────────
  const resolveRoleFields = (roleType) => {
    if (roleType === 'admin') return { role: 'Admin', role_id: null };
    const r = roles.find(r => r.id === roleType);
    return { role: r?.name || 'Kullanıcı', role_id: roleType };
  };

  const handleAddUser = async () => {
    const fn = userForm.full_name.trim();
    const un = userForm.username.trim();
    const em = userForm.email.trim();
    const pw = userForm.password.trim();
    if (!fn || !un || !em || !pw) { alert('Tüm alanlar zorunludur.'); return; }
    const { role, role_id } = resolveRoleFields(userForm.roleType);
    const { error } = await supabase.from('profiles').insert([{
      full_name: fn, username: un, email: em, password: pw,
      role, role_id, company_id: cid,
    }]);
    if (error) { alert('Kayıt başarısız: ' + error.message); return; }
    setShowUserModal(false);
    setUserForm({ full_name: '', username: '', email: '', password: '', roleType: 'admin' });
    fetchUsers();
    alert(`Kullanıcı oluşturuldu!\nKullanıcı Adı: ${un}\nŞifre: ${pw}`);
  };

  const handleEditUser = async () => {
    if (!editUser.full_name || !editUser.email) { alert('Ad Soyad ve E-Posta zorunludur.'); return; }
    const { role, role_id } = resolveRoleFields(editUser.roleType);
    const updates = { full_name: editUser.full_name, username: editUser.username, email: editUser.email, role, role_id };
    if (editUser.password) updates.password = editUser.password;
    await supabase.from('profiles').update(updates).eq('id', editUser.id);
    setEditUser(null);
    fetchUsers();
  };

  const handleDeleteUser = async () => {
    await supabase.from('profiles').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    fetchUsers();
  };

  const openEditUser = (u) => {
    const roleType = u.role_id ? u.role_id : 'admin';
    setEditUser({ id: u.id, full_name: u.full_name, username: u.username || '', email: u.email, password: '', roleType });
    setShowEditPass(false);
  };

  // ─── Role CRUD ───────────────────────────────────────────────────────────────
  const togglePerm = (modId) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(modId)
        ? prev.permissions.filter(p => p !== modId)
        : [...prev.permissions, modId],
    }));
  };

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) { alert('Rol adı zorunludur.'); return; }
    if (editRole) {
      await supabase.from('roles').update({ name: roleForm.name, permissions: roleForm.permissions }).eq('id', editRole.id);
    } else {
      await supabase.from('roles').insert([{ name: roleForm.name, permissions: roleForm.permissions, company_id: cid }]);
    }
    setShowRoleModal(false);
    setEditRole(null);
    setRoleForm({ name: '', permissions: [] });
    fetchRoles();
  };

  const openEditRole = (r) => {
    setEditRole(r);
    setRoleForm({ name: r.name, permissions: Array.isArray(r.permissions) ? r.permissions : [] });
    setShowRoleModal(true);
  };

  const handleDeleteRole = async (id) => {
    if (!window.confirm('Bu rolü silmek istediğinizden emin misiniz?')) return;
    await supabase.from('roles').delete().eq('id', id);
    fetchRoles();
  };

  // ─── Doc Category CRUD ───────────────────────────────────────────────────────
  const handleSaveDocCat = async () => {
    if (!docCatForm.name.trim()) { alert('Kategori adı zorunludur.'); return; }
    await supabase.from('document_categories').insert([{ name: docCatForm.name.trim(), company_id: cid }]);
    setShowDocCatModal(false);
    setDocCatForm({ name: '' });
    fetchDocCats();
  };

  const handleDeleteDocCat = async (id) => {
    if (!window.confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return;
    await supabase.from('document_categories').delete().eq('id', id);
    fetchDocCats();
  };

  // ─── Header button ───────────────────────────────────────────────────────────
  // ─── Header button (Global & Serbest Kayıt) ───
  const handleAddClick = () => {
    if (activeTab === 'gider' || activeTab === 'malzeme') {
      const isGider = activeTab === 'gider';
      setMatForm({
        name: '', unit: 'Adet', 
        item_type: isGider ? 'Gider' : 'Malzeme',
        account_card: '', category: '',
      });
      setShowMatModal(true);
    } else if (activeTab === 'kasalar') {
      setKasaForm({ name: '', type: 'Kasa' });
      setShowKasaModal(true);
    } else if (activeTab === 'users') {
      setUserForm({ full_name: '', username: '', email: '', password: '', roleType: 'admin' });
      setEditUser(null);
      setShowUserModal(true);
    } else if (activeTab === 'roles') {
      setEditRole(null);
      setRoleForm({ name: '', permissions: [] });
      setShowRoleModal(true);
    } else if (activeTab === 'doc_cats') {
      setDocCatForm({ name: '' });
      setShowDocCatModal(true);
    }
  };

  // ─── Grid/Contextual button (Klasör İçinden Hızlı Kayıt) ───
  const handleOpenAddModal = () => {
    setMatForm({
      name: '', 
      unit: 'Adet', 
      item_type: activeTab === 'gider' ? 'Gider' : 'Malzeme',
      account_card: (activeTab === 'gider' ? drillCard : '') || '',
      category: (activeTab === 'gider' ? drillCat : drillCard) || '',
    });
    setShowMatModal(true);
  };

  const ADD_LABELS = {
    gider: 'Yeni Gider Kartı', malzeme: 'Yeni Malzeme',
    kasalar: 'Yeni Kasa Ekle', users: 'Yeni Kullanıcı',
    roles: 'Yeni Rol', doc_cats: 'Yeni Kategori',
  };

  // ─── Search filter ───────────────────────────────────────────────────────────
  const filteredMaterials = materials.filter(m => m.name?.toLowerCase().includes(search.toLowerCase()));

  // ─── Render ──────────────────────────────────────────────────────────────────
  const addButtonLabel = ADD_LABELS[activeTab] || 'YENİ EKLE';
  const showBulkAdd    = (activeTab === 'malzeme' || activeTab === 'gider') && !!drillCard;

  return (
    <div className="definitions-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Sistem Tanımlamaları</h1>
          <p className="text-muted">Kartlar, kasalar, kullanıcılar, roller ve doküman kategorilerini yönetin.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {!(activeTab === 'gider' || activeTab === 'malzeme') && (
            <button className="btn btn-primary" onClick={handleAddClick}>
              <Plus size={18} /> {addButtonLabel}
            </button>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* Sidebar */}
        <div style={{ width: '260px', flexShrink: 0 }}>
          <div className="card" style={{ padding: '0.75rem' }}>
            <TabBtn active={activeTab==='gider'}    onClick={()=>setActiveTab('gider')}    icon={<DollarSign size={18}/>} label="Gider Kartları" />
            <TabBtn active={activeTab==='malzeme'}  onClick={()=>setActiveTab('malzeme')}  icon={<Package size={18}/>}    label="Malzeme Kartları" />
            <TabBtn active={activeTab==='kasalar'}  onClick={()=>setActiveTab('kasalar')}  icon={<Wallet size={18}/>}     label="Kasalar & Hesaplar" />
            <TabBtn active={activeTab==='doc_cats'} onClick={()=>setActiveTab('doc_cats')} icon={<FolderOpen size={18}/>} label="Doküman Kategorileri" />
            <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }} />
            <TabBtn active={activeTab==='users'}    onClick={()=>setActiveTab('users')}    icon={<Users size={18}/>}      label="Kullanıcı Yönetimi" />
            <TabBtn active={activeTab==='roles'}    onClick={()=>setActiveTab('roles')}    icon={<Shield size={18}/>}     label="Rol & Yetki Yönetimi" />
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div className="card">

            {/* ── GİDER & MALZEME — Hiyerarşik Drill-down ── */}
            {(activeTab === 'gider' || activeTab === 'malzeme') && (() => {
              const isGiderLevel = activeTab === 'gider';
              const isGider      = isGiderLevel;
              const topCards = isGiderLevel ? GIDER_CARDS : MALZEME_CATS;

              const level2List = materials.filter(m => {
                if (!drillCard) return false;
                if (isGiderLevel) {
                  const matchCard = m.account_card === drillCard || (!m.account_card && drillCard === 'Diğer Giderler');
                  if (!matchCard) return false;
                  if (drillCat) return m.category === drillCat;
                  return true;
                } else {
                  if (drillCard === 'Diğer') {
                    return !m.category || !MALZEME_CATS.includes(m.category) || m.category === 'Diğer';
                  }
                  return m.category === drillCard;
                }
              });

              const uniqueCatsUnderCard = drillCard && isGiderLevel
                ? [...new Set(materials.filter(m => (m.account_card === drillCard || (!m.account_card && drillCard === 'Diğer Giderler')) && m.category).map(m => m.category))]
                : [];

              const showCategoryGrid  = isGiderLevel && drillCard && !drillCat;
              const showMaterialTable = isGiderLevel ? (drillCard && drillCat) : !!drillCard;
              const showCardGrid      = !drillCard;

              const filtered = level2List.filter(m =>
                !search || m.name?.toLowerCase().includes(search.toLowerCase())
              );

              return (
                <>
                  {/* Breadcrumb + Add Button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => { setDrillCard(null); setDrillCat(null); setSearch(''); }}
                      style={{ background: 'none', border: 'none', cursor: drillCard ? 'pointer' : 'default',
                        fontWeight: '700', fontSize: '0.92rem',
                        color: drillCard ? 'var(--primary)' : 'var(--text)',
                        textDecoration: drillCard ? 'underline' : 'none', padding: 0 }}>
                      {isGider ? 'Gider Kartları' : 'Malzeme Kartları'}
                    </button>
                    {drillCard && (
                      <>
                        <ChevronRight size={14} style={{ color: 'var(--text-dim)' }} />
                        <button onClick={() => { setDrillCat(null); setSearch(''); }}
                          style={{ background: 'none', border: 'none', cursor: (isGider && drillCat) ? 'pointer' : 'default',
                            fontWeight: '700', fontSize: '0.92rem',
                            color: (isGider && drillCat) ? 'var(--primary)' : 'var(--text)',
                            textDecoration: (isGider && drillCat) ? 'underline' : 'none', padding: 0 }}>
                          {drillCard}
                        </button>
                      </>
                    )}
                    {drillCat && (
                      <>
                        <ChevronRight size={14} style={{ color: 'var(--text-dim)' }} />
                        <span style={{ fontWeight: '700', fontSize: '0.92rem' }}>{drillCat}</span>
                      </>
                    )}
                  </div>
                  <button className="btn btn-primary" onClick={handleAddClick} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                    <Plus size={16} /> {addButtonLabel}
                  </button>
                  </div>

                  {loading && <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>Yükleniyor...</p>}

                  {/* Level 0 — Kart Grid */}
                  {!loading && showCardGrid && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                      {topCards.map(card => {

                        const meta  = CARD_META[card] || { color: '#64748b', bg: '#f8fafc', emoji: '📁' };
                        const count = materials.filter(m => {
                          if (isGiderLevel) return m.account_card === card || (!m.account_card && card === 'Diğer Giderler');
                          if (card === 'Diğer') {
                            return !m.category || !MALZEME_CATS.includes(m.category) || m.category === 'Diğer';
                          }
                          return m.category === card;
                        }).length;
                        return (
                          <div key={card} onClick={() => { setDrillCard(card); setDrillCat(null); }}
                            style={{ padding: '1.25rem', borderRadius: '14px', border: '1.5px solid', borderColor: meta.color + '33',
                              background: meta.bg, cursor: 'pointer', transition: 'box-shadow 0.18s',
                              display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 16px ${meta.color}22`}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{meta.emoji}</span>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: '700', fontSize: '0.85rem', color: meta.color, lineHeight: 1.3 }}>{card}</p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.75rem', color: meta.color, fontWeight: '600',
                                background: meta.color + '1a', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                                {count} kalem
                              </span>
                              <ChevronRight size={14} style={{ color: meta.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Level 1 — Kategori grid (yalnızca Gider) */}
                  {!loading && showCategoryGrid && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                      {uniqueCatsUnderCard.map(cat => {
                        const meta  = CARD_META[cat] || { color: '#64748b', bg: '#f8fafc', emoji: '📂' };
                        const count = materials.filter(m => m.account_card === drillCard && m.category === cat).length;
                        return (
                          <div key={cat} onClick={() => setDrillCat(cat)}
                            style={{ padding: '1.1rem', borderRadius: '12px', border: '1.5px solid', borderColor: meta.color + '33',
                              background: meta.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'box-shadow 0.18s' }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 14px ${meta.color}22`}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                            <span style={{ fontSize: '1.4rem' }}>{meta.emoji}</span>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: '700', fontSize: '0.82rem', color: meta.color }}>{cat}</p>
                              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>{count} kalem</p>
                            </div>
                            <ChevronRight size={13} style={{ color: meta.color, flexShrink: 0 }} />
                          </div>
                        );
                      })}
                      {/* + Yeni Kalem Ekle tile */}
                      <div onClick={handleOpenAddModal}
                        style={{ padding: '1.1rem', borderRadius: '12px', border: '2px dashed var(--border)',
                          background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center',
                          gap: '0.75rem', transition: 'all 0.18s', color: 'var(--primary)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Plus size={18} style={{ color: 'var(--primary)' }} />
                        </div>
                        <div>
                          <p style={{ fontWeight: '700', fontSize: '0.82rem' }}>Yeni Kalem Ekle</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>Bu karta kalem ekle</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Level 2 — Malzeme listesi */}
                  {!loading && showMaterialTable && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem' }}>
                        <button className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '0.55rem 1rem', flexShrink: 0 }} onClick={handleOpenAddModal}>
                          <Plus size={15} /> Yeni Kalem Ekle
                        </button>
                        <div className="search-box" style={{ width: '240px' }}>
                          <Search size={15} className="text-dim" />
                          <input type="text" placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                      </div>
                      {filtered.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>Bu kategoride kalem bulunamadı.</p>
                      ) : (
                        <table style={{ width: '100%' }}>
                          <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                              <th style={{ paddingBottom: '1rem' }}>Tanım Adı</th>
                              {isGider && <th style={{ paddingBottom: '1rem' }}>Hesap Kartı</th>}
                              <th style={{ paddingBottom: '1rem' }}>Kategori</th>
                              <th style={{ paddingBottom: '1rem' }}>Birim</th>
                              <th style={{ paddingBottom: '1rem', textAlign: 'right' }}>İşlemler</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map(m => (
                              <tr key={m.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                                <td style={{ padding: '0.9rem 0', fontWeight: '600' }}>{m.name}</td>
                                {isGider && <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{m.account_card || '—'}</td>}
                                <td><span className="badge badge-primary">{m.category}</span></td>
                                <td className="text-dim" style={{ fontSize: '0.85rem' }}>{m.unit}</td>
                                <td style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.25rem', padding: '0.9rem 0' }}>
                                  <button className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--primary)' }} onClick={() => handleEditMaterial(m)}>
                                    <Edit2 size={15} />
                                  </button>
                                  <button className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--danger)' }} onClick={() => handleDeleteMaterial(m.id)}>
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  )}
                </>
              );
            })()}

            {/* ── KASALAR ── */}
            {activeTab === 'kasalar' && (
              <>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Kasalar & Hesaplar</h2>
                {kasalar.length === 0 ? (
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
                          <td style={{ padding: '0.9rem 0', fontWeight: '700' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Wallet size={15} style={{ color: 'var(--primary)' }} /> {k.name}
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
                            <button className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--danger)' }} onClick={() => handleDeleteKasa(k.id)}>
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {/* ── DOKÜMAN KATEGORİLERİ ── */}
            {activeTab === 'doc_cats' && (
              <>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Doküman Kategorileri</h2>
                <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                  Döküman & Arşiv ekranında dosyaları etiketlemek için kullanılır.
                </p>
                {docCats.length === 0 ? (
                  <p className="text-dim" style={{ textAlign: 'center', padding: '3rem' }}>Henüz kategori tanımı yok.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {docCats.map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--primary-light)', borderRadius: '20px', border: '1px solid var(--primary)' }}>
                        <FolderOpen size={14} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }}>{c.name}</span>
                        <button onClick={() => handleDeleteDocCat(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', padding: '0 0 0 0.25rem' }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── KULLANICI YÖNETİMİ ── */}
            {activeTab === 'users' && (
              <>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Kullanıcı Yönetimi</h2>
                {!cid ? (
                  <p className="text-dim" style={{ textAlign: 'center', padding: '3rem' }}>Bu sekme yalnızca firma hesapları içindir.</p>
                ) : loading ? (
                  <p style={{ textAlign: 'center', padding: '2rem' }}>Yükleniyor...</p>
                ) : (
                  <table style={{ width: '100%' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ paddingBottom: '1rem' }}>Ad Soyad</th>
                        <th style={{ paddingBottom: '1rem' }}>E-Posta</th>
                        <th style={{ paddingBottom: '1rem' }}>Rol</th>
                        <th style={{ paddingBottom: '1rem', textAlign: 'right' }}>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                          <td style={{ padding: '0.9rem 0' }}>
                            <p style={{ fontWeight: '600' }}>{u.full_name}</p>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>@{u.username || '—'}</p>
                          </td>
                          <td className="text-muted" style={{ fontSize: '0.85rem' }}>{u.email}</td>
                          <td><span className="badge badge-primary">{u.role}</span></td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => openEditUser(u)}>
                                <Pencil size={14} /> Düzenle
                              </button>
                              <button className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: 'var(--danger)' }} onClick={() => setDeleteTarget(u)}>
                                <Trash2 size={14} /> Sil
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {/* ── ROL & YETKİ ── */}
            {activeTab === 'roles' && (
              <>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Rol & Yetki Yönetimi</h2>
                <p className="text-muted" style={{ marginBottom: '2rem', fontSize: '0.85rem' }}>
                  Firmaya özel roller oluşturun ve modül erişim izinlerini belirleyin.
                </p>
                {!cid ? (
                  <p className="text-dim" style={{ textAlign: 'center', padding: '3rem' }}>Bu sekme yalnızca firma hesapları içindir.</p>
                ) : roles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    <Shield size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p>Henüz rol tanımlanmamış.</p>
                    <p style={{ fontSize: '0.85rem' }}>Yeni Rol butonuyla başlayın.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {roles.map(r => {
                      const perms = Array.isArray(r.permissions) ? r.permissions : [];
                      return (
                        <div key={r.id} style={{ padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                          <div style={{ width: '40px', height: '40px', background: 'var(--primary-light)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Shield size={18} style={{ color: 'var(--primary)' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: '700', marginBottom: '0.5rem' }}>{r.name}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {perms.length === 0 ? (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Hiç yetki atanmamış</span>
                              ) : perms.map(p => (
                                <span key={p} style={{ fontSize: '0.72rem', fontWeight: '600', padding: '0.2rem 0.5rem', background: 'var(--bg-main)', borderRadius: '6px', color: 'var(--text-dim)' }}>
                                  {MODULE_LABELS[p] || p}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => openEditRole(r)}>
                              <Edit2 size={14} /> Düzenle
                            </button>
                            <button className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: 'var(--danger)' }} onClick={() => handleDeleteRole(r.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>

      {/* ═══ MODALLER ═══════════════════════════════════════════════════════════ */}

      {/* Malzeme/Gider Modal — Stepped */}
      {showMatModal && (() => {
        const isGider    = activeTab === 'gider';
        // Düzenleme modunda adımlar kilitli değil; yeni eklemede context varsa kilitli
        const cardLocked = !editMaterial && (isGider ? !!matForm.account_card : !!matForm.category);
        const catLocked  = !editMaterial && isGider && !!matForm.category;
        const currentContext = isGider ? matForm.account_card : matForm.category;
        const cardMeta   = CARD_META[currentContext] || {};

        const step1Label = isGider ? 'Hesap Kartı' : 'Kategori';
        const step1Value = isGider ? matForm.account_card : matForm.category;
        const step1Locked = cardLocked;
        const step1LockedVal = isGider ? matForm.account_card : matForm.category;

        // Step 2 visible only for gider (category)
        const step2Locked = catLocked;
        const step2LockedVal = matForm.category;

        // Final step number
        const finalStepNum = isGider ? 3 : 2;

        // Is final step enabled?
        const step1Done = isGider ? !!matForm.account_card : !!matForm.category;
        const step2Done = !isGider || !!matForm.category;
        const finalEnabled = step1Done && step2Done;

        return (
          <div style={overlay}>
            <div className="card" style={{ ...modal, maxWidth: '500px' }}>
              <ModalHeader
                title={editMaterial ? (isGider ? 'Gider Kalemi Düzenle' : 'Malzeme Düzenle') : (isGider ? 'Yeni Gider Kalemi Ekle' : 'Yeni Malzeme Ekle')}
                onClose={() => { setShowMatModal(false); setEditMaterial(null); }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                {/* ADIM 1 */}
                <StepRow num={1} label={step1Label} locked={step1Locked} lockedVal={step1LockedVal} meta={cardMeta}>
                  {isGider ? (
                    <select className="input" value={matForm.account_card}
                      onChange={e => setMatForm({ ...matForm, account_card: e.target.value, category: '' })}>
                      <option value="">Seçiniz...</option>
                      {GIDER_CARDS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  ) : (
                    <select className="input" value={matForm.category}
                      onChange={e => setMatForm({ ...matForm, category: e.target.value })}>
                      <option value="">Seçiniz...</option>
                      {MALZEME_CATS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  )}
                </StepRow>

                <StepConnector active={step1Done} />

                {/* ADIM 2 — sadece Gider */}
                {isGider && (
                  <>
                    <StepRow num={2} label="Kategori" locked={step2Locked} lockedVal={step2LockedVal}
                      disabled={!matForm.account_card && !drillCard}>
                      <input className="input"
                        placeholder="Örn: Lastik, Yağ & Filtre, Bakım..."
                        value={matForm.category}
                        disabled={!matForm.account_card && !drillCard}
                        onChange={e => setMatForm({ ...matForm, category: e.target.value })} />
                    </StepRow>
                    <StepConnector active={!!matForm.category} />
                  </>
                )}

                {/* SON ADIM: İsim + Birim */}
                <StepRow num={finalStepNum} label="Tanım Adı & Birim" disabled={!finalEnabled}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '0.75rem' }}>
                    <input autoFocus className="input"
                      placeholder="Örn: Motor Yağı 10W-40..."
                      value={matForm.name}
                      disabled={!finalEnabled}
                      onChange={e => setMatForm({ ...matForm, name: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && handleSaveMaterial()} />
                    <select className="input" value={matForm.unit} disabled={!finalEnabled}
                      onChange={e => setMatForm({ ...matForm, unit: e.target.value })}>
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </StepRow>

              </div>

              <ModalFooter onCancel={() => { setShowMatModal(false); setEditMaterial(null); }} onSave={handleSaveMaterial} saveLabel={editMaterial ? 'Güncelle' : 'Kaydet'} />
            </div>
          </div>
        );
      })()}

      {/* Kasa Modal */}
      {showKasaModal && (
        <div style={overlay}>
          <div className="card" style={modal}>
            <ModalHeader title="Yeni Kasa / Hesap" onClose={() => setShowKasaModal(false)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Field label="Kasa / Hesap Adı *">
                <input className="input" placeholder="Örn: Merkez Kasa, Garanti Bankası" value={kasaForm.name} onChange={e => setKasaForm({ ...kasaForm, name: e.target.value })} />
              </Field>
              <Field label="Tür">
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {['Kasa', 'Banka'].map(t => (
                    <button key={t} type="button" onClick={() => setKasaForm({ ...kasaForm, type: t })}
                      style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', border: '1.5px solid',
                        background: kasaForm.type === t ? 'var(--primary)' : 'transparent',
                        color: kasaForm.type === t ? 'white' : 'var(--text-muted)',
                        borderColor: kasaForm.type === t ? 'var(--primary)' : 'var(--border)' }}>
                      {t === 'Kasa' ? 'Kasa' : 'Banka'}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <ModalFooter onCancel={() => setShowKasaModal(false)} onSave={handleSaveKasa} />
          </div>
        </div>
      )}

      {/* Kullanıcı Ekle Modal */}
      {showUserModal && (
        <div style={overlay}>
          <div className="card" style={modal}>
            <ModalHeader title="Yeni Kullanıcı Ekle" onClose={() => setShowUserModal(false)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Field label="Ad Soyad *">
                <input className="input" value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })} placeholder="Kübra Özcan" />
              </Field>
              <Field label="Kullanıcı Adı *">
                <input className="input" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })} placeholder="kubra.ozcan" />
              </Field>
              <Field label="E-Posta *">
                <input className="input" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} placeholder="kubra@firma.com" />
              </Field>
              <Field label="Şifre *">
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} className="input" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} style={{ paddingRight: '3rem' }} />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <RoleDropdown value={userForm.roleType} onChange={v => setUserForm({ ...userForm, roleType: v })} roles={roles} />
            </div>
            <ModalFooter onCancel={() => setShowUserModal(false)} onSave={handleAddUser} saveLabel="Kullanıcı Oluştur" />
          </div>
        </div>
      )}

      {/* Kullanıcı Düzenle Modal */}
      {editUser && (
        <div style={overlay}>
          <div className="card" style={modal}>
            <ModalHeader title="Kullanıcıyı Düzenle" onClose={() => setEditUser(null)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Field label="Ad Soyad *">
                <input className="input" value={editUser.full_name} onChange={e => setEditUser({ ...editUser, full_name: e.target.value })} />
              </Field>
              <Field label="Kullanıcı Adı">
                <input className="input" value={editUser.username} onChange={e => setEditUser({ ...editUser, username: e.target.value.toLowerCase().replace(/\s/g, '') })} />
              </Field>
              <Field label="E-Posta *">
                <input className="input" value={editUser.email} onChange={e => setEditUser({ ...editUser, email: e.target.value })} />
              </Field>
              <Field label="Yeni Şifre (boş = değişmez)">
                <div style={{ position: 'relative' }}>
                  <input type={showEditPass ? 'text' : 'password'} className="input" value={editUser.password} onChange={e => setEditUser({ ...editUser, password: e.target.value })} placeholder="Değiştirmek için girin" style={{ paddingRight: '3rem' }} />
                  <button type="button" onClick={() => setShowEditPass(s => !s)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                    {showEditPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <RoleDropdown value={editUser.roleType} onChange={v => setEditUser({ ...editUser, roleType: v })} roles={roles} />
            </div>
            <ModalFooter onCancel={() => setEditUser(null)} onSave={handleEditUser} saveLabel="Değişiklikleri Kaydet" />
          </div>
        </div>
      )}

      {/* Kullanıcı Sil Modal */}
      {deleteTarget && (
        <div style={overlay}>
          <div className="card" style={{ ...modal, maxWidth: '420px', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--danger)' }}>
              <Trash2 size={28} />
            </div>
            <h2 style={{ marginBottom: '0.75rem' }}>Kullanıcıyı Sil</h2>
            <p className="text-muted" style={{ marginBottom: '0.5rem' }}><strong>{deleteTarget.full_name}</strong> silinsin mi?</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--danger)', marginBottom: '2rem' }}>Bu işlem geri alınamaz.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} style={{ flex: 1 }}>Vazgeç</button>
              <button className="btn" onClick={handleDeleteUser} style={{ flex: 1, background: 'var(--danger)', color: 'white' }}>Evet, Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* Rol Modal (Ekle / Düzenle) */}
      {showRoleModal && (
        <div style={overlay}>
          <div className="card" style={{ ...modal, maxWidth: '620px' }}>
            <ModalHeader title={editRole ? `Rol Düzenle: ${editRole.name}` : 'Yeni Rol Oluştur'} onClose={() => { setShowRoleModal(false); setEditRole(null); }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <Field label="Rol Adı *">
                <input className="input" placeholder="Örn: Ön Muhasebe, Saha Ekibi" value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} />
              </Field>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)', display: 'block', marginBottom: '1rem' }}>Modül Yetkileri</label>
                {MODULE_MATRIX.map(grp => (
                  <div key={grp.group} style={{ marginBottom: '1.25rem' }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>{grp.group}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {grp.items.map(modId => {
                        const checked = roleForm.permissions.includes(modId);
                        return (
                          <button key={modId} type="button" onClick={() => togglePerm(modId)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1.5px solid', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', transition: 'all 0.15s',
                              background: checked ? 'var(--primary)' : 'transparent',
                              color: checked ? 'white' : 'var(--text-muted)',
                              borderColor: checked ? 'var(--primary)' : 'var(--border)' }}>
                            {checked ? <CheckSquare size={13} /> : <Square size={13} />}
                            {MODULE_LABELS[modId] || modId}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <ModalFooter onCancel={() => { setShowRoleModal(false); setEditRole(null); }} onSave={handleSaveRole} saveLabel={editRole ? 'Güncelle' : 'Rol Oluştur'} />
          </div>
        </div>
      )}

      {/* Doküman Kategori Modal */}
      {showDocCatModal && (
        <div style={overlay}>
          <div className="card" style={modal}>
            <ModalHeader title="Yeni Doküman Kategorisi" onClose={() => setShowDocCatModal(false)} />
            <Field label="Kategori Adı *">
              <input className="input" placeholder="Örn: Fatura, Sözleşme, Dekont" value={docCatForm.name} onChange={e => setDocCatForm({ name: e.target.value })} />
            </Field>
            <ModalFooter onCancel={() => setShowDocCatModal(false)} onSave={handleSaveDocCat} />
          </div>
        </div>
      )}
      {/* TOPLU YÜKLEME MODALI */}
      {showBulkModal && (
        <div style={overlay}>
          <div className="card" style={{ ...modal, maxWidth: '620px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem' }}>Toplu Malzeme Yükle</h2>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>Excel dosyasından toplu malzeme içe aktarın.</p>
              </div>
              <button onClick={() => { setShowBulkModal(false); setBulkPreview([]); setBulkFileName(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            {/* Adım 1: Şablon indir */}
            <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <FileSpreadsheet size={28} style={{ color: '#16a34a', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.85rem', fontWeight: '700' }}>1. Adım — Şablonu İndir</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Ad, Kategori, Birim sütunlu hazır Excel şablonunu indir ve doldur.</p>
              </div>
              <button className="btn btn-ghost" onClick={downloadSampleExcel} style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                📥 Şablon İndir
              </button>
            </div>

            {/* Adım 2: Dosya seç */}
            <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.75rem' }}>2. Adım — Excel Dosyasını Seç</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelFile}
                style={{ display: 'none' }}
              />
              <button
                className="btn btn-ghost"
                onClick={() => fileInputRef.current?.click()}
                style={{ width: '100%', padding: '0.85rem', border: '2px dashed var(--border)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Upload size={18} />
                {bulkFileName ? bulkFileName : 'Dosya seç (.xlsx)'}
              </button>
            </div>

            {/* Önizleme */}
            {bulkPreview.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem', color: '#16a34a' }}>
                  ✓ {bulkPreview.length} satır okundu — önizleme:
                </p>
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.78rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-main)' }}>
                        {['Ad', 'Kategori', 'Birim'].map(h => (
                          <th key={h} style={{ padding: '0.4rem 0.75rem', textAlign: 'left', fontWeight: '700', color: 'var(--text-dim)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.slice(0, 8).map((r, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--bg-main)' }}>
                          <td style={{ padding: '0.4rem 0.75rem' }}>{r.name}</td>
                          <td style={{ padding: '0.4rem 0.75rem', color: 'var(--text-dim)' }}>{r.category}</td>
                          <td style={{ padding: '0.4rem 0.75rem', color: 'var(--text-dim)' }}>{r.unit}</td>
                        </tr>
                      ))}
                      {bulkPreview.length > 8 && (
                        <tr><td colSpan={3} style={{ padding: '0.4rem 0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>...ve {bulkPreview.length - 8} satır daha</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setShowBulkModal(false); setBulkPreview([]); setBulkFileName(''); }}>İptal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleBulkMaterialUpload} disabled={loading || bulkPreview.length === 0}>
                {loading ? 'Yükleniyor...' : `🚀 ${bulkPreview.length} Malzemeyi Kaydet`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Alt bileşenler ───────────────────────────────────────────────────────────
const TabBtn = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', width: '100%', padding: '0.9rem 1rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: active ? '700' : '500', transition: 'all 0.2s',
    background: active ? 'var(--primary-light)' : 'transparent',
    color: active ? 'var(--primary)' : 'var(--text-dim)' }}>
  {icon} {label}
  <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: active ? 1 : 0 }} />
  </button>
);

const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-dim)' }}>{label}</label>
    {children}
  </div>
);

const ModalHeader = ({ title, onClose }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
    <h2 style={{ fontSize: '1.2rem' }}>{title}</h2>
    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={22} /></button>
  </div>
);

const ModalFooter = ({ onCancel, onSave, saveLabel = 'Kaydet' }) => (
  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
    <button className="btn btn-ghost" onClick={onCancel} style={{ flex: 1 }}>İptal</button>
    <button className="btn btn-primary" onClick={onSave} style={{ flex: 2 }}>{saveLabel}</button>
  </div>
);

const RoleDropdown = ({ value, onChange, roles }) => (
  <Field label="Sistem Rolü">
    <select className="input" value={value} onChange={e => onChange(e.target.value)}>
      <option value="admin">Admin (Tam Yetki)</option>
      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
    </select>
  </Field>
);

const StepRow = ({ num, label, locked, lockedVal, meta = {}, disabled, children }) => (
  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '1rem 0', opacity: disabled ? 0.4 : 1, transition: 'opacity 0.2s' }}>
    {/* Numara balonu */}
    <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, marginTop: '7px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800',
      background: locked ? (meta.color || 'var(--primary)') : 'var(--primary)',
      color: 'white' }}>{num}</div>

    <div style={{ flex: 1 }}>
      <p style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase',
        letterSpacing: '0.07em', marginBottom: '0.4rem' }}>{label}</p>

      {locked ? (
        /* Kilitli durum — readonly chip */
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.9rem',
          borderRadius: '10px', border: `1.5px solid ${meta.color || 'var(--primary)'}33`,
          background: meta.bg || 'var(--primary-light)', userSelect: 'none' }}>
          {meta.emoji && <span style={{ fontSize: '1.1rem' }}>{meta.emoji}</span>}
          <span style={{ fontWeight: '700', fontSize: '0.88rem', color: meta.color || 'var(--primary)', flex: 1 }}>{lockedVal}</span>
          <span style={{ fontSize: '0.68rem', background: meta.color || 'var(--primary)', color: 'white',
            borderRadius: '4px', padding: '1px 5px', fontWeight: '700' }}>OTO</span>
        </div>
      ) : children}
    </div>
  </div>
);

const StepConnector = ({ active }) => (
  <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '13px', gap: '4px' }}>
    <div style={{ width: '2px', height: '20px', borderRadius: '2px',
      background: active ? 'var(--primary)' : 'var(--border)', transition: 'background 0.2s' }} />
  </div>
);

const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modal   = { width: '100%', maxWidth: '500px', padding: '2rem' };

export default Definitions;
