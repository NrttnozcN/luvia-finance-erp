import React, { useState } from 'react';
import {
  Bell, AlertTriangle, Truck, FileText, Package,
  ShieldAlert, Clock, CheckCircle, Search,
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatDate } from '../utils/formatters';

const CATEGORY_META = {
  Fatura:  { icon: <FileText size={18} />,   color: 'var(--danger)',  label: 'Vadesi Geçmiş Fatura' },
  Araç:    { icon: <Truck size={18} />,      color: 'var(--warning)', label: 'Araç Uyarısı' },
  Sigorta: { icon: <ShieldAlert size={18} />, color: 'var(--warning)', label: 'Sigorta Uyarısı' },
  Stok:    { icon: <Package size={18} />,    color: 'var(--primary)', label: 'Stok Uyarısı' },
};

const AlertCenter = () => {
  const getAlerts = useStore(s => s.getAlerts);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Tümü');

  const allAlerts = getAlerts();

  const counts = {
    Fatura:  allAlerts.filter(a => a.category === 'Fatura').length,
    Araç:    allAlerts.filter(a => a.category === 'Araç').length,
    Sigorta: allAlerts.filter(a => a.category === 'Sigorta').length,
    Stok:    allAlerts.filter(a => a.category === 'Stok').length,
  };

  const visible = allAlerts.filter(a => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.detail.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'Tümü' || a.category === filter;
    return matchSearch && matchFilter;
  });

  const dangerCount = allAlerts.filter(a => a.type === 'danger').length;
  const warningCount = allAlerts.filter(a => a.type === 'warning').length;

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Akıllı Uyarı Merkezi</h1>
          <p className="text-muted">Kritik tarihleri, yaklaşan ödemeleri ve operasyonel uyarıları buradan takip edin.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {allAlerts.length > 0 ? (
            <span style={{ padding: '0.4rem 1rem', background: dangerCount > 0 ? 'var(--danger)' : 'var(--warning)', color: 'white', borderRadius: '99px', fontWeight: '700', fontSize: '0.85rem' }}>
              {allAlerts.length} Aktif Uyarı
            </span>
          ) : (
            <span style={{ padding: '0.4rem 1rem', background: 'var(--success)', color: 'white', borderRadius: '99px', fontWeight: '700', fontSize: '0.85rem' }}>
              Uyarı Yok
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <AlertStatCard title="Vadesi Geçmiş Fatura" count={counts.Fatura} sub="Acil Tahsilat" icon={<FileText size={20} />} color="var(--danger)" />
        <AlertStatCard title="Araç Uyarıları" count={counts.Araç} sub="Muayene / Bakım" icon={<Truck size={20} />} color="var(--warning)" />
        <AlertStatCard title="Stok Alarmları" count={counts.Stok} sub="Kritik / Biten" icon={<Package size={20} />} color="var(--primary)" />
        <AlertStatCard title="Sigorta Uyarıları" count={counts.Sigorta} sub="Yenileme Gerekli" icon={<ShieldAlert size={20} />} color="var(--warning)" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Aktif Uyarılar</h3>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-main)', padding: '0.45rem 0.85rem', borderRadius: '8px', alignItems: 'center' }}>
                <Search size={14} className="text-dim" />
                <input
                  type="text"
                  placeholder="Filtrele..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ background: 'transparent', border: 'none', fontSize: '0.82rem', outline: 'none', width: '120px' }}
                />
              </div>
              <select
                className="input"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.7rem' }}
              >
                <option>Tümü</option>
                <option>Fatura</option>
                <option>Araç</option>
                <option>Sigorta</option>
                <option>Stok</option>
              </select>
            </div>
          </div>

          {visible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <CheckCircle size={48} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
              <p style={{ fontWeight: '700', color: 'var(--text-main)' }}>Tüm sistemler normal</p>
              <p className="text-dim" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Şu an için kritik uyarı bulunmuyor.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {visible.map(alert => {
                const meta = CATEGORY_META[alert.category] || { icon: <Bell size={18} />, color: 'var(--text-dim)', label: alert.category };
                const borderColor = alert.type === 'danger' ? 'var(--danger)' : alert.type === 'warning' ? 'var(--warning)' : 'var(--primary)';
                return (
                  <div key={alert.id} style={{
                    padding: '1rem 1.25rem',
                    background: 'var(--bg-main)',
                    borderRadius: '12px',
                    borderLeft: `4px solid ${borderColor}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                      <div style={{ color: borderColor, flexShrink: 0 }}>{meta.icon}</div>
                      <div>
                        <p style={{ fontWeight: '700', fontSize: '0.92rem' }}>{alert.title}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>{alert.detail}</p>
                      </div>
                    </div>
                    <span style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '99px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      background: alert.type === 'danger' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                      color: borderColor,
                      flexShrink: 0,
                    }}>
                      {alert.category}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Özet</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <SummaryRow label="Kritik (Kırmızı)" count={dangerCount} color="var(--danger)" />
              <SummaryRow label="Uyarı (Sarı)" count={warningCount} color="var(--warning)" />
              <SummaryRow label="Toplam" count={allAlerts.length} color="var(--text-main)" bold />
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Bildirim Ayarları</h3>
            <p className="text-dim" style={{ fontSize: '0.82rem', marginBottom: '1.25rem' }}>Hangi durumlarda bildirim almak istediğinizi seçin.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <CheckRow label="SMS ile bilgilendir" defaultChecked />
              <CheckRow label="E-Posta ile bilgilendir" defaultChecked />
              <CheckRow label="Mobil Bildirim (Push)" />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>Ayarları Güncelle</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AlertStatCard = ({ title, count, sub, icon, color }) => (
  <div className="card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
      <div style={{ color }}>{icon}</div>
      {count > 0 && <AlertTriangle size={16} color={color} />}
    </div>
    <h3 style={{ fontSize: '1.8rem', marginBottom: '0.25rem', color: count > 0 ? color : 'var(--text-main)' }}>{count}</h3>
    <p className="text-dim" style={{ fontSize: '0.85rem', fontWeight: '600' }}>{title}</p>
    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>{sub}</p>
  </div>
);

const SummaryRow = ({ label, count, color, bold }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: '0.88rem', fontWeight: bold ? '700' : '500', color: 'var(--text-main)' }}>{label}</span>
    <span style={{ fontSize: '0.88rem', fontWeight: '700', color }}>{count}</span>
  </div>
);

const CheckRow = ({ label, defaultChecked }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.88rem', cursor: 'pointer', padding: '0.4rem', borderRadius: '8px' }}>
    <input type="checkbox" defaultChecked={defaultChecked} /> <span>{label}</span>
  </label>
);

export default AlertCenter;
