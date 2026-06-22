// Luvia — create-user Edge Function
//
// Yeni firma-admin'i (Companies.jsx) veya firma-içi yeni kullanıcı/personel
// login'i (Definitions.jsx) oluşturur. service_role key SADECE bu fonksiyonun
// sunucu tarafı ortamında durur (SUPABASE_SERVICE_ROLE_KEY), frontend'e hiç inmez.
//
// Çağıran kullanıcının yetkisi kontrol edilir:
//   - mode: 'new_company'  -> sadece SuperAdmin çağırabilir
//   - mode: 'company_user' -> çağıran kendi şirketinde Admin/SuperAdmin olmalı
//
// Deploy: supabase functions deploy create-user
// Çağrı (frontend): supabase.functions.invoke('create-user', { body: {...} })

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: callerUser, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !callerUser?.user) {
      return json({ error: 'Geçersiz oturum.' }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('id, role, company_id')
      .eq('auth_user_id', callerUser.user.id)
      .single();

    if (!callerProfile) return json({ error: 'Profil bulunamadı.' }, 403);

    const body = await req.json();
    const { mode } = body; // 'new_company' | 'company_user'

    if (mode === 'new_company') {
      if (callerProfile.role !== 'SuperAdmin') {
        return json({ error: 'Bu işlem için yetkiniz yok.' }, 403);
      }
      return await createCompanyAndAdmin(admin, body);
    }

    if (mode === 'company_user') {
      const isAllowed = callerProfile.role === 'SuperAdmin' || callerProfile.role === 'Admin';
      if (!isAllowed) return json({ error: 'Bu işlem için yetkiniz yok.' }, 403);
      return await createCompanyUser(admin, body, callerProfile.company_id);
    }

    return json({ error: 'Geçersiz mode.' }, 400);
  } catch (err) {
    return json({ error: err.message || 'Sunucu hatası.' }, 500);
  }
});

async function createCompanyAndAdmin(admin, body) {
  const { company, adminUser } = body;

  const { data: createdCompany, error: compErr } = await admin
    .from('companies')
    .insert([{ ...company, status: 'active' }])
    .select()
    .single();
  if (compErr) return json({ error: 'Firma eklenemedi: ' + compErr.message }, 400);

  const result = await createAuthAndProfile(admin, adminUser, createdCompany.id, 'Admin');
  if (result.error) {
    await admin.from('companies').delete().eq('id', createdCompany.id);
    return json({ error: result.error }, 400);
  }

  return json({ company: createdCompany, profile: result.profile });
}

async function createCompanyUser(admin, body, callerCompanyId) {
  const { user, role } = body;
  const result = await createAuthAndProfile(admin, user, callerCompanyId, role || 'Admin');
  if (result.error) return json({ error: result.error }, 400);
  return json({ profile: result.profile });
}

async function createAuthAndProfile(admin, user, companyId, role) {
  const authEmail = (user.email && user.email.trim())
    ? user.email.trim().toLowerCase()
    : `${user.username}@${companyId}.luvia.internal`;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: authEmail,
    password: user.password,
    email_confirm: true,
    user_metadata: { full_name: user.full_name },
  });
  if (createErr) return { error: 'Kullanıcı oluşturulamadı: ' + createErr.message };

  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .insert([{
      full_name: user.full_name.trim(),
      username: user.username?.trim().toLowerCase() || null,
      email: user.email?.trim().toLowerCase() || null,
      role,
      company_id: companyId,
      auth_user_id: created.user.id,
    }])
    .select()
    .single();

  if (profErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: 'Profil oluşturulamadı: ' + profErr.message };
  }

  return { profile };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
