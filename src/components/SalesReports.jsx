import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Target, FileText, Users2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { supabase } from '../lib/supabase';

const fmt = (v) => `₺${Number(v || 0).toLocaleString('tr-TR')}`;

const SalesReports = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .order('date', { ascending: false });
      setInvoices(data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const thisMonthSales = invoices
    .filter(i => (i.date || '').startsWith(thisMonthKey))
    .reduce((s, i) => s + Number(i.total_amount), 0);
  const totalSales = invoices.reduce((s, i) => s + Number(i.total_amount), 0);
  const avgInvoice = invoices.length > 0 ? totalSales / invoices.length : 0;

  const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const areaData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const ciro = invoices
      .filter(inv => (inv.date || '').startsWith(key))
      .reduce((s, inv) => s + Number(inv.total_amount), 0);
    return { name: monthNames[d.getMonth()], ciro };
  });

  const customerMap = {};
  invoices.forEach(inv => {
    const name = inv.customers?.name || 'Bilinmeyen';
    customerMap[name] = (customerMap[name] || 0) + Number(inv.total_amount);
  });
  const topCustomers = Object.entries(customerMap)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const maxSale = topCustomers[0]?.total || 1;

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Satış & Karlılık Raporları</h1>
          <p className="text-muted">Ciro hedeflerinizi, karlılık analizlerinizi ve satış performansınızı izleyin.</p>
        </div>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <SalesStatCard title="Bu Ay Ciro" value={fmt(thisMonthSales)} icon={<TrendingUp size={20} />} color="var(--primary)" />
        <SalesStatCard title="Toplam Ciro" value={fmt(totalSales)} icon={<BarChart3 size={20} />} color="var(--success)" />
        <SalesStatCard title="Toplam Fatura" value={`${invoices.length} Adet`} icon={<Target size={20} />} color="var(--warning)" />
        <SalesStatCard title="Ort. Fatura" value={fmt(avgInvoice)} icon={<FileText size={20} />} color="var(--text-dim)" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Ciro Analizi (6 Ay)</h3>
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
                <Tooltip formatter={v => [fmt(v), 'Ciro']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="ciro" name="Ciro" stroke="var(--primary)" fillOpacity={1} fill="url(#colorCiro)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users2 size={18} style={{ color: 'var(--primary)' }} /> En İyi Müşteriler
          </h3>
          {topCustomers.length === 0 ? (
            <p className="text-dim" style={{ textAlign: 'center', padding: '3rem 0' }}>Henüz satış verisi yok</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {topCustomers.map((c, i) => (
                <div key={c.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: '600' }}>{c.name}</span>
                    <span style={{ fontSize: '0.88rem', color: 'var(--primary)', fontWeight: '700' }}>{fmt(c.total)}</span>
                  </div>
                  <div style={{ height: '7px', background: 'var(--bg-main)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(c.total / maxSale) * 100}%`, background: i === 0 ? 'var(--primary)' : 'var(--text-dim)', borderRadius: '99px' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Fatura Listesi</h3>
        {loading ? (
          <p className="text-dim" style={{ textAlign: 'center', padding: '2rem' }}>Yükleniyor...</p>
        ) : invoices.length === 0 ? (
          <p className="text-dim" style={{ textAlign: 'center', padding: '2rem' }}>Henüz fatura yok</p>
        ) : (
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Fatura No</th>
                <th>Cari</th>
                <th>Tarih</th>
                <th style={{ textAlign: 'right' }}>Tutar</th>
                <th style={{ textAlign: 'right' }}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ padding: '1rem', fontWeight: '700' }}>{inv.invoice_no}</td>
                  <td>{inv.customers?.name || '—'}</td>
                  <td className="text-dim">{inv.date ? new Date(inv.date).toLocaleDateString('tr-TR') : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: '700' }}>{fmt(inv.total_amount)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`badge ${inv.status === 'Tahsil Edildi' ? 'badge-success' : 'badge-danger'}`}>
                      {inv.status || 'Bekliyor'}
                    </span>
                  </td>
                </tr>
              ))}
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
