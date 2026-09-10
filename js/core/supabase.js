/**
 * GEF - GESTÃO FINANCEIRA | CONEXÃO SUPABASE
 * 
 * Configure aqui as credenciais do seu projeto Supabase.
 * Obtenha a URL e a Anon Key em:
 * Supabase Dashboard -> Project Settings -> API -> Project URL & Project API Keys (anon/public)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 1. Defina a URL do seu projeto Supabase:
export const SUPABASE_URL = window.__ENV__?.SUPABASE_URL || 'https://seu-projeto.supabase.co';

// 2. Defina a chave pública (anon key) do seu projeto Supabase:
export const SUPABASE_ANON_KEY = window.__ENV__?.SUPABASE_ANON_KEY || 'sua-chave-anon-publica-do-supabase';

// 3. Inicialização do cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

export default supabase;
