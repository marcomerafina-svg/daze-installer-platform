import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Environment check:', {
    url: supabaseUrl ? 'present' : 'MISSING',
    key: supabaseAnonKey ? 'present' : 'MISSING',
    urlValue: supabaseUrl,
    keyValue: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'undefined'
  });
  throw new Error(`Missing Supabase environment variables: ${!supabaseUrl ? 'VITE_SUPABASE_URL ' : ''}${!supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : ''}`);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
