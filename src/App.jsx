import React, { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import useAuthStore from './store/authStore';
import Invoices from './components/Invoices';
import Stock from './components/Stock';
import Definitions from './components/Definitions';
import Vehicles from './components/Vehicles';
import Fuel from './components/Fuel';
import Tires from './components/Tires';
import Purchasing from './components/Purchasing';
import Finance from './components/Finance';
import Checks from './components/Checks';
import RevenueExpense from './components/RevenueExpense';
import Documents from './components/Documents';
import Personnel from './components/Personnel';
import Ledgers from './components/Ledgers';
import CostReports from './components/CostReports';
import Settings from './components/Settings';
import AlertCenter from './components/AlertCenter';
import Customers from './components/Customers';
import SalesReports from './components/SalesReports';
import BulkTransfers from './components/BulkTransfers';
import Facilities from './components/Facilities';
import useStore from './store/useStore';
import { ROLE_PERMISSIONS } from './store/authStore';
import { formatCurrency } from './utils/formatters';
import {
  ArrowUpRight,
  ArrowDownLeft,
  PieChart,
  Search,
  Bell,
  ScanLine,
  Building2,
  ChevronDown,
  TrendingUp,
  AlertCircle,
  Package,
  Truck,
  Fuel as FuelIcon,
  Users,
  X,
  FileText,
  Layers,
  User,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ─── Global Arama ─────────────────────────────────────────────────────────────
const GlobalSearch = ({ onNavigate, onClose }) => {
  const [query, setQuery] = useState('');
  const globalSearch = useStore(s => s.globalSearch);
  const results = globalSearch(query);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const typeIcon = (type) => {
    if (type === 'fatura') return <FileText size={16} />;
    if (type === 'cari') return <Users size={16} />;
    if (type === 'araç') return <Truck size={16} />;
    if (type === 'stok') return <Layers size={16} />;
    return <User size={16} />;
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        className="card"
        style={{ width: '100%', maxWidth: '600px', padding: '1.5rem', marginTop: '5rem' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <Search size={20} className="text-dim" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Müşteri, Fatura no, Plaka, Malzeme..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1.1rem', background: 'transparent' }}
          />
          <kbd style={{ padding: '0.2rem 0.5rem', background: 'var(--bg-main)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>Esc</kbd>
        </div>

        {query.length >= 2 && results.length === 0 && (
          <p className="text-dim" style={{ textAlign: 'center', padding: '1.5rem 0' }}>Sonuç bulunamadı.</p>
        )}

        {results.map(r => (
          <button
            key={r.id + r.type}
            onClick={() => { onNavigate(r.tab); onClose(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', padding: '0.85rem 1rem', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '10px', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ color: 'var(--primary)', background: 'var(--primary-light)', padding: '0.4rem', borderRadius: '8px' }}>
              {typeIcon(r.type)}
            </div>
            <div>
              <p style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-main)' }}>{r.label}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{r.sub}</p>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: 'var(--bg-main)', borderRadius: '6px', color: 'var(--text-dim)' }}>{r.type}</span>
          </button>
        ))}

        {query.length < 2 && (
          <p className="text-dim" style={{ fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
            Aramak için en az 2 karakter girin...
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Ana Uygulama ─────────────────────────────────────────────────────────────
const App = () => {
  const currentUser = useAuthStore(s => s.currentUser);
  const canAccess = useAuthStore(s => s.canAccess);

  // Auth gate — giriş yapılmamışsa Login ekranını göster
  if (!currentUser) return <Login />;

  return <MainApp currentUser={currentUser} canAccess={canAccess} />;
};

const MainApp = ({ currentUser, canAccess }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentFacility, setCurrentFacility] = useState('İstanbul Merkez');
  const [showFacilityMenu, setShowFacilityMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const openInvoiceModal = useStore(s => s.openInvoiceModal);
  const setOpenInvoiceModal = useStore(s => s.setOpenInvoiceModal);

  const facilities = ['İstanbul Merkez', 'İzmir Depo', 'Ankara Şube', 'Global'];

  // Ctrl+K / Cmd+K global arama kısayolu
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Fiş İşle butonu → fatura oluştur sayfasına yönlendir
  const handleFisIsle = () => {
    setActiveTab('invoices');
    setOpenInvoiceModal(true);
  };

  const renderContent = () => {
    // dashboard her zaman erişilebilir; diğerleri için rol kontrolü
    if (activeTab !== 'dashboard' && !canAccess(activeTab)) {
      return <AccessDenied tab={activeTab} onBack={() => setActiveTab('dashboard')} role={currentUser.role} />;
    }
    switch (activeTab) {
      case 'dashboard': return <Dashboard facility={currentFacility} navigate={setActiveTab} />;
      case 'facilities': return <Facilities />;
      case 'cariler': return <Customers />;
      case 'invoices': return <Invoices />;
      case 'wallets': return <Finance />;
      case 'checks': return <Checks />;
      case 'rev_exp': return <RevenueExpense />;
      case 'logs': return <Documents />;
      case 'ledgers': return <Ledgers />;
      case 'stock': return <Stock />;
      case 'vehicles': return <Vehicles />;
      case 'fuel': return <Fuel />;
      case 'tires': return <Tires />;
      case 'personnel': return <Personnel />;
      case 'costs': return <CostReports />;
      case 'purchasing': return <Purchasing />;
      case 'definitions': return <Definitions />;
      case 'settings': return <Settings />;
      case 'alerts': return <AlertCenter />;
      case 'transfers': return <BulkTransfers />;
      case 'sales': return <SalesReports />;
      default: return (
        <div className="card" style={{ textAlign: 'center', padding: '5rem' }}>
          <h2 style={{ color: 'var(--text-dim)' }}>Bu modül yakında eklenecek...</h2>
          <p className="text-muted">Luvia Pro geliştirilmeye devam ediyor.</p>
        </div>
      );
    }
  };

  return (
    <div className="app-container">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { borderRadius: '12px', fontFamily: 'inherit', fontSize: '0.9rem' },
          success: { style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' } },
          error: { style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' } },
        }}
      />

      {showSearch && (
        <GlobalSearch onNavigate={setActiveTab} onClose={() => setShowSearch(false)} />
      )}

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-ghost"
              onClick={() => setShowFacilityMenu(!showFacilityMenu)}
              style={{ padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'white' }}
            >
              <Building2 size={18} color="var(--primary)" />
              <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)' }}>{currentFacility}</span>
              <ChevronDown size={16} className="text-dim" />
            </button>

            {showFacilityMenu && (
              <div className="card" style={{ position: 'absolute', top: '115%', left: 0, zIndex: 100, width: '240px', padding: '0.5rem', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
                {facilities.map(f => (
                  <button
                    key={f}
                    onClick={() => { setCurrentFacility(f); setShowFacilityMenu(false); }}
                    className="nav-item"
                    style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem', color: 'var(--text-main)', border: 'none' }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              className="search-bar"
              onClick={() => setShowSearch(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-main)', padding: '0.6rem 1.25rem', borderRadius: '12px', width: '350px', border: '1px solid var(--border)', cursor: 'text' }}
            >
              <Search size={18} className="text-dim" />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Hızlı ara (Ctrl+K)</span>
              <kbd style={{ marginLeft: 'auto', padding: '0.15rem 0.5rem', background: 'white', borderRadius: '6px', fontSize: '0.7rem', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>⌘K</kbd>
            </button>
            <AlertBell onNavigate={setActiveTab} />
            <button
              className="btn btn-primary"
              style={{ gap: '0.5rem', padding: '0.6rem 1.25rem' }}
              onClick={handleFisIsle}
            >
              <ScanLine size={20} /> Fiş İşle
            </button>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
};

// ─── Alert Bell ───────────────────────────────────────────────────────────────
const AlertBell = ({ onNavigate }) => {
  const getAlerts = useStore(s => s.getAlerts);
  const alerts = getAlerts();
  const dangerCount = alerts.filter(a => a.type === 'danger').length;

  return (
    <button
      className="btn btn-ghost"
      style={{ padding: '0.6rem', position: 'relative' }}
      onClick={() => onNavigate('alerts')}
    >
      <Bell size={20} />
      {alerts.length > 0 && (
        <span style={{
          position: 'absolute', top: '4px', right: '4px',
          width: '18px', height: '18px', borderRadius: '50%',
          background: dangerCount > 0 ? 'var(--danger)' : 'var(--warning)',
          color: 'white', fontSize: '0.6rem', fontWeight: '800',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {alerts.length}
        </span>
      )}
    </button>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = ({ facility, navigate }) => {
  const getDashboardStats = useStore(s => s.getDashboardStats);
  const invoices = useStore(s => s.invoices);
  const stats = getDashboardStats();

  // Son 6 ay gelir/gider verisi (faturalardan)
  const monthlyData = (() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('tr-TR', { month: 'short' });
      const gelir = invoices.filter(inv => inv.type === 'Satış Faturası' && inv.date?.startsWith(key)).reduce((s, i) => s + i.total, 0);
      const gider = invoices.filter(inv => inv.type !== 'Satış Faturası' && inv.date?.startsWith(key)).reduce((s, i) => s + i.total, 0);
      months.push({ name: label, gelir, gider });
    }
    return months;
  })();

  return (
    <>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', color: 'var(--text-main)' }}>{facility} Kontrol Paneli</h1>
        <p className="text-muted" style={{ fontSize: '1.1rem' }}>Şirketinizin operasyonel ve finansal sağlığına dair anlık veriler.</p>
      </div>

      <div className="grid grid-cols-3" style={{ marginBottom: '2.5rem' }}>
        <StatCard
          title="Bu Ay Satış"
          value={formatCurrency(stats.thisMonthSales)}
          trend={`${stats.activeVehicles} Araç Seferde`}
          trendUp={true}
          icon={<TrendingUp size={24} color="var(--primary)" />}
        />
        <StatCard
          title="Vadesi Geçen"
          value={formatCurrency(stats.totalPayable)}
          trend={`${stats.overdueCount} Fatura`}
          trendUp={false}
          icon={<AlertCircle size={24} color="var(--danger)" />}
          onClick={() => navigate('invoices')}
        />
        <StatCard
          title="Kritik Stok"
          value={`${stats.criticalStockCount} Kalem`}
          trend="Stok Alarmı"
          trendUp={false}
          icon={<Package size={24} color="var(--warning)" />}
          onClick={() => navigate('stock')}
        />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>Nakit Akış Analizi</h3>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>Son 6 aylık gelir / gider</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Toplam Nakit</p>
              <p style={{ fontWeight: '800', fontSize: '1.1rem', color: stats.totalCash >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {formatCurrency(stats.totalCash)}
              </p>
            </div>
          </div>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGider" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.10} />
                    <stop offset="95%" stopColor="var(--danger)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `₺${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(val, name) => [formatCurrency(val), name === 'gelir' ? 'Gelir' : 'Gider']}
                  contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)' }}
                />
                <Area type="monotone" dataKey="gelir" stroke="var(--primary)" fillOpacity={1} fill="url(#colorGelir)" strokeWidth={3} />
                <Area type="monotone" dataKey="gider" stroke="var(--danger)" fillOpacity={1} fill="url(#colorGider)" strokeWidth={2} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Hızlı Özet</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <SummaryRow label="Toplam Alacak" value={formatCurrency(stats.totalReceivable)} color="var(--success)" onClick={() => navigate('cariler')} />
            <SummaryRow label="Toplam Borç" value={formatCurrency(stats.totalPayable)} color="var(--danger)" onClick={() => navigate('invoices')} />
            <SummaryRow label="Toplam Nakit" value={formatCurrency(stats.totalCash)} color="var(--primary)" onClick={() => navigate('wallets')} />
            <div style={{ height: '1px', background: 'var(--border)' }} />
            <DashboardAction icon={<Truck size={20} />} label="Araç Yönetimi" description={`${stats.activeVehicles} araç seferde`} onClick={() => navigate('vehicles')} />
            <DashboardAction icon={<Package size={20} />} label="Stok Durumu" description={`${stats.criticalStockCount} kritik kalem`} onClick={() => navigate('stock')} />
          </div>
        </div>
      </div>
    </>
  );
};

const SummaryRow = ({ label, value, color, onClick }) => (
  <button
    onClick={onClick}
    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-main)', borderRadius: '10px', border: 'none', cursor: 'pointer', width: '100%' }}
  >
    <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: '600' }}>{label}</span>
    <span style={{ fontWeight: '800', color }}>{value}</span>
  </button>
);

const StatCard = ({ title, value, trend, trendUp, icon, onClick }) => (
  <div
    className="card"
    style={{ position: 'relative', overflow: 'hidden', cursor: onClick ? 'pointer' : 'default' }}
    onClick={onClick}
  >
    <div style={{ position: 'absolute', top: 0, right: 0, padding: '1.5rem' }}>{icon}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <span className="text-muted" style={{ fontSize: '0.95rem', fontWeight: '500' }}>{title}</span>
      <h2 style={{ fontSize: '2rem', color: 'var(--text-main)' }}>{value}</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span className={`badge badge-${trendUp ? 'success' : 'danger'}`}>{trend}</span>
        <span className="text-dim" style={{ fontSize: '0.8rem' }}>Anlık</span>
      </div>
    </div>
  </div>
);

const DashboardAction = ({ icon, label, description, onClick }) => (
  <button
    className="btn btn-ghost"
    onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', textAlign: 'left', padding: '0.85rem', justifyContent: 'flex-start', background: 'var(--bg-main)', border: 'none' }}
  >
    <div style={{ background: 'white', padding: '0.6rem', borderRadius: '10px', color: 'var(--primary)', boxShadow: 'var(--shadow-sm)' }}>{icon}</div>
    <div>
      <p style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-main)' }}>{label}</p>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{description}</p>
    </div>
  </button>
);

// ─── Erişim Engellendi ────────────────────────────────────────────────────────
const AccessDenied = ({ onBack, role }) => {
  const roleMeta = ROLE_PERMISSIONS[role];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: '1rem' }}>
      <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '2rem' }}>🔒</span>
      </div>
      <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>Bu Modüle Erişim Yok</h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: '380px', lineHeight: '1.6' }}>
        <strong style={{ color: roleMeta?.color }}>{roleMeta?.label}</strong> rolünün bu modüle erişim yetkisi bulunmuyor.
        Yöneticinizden yetki talep edebilirsiniz.
      </p>
      <button className="btn btn-primary" onClick={onBack} style={{ marginTop: '0.5rem' }}>Dashboard'a Dön</button>
    </div>
  );
};

const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)', zIndex: 2000,
  display: 'flex', justifyContent: 'center', backdropFilter: 'blur(4px)',
  padding: '0 1rem',
};

export default App;
