/**
 * GEF - GESTÃO FINANCEIRA | CONEXÃO SUPABASE
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL =
  'https://utrbgcjcozrmgunvwysk.supabase.co';

export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0cmJnY2pjb3pybWd1bnZ3eXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNzcxNDcsImV4cCI6MjEwNDY1MzE0N30.br6y9zxabYsFhZy6oj9lcEDqmvH5NJ1XGVwdvjJpyqQ';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);

export default supabase;
