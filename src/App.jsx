import { useState, useEffect } from 'react';
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
import CustomerMovementReport from './components/CustomerMovementReport';
import KasaHareketRaporu from './components/KasaHareketRaporu';
import SupportTickets from './components/SupportTickets';
import Companies from './components/Companies';
import Login from './components/Login';
import AIAssistant from './components/AIAssistant';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell,
} from 'recharts';
import {
  Bell, Search, Plus, DollarSign, Truck, Fuel as FuelIcon,
  PieChart, Users, AlertCircle, Clock, ChevronRight,
  TrendingUp, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { supabase } from './lib/supabase';

import useAuthStore from './store/authStore';

const daysUntil = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '—';

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const App = () => {
  const [activeModule, setActiveModule] = useState('dashboard');
  const currentUser = useAuthStore(s => s.currentUser);
  const cid = currentUser?.company_id;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportForm, setSupportForm] = useState({ title: '', description: '' });
  const [supportSending, setSupportSending] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem('luvia_notifications') || '[]'); }
    catch { return []; }
  });
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const [stats, setStats] = useState({ totalSales: 0, vehicleCount: 0, customerCount: 0, fuelCost: 0, pendingInvoices: 0 });
  const [monthlyData, setMonthlyData] = useState([]);
  const [expensePie, setExpensePie] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [upcomingAlerts, setUpcomingAlerts] = useState([]);

  const fetchDashboardStats = async () => {
    if (!cid) return;
    const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

    const [
      { data: invs },
      { count: vCount },
      { count: cCount },
      { data: fuel },
      { data: emps },
      { data: recentTx },
    ] = await Promise.all([
      supabase.from('invoices').select('total_amount, date, islem_turu').eq('company_id', cid),
      supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', cid),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', cid),
      supabase.from('fuel_logs').select('total_amount').eq('company_id', cid),
      supabase.from('employees').select('salary').eq('company_id', cid),
      supabase.from('finance_transactions').select('*').eq('company_id', cid).order('date', { ascending: false }).limit(8),
    ]);

    const totalSales   = invs?.filter(i => i.islem_turu === 'Satış Faturası').reduce((s, i) => s + Number(i.total_amount), 0) || 0;
    const fuelCost     = fuel?.reduce((s, f) => s + Number(f.total_amount), 0) || 0;
    const persTotal    = emps?.reduce((s, e) => s + Number(e.salary || 0), 0) || 0;
    const invGider     = invs?.filter(i => i.islem_turu === 'Alış Faturası').reduce((s, i) => s + Number(i.total_amount), 0) || 0;

    const monthly = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const gelir = invs?.filter(inv => inv.islem_turu === 'Satış Faturası' && (inv.date || '').startsWith(key)).reduce((s, inv) => s + Number(inv.total_amount), 0) || 0;
      const gider = invs?.filter(inv => inv.islem_turu === 'Alış Faturası' && (inv.date || '').startsWith(key)).reduce((s, inv) => s + Number(inv.total_amount), 0) || 0;
      return { name: MONTHS[d.getMonth()], Gelir: Math.round(gelir), Gider: Math.round(gider) };
    });

    const pie = [
      { name: 'Akaryakıt',     value: Math.round(fuelCost),  color: '#6366F1' },
      { name: 'Personel',      value: Math.round(persTotal),  color: '#10B981' },
      { name: 'Fatura Gideri', value: Math.round(invGider),   color: '#F43F5E' },
    ].filter(d => d.value > 0);

    setStats({ totalSales, vehicleCount: vCount || 0, customerCount: cCount || 0, fuelCost, pendingInvoices: invs?.length || 0 });
    setMonthlyData(monthly);
    setExpensePie(pie);
    setRecentTransactions(recentTx || []);
  };

  const fetchUpcomingAlerts = async () => {
    if (!cid) return;
    const future60 = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
    const future30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const { data: compVehs } = await supabase.from('vehicles').select('id').eq('company_id', cid);
    const vIds = (compVehs || []).map(v => v.id);

    const vQuery = vIds.length
      ? [
          supabase.from('vehicle_inspections').select('id, type, expiry_date, vehicles(plate)').in('vehicle_id', vIds).not('expiry_date', 'is', null).lte('expiry_date', future60).order('expiry_date').limit(10),
          supabase.from('vehicle_insurances').select('id, insurance_type, expiry_date, company, vehicles(plate)').in('vehicle_id', vIds).not('expiry_date', 'is', null).lte('expiry_date', future60).order('expiry_date').limit(10),
        ]
      : [Promise.resolve({ data: [] }), Promise.resolve({ data: [] })];

    const [{ data: insps }, { data: insurs }, { data: empDocs }, { data: stockMovsRaw }] = await Promise.all([
      ...vQuery,
      supabase.from('employee_documents').select('id, doc_type, file_name, expiry_date, employees(full_name)').eq('company_id', cid).not('expiry_date', 'is', null).lte('expiry_date', future30).order('expiry_date').limit(10),
      supabase.from('stock_movements').select('material_id, quantity, movement_type, materials(id, name, category, min_stock_level)').eq('company_id', cid),
    ]);

    const stockMap = {};
    (stockMovsRaw || []).forEach(mov => {
      const mid = mov.material_id;
      if (!mid) return;
      if (!stockMap[mid]) {
        stockMap[mid] = {
          name: mov.materials?.name || mid,
          minLevel: Number(mov.materials?.min_stock_level ?? 10),
          qty: 0,
        };
      }
      const q = Number(mov.quantity || 0);
      if (mov.movement_type === 'Giriş') stockMap[mid].qty += q;
      else stockMap[mid].qty -= q;
    });
    const criticalStockAlerts = Object.entries(stockMap)
      .filter(([, v]) => v.qty <= v.minLevel)
      .map(([mid, v]) => ({
        id: `stock-${mid}`,
        category: 'Stok Uyarısı',
        label: v.name,
        expiry: null,
        days: v.qty <= 0 ? -1 : 3,
        badge: `${Math.max(0, Math.round(v.qty))} adet`,
      }));

    const items = [
      ...(insps || []).map(i => ({ id: `i-${i.id}`, category: 'Muayene', label: `${i.type} — ${i.vehicles?.plate || ''}`, expiry: i.expiry_date, days: daysUntil(i.expiry_date) })),
      ...(insurs || []).map(i => ({ id: `s-${i.id}`, category: 'Sigorta', label: `${i.insurance_type}${i.company ? ' (' + i.company + ')' : ''} — ${i.vehicles?.plate || ''}`, expiry: i.expiry_date, days: daysUntil(i.expiry_date) })),
      ...(empDocs || []).map(d => ({ id: `d-${d.id}`, category: 'Personel Belgesi', label: `${d.doc_type} — ${d.employees?.full_name || ''}`, expiry: d.expiry_date, days: daysUntil(d.expiry_date) })),
      ...criticalStockAlerts,
    ].sort((a, b) => a.days - b.days);
    setUpcomingAlerts(items);
  };

  useEffect(() => {
    if (currentUser) { fetchDashboardStats(); fetchUpcomingAlerts(); }
  }, [currentUser, activeModule]);

  useEffect(() => {
    if (currentUser?.role !== 'Admin') return;
    if (Notification.permission === 'default') Notification.requestPermission();

    const channel = supabase
      .channel('admin-tickets-watch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, (payload) => {
        const ticket = payload.new;
        const notif = {
          id: `${ticket.id}-${Date.now()}`,
          title: 'Yeni Destek Talebi',
          body: `${ticket.user_name}: ${ticket.title}`,
          time: new Date().toISOString(),
          read: false,
          tab: 'support_tickets',
        };
        if (Notification.permission === 'granted') {
          new Notification(notif.title, { body: notif.body });
        }
        setNotifications(prev => {
          const updated = [notif, ...prev].slice(0, 50);
          localStorage.setItem('luvia_notifications', JSON.stringify(updated));
          return updated;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  const markAllRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem('luvia_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const clearNotifications = () => {
    localStorage.removeItem('luvia_notifications');
    setNotifications([]);
  };

  const handleNotifClick = (notif) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === notif.id ? { ...n, read: true } : n);
      localStorage.setItem('luvia_notifications', JSON.stringify(updated));
      return updated;
    });
    setActiveModule(notif.tab);
    setShowNotifPanel(false);
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); setShowSearch(false); return; }
    setShowSearch(true);
    const term = `%${q.trim()}%`;
    const [{ data: custs }, { data: invs }, { data: vehs }] = await Promise.all([
      supabase.from('customers').select('id, name').ilike('name', term).eq('company_id', cid).limit(4),
      supabase.from('invoices').select('id, invoice_no').ilike('invoice_no', term).eq('company_id', cid).limit(4),
      supabase.from('vehicles').select('id, plate').ilike('plate', term).eq('company_id', cid).limit(4),
    ]);
    const results = [
      ...(custs || []).map(r => ({ label: r.name, sub: 'Cari', tab: 'cariler' })),
      ...(invs  || []).map(r => ({ label: r.invoice_no, sub: 'Fatura', tab: 'invoices' })),
      ...(vehs  || []).map(r => ({ label: r.plate, sub: 'Araç', tab: 'vehicles' })),
    ];
    setSearchResults(results);
  };

  if (!currentUser) return <Login />;

  const renderContent = () => {
    switch (activeModule) {
      case 'dashboard': return renderDashboard();
      case 'vehicles': return <Vehicles />;
      case 'customers': case 'cariler': return <Customers />;
      case 'invoices': return <Invoices />;
      case 'invoices-create': return <Invoices initialView="create" />;
      case 'finance': case 'wallets': return <Finance />;
      case 'revenue-expense': case 'rev_exp': return <RevenueExpense />;
      case 'checks': return <Checks />;
      case 'fuel': return <Fuel />;
      case 'tires': return <Tires />;
      case 'purchasing': return <Purchasing />;
      case 'personnel': case 'personnel_def': return <Personnel initialTab="definition" />;
      case 'personnel_payroll': return <Personnel initialTab="payroll" />;
      case 'personnel_pos': return <Personnel initialTab="position" />;
      case 'documents': case 'logs': return <Documents />;
      case 'settings': return <Settings />;
      case 'stock': return <Stock />;
      case 'sales-reports': case 'sales': return <SalesReports />;
      case 'cost-reports': case 'costs': return <CostReports />;
      case 'definitions': return <Definitions />;
      case 'alert-center': case 'alerts': return <AlertCenter />;
      case 'bulk-transfers': case 'transfers': return <BulkTransfers />;
      case 'ledgers': return <Ledgers />;
      case 'facilities': return <Facilities />;
      case 'cari_rapor': return <CustomerMovementReport />;
      case 'kasa_rapor': return <KasaHareketRaporu />;
      case 'support_tickets': return <SupportTickets />;
      case 'companies': return <Companies />;
      default: return renderDashboard();
    }
  };

  const renderDashboard = () => {
    const fmt = (n) => `₺${Number(n || 0).toLocaleString('tr-TR')}`;
    const cardStyle = (style = {}) => ({
      background: 'white', borderRadius: '20px', padding: '1.75rem',
      boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
      ...style,
    });

    return (
      <div style={{ paddingBottom: '2rem' }}>
        {/* Header */}
        <header style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1E293B', marginBottom: '4px' }}>
            Hoş Geldiniz, {currentUser?.name?.split(' ')[0] || 'Admin'} 👋
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>İşletmenizin finansal ve operasyonel özeti.</p>
        </header>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 dashboard-stats-row" style={{ marginBottom: '1.75rem' }}>
          <DashStatCard title="Toplam Ciro"      value={fmt(stats.totalSales)}    sub="Tüm satış faturaları"  icon={<TrendingUp size={20} />}  gradient="linear-gradient(135deg,#6366F1,#8B5CF6)" />
          <DashStatCard title="Aktif Filo"        value={stats.vehicleCount}       sub="Kayıtlı araç sayısı"   icon={<Truck size={20} />}       gradient="linear-gradient(135deg,#10B981,#059669)" />
          <DashStatCard title="Akaryakıt Gideri"  value={fmt(stats.fuelCost)}      sub="Toplam yakıt maliyeti" icon={<FuelIcon size={20} />}    gradient="linear-gradient(135deg,#F43F5E,#E11D48)" />
          <DashStatCard title="Cari Hesaplar" value={stats.customerCount} sub="Aktif cari sayısı" icon={<Users size={20} />} gradient="linear-gradient(135deg,#F59E0B,#D97706)" />
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Area Chart */}
          <div style={cardStyle()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#1E293B', marginBottom: '2px' }}>Gelir / Gider Trendi</h3>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Son 6 aylık karşılaştırma</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', fontWeight: '700' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#6366F1' }}>
                  <span style={{ width: '12px', height: '3px', background: '#6366F1', borderRadius: '2px', display: 'inline-block' }} /> Gelir
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#F43F5E' }}>
                  <span style={{ width: '12px', height: '3px', background: '#F43F5E', borderRadius: '2px', display: 'inline-block' }} /> Gider
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gelirGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="giderGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.14} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} fontSize={11} tick={{ fill: '#94a3b8' }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <ReTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: '0.83rem' }} formatter={(v, n) => [fmt(v), n]} />
                <Area type="monotone" dataKey="Gelir" stroke="#6366F1" strokeWidth={2.5} fill="url(#gelirGrad)" dot={{ fill: '#6366F1', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                <Area type="monotone" dataKey="Gider" stroke="#F43F5E" strokeWidth={2.5} fill="url(#giderGrad)" dot={{ fill: '#F43F5E', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div style={cardStyle()}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#1E293B', marginBottom: '2px' }}>Gider Dağılımı</h3>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Kategori bazlı maliyet analizi</p>
            </div>
            {expensePie.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94a3b8', fontSize: '0.85rem' }}>Veri yok</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <RPieChart>
                    <Pie data={expensePie} innerRadius={52} outerRadius={78} paddingAngle={4} dataKey="value" startAngle={90} endAngle={-270}>
                      {expensePie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <ReTooltip formatter={v => [fmt(v)]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: '0.82rem' }} />
                  </RPieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                  {expensePie.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1E293B' }}>{fmt(item.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '1.5rem' }}>
          {/* Left: Son İşlemler + Uyarılar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Son İşlemler */}
            <div style={cardStyle()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#1E293B', marginBottom: '2px' }}>Son İşlemler</h3>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>En son finansal hareketler</p>
                </div>
                <button className="btn btn-ghost" style={{ fontSize: '0.82rem' }} onClick={() => setActiveModule('wallets')}>Tümünü Gör →</button>
              </div>
              {recentTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>Henüz işlem kaydı bulunmuyor.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {recentTransactions.map((tx, i) => {
                    const isGelir = tx.type === 'Gelir' || Number(tx.amount) >= 0;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem', borderRadius: '12px', background: '#f8fafc' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: isGelir ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isGelir ? <ArrowUpRight size={17} color="#10B981" /> : <ArrowDownRight size={17} color="#F43F5E" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: '700', fontSize: '0.87rem', color: '#1E293B', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.description || tx.type || 'İşlem'}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{tx.date ? new Date(tx.date).toLocaleDateString('tr-TR') : '—'}</p>
                        </div>
                        <span style={{ fontWeight: '800', fontSize: '0.93rem', color: isGelir ? '#10B981' : '#F43F5E', whiteSpace: 'nowrap' }}>
                          {isGelir ? '+' : '-'}₺{Math.abs(Number(tx.amount || 0)).toLocaleString('tr-TR')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Yaklaşan Uyarılar */}
            <div style={cardStyle()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#1E293B', marginBottom: '2px' }}>Yaklaşan Uyarılar</h3>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Muayene, sigorta, belge & kritik stok</p>
                </div>
                <button className="btn btn-ghost" style={{ fontSize: '0.82rem' }} onClick={() => setActiveModule('alert-center')}>Tümünü Gör →</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {upcomingAlerts.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>Yaklaşan uyarı bulunmuyor.</p>
                ) : upcomingAlerts.slice(0, 4).map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem', borderRadius: '12px', background: a.days < 0 ? 'rgba(244,63,94,0.05)' : a.days <= 7 ? 'rgba(245,158,11,0.05)' : '#f8fafc' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: a.days < 0 ? 'rgba(244,63,94,0.12)' : a.days <= 7 ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {a.days < 0 ? <AlertCircle size={17} color="#F43F5E" /> : <Clock size={17} color={a.days <= 7 ? '#f59e0b' : '#6366F1'} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: '700', fontSize: '0.87rem', color: '#1E293B', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</p>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{a.category} — {fmtDate(a.expiry)}</p>
                    </div>
                    <span style={{ fontSize: '0.76rem', fontWeight: '800', padding: '0.22rem 0.6rem', borderRadius: '20px', whiteSpace: 'nowrap', background: a.days < 0 ? 'rgba(244,63,94,0.12)' : a.days <= 7 ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.1)', color: a.days < 0 ? '#F43F5E' : a.days <= 7 ? '#f59e0b' : '#6366F1' }}>
                      {a.badge ? a.badge : (a.days < 0 ? `${Math.abs(a.days)}g geçti` : a.days === 0 ? 'Bugün!' : `${a.days}g kaldı`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Hızlı İşlemler + Destek */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={cardStyle()}>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#1E293B', marginBottom: '1.25rem' }}>Hızlı İşlemler</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {[
                  { icon: <Truck size={17} />,     label: 'Araç Seferi Başlat', tab: 'vehicles',       color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
                  { icon: <FuelIcon size={17} />,  label: 'Akaryakıt Fişi Ekle', tab: 'fuel',          color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
                  { icon: <DollarSign size={17} />,label: 'Yeni Fatura İşle',   tab: 'invoices-create', color: '#F43F5E', bg: 'rgba(244,63,94,0.1)' },
                  { icon: <Users size={17} />,     label: 'Cari Hareket Ekle',  tab: 'customers',      color: '#1E293B', bg: 'rgba(30,41,59,0.08)' },
                ].map((a, i) => (
                  <button key={i} onClick={() => setActiveModule(a.tab)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem', borderRadius: '12px', background: '#f8fafc', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.18s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.transform = 'translateX(3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.transform = 'translateX(0)'; }}>
                    <div style={{ width: '35px', height: '35px', borderRadius: '10px', background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.color, flexShrink: 0 }}>{a.icon}</div>
                    <span style={{ fontWeight: '700', fontSize: '0.87rem', color: '#1E293B', flex: 1 }}>{a.label}</span>
                    <ChevronRight size={14} color="#94a3b8" />
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', borderRadius: '20px', padding: '1.75rem', boxShadow: '0 8px 32px rgba(99,102,241,0.28)' }}>
              <h3 style={{ color: 'white', fontWeight: '800', fontSize: '1rem', marginBottom: '0.4rem' }}>Yardım Merkezi</h3>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.84rem', marginBottom: '1.25rem', lineHeight: '1.55' }}>Bir sorun mu yaşıyorsunuz? Destek ekibimize ulaşın.</p>
              <button onClick={() => setShowSupportModal(true)}
                style={{ width: '100%', padding: '0.7rem', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', transition: 'background 0.18s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}>
                Destek Talebi Oluştur
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleSupportSubmit = async () => {
    if (!supportForm.title.trim()) return;
    setSupportSending(true);
    const { data: ticket } = await supabase.from('support_tickets').insert([{
      user_id: currentUser?.id,
      user_name: currentUser?.name,
      user_email: currentUser?.email,
      title: supportForm.title.trim(),
      description: supportForm.description.trim(),
      status: 'Açık',
    }]).select().single();
    if (ticket) {
      await supabase.from('support_messages').insert([{
        ticket_id: ticket.id,
        sender_id: currentUser?.id,
        sender_name: currentUser?.name,
        sender_role: currentUser?.role,
        message: supportForm.description.trim() || supportForm.title.trim(),
        is_admin_reply: false,
      }]);
    }
    setSupportSending(false);
    setShowSupportModal(false);
    setSupportForm({ title: '', description: '' });
    alert('✅ Destek talebiniz oluşturuldu. Admin ekibi en kısa sürede dönüş yapacaktır.');
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeModule} setActiveTab={setActiveModule} />
      <main className="main-content">
        <header className="top-bar">
          <div style={{ position: 'relative' }}>
            <div className="search-box">
              <Search size={18} className="text-dim" />
              <input
                type="text"
                placeholder="Hızlı ara (Müşteri, Fatura, Plaka...)"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                onFocus={() => searchResults.length > 0 && setShowSearch(true)}
              />
            </div>
            {showSearch && searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 999, overflow: 'hidden' }}>
                {searchResults.map((r, i) => (
                  <button key={i} onMouseDown={() => { setActiveModule(r.tab); setSearchQuery(''); setShowSearch(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--bg-main)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '6px' }}>{r.sub}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{r.label}</span>
                  </button>
                ))}
              </div>
            )}
            {showSearch && searchResults.length === 0 && searchQuery.length >= 2 && (
              <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', zIndex: 999, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                Sonuç bulunamadı
              </div>
            )}
          </div>
          <div className="user-nav">
            <button className="btn btn-primary" style={{ background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: '10px' }} onClick={() => setActiveModule('invoices-create')}>
              <Plus size={18} /> Fiş İşle
            </button>
            <div style={{ position: 'relative' }}>
              <button className="icon-btn" style={{ position: 'relative' }} onClick={() => setShowNotifPanel(s => !s)}>
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--danger)', color: 'white', borderRadius: '10px', padding: '0.1rem 0.38rem', fontSize: '0.62rem', fontWeight: '800', minWidth: '16px', textAlign: 'center', lineHeight: '1.4' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifPanel && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '360px', background: 'white', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 1000, overflow: 'hidden' }}
                  onMouseLeave={() => {}}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text)' }}>Bildirimler</h3>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700' }}>Tümünü Okundu</button>
                      )}
                      {notifications.length > 0 && (
                        <button onClick={clearNotifications} style={{ fontSize: '0.75rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>Temizle</button>
                      )}
                      <button onClick={() => setShowNotifPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }}>✕</button>
                    </div>
                  </div>
                  <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <p style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>Bildirim bulunmuyor</p>
                    ) : notifications.map((notif, i) => (
                      <button key={i} onClick={() => handleNotifClick(notif)}
                        style={{ display: 'block', width: '100%', padding: '0.9rem 1.25rem', background: notif.read ? 'none' : 'rgba(255,107,0,0.05)', border: 'none', borderBottom: '1px solid var(--bg-main)', cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                        onMouseLeave={e => e.currentTarget.style.background = notif.read ? 'none' : 'rgba(255,107,0,0.05)'}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: notif.read ? 'var(--border)' : 'var(--primary)', flexShrink: 0, marginTop: '5px' }} />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '2px', color: 'var(--text)' }}>{notif.title}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{notif.body}</p>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{new Date(notif.time).toLocaleString('tr-TR')}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                    <button onClick={() => { setActiveModule('support_tickets'); setShowNotifPanel(false); }} style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Tüm Destek Taleplerini Gör →
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="user-profile" onClick={() => setActiveModule('settings')}>
              <div className="avatar">{getInitials(currentUser?.name)}</div>
              <div className="user-info">
                <span className="user-name">{currentUser?.name?.split(' ').slice(0, 2).join(' ')}</span>
                <span className="user-role">{currentUser?.roleLabel || currentUser?.role}</span>
              </div>
            </div>
          </div>
        </header>
        <div className="content-area">
          {renderContent()}
        </div>
      </main>

      {/* Destek Talebi Modal */}
      {showSupportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Destek Talebi Oluştur</h2>
              <button onClick={() => setShowSupportModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Konu *</label>
                <input className="input" value={supportForm.title} onChange={e => setSupportForm({ ...supportForm, title: e.target.value })} placeholder="Sorunuzu kısaca belirtin" />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Açıklama</label>
                <textarea className="input" value={supportForm.description} onChange={e => setSupportForm({ ...supportForm, description: e.target.value })} placeholder="Detayları açıklayın (hangi modül, hangi adım, hata mesajı...)" rows={4} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowSupportModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleSupportSubmit} disabled={supportSending || !supportForm.title.trim()} style={{ flex: 2 }}>
                {supportSending ? 'Gönderiliyor...' : '📩 Talebi Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}
      <AIAssistant />
    </div>
  );
};

const DashStatCard = ({ title, value, sub, icon, gradient }) => (
  <div className="dash-stat-card" style={{ background: gradient, borderRadius: '20px', padding: '1.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.13)', color: 'white', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: '-18px', right: '-18px', width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
    <div style={{ position: 'absolute', bottom: '-25px', right: '18px', width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
    <div style={{ position: 'relative' }}>
      <div style={{ padding: '0.5rem', borderRadius: '11px', background: 'rgba(255,255,255,0.2)', display: 'inline-flex', marginBottom: '1rem' }}>{icon}</div>
      <h3 style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '0.15rem', letterSpacing: '-0.02em' }}>{value}</h3>
      <p style={{ fontSize: '0.88rem', fontWeight: '700', marginBottom: '2px' }}>{title}</p>
      <p style={{ fontSize: '0.74rem', opacity: 0.85 }}>{sub}</p>
    </div>
  </div>
);

const StatCard = ({ label, value, color }) => (
  <div className="card" style={{ borderLeft: `4px solid ${color}` }}>
    <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: '600', marginBottom: '0.5rem' }}>{label}</p>
    <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>{value}</h3>
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

const MiniCard = ({ label, value, color }) => (
  <div className="card" style={{ borderLeft: `4px solid ${color}`, padding: '1rem' }}>
    <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{label}</p>
    <p style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>{value}</p>
  </div>
);

export default App;
