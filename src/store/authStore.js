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
  { group: 'İnsan Kaynakları',  items: ['personnel_def', 'personnel_payroll', 'personnel_pos'] },
  { group: 'Muhasebe & Defter', items: ['ledgers', 'transfers'] },
  { group: 'Raporlama',         items: ['costs', 'sales', 'logs', 'cari_rapor', 'kasa_rapor'] },
  { group: 'Sistem',            items: ['alerts', 'settings', 'definitions', 'support_tickets'] },
];

export const MODULE_LABELS = {
  dashboard:  'Gösterge Paneli',      facilities: 'Tesisler',
  cariler:    'Cariler',              invoices:   'Faturalar',
  wallets:    'Kasalar & Banka',      rev_exp:    'Gelir & Gider',
  checks:     'Çek & Senet',         stock:      'Stok & Depo',
  vehicles:   'Araç Yönetimi',       fuel:       'Akaryakıt Takibi',
  tires:      'Lastik İşlemleri',    purchasing: 'Satın Alma',
  personnel_def:     'Personel Tanımlama',
  personnel_payroll: 'Pusula & Puantaj',
  personnel_pos:     'Pozisyon Değişikliği',
  ledgers:    'Defter İşlemleri',    transfers:  'Toplu Devirler',
  costs:      'Maliyet Raporları',   sales:      'Satış Raporları',
  logs:       'Döküman Yönetimi',    cari_rapor: 'Cari Hareket Raporu',
  kasa_rapor: 'Kasa Hareket Raporu',
  alerts:     'Uyarı Merkezi',       settings:   'Sistem Ayarları',
  definitions: 'Tanımlamalar',       support_tickets: 'Destek Talepleri',
};

// Geçiş güvenliği: role_id atanmamış mevcut kullanıcılar için fallback
const LEGACY_PERMISSIONS = {
  Muhasebe:  ['dashboard', 'cariler', 'invoices', 'wallets', 'checks', 'rev_exp',
               'ledgers', 'costs', 'sales', 'logs', 'alerts', 'transfers', 'cari_rapor', 'kasa_rapor'],
  Operasyon: ['dashboard', 'facilities', 'stock', 'vehicles', 'fuel', 'tires', 'purchasing', 'personnel_def', 'personnel_payroll', 'personnel_pos', 'alerts'],
  Izleme:    ['dashboard', 'costs', 'sales', 'alerts'],
};

import { localApi } from '../lib/localApi';

const useAuthStore = create(
  persist(
    (set, get) => ({
      currentUser: null,
      loginError: null,

      login: async (identifier, password) => {
        try {
          const { data, error } = await localApi.auth.signIn(identifier, password);
          
          if (error) {
            set({ loginError: error.error || 'Giriş yapılamadı.' });
            return false;
          }

          const user = data.user;
          const safeUser = {
            id:          user.id,
            name:        user.full_name,
            username:    user.username,
            email:       user.email,
            role:        user.role,
            role_id:     user.role_id || null,
            roleLabel:   ROLE_DISPLAY_META[user.role]?.label || user.role,
            permissions: user.permissions || null,
            company_id:  user.company_id || null,
            companyName: user.companyName || null,
            status:      'active',
          };

          set({ currentUser: safeUser, loginError: null });
          return true;
        } catch (err) {
          set({ loginError: 'Sunucuyla bağlantı kurulamadı.' });
          return false;
        }
      },

      logout: () => {
        localApi.auth.signOut();
        set({ currentUser: null });
      },
      clearError: () => set({ loginError: null }),
      updateUser: (updates) => set(state => ({ currentUser: { ...state.currentUser, ...updates } })),

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

