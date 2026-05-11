import React from 'react';
import { BarChart3, TrendingUp, Target, FileText, ChevronRight, Users2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import useStore from '../store/useStore';
import { formatCurrency } from '../utils/formatters';

const SalesReports = () => {
  const invoices = useStore(s => s.invoices);
  const customers = useStore(s => s.customers);

  const salesInvoices = invoices.filter(i => i.type === 'Satış Faturası');
  const purchaseInvoices = invoices.filter(i => i.type !== 'Satış Faturası');

  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const thisMonthSales = salesInvoices.filter(i => i.date?.startsWith(thisMonthKey)).reduce((s, i) => s + i.total, 0);
  const thisMonthCost = purchaseInvoices.filter(i => i.date?.startsWith(thisMonthKey)).reduce((s, i) => s + i.total, 0);
  const grossProfit = thisMonthSales - thisMonthCost;
  const avgInvoice = salesInvoices.length > 0 ? salesInvoices.reduce((s, i) => s + i.total, 0) / salesInvoices.length : 0;

  // 6-month area chart
  const areaData = (() => {
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const ciro = salesInvoices.filter(inv => inv.date?.startsWith(key)).reduce((s, inv) => s + inv.total, 0);
      const cost = purchaseInvoices.filter(inv => inv.date?.startsWith(key)).reduce((s, inv) => s + inv.total, 0);
      return { name: monthNames[d.getMonth()], ciro, kar: ciro - cost };
    });
  })();

  // Top 5 customers by invoice total
  const customerSales = customers
    .map(c => ({
      name: c.name,
      total: salesInvoices.filter(i => i.customerId === c.id).reduce((s, i) => s + i.total, 0),
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const maxCustomerSale = customerSales[0]?.total || 1;

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Satış & Karlılık Raporları</h1>
          <p className="text-muted">Ciro hedeflerinizi, karlılık analizlerinizi ve satış performansınızı izleyin.</p>
        </div>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <SalesStatCard title="Bu Ay Ciro" value={formatCurrency(thisMonthSales)} icon={<TrendingUp size={20} />} color="var(--primary)" />
        <SalesStatCard title="Brüt Kâr" value={formatCurrency(grossProfit)} icon={<BarChart3 size={20} />} color={grossProfit >= 0 ? 'var(--success)' : 'var(--danger)'} />
        <SalesStatCard title="Toplam Fatura" value={`${salesInvoices.length} Adet`} icon={<Target size={20} />} color="var(--warning)" />
        <SalesStatCard title="Ort. Fatura" value={formatCurrency(avgInvoice)} icon={<FileText size={20} />} color="var(--text-dim)" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Ciro & Karlılık Analizi (6 Ay)</h3>
          <div style={{ width: '100%', height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="colorCiro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                <Area type="monotone" dataKey="ciro" name="Ciro" stroke="var(--primary)" fillOpacity={1} fill="url(#colorCiro)" strokeWidth={3} />
                <Area type="monotone" dataKey="kar" name="Kâr" stroke="var(--success)" fill="transparent" strokeWidth={3} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users2 size={18} style={{ color: 'var(--primary)' }} /> En İyi Müşteriler
          </h3>
          {customerSales.length === 0 ? (
            <p className="text-dim" style={{ textAlign: 'center', padding: '3rem 0' }}>Henüz satış verisi yok</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {customerSales.map((c, i) => (
                <div key={c.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: '600' }}>{c.name}</span>
                    <span style={{ fontSize: '0.88rem', color: 'var(--primary)', fontWeight: '700' }}>{formatCurrency(c.total)}</span>
                  </div>
                  <div style={{ height: '7px', background: 'var(--bg-main)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(c.total / maxCustomerSale) * 100}%`, background: i === 0 ? 'var(--primary)' : 'var(--text-dim)', borderRadius: '99px' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Satış Faturası Listesi</h3>
        {salesInvoices.length === 0 ? (
          <p className="text-dim" style={{ textAlign: 'center', padding: '2rem 0' }}>Henüz satış faturası yok</p>
        ) : (
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Fatura No</th>
                <th>Cari</th>
                <th>Tarih</th>
                <th>Vade</th>
                <th style={{ textAlign: 'right' }}>Tutar</th>
                <th style={{ textAlign: 'right' }}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {[...salesInvoices].sort((a, b) => b.date > a.date ? 1 : -1).map(inv => {
                const c = customers.find(c => c.id === inv.customerId);
                const statusLabel = inv.status === 'paid' ? 'Tahsil Edildi' : inv.status === 'partial' ? 'Kısmi' : 'Bekliyor';
                const statusClass = inv.status === 'paid' ? 'badge-success' : inv.status === 'partial' ? 'badge-warning' : 'badge-danger';
                return (
                  <tr key={inv.id}>
                    <td style={{ padding: '1rem', fontWeight: '700' }}>{inv.no}</td>
                    <td>{c?.name || '—'}</td>
                    <td className="text-dim">{inv.date}</td>
                    <td className="text-dim">{inv.dueDate || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700' }}>{formatCurrency(inv.total)}</td>
                    <td style={{ textAlign: 'right' }}><span className={`badge ${statusClass}`}>{statusLabel}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const SalesStatCard = ({ title, value, icon, color }) => (
  <div className="card">
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
      <div style={{ color }}>{icon}</div>
    </div>
    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{value}</h3>
    <p className="text-dim" style={{ fontSize: '0.85rem', fontWeight: '600' }}>{title}</p>
  </div>
);

export default SalesReports;
