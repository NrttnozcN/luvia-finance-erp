import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Vehicles from './components/Vehicles';
import Customers from './components/Customers';
import Invoices from './components/Invoices';
import Finance from './components/Finance';
import RevenueExpense from './components/RevenueExpense';
import Checks from './components/Checks';
import Fuel from './components/Fuel';
import Tires from './components/Tires';
import Purchasing from './components/Purchasing';
import Personnel from './components/Personnel';
import Documents from './components/Documents';
import Settings from './components/Settings';
import Stock from './components/Stock';
import SalesReports from './components/SalesReports';
import CostReports from './components/CostReports';
import Definitions from './components/Definitions';
import AlertCenter from './components/AlertCenter';
import BulkTransfers from './components/BulkTransfers';
import Ledgers from './components/Ledgers';
import Facilities from './components/Facilities';
import Login from './components/Login';
import { 
  Bell, 
  Search, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Truck, 
  Fuel as FuelIcon, 
  PieChart, 
  Users,
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { supabase } from './lib/supabase';

const App = () => {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    vehicleCount: 0,
    customerCount: 0,
    fuelCost: 0,
    pendingInvoices: 0
  });
  const [loading, setLoading] = useState(true);

  // SQL'DEN GERÇEK İSTATİSTİKLERİ ÇEK
  const fetchDashboardStats = async () => {
    setLoading(true);
    
    // 1. Toplam Satış (Faturalar)
    const { data: invs } = await supabase.from('invoices').select('total_amount');
    const totalSales = invs?.reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0;

    // 2. Araç Sayısı
    const { count: vCount } = await supabase.from('vehicles').select('*', { count: 'exact', head: true });

    // 3. Cari Sayısı
    const { count: cCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });

    // 4. Akaryakıt Maliyeti
    const { data: fuel } = await supabase.from('fuel_logs').select('total_amount');
    const fuelCost = fuel?.reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0;

    setStats({
      totalSales,
      vehicleCount: vCount || 0,
      customerCount: cCount || 0,
      fuelCost,
      pendingInvoices: invs?.length || 0
    });
    setLoading(false);
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchDashboardStats();
    }
  }, [isLoggedIn, activeModule]); // Modül değiştikçe verileri tazele

  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />;

  const renderContent = () => {
    switch (activeModule) {
      case 'dashboard': return renderDashboard();
      case 'vehicles': return <Vehicles />;
      case 'customers': return <Customers />;
      case 'invoices': return <Invoices />;
      case 'invoices-create': return <Invoices initialView="create" />;
      case 'finance': return <Finance />;
      case 'revenue-expense': return <RevenueExpense />;
      case 'checks': return <Checks />;
      case 'fuel': return <Fuel />;
      case 'tires': return <Tires />;
      case 'purchasing': return <Purchasing />;
      case 'personnel': return <Personnel />;
      case 'documents': return <Documents />;
      case 'settings': return <Settings />;
      case 'stock': return <Stock />;
      case 'sales-reports': return <SalesReports />;
      case 'cost-reports': return <CostReports />;
      case 'definitions': return <Definitions />;
      case 'alert-center': return <AlertCenter />;
      case 'bulk-transfers': return <BulkTransfers />;
      case 'ledgers': return <Ledgers />;
      case 'facilities': return <Facilities />;
      default: return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="dashboard-view">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Hoş Geldiniz, Nurettin</h1>
        <p className="text-muted">İşte işletmenizin bugünkü finansal ve operasyonel özeti.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
        <StatCard 
          title="Toplam Ciro" 
          value={`₺${stats.totalSales.toLocaleString()}`} 
          trend="+12.5%" 
          positive={true} 
          icon={<DollarSign size={20} />} 
        />
        <StatCard 
          title="Aktif Filo" 
          value={stats.vehicleCount} 
          trend="Tümü aktif" 
          positive={true} 
          icon={<Truck size={20} />} 
        />
        <StatCard 
          title="Akaryakıt Gideri" 
          value={`₺${stats.fuelCost.toLocaleString()}`} 
          trend="-%4.2" 
          positive={true} 
          icon={<FuelIcon size={20} />} 
        />
        <StatCard 
          title="Cari Hesaplar" 
          value={stats.customerCount} 
          trend="Aktif cari" 
          positive={true} 
          icon={<Users size={20} />} 
        />
      </div>

      <div className="grid grid-cols-3" style={{ gap: '2rem' }}>
        {/* Recent Alerts */}
        <div className="col-span-2">
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Kritik Bildirimler</h3>
              <button className="btn btn-ghost" onClick={() => setActiveModule('alert-center')}>Tümünü Gör</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <AlertItem 
                icon={<AlertCircle color="var(--danger)" />} 
                title="Muayenesi Geçen Araçlar" 
                desc="34 LUV 001 plakalı aracın muayenesi 2 gün geçti."
                time="10 dk önce"
              />
              <AlertItem 
                icon={<Clock color="var(--warning)" />} 
                title="Vadesi Yaklaşan Çekler" 
                desc="Gelecek 3 gün içinde 45.000 TL ödemeniz bulunuyor."
                time="2 saat önce"
              />
            </div>
          </div>
          
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Son İşlemler</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p className="text-dim" style={{ textAlign: 'center', padding: '2rem' }}>Henüz son işlem bulunmuyor.</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-1">
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Hızlı Operasyonlar</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <DashboardAction onClick={() => setActiveModule('vehicles')} icon={<Truck size={20} />} label="Araç Seferi Başlat" description="Plaka ve şoför ataması yap" />
              <DashboardAction onClick={() => setActiveModule('fuel')} icon={<FuelIcon size={20} />} label="Akaryakıt Fişi Ekle" description="Fişi tara veya manuel gir" />
              <DashboardAction onClick={() => setActiveModule('invoices')} icon={<PieChart size={20} />} label="Günlük İcmal Al" description="Tesisin gün sonu raporu" />
              <DashboardAction onClick={() => setActiveModule('customers')} icon={<Users size={20} />} label="Cari Hareket Ekle" description="Tahsilat veya ödeme kaydı" />
            </div>
          </div>

          <div className="card" style={{ background: 'var(--primary)', color: 'white' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Yardım Merkezi</h3>
            <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '1.5rem' }}>Sistemle ilgili bir sorun mu yaşıyorsunuz? Destek ekibimize ulaşın.</p>
            <button className="btn" style={{ background: 'white', color: 'var(--primary)', width: '100%' }}>Destek Talebi Oluştur</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
      <main className="main-content">
        <header className="top-bar">
          <div className="search-box">
            <Search size={18} className="text-dim" />
            <input type="text" placeholder="Hızlı ara (Müşteri, Fatura, Plaka...)" />
          </div>
          <div className="user-nav">
            <button className="btn btn-primary" style={{ background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: '10px' }} onClick={() => setActiveModule('invoices-create')}>
              <Plus size={18} /> Fiş İşle
            </button>
            <button className="icon-btn" onClick={() => setActiveModule('alert-center')}>
              <Bell size={20} />
              <span className="notification-dot"></span>
            </button>
            <div className="user-profile" onClick={() => setActiveModule('settings')}>
              <div className="avatar">NÖ</div>
              <div className="user-info">
                <span className="user-name">Nurettin Ö.</span>
                <span className="user-role">Yönetici</span>
              </div>
            </div>
          </div>
        </header>
        <div className="content-area">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ title, value, trend, positive, icon }) => (
  <div className="card stat-card">
    <div className="stat-header">
      <div className="stat-icon">{icon}</div>
      <span className={`stat-trend ${positive ? 'up' : 'down'}`}>
        {trend}
      </span>
    </div>
    <div className="stat-body">
      <h3 className="stat-value">{value}</h3>
      <p className="stat-label">{title}</p>
    </div>
  </div>
);

const AlertItem = ({ icon, title, desc, time }) => (
  <div className="alert-item" style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--bg-main)', borderRadius: '12px' }}>
    <div style={{ marginTop: '0.25rem' }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <p style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{title}</p>
      <p className="text-muted" style={{ fontSize: '0.85rem' }}>{desc}</p>
    </div>
    <span className="text-dim" style={{ fontSize: '0.75rem' }}>{time}</span>
  </div>
);

const DashboardAction = ({ icon, label, description, onClick }) => (
  <div 
    className="dashboard-action" 
    onClick={onClick}
    style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '1rem', 
      padding: '1rem', 
      borderRadius: '12px', 
      border: '1px solid var(--border)',
      cursor: 'pointer',
      transition: 'all 0.2s'
    }}
  >
    <div style={{ color: 'var(--primary)' }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>{label}</p>
      <p className="text-muted" style={{ fontSize: '0.8rem' }}>{description}</p>
    </div>
    <ChevronRight size={16} className="text-dim" />
  </div>
);

export default App;
