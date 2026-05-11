import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { genId } from '../utils/formatters';

// ─── Rol → Modül Erişim Tablosu ──────────────────────────────────────────────
export const ROLE_PERMISSIONS = {
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
    modules: ['dashboard', 'cariler', 'invoices', 'wallets', 'checks', 'rev_exp', 'ledgers', 'costs', 'sales', 'logs', 'alerts', 'transfers'],
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

// ─── Mock Kullanıcılar ────────────────────────────────────────────────────────
const INITIAL_USERS = [
  { id: 'u1', name: 'Nurettin Özcan', username: 'nurettin.ozcan', email: 'nurettin@luvia.com', password: '123456', role: 'Admin', facility: 'İstanbul Merkez', initials: 'NÖ', status: 'active', createdAt: '2024-01-01' },
];

// ─── Auth Store ───────────────────────────────────────────────────────────────
const useAuthStore = create(
  persist(
    (set, get) => ({
      currentUser: null,
      users: INITIAL_USERS,
      loginError: null,

      login: (identifier, password) => {
        const user = get().users.find(
          u => (u.email.toLowerCase() === identifier.toLowerCase() || u.username?.toLowerCase() === identifier.toLowerCase())
            && u.password === password && u.status === 'active'
        );
        if (!user) {
          set({ loginError: 'Kullanıcı adı/e-posta veya şifre hatalı.' });
          return false;
        }
        const { password: _pw, ...safeUser } = user;
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
      },

      addUser: (data) => set(s => {
        const initials = data.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
        const username = data.username || data.name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
        return {
          users: [...s.users, { ...data, id: genId(), username, initials, status: 'active', createdAt: new Date().toISOString().split('T')[0] }],
        };
      }),

      updateUser: (id, data) => set(s => ({
        users: s.users.map(u => u.id === id ? { ...u, ...data } : u),
      })),

      toggleUserStatus: (id) => set(s => ({
        users: s.users.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u),
      })),

      deleteUser: (id) => set(s => ({
        users: s.users.filter(u => u.id !== id),
      })),
    }),
    {
      name: 'luvia_auth_storage',
      partialize: (state) => ({ users: state.users, currentUser: state.currentUser }),
    }
  )
);

export default useAuthStore;
