import React, { useState } from 'react';
import {
  Settings, Building2, Truck, Package, Wallet,
  ChevronRight, Plus, X, Layers, Search,
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatCurrency } from '../utils/formatters';
import { FormField } from './Invoices';

const Definitions = () => {
  const [activeSubTab, setActiveSubTab] = useState(null);

  const renderSubContent = () => {
    switch (activeSubTab) {
      case 'material_categories': return <MaterialCategoriesView onClose={() => setActiveSubTab(null)} />;
      case 'material_cards': return <MaterialCardsView onClose={() => setActiveSubTab(null)} />;
      default: return <DefinitionsMenu onSelect={setActiveSubTab} />;
    }
  };

  return (
    <div>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Sistem Tanımlamaları</h1>
        <p className="text-muted">Luvia ERP altyapısını, kategorileri ve genel parametreleri buradan yönetin.</p>
      </header>
      {renderSubContent()}
    </div>
  );
};

const MaterialCategoriesView = ({ onClose }) => {
  const stockItems = useStore(s => s.stockItems);

  const categories = (() => {
    const map = {};
    stockItems.forEach(s => {
      map[s.category] = (map[s.category] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  })();

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.4rem' }}><X size={20} /></button>
          <h3 style={{ fontSize: '1.25rem' }}>Malzeme Kategorileri</h3>
        </div>
        <button className="btn btn-primary"><Plus size={18} /> Yeni Kategori Ekle</button>
      </div>
      {categories.length === 0 ? (
        <p className="text-dim" style={{ textAlign: 'center', padding: '2rem 0' }}>Stok verisi yok</p>
      ) : (
        <div className="grid grid-cols-3" style={{ gap: '1rem' }}>
          {categories.map(c => <CategoryCard key={c.name} name={c.name} count={`${c.count} Ürün`} />)}
        </div>
      )}
    </div>
  );
};

const MaterialCardsView = ({ onClose }) => {
  const stockItems = useStore(s => s.stockItems);
  const [search, setSearch] = useState('');

  const visible = stockItems.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.4rem' }}><X size={20} /></button>
          <h3 style={{ fontSize: '1.25rem' }}>Malzeme Kartları</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-main)', padding: '0.45rem 0.85rem', borderRadius: '8px', alignItems: 'center' }}>
            <Search size={14} className="text-dim" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ara..." style={{ background: 'transparent', border: 'none', fontSize: '0.82rem', outline: 'none', width: '120px' }} />
          </div>
        </div>
      </div>
      <table style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Ürün Adı</th>
            <th>Kategori</th>
            <th>Birim</th>
            <th>Tesis</th>
            <th style={{ textAlign: 'right' }}>Stok</th>
            <th style={{ textAlign: 'right' }}>Birim Maliyet</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(s => (
            <tr key={s.id}>
              <td style={{ padding: '1rem', fontWeight: '700' }}>{s.name}</td>
              <td><span className="badge" style={{ background: 'var(--bg-main)' }}>{s.category}</span></td>
              <td className="text-dim">{s.unit}</td>
              <td className="text-dim">{s.facility}</td>
              <td style={{ textAlign: 'right', fontWeight: '800', color: s.qty <= 0 ? 'var(--danger)' : s.qty <= s.minQty ? 'var(--warning)' : 'inherit' }}>
                {s.qty} {s.unit}
              </td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(s.unitCost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const DefinitionsMenu = ({ onSelect }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <MenuGroup title="Genel Tanımlar" icon={<Settings size={18} />}>
      <MenuItem label="Tesis Tanımlama" />
      <MenuItem label="Ölçü Birimleri" />
      <MenuItem label="KDV Oranları" />
    </MenuGroup>

    <MenuGroup title="Filo & Araç" icon={<Truck size={18} />}>
      <MenuItem label="Araç Markaları" />
      <MenuItem label="Araç Modelleri" />
      <MenuItem label="Araç Tipleri" />
    </MenuGroup>

    <MenuGroup title="Stok & Depo" icon={<Package size={18} />}>
      <MenuItem label="Malzeme Kategorileri" onClick={() => onSelect('material_categories')} active />
      <MenuItem label="Malzeme Kartları" onClick={() => onSelect('material_cards')} active />
    </MenuGroup>

    <MenuGroup title="Finansal" icon={<Wallet size={18} />}>
      <MenuItem label="Cari Grupları" />
      <MenuItem label="KK Tipleri" />
      <MenuItem label="Kasa / Banka Tanımları" />
    </MenuGroup>
  </div>
);

const MenuGroup = ({ title, icon, children }) => (
  <div className="card" style={{ padding: '1.5rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: 'var(--primary)' }}>
      {icon}
      <h3 style={{ fontSize: '1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{children}</div>
  </div>
);

const MenuItem = ({ label, onClick, active }) => (
  <button
    onClick={onClick}
    className="btn btn-ghost"
    style={{
      justifyContent: 'space-between', width: '100%', padding: '0.85rem 1.25rem',
      background: active ? 'var(--primary-light)' : 'transparent',
      border: active ? '1px solid var(--primary)' : '1px solid transparent',
    }}
  >
    <span style={{ fontWeight: active ? '700' : '500' }}>{label}</span>
    <ChevronRight size={16} className="text-dim" />
  </button>
);

const CategoryCard = ({ name, count }) => (
  <div className="card" style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{ padding: '0.5rem', background: 'white', borderRadius: '8px', color: 'var(--primary)' }}><Layers size={18} /></div>
    <div>
      <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>{name}</p>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{count}</p>
    </div>
  </div>
);

export default Definitions;
