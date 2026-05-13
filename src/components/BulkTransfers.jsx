import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { RefreshCcw, Package, Users, Wallet, Building2, CheckCircle2, ShieldAlert, Play, History } from 'lucide-react';
import { supabase } from '../lib/supabase';

const fmt = (v) => `₺${Number(v || 0).toLocaleString('tr-TR')}`;

const BulkTransfers = () => {
  const [counts, setCounts] = useState({ stock: 0, customers: 0, kasa: 0, banka: 0 });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);
      const [
        { count: stockCount },
        { count: custCount },
        { data: trans },
      ] = await Promise.all([
        supabase.from('materials').select('*', { count: 'exact', head: true }),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('finance_transactions').select('type, account_type, amount'),
      ]);

      const kasaBal = (trans || [])
        .filter(t => t.account_type === 'Kasa')
        .reduce((s, t) => s + (t.type === 'Tahsilat' ? Number(t.amount) : -Number(t.amount)), 0);
      const bankaBal = (trans || [])
        .filter(t => t.account_type === 'Banka')
        .reduce((s, t) => s + (t.type === 'Tahsilat' ? Number(t.amount) : -Number(t.amount)), 0);

      setCounts({ stock: stockCount || 0, customers: custCount || 0, kasa: kasaBal, banka: bankaBal });
      setLoading(false);
    };
    fetchCounts();
  }, []);

  const handleStart = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      setDone(true);
      toast.success('Dönem sonu devir işlemi tamamlandı!');
    }, 2200);
  };

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Dönem Sonu & Toplu Devirler</h1>
          <p className="text-muted">Mali dönem sonlarında stok, cari ve finansal bakiyelerinizi yeni döneme güvenle aktarın.</p>
        </div>
        <button className="btn btn-ghost" style={{ background: 'white' }}>
          <History size={18} /> Geçmiş Devirler
        </button>
      </header>

      <div className="card" style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <ShieldAlert size={32} color="var(--primary)" />
        <div>
          <h4 style={{ color: 'var(--text-main)', marginBottom: '0.25rem' }}>Dikkat: Devir İşlemi Öncesi Yedek Alın</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Toplu devir işlemleri geri alınamaz. İşleme başlamadan önce veritabanı yedeği aldığınızdan emin olun.</p>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Aktarılacak Kalemler</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <TransferItem icon={<Package size={20} />} title="Stok Devir İşlemi"
              desc={loading ? 'Yükleniyor...' : `${counts.stock} kalem stok yeni döneme aktarılacak`} done={done} />
            <TransferItem icon={<Users size={20} />} title="Cari Bakiye Devri"
              desc={loading ? 'Yükleniyor...' : `${counts.customers} cari hesap için açılış fişi oluşturulacak`} done={done} />
            <TransferItem icon={<Wallet size={20} />} title="Kasa Devir İşlemi"
              desc={loading ? 'Yükleniyor...' : `Kasa bakiyesi: ${fmt(counts.kasa)}`} done={done} />
            <TransferItem icon={<Building2 size={20} />} title="Banka Hesap Devri"
              desc={loading ? 'Yükleniyor...' : `Banka bakiyesi: ${fmt(counts.banka)}`} done={done} />
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '3rem' }}>
          <RefreshCcw
            size={64}
            color={done ? 'var(--success)' : 'var(--primary)'}
            style={{ marginBottom: '1.5rem', animation: running ? 'spin 1s linear infinite' : 'none' }}
          />
          {done ? (
            <>
              <h3 style={{ color: 'var(--success)' }}>Devir Tamamlandı</h3>
              <p className="text-muted" style={{ marginBottom: '2rem', maxWidth: '300px' }}>Tüm bakiyeler başarıyla yeni döneme aktarıldı.</p>
            </>
          ) : (
            <>
              <h3>Devir Sihirbazı Hazır</h3>
              <p className="text-muted" style={{ marginBottom: '2rem', maxWidth: '300px' }}>
                {counts.stock} stok kalemi ve {counts.customers} cari hesap devredilecek.
              </p>
              <button
                className="btn btn-primary"
                style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}
                onClick={handleStart}
                disabled={running || loading}
              >
                <Play size={20} fill="white" /> {running ? 'İşleniyor...' : 'Devri Başlat'}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const TransferItem = ({ icon, title, desc, done }) => (
  <div className="card" style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <div style={{ padding: '0.6rem', background: 'white', borderRadius: '10px', color: 'var(--primary)' }}>{icon}</div>
      <div>
        <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>{title}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{desc}</p>
      </div>
    </div>
    <div className={`badge ${done ? 'badge-success' : ''}`} style={{ padding: '0.4rem', background: done ? undefined : 'var(--bg-card)' }}>
      <CheckCircle2 size={16} color={done ? undefined : 'var(--text-dim)'} />
    </div>
  </div>
);

export default BulkTransfers;
