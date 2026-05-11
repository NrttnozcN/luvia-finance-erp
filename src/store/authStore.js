import { create } from 'zustand';
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
  { id: 'u1', name: 'Nurettin Ö.',  email: 'admin@luvia.com',      password: '123456', role: 'Admin',     facility: 'İstanbul Merkez', initials: 'NÖ', status: 'active', createdAt: '2024-01-01' },
  { id: 'u2', name: 'Fatma Kaya',   email: 'muhasebe@luvia.com',   password: '123456', role: 'Muhasebe',  facility: 'İstanbul Merkez', initials: 'FK', status: 'active', createdAt: '2024-03-15' },
  { id: 'u3', name: 'Ahmet Yılmaz', email: 'operasyon@luvia.com',  password: '123456', role: 'Operasyon', facility: 'İzmir Depo',      initials: 'AY', status: 'active', createdAt: '2024-06-01' },
  { id: 'u4', name: 'Mehmet Demir', email: 'izleme@luvia.com',     password: '123456', role: 'Izleme',    facility: 'Ankara Şube',     initials: 'MD', status: 'active', createdAt: '2025-01-10' },
];

// ─── localStorage'dan oturumu geri yükle ─────────────────────────────────────
const restoreSession = () => {
  try { return JSON.parse(localStorage.getItem('luvia_session')); } catch { return null; }
};

// ─── Auth Store ───────────────────────────────────────────────────────────────
const useAuthStore = create((set, get) => ({
  currentUser: restoreSession(),
  users: INITIAL_USERS,
  loginError: null,

  login: (email, password) => {
    const user = get().users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.status === 'active'
    );
    if (!user) {
      set({ loginError: 'E-posta veya şifre hatalı. Lütfen tekrar deneyin.' });
      return false;
    }
    const { password: _pw, ...safeUser } = user;
    localStorage.setItem('luvia_session', JSON.stringify(safeUser));
    set({ currentUser: safeUser, loginError: null });
    return true;
  },

  logout: () => {
    localStorage.removeItem('luvia_session');
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
    return {
      users: [...s.users, { ...data, id: genId(), initials, status: 'active', createdAt: new Date().toISOString().split('T')[0] }],
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
}));

export default useAuthStore;
