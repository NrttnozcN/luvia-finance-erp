import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

// Sadece görsel etiket/renk — SuperAdmin & Admin için (DB'de rol girişi yok)
export const ROLE_DISPLAY_META = {
  SuperAdmin: { label: 'Platform Sahibi', color: '#7C3AED' },
  Admin:      { label: 'Süper Admin',     color: '#FF6B00' },
};

// Rol & Yetki ekranı için modül matrisi
export const MODULE_MATRIX = [
  { group: 'Genel',             items: ['dashboard', 'facilities'] },
  { group: 'Finans Yönetimi',   items: ['cariler', 'invoices', 'wallets', 'rev_exp', 'checks'] },
  { group: 'Operasyon & Filo',  items: ['stock', 'vehicles', 'fuel', 'tires', 'purchasing'] },
  { group: 'İnsan Kaynakları',  items: ['personnel'] },
  { group: 'Muhasebe & Defter', items: ['ledgers', 'transfers'] },
  { group: 'Raporlama',         items: ['costs', 'sales', 'logs', 'cari_rapor', 'kasa_rapor'] },
  { group: 'Sistem',            items: ['alerts', 'settings', 'definitions'] },
];

export const MODULE_LABELS = {
  dashboard:  'Gösterge Paneli',      facilities: 'Tesisler',
  cariler:    'Cariler',              invoices:   'Faturalar',
  wallets:    'Kasalar & Banka',      rev_exp:    'Gelir & Gider',
  checks:     'Çek & Senet',         stock:      'Stok & Depo',
  vehicles:   'Araç Yönetimi',       fuel:       'Akaryakıt Takibi',
  tires:      'Lastik İşlemleri',    purchasing: 'Satın Alma',
  personnel:  'Personel & Puantaj',
  ledgers:    'Defter İşlemleri',    transfers:  'Toplu Devirler',
  costs:      'Maliyet Raporları',   sales:      'Satış Raporları',
  logs:       'Döküman Yönetimi',    cari_rapor: 'Cari Hareket Raporu',
  kasa_rapor: 'Kasa Hareket Raporu',
  alerts:     'Uyarı Merkezi',       settings:   'Sistem Ayarları',
  definitions: 'Tanımlamalar',
};

// Geçiş güvenliği: role_id atanmamış mevcut kullanıcılar için fallback
const LEGACY_PERMISSIONS = {
  Muhasebe:  ['dashboard', 'cariler', 'invoices', 'wallets', 'checks', 'rev_exp',
               'ledgers', 'costs', 'sales', 'logs', 'alerts', 'transfers', 'cari_rapor', 'kasa_rapor'],
  Operasyon: ['dashboard', 'facilities', 'stock', 'vehicles', 'fuel', 'tires', 'purchasing', 'personnel', 'alerts'],
  Izleme:    ['dashboard', 'costs', 'sales', 'alerts'],
};

const useAuthStore = create(
  persist(
    (set, get) => ({
      currentUser: null,
      loginError: null,

      login: async (identifier, password) => {
        const cleanId = identifier.trim().toLowerCase();

        // 1) Kullanıcıyı şifre ile bul (companies join, roles ayrı sorgu)
        const { data: users, error } = await supabase
          .from('profiles')
          .select('*, companies(*)')
          .eq('password', password);

        if (error || !users || users.length === 0) {
          set({ loginError: 'Kullanıcı adı/e-posta veya şifre hatalı.' });
          return false;
        }

        const user = users.find(u =>
          (u.email && u.email.toLowerCase() === cleanId) ||
          (u.username && u.username.toLowerCase() === cleanId)
        );

        if (!user) {
          set({ loginError: 'Kullanıcı adı/e-posta veya şifre hatalı.' });
          return false;
        }

        if (user.companies) {
          if (user.companies.status === 'passive') {
            set({ loginError: 'Firmanızın hesabı askıya alınmıştır. Lütfen Ülgen Soft ile iletişime geçin.' });
            return false;
          }
          if (user.companies.license_end_date) {
            const expiry = new Date(user.companies.license_end_date);
            expiry.setHours(23, 59, 59, 999);
            if (expiry < new Date()) {
              set({ loginError: 'Lisans süreniz dolmuştur. Lütfen Ülgen Soft Yazılım ile iletişime geçin.' });
              return false;
            }
          }
        }

        // 2) role_id varsa roles tablosundan ayrıca çek (FK yoksa hata vermez)
        let roleInfo = null;
        if (user.role_id) {
          const { data: rd } = await supabase
            .from('roles')
            .select('name, permissions')
            .eq('id', user.role_id)
            .single();
          roleInfo = rd || null;
        }

        const safeUser = {
          id:          user.id,
          name:        user.full_name,
          username:    user.username,
          email:       user.email,
          role:        user.role,
          role_id:     user.role_id || null,
          roleLabel:   roleInfo?.name || ROLE_DISPLAY_META[user.role]?.label || user.role,
          permissions: roleInfo?.permissions || null,
          company_id:  user.company_id || null,
          companyName: user.companies?.name || null,
          status:      'active',
        };

        set({ currentUser: safeUser, loginError: null });
        return true;
      },

      logout: () => set({ currentUser: null }),
      clearError: () => set({ loginError: null }),

      canAccess: (tab) => {
        const user = get().currentUser;
        if (!user) return false;
        if (user.role === 'SuperAdmin' || user.role === 'Admin') return true;
        if (user.permissions) return Array.isArray(user.permissions) && user.permissions.includes(tab);
        const legacy = LEGACY_PERMISSIONS[user.role];
        if (!legacy) return false;
        return legacy.includes(tab);
      },
    }),
    {
      name: 'luvia_auth_storage',
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);

export default useAuthStore;
