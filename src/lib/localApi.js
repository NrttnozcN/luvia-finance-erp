import { supabase } from './supabase';

export const localApi = {
  auth: {
    signIn: async (identifier, password) => {
      try {
        const cleanId = identifier.trim().toLowerCase();

        // identifier bir email mi yoksa username mi — username ise önce
        // gerçek Auth email'ini (gerçek veya sentetik) bulmamız gerekiyor.
        // Bu lookup, login OLMADAN yapılabilmesi için RLS dışında bırakılan
        // dar kapsamlı bir RPC üzerinden çalışır (bkz. migrations/003_auth_rls.sql
        // sonrası eklenecek `resolve_auth_email` fonksiyonu).
        let authEmail = cleanId;
        if (!cleanId.includes('@')) {
          const { data: resolved, error: resolveErr } = await supabase
            .rpc('resolve_auth_email', { identifier: cleanId });
          if (resolveErr || !resolved) {
            return { data: null, error: { error: 'Kullanıcı adı veya şifre hatalı.' } };
          }
          authEmail = resolved;
        }

        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });

        if (signInErr || !signInData?.user) {
          return { data: null, error: { error: 'Kullanıcı adı veya şifre hatalı.' } };
        }

        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('*, companies(name, status, license_end_date)')
          .eq('auth_user_id', signInData.user.id)
          .single();

        if (profileErr || !profile) {
          await supabase.auth.signOut();
          return { data: null, error: { error: 'Profil bulunamadı.' } };
        }

        if (profile.companies?.status === 'passive') {
          await supabase.auth.signOut();
          return { data: null, error: { error: 'Firmanızın hesabı askıya alınmıştır.' } };
        }

        const safeUser = {
          id: profile.id,
          full_name: profile.full_name,
          username: profile.username,
          email: profile.email,
          role: profile.role,
          role_id: profile.role_id,
          company_id: profile.company_id,
          companyName: profile.companies?.name,
          permissions: null,
        };

        return { data: { user: safeUser, token: signInData.session.access_token }, error: null };
      } catch (err) {
        return { data: null, error: { error: 'Giriş başarısız' } };
      }
    },
    signOut: () => supabase.auth.signOut(),
    getUser: async () => {
      const { data } = await supabase.auth.getUser();
      return { data: { user: data?.user || null }, error: null };
    },
  },
  
  // from metodunu doğrudan supabase.from'a yönlendiriyoruz!
  // Böylece App.jsx'teki tüm sorgular çalışacak.
  from: (tableName) => supabase.from(tableName)
};

export default localApi;
