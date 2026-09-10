/**
 * GEF - GESTÃO FINANCEIRA | CONEXÃO SUPABASE
 * 
 * Configure aqui as credenciais do seu projeto Supabase.
 * Obtenha a URL e a Anon Key em:
 * Supabase Dashboard -> Project Settings -> API -> Project URL & Project API Keys (anon/public)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 1. Defina a URL do seu projeto Supabase:
export const SUPABASE_URL = window.__ENV__?.SUPABASE_URL || 'https://vjajbqiobmemdohzpjjm.supabase.co';

// 2. Defina a chave pública (anon key) do seu projeto Supabase:
export const SUPABASE_ANON_KEY = window.__ENV__?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqYWpicWlvYm1lbWRvaHpwamptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNzI1OTcsImV4cCI6MjEwNDY0ODU5N30.JwHjFWI7ncH_BV9J4n1pkJkRmqVXVial8xgjh0t6-JI';

// 3. Inicialização do cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

export default supabase;
