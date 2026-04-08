// ═══════════════════════════════════════════════════════════════════════════
// supabaseClient.js — Client Supabase officiel (production)
// URL + anon key publics (RLS protège tout côté DB)
// ═══════════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || 'https://oqmqmhxbpirrtjgfhbcp.supabase.co';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xbXFtaHhicGlycnRqZ2ZoYmNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDc1ODIsImV4cCI6MjA5MTA4MzU4Mn0.ay3JZFS3XMIWQDk7CXWivDgVzuNczJQdMmy6LtYi2ZI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

export default supabase;
