import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yqcpvkiqkqdmranngdyv.supabase.co';
const supabaseAnonKey = 'sb_publishable_237AuUGPAkPQPQTs8kHZ6g_-1qDWCJl';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
