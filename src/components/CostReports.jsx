import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingDown, Truck, Users, Wrench } from 'lucide-react';
import { Fuel } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip,
  Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { supabase } from '../lib/supabase';

const COLORS = ['var(--primary)', '#64748b', '#94a3b8'];
const fmt = (v) => `₺${Number(v || 0).toLocaleString('tr-TR')}`;

const CostReports = () => {
  const [fuelLogs, setFuelLogs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [
        { data: fuels },
        { data: invs },
        { data: vehs },
        { data: persList },
      ] = await Promise.all([
        supabase.from('fuel_logs').select('total_amount, vehicle_id, created_at'),
        supabase.from('invoices').select('total_amount, date'),
        supabase.from('vehicles').select('id, plate'),
        supabase.from('personnel').select('salary'),
      ]);
      setFuelLogs(fuels || []);
      setInvoices(invs || []);
      setVehicles(vehs || []);
      setPersonnel(persList || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const fuelTotal = fuelLogs.reduce((s, f) => s + Number(f.total_amount), 0);
  const personnelTotal = personnel.reduce((s, p) => s + Number(p.salary || 0), 0);
  const invCosts = invoices.reduce((s, i) => s + Number(i.total_amount), 0);
  const totalCost = fuelTotal + invCosts + personnelTotal;

  const pieData = [
    { name: 'Akaryakıt', value: fuelTotal, color: 'var(--primary)' },
    { name: 'Fatura/Bakım', value: invCosts, color: '#64748b' },
    { name: 'Personel', value: personnelTotal, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  const vehicleCostData = vehicles
    .map(v => ({
      name: v.plate,
      maliyet: fuelLogs
        .filter(f => f.vehicle_id === v.id)
        .reduce((s, f) => s + Number(f.total_amount), 0),
    }))
    .filter(d => d.maliyet > 0)
    .sort((a, b) => b.maliyet - a.maliyet)
    .slice(0, 8);

  const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const gider =
      fuelLogs.filter(f => (f.created_at || '').startsWith(key)).reduce((s, f) => s + Number(f.total_amount), 0) +
      invoices.filter(inv => (inv.date || '').startsWith(key)).reduce((s, inv) => s + Number(inv.total_amount), 0);
    return { name: monthNames[d.getMonth()], gider };
  });

  const summaryRows = [
    { label: 'Akaryakıt Giderleri', icon: <Fuel size={14} />, value: fuelTotal },
    { label: 'Fatura Giderleri', icon: <Wrench size={14} />, value: invCosts },
    { label: 'Personel Maaşları', icon: <Users size={14} />, value: personnelTotal },
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
        <CostStatCard title="Akaryakıt Gideri" value={fmt(fuelTotal)} sub="fuel_logs toplamı" icon={<TrendingDown size={20} />} color="var(--danger)" />
        <CostStatCard title="Fatura Gideri" value={fmt(invCosts)} sub="Tüm Faturalar" icon={<TrendingDown size={20} />} color="var(--warning)" />
        <CostStatCard title="Personel Maaşı" value={fmt(personnelTotal)} sub="Aylık Toplam" icon={<Users size={20} />} color="var(--primary)" />
        <CostStatCard title="Toplam Maliyet" value={fmt(totalCost)} sub="Genel Toplam" icon={<BarChart3 size={20} />} color="var(--danger)" />
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
                  <ReTooltip formatter={v => [fmt(v)]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Son 6 Ay Aylık Gider</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <ReTooltip formatter={v => [fmt(v), 'Gider']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="gider" name="Gider" fill="var(--danger)" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {vehicleCostData.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Araç Bazlı Akaryakıt Maliyeti</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {vehicleCostData.map((v, i) => {
              const pct = vehicleCostData[0]?.maliyet > 0 ? (v.maliyet / vehicleCostData[0].maliyet * 100) : 0;
              return (
                <div key={v.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Truck size={13} style={{ color: 'var(--text-dim)' }} /> {v.name}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: i === 0 ? 'var(--danger)' : 'var(--primary)', fontWeight: '700' }}>{fmt(v.maliyet)}</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-main)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? 'var(--danger)' : 'var(--primary)', borderRadius: '99px', transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                <td style={{ textAlign: 'right', fontWeight: '700' }}>{fmt(row.value)}</td>
                <td style={{ textAlign: 'right', color: 'var(--text-dim)' }}>
                  {totalCost > 0 ? `%${(row.value / totalCost * 100).toFixed(1)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--bg-main)' }}>
              <td style={{ padding: '1rem', fontWeight: '700' }}>Toplam Maliyet</td>
              <td style={{ textAlign: 'right', fontWeight: '900', color: 'var(--danger)', fontSize: '1.05rem' }}>{fmt(totalCost)}</td>
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
