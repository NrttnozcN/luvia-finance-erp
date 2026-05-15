import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yqcpvkiqkqdmranngdyv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_237AuUGPAkPQPQTs8kHZ6g_-1qDWCJl';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

