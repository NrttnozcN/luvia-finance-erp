import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yqcpvkiqkqdmranngdyv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_237AuUGPAkPQPQTs8kHZ6g_-1qDWCJl';

// Backend kullanmadan doğrudan Supabase'e bağlanan istemci
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const localApi = {
  auth: {
    signIn: async (identifier, password) => {
      try {
        const cleanId = identifier.trim().toLowerCase();
        
        // Supabase profiles tablosundan doğrudan şifre kontrolü (Eski yapı)
        const { data: users, error } = await supabase
          .from('profiles')
          .select('*, companies(name, status, license_end_date)')
          .or(`username.eq.${cleanId},email.eq.${cleanId}`)
          .eq('password', password);

        if (error || !users || users.length === 0) {
          return { data: null, error: { error: 'Kullanıcı adı veya şifre hatalı.' } };
        }

        const user = users[0];
        
        if (user.companies?.status === 'passive') {
            return { data: null, error: { error: 'Firmanızın hesabı askıya alınmıştır.' } };
        }

        const safeUser = {
            id: user.id,
            full_name: user.full_name,
            username: user.username,
            email: user.email,
            role: user.role,
            role_id: user.role_id,
            company_id: user.company_id,
            companyName: user.companies?.name,
            permissions: null
        };

        localStorage.setItem('luvia_token', 'supabase-direct-mode');
        return { data: { user: safeUser, token: 'supabase-direct-mode' }, error: null };
      } catch (err) {
        return { data: null, error: { error: 'Giriş başarısız' } };
      }
    },
    signOut: () => localStorage.removeItem('luvia_token'),
    getUser: async () => ({ data: { user: { id: 'temp' } }, error: null })
  },
  
  // from metodunu doğrudan supabase.from'a yönlendiriyoruz!
  // Böylece App.jsx'teki tüm sorgular çalışacak.
  from: (tableName) => supabase.from(tableName)
};

export default localApi;
