import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

// ─── Rol → Modül Erişim Tablosu ──────────────────────────────────────────────
export const ROLE_PERMISSIONS = {
  SuperAdmin: {
    label: 'Platform Sahibi',
    color: '#7C3AED',
    badgeStyle: { background: '#ede9fe', color: '#5b21b6' },
    modules: 'all',
    canWrite: true,
    description: 'Platform sahibi — tüm firmalara ve modüllere tam erişim',
  },
  Admin: {
    label: 'Süper Admin',
    color: '#FF6B00',
    badgeStyle: { background: '#fff0e6', color: '#c2400a' },
    modules: 'all',
    canWrite: true,
    description: 'Tüm modüllere tam erişim',
  },
  Muhasebe: {
    label: 'Muhasebe',
    color: '#22C55E',
    badgeStyle: { background: '#dcfce7', color: '#166534' },
    modules: ['dashboard', 'cariler', 'invoices', 'wallets', 'checks', 'rev_exp', 'ledgers', 'costs', 'sales', 'logs', 'alerts', 'transfers', 'cari_rapor', 'kasa_rapor'],
    canWrite: true,
    description: 'Finans ve muhasebe modüllerine tam erişim',
  },
  Operasyon: {
    label: 'Operasyon',
    color: '#F59E0B',
    badgeStyle: { background: '#fef3c7', color: '#92400e' },
    modules: ['dashboard', 'facilities', 'stock', 'vehicles', 'fuel', 'tires', 'purchasing', 'personnel', 'alerts'],
    canWrite: true,
    description: 'Filo ve operasyon modüllerine tam erişim',
  },
  Izleme: {
    label: 'Sadece İzleme',
    color: '#64748B',
    badgeStyle: { background: '#f1f5f9', color: '#475569' },
    modules: ['dashboard', 'costs', 'sales', 'alerts'],
    canWrite: false,
    description: 'Yalnızca rapor ve dashboard görüntüleme',
  },
};

// ─── Modül → Erişim Matrisi (Rol Yetkileri ekranı için) ──────────────────────
export const MODULE_MATRIX = [
  { group: 'Finans Yönetimi',    tabs: ['cariler', 'invoices', 'wallets', 'checks', 'rev_exp'] },
  { group: 'Operasyon & Filo',   tabs: ['facilities', 'stock', 'vehicles', 'fuel', 'tires', 'purchasing'] },
  { group: 'İnsan Kaynakları',   tabs: ['personnel'] },
  { group: 'Muhasebe & Defter',  tabs: ['ledgers', 'transfers'] },
  { group: 'Raporlama',          tabs: ['costs', 'sales', 'logs'] },
  { group: 'Sistem',             tabs: ['settings', 'definitions', 'alerts'] },
];

// ─── Auth Store (Sadece Oturum Yönetimi) ──────────────────────────────────────
const useAuthStore = create(
  persist(
    (set, get) => ({
      currentUser: null,
      loginError: null,

      login: async (identifier, password) => {
        const cleanId = identifier.trim().toLowerCase();

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

        // Firma lisans ve durum kontrolü (SuperAdmin için atlanır)
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

        const safeUser = {
          id: user.id,
          name: user.full_name,
          username: user.username,
          email: user.email,
          role: user.role,
          company_id: user.company_id || null,
          companyName: user.companies?.name || null,
          status: 'active',
        };

        set({ currentUser: safeUser, loginError: null });
        return true;
      },

      logout: () => {
        set({ currentUser: null });
      },

      clearError: () => set({ loginError: null }),

      canAccess: (tab) => {
        const user = get().currentUser;
        if (!user) return false;
        const perm = ROLE_PERMISSIONS[user.role];
        if (!perm) return false;
        return perm.modules === 'all' || perm.modules.includes(tab);
      }
    }),
    {
      name: 'luvia_auth_storage',
      // Sadece currentUser'ı local storage'da tut, kullanıcı listesi artık tamamen DB'den
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);

export default useAuthStore;
