import React from 'react';
import { BarChart3, TrendingUp, TrendingDown, Truck, Users, Wrench } from 'lucide-react';
import { Disc, Fuel } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip,
  Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import useStore from '../store/useStore';
import { formatCurrency } from '../utils/formatters';

const COLORS = ['var(--primary)', '#64748b', '#94a3b8', '#cbd5e1', '#0ea5e9', '#f59e0b'];

const CostReports = () => {
  const fuelEntries = useStore(s => s.fuelEntries);
  const tireEntries = useStore(s => s.tireEntries);
  const invoices = useStore(s => s.invoices);
  const vehicles = useStore(s => s.vehicles);
  const personnel = useStore(s => s.personnel);
  const getVehicleTotalCost = useStore(s => s.getVehicleTotalCost);

  const salesInvoices = invoices.filter(i => i.type === 'Satış Faturası');
  const purchaseInvoices = invoices.filter(i => i.type !== 'Satış Faturası');

  const fuelTotal = fuelEntries.reduce((s, f) => s + f.total, 0);
  const tireTotal = tireEntries.reduce((s, t) => s + t.total, 0);
  const personnelTotal = personnel.reduce((s, p) => s + (p.salary || 0), 0);
  const invCosts = purchaseInvoices.reduce((s, i) => s + i.total, 0);
  const salesTotal = salesInvoices.reduce((s, i) => s + i.total, 0);
  const totalCost = fuelTotal + tireTotal + invCosts + personnelTotal;
  const grossProfit = salesTotal - totalCost;
  const grossMargin = salesTotal > 0 ? (grossProfit / salesTotal * 100).toFixed(1) : '0.0';

  const pieData = [
    { name: 'Akaryakıt', value: fuelTotal, color: 'var(--primary)' },
    { name: 'Bakım/Onarım', value: invCosts, color: '#64748b' },
    { name: 'Personel', value: personnelTotal, color: '#94a3b8' },
    { name: 'Lastik', value: tireTotal, color: '#cbd5e1' },
  ].filter(d => d.value > 0);

  const vehicleCostData = vehicles
    .map(v => ({ name: v.plate, maliyet: getVehicleTotalCost(v.id) }))
    .filter(d => d.maliyet > 0)
    .sort((a, b) => b.maliyet - a.maliyet)
    .slice(0, 8);

  const monthlyData = (() => {
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const gelir = salesInvoices.filter(inv => inv.date?.startsWith(key)).reduce((s, inv) => s + inv.total, 0);
      const gider = fuelEntries.filter(f => f.date?.startsWith(key)).reduce((s, f) => s + f.total, 0)
        + purchaseInvoices.filter(inv => inv.date?.startsWith(key)).reduce((s, inv) => s + inv.total, 0);
      return { name: monthNames[d.getMonth()], gelir, gider, kar: gelir - gider };
    });
  })();

  const expenseByCard = (() => {
    const map = {};
    invoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        const card = item.expenseCard || 'Genel';
        map[card] = (map[card] || 0) + (item.total || 0);
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 6);
  })();

  const summaryRows = [
    { label: 'Akaryakıt Giderleri', icon: <Fuel size={14} />, value: fuelTotal },
    { label: 'Bakım & Onarım (Faturalar)', icon: <Wrench size={14} />, value: invCosts },
    { label: 'Personel Maaşları', icon: <Users size={14} />, value: personnelTotal },
    { label: 'Lastik Giderleri', icon: <Disc size={14} />, value: tireTotal },
  ];

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Maliyet Raporları</h1>
          <p className="text-muted">Tesis, araç ve personel bazlı operasyonel maliyetlerinizi analiz edin.</p>
        </div>
        <button className="btn btn-primary">
          <BarChart3 size={18} /> Dışa Aktar
        </button>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <CostStatCard title="Toplam Gelir" value={formatCurrency(salesTotal)} sub="Satış Faturaları" icon={<TrendingUp size={20} />} color="var(--success)" />
        <CostStatCard title="Toplam Maliyet" value={formatCurrency(totalCost)} sub="Tüm Giderler" icon={<TrendingDown size={20} />} color="var(--danger)" />
        <CostStatCard title="Brüt Kâr" value={formatCurrency(grossProfit)} sub={grossProfit >= 0 ? 'Kâr' : 'Zarar'} icon={<BarChart3 size={20} />} color={grossProfit >= 0 ? 'var(--primary)' : 'var(--danger)'} />
        <CostStatCard title="Brüt Marj" value={`%${grossMargin}`} sub="Kâr Oranı" icon={<TrendingUp size={20} />} color="var(--warning)" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.2fr 1.8fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Gider Dağılımı</h3>
          {pieData.length === 0 ? (
            <p className="text-dim" style={{ textAlign: 'center', padding: '4rem 0' }}>Veri yok</p>
          ) : (
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <ReTooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Son 6 Ay Gelir / Gider / Kâr</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <ReTooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                <Bar dataKey="gelir" name="Gelir" fill="var(--success)" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="gider" name="Gider" fill="var(--danger)" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="kar" name="Kâr" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Araç Bazlı Toplam Maliyet</h3>
          {vehicleCostData.length === 0 ? (
            <p className="text-dim" style={{ textAlign: 'center', padding: '4rem 0' }}>Henüz araç maliyeti yok</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {vehicleCostData.map((v, i) => {
                const pct = vehicleCostData[0]?.maliyet > 0 ? (v.maliyet / vehicleCostData[0].maliyet * 100) : 0;
                return (
                  <div key={v.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Truck size={13} style={{ color: 'var(--text-dim)' }} /> {v.name}
                      </span>
                      <span style={{ fontSize: '0.9rem', color: i === 0 ? 'var(--danger)' : 'var(--primary)', fontWeight: '700' }}>{formatCurrency(v.maliyet)}</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-main)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? 'var(--danger)' : 'var(--primary)', borderRadius: '99px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Harcama Kartı Dağılımı</h3>
          {expenseByCard.length === 0 ? (
            <p className="text-dim" style={{ textAlign: 'center', padding: '4rem 0' }}>Veri yok</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {expenseByCard.map((e, i) => {
                const pct = expenseByCard[0]?.value > 0 ? (e.value / expenseByCard[0].value * 100) : 0;
                return (
                  <div key={e.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: '600' }}>{e.name}</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>{formatCurrency(e.value)}</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-main)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i % COLORS.length], borderRadius: '99px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Maliyet İcmal Tablosu</h3>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Maliyet Kalemi</th>
              <th style={{ textAlign: 'right' }}>Tutar</th>
              <th style={{ textAlign: 'right' }}>Oran</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map(row => (
              <tr key={row.label}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                    <span style={{ color: 'var(--primary)' }}>{row.icon}</span> {row.label}
                  </div>
                </td>
                <td style={{ textAlign: 'right', fontWeight: '700' }}>{formatCurrency(row.value)}</td>
                <td style={{ textAlign: 'right', color: 'var(--text-dim)' }}>
                  {totalCost > 0 ? `%${(row.value / totalCost * 100).toFixed(1)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--bg-main)' }}>
              <td style={{ padding: '1rem', fontWeight: '700' }}>Toplam Maliyet</td>
              <td style={{ textAlign: 'right', fontWeight: '900', color: 'var(--danger)', fontSize: '1.05rem' }}>{formatCurrency(totalCost)}</td>
              <td style={{ textAlign: 'right', fontWeight: '700' }}>%100</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

const CostStatCard = ({ title, value, sub, icon, color }) => (
  <div className="card" style={{ position: 'relative' }}>
    <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color, opacity: 0.8 }}>{icon}</div>
    <p className="text-dim" style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}>{title}</p>
    <h2 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>{value}</h2>
    <p style={{ fontSize: '0.8rem', color, fontWeight: '700' }}>{sub}</p>
  </div>
);

export default CostReports;
