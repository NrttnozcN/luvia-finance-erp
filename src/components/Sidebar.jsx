import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Receipt, Package, Settings, Building2, Wallet,
  Truck, Fuel, Disc, FileSpreadsheet, Briefcase, ShoppingCart,
  TrendingDown, FileText, BarChart3, Bell, RefreshCcw, ShieldCheck,
  FolderOpen, PieChart, LogOut, ChevronDown, ChevronRight, MessageCircle, TrendingUp,
} from 'lucide-react';
import useAuthStore, { ROLE_DISPLAY_META } from '../store/authStore';
import { supabase } from '../lib/supabase';

const NAV_GROUPS = [
  {
    label: 'Genel',
    items: [
      { icon: <LayoutDashboard size={18} />, label: 'Gösterge Paneli',   tab: 'dashboard' },
      { icon: <Building2 size={18} />,       label: 'Tesisler',          tab: 'facilities' },
    ],
  },
  {
    label: 'Finans Yönetimi',
    items: [
      { icon: <Users size={18} />,          label: 'Cariler',           tab: 'cariler' },
      { icon: <Receipt size={18} />,         label: 'Faturalar',         tab: 'invoices' },
      { icon: <Wallet size={18} />,          label: 'Kasalar & Banka',   tab: 'wallets' },
      { icon: <TrendingDown size={18} />,    label: 'Gelir & Gider',     tab: 'rev_exp' },
      { icon: <FileSpreadsheet size={18} />, label: 'Çek & Senet',       tab: 'checks' },
    ],
  },
  {
    label: 'Operasyon & Filo',
    items: [
      { icon: <Package size={18} />,         label: 'Stok & Depo',       tab: 'stock' },
      { icon: <Truck size={18} />,           label: 'Araç Yönetimi',     tab: 'vehicles' },
      { icon: <Fuel size={18} />,            label: 'Akaryakıt Takibi',  tab: 'fuel' },
      { icon: <Disc size={18} />,            label: 'Lastik İşlemleri',  tab: 'tires' },
      { icon: <ShoppingCart size={18} />,    label: 'Satın Alma',        tab: 'purchasing' },
    ],
  },
  {
    label: 'İnsan Kaynakları',
    items: [
      { icon: <Briefcase size={18} />,       label: 'Personel & Puantaj', tab: 'personnel' },
    ],
  },
  {
    label: 'Raporlama & Arşiv',
    items: [
      { icon: <FileText size={18} />,        label: 'Defter İşlemleri',      tab: 'ledgers' },
      { icon: <TrendingUp size={18} />,      label: 'Cari Hareket Raporu',   tab: 'cari_rapor' },
      { icon: <Wallet size={18} />,          label: 'Kasa Hareket Raporu',   tab: 'kasa_rapor' },
      { icon: <BarChart3 size={18} />,       label: 'Maliyet Raporları',     tab: 'costs' },
      { icon: <PieChart size={18} />,        label: 'Satış Raporları',       tab: 'sales' },
      { icon: <FolderOpen size={18} />,      label: 'Döküman Yönetimi',      tab: 'logs' },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { icon: <Bell size={18} />,            label: 'Uyarı Merkezi',         tab: 'alerts' },
      { icon: <MessageCircle size={18} />,   label: 'Destek Talepleri',      tab: 'support_tickets' },
      { icon: <Settings size={18} />,        label: 'Sistem Ayarları',       tab: 'settings' },
      { icon: <RefreshCcw size={18} />,      label: 'Toplu Devirler',        tab: 'transfers' },
      { icon: <ShieldCheck size={18} />,     label: 'Tanımlamalar',          tab: 'definitions' },
    ],
  },
];

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Sidebar = ({ activeTab, setActiveTab }) => {
  const currentUser = useAuthStore(s => s.currentUser);
  const logout = useAuthStore(s => s.logout);
  const canAccess = useAuthStore(s => s.canAccess);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [openTickets, setOpenTickets] = useState(0);
  const [openGroups, setOpenGroups] = useState(() => {
    const init = {};
    NAV_GROUPS.forEach(g => {
      if (g.items.some(item => item.tab === activeTab)) init[g.label] = true;
    });
    return init;
  });

  useEffect(() => {
    NAV_GROUPS.forEach(g => {
      if (g.items.some(item => item.tab === activeTab)) {
        setOpenGroups(prev => ({ ...prev, [g.label]: true }));
      }
    });
  }, [activeTab]);

  const toggleGroup = (label) => setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));

  const roleColor = ROLE_DISPLAY_META[currentUser?.role]?.color || '#64748b';

  useEffect(() => {
    if (currentUser?.role === 'Admin') {
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'Açık')
        .then(({ count }) => setOpenTickets(count || 0));
    }
  }, [currentUser]);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', paddingLeft: '0.5rem' }}>
        <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #FF6B00, #e55a00)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(255, 107, 0, 0.3)', flexShrink: 0 }}>
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.4rem' }}>L</span>
        </div>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.05em', color: 'white', lineHeight: '1' }}>Luvia</h2>
          <p style={{ fontSize: '0.62rem', color: '#475569', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Enterprise ERP</p>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ overflowY: 'auto', paddingRight: '0.25rem', flex: 1, paddingBottom: '1rem' }}>
        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(item => canAccess(item.tab));
          if (visibleItems.length === 0) return null;
          const isOpen = !!openGroups[group.label];
          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '0.55rem 0.5rem 0.3rem', marginTop: '0.25rem' }}
              >
                <span className="nav-group-label" style={{ margin: 0, padding: 0 }}>{group.label}</span>
                {isOpen
                  ? <ChevronDown size={12} style={{ color: '#475569', flexShrink: 0 }} />
                  : <ChevronRight size={12} style={{ color: '#475569', flexShrink: 0 }} />}
              </button>
              {isOpen && visibleItems.map(item => (
                <NavItem
                  key={item.tab}
                  icon={item.icon}
                  label={item.label}
                  active={activeTab === item.tab}
                  onClick={() => setActiveTab(item.tab)}
                  badge={item.tab === 'support_tickets' && openTickets > 0 ? openTickets : null}
                />
              ))}
            </div>
          );
        })}

        {currentUser?.role === 'SuperAdmin' && (
          <div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0.75rem 0.5rem' }} />
            <span className="nav-group-label" style={{ display: 'block', padding: '0.55rem 0.5rem 0.3rem', color: '#7C3AED' }}>Platform Yönetimi</span>
            <NavItem
              icon={<Building2 size={18} />}
              label="Müşteri Firmalar"
              active={activeTab === 'companies'}
              onClick={() => setActiveTab('companies')}
            />
          </div>
        )}
      </nav>

      {/* Alt — Kullanıcı & Çıkış */}
      <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
        <button
          onClick={() => setShowUserMenu(s => !s)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.5rem', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '10px', transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#1e293b', border: '2px solid #FF6B00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', color: 'white', flexShrink: 0 }}>
            {getInitials(currentUser?.name)}
          </div>
          <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
            <p style={{ fontSize: '0.83rem', fontWeight: '700', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser?.name}</p>
            <p style={{ fontSize: '0.68rem', fontWeight: '600', color: roleColor, marginTop: '1px' }}>{currentUser?.roleLabel || ''}</p>
          </div>
          <ChevronDown size={14} style={{ color: '#475569', transform: showUserMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
        </button>

        {showUserMenu && (
          <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '0.5rem', marginBottom: '0.5rem', boxShadow: '0 -8px 24px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '0.75rem 1rem', marginBottom: '0.25rem' }}>
              <p style={{ fontSize: '0.82rem', fontWeight: '700', color: 'white' }}>{currentUser?.name}</p>
              <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{currentUser?.email}</p>
              <p style={{ fontSize: '0.7rem', color: '#475569', marginTop: '2px' }}>{currentUser?.facility}</p>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '0.25rem' }} />
            <button
              onClick={() => { setShowUserMenu(false); logout(); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.65rem 1rem', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '8px', color: '#ef4444', fontWeight: '600', fontSize: '0.85rem', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={16} /> Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

const NavItem = ({ icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`nav-item ${active ? 'active' : ''}`}
    style={{ padding: '0.7rem 1rem', fontSize: '0.85rem' }}
  >
    {icon}
    <span style={{ flex: 1 }}>{label}</span>
    {badge && (
      <span style={{ background: 'var(--danger)', color: 'white', borderRadius: '10px', padding: '0.1rem 0.45rem', fontSize: '0.7rem', fontWeight: '800', minWidth: '18px', textAlign: 'center' }}>
        {badge}
      </span>
    )}
  </button>
);

export default Sidebar;
