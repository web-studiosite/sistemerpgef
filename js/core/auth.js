/**
 * GEF - GESTÃO FINANCEIRA | AUTH SERVICE
 * JavaScript Puro (Vanilla JS)
 */

import { SUPERADMIN_SPECIAL_ID, normalizeRole, canSwitchStores } from './permissions.js';
import { db, supabase } from './database.js';

const AUTH_STORAGE_KEY = 'gef_authenticated_user_v2';

export const DEMO_USERS = [
  {
    id: SUPERADMIN_SPECIAL_ID,
    email: 'superadmin@gef.co.mz',
    fullName: 'Administrador SaaS Global (Superadmin)',
    role: 'SUPERADMIN',
    storeId: 'ALL',
    storeName: 'Plataforma Global (Monitor & SaaS)',
    active: true
  },
  {
    id: 'user-admin-01',
    email: 'admin.loja@gef.co.mz',
    fullName: 'Eng. Carlos Sitoe (Administrador da Loja)',
    role: 'ADMIN',
    storeId: 'store-001',
    storeName: 'GEF Ferragens – Loja Matriz Maputo',
    active: true
  },
  {
    id: 'user-gerente-02',
    email: 'marta.gerente@gef.co.mz',
    fullName: 'Dra. Marta Machava (Gerente Filial)',
    role: 'GERENTE',
    storeId: 'store-002',
    storeName: 'GEF Ferragens – Filial Matola Rio',
    active: true
  },
  {
    id: 'user-caixa-03',
    email: 'caixa.maputo@gef.co.mz',
    fullName: 'Felisberto Macamo (Operador de Caixa)',
    role: 'CASHIER',
    storeId: 'store-001',
    storeName: 'GEF Ferragens – Loja Matriz Maputo',
    active: true
  },
  {
    id: 'user-estoque-04',
    email: 'estoquista@gef.co.mz',
    fullName: 'João Mondlane (Encarregado de Estoque & Pátio)',
    role: 'ESTOQUISTA',
    storeId: 'store-001',
    storeName: 'GEF Ferragens – Loja Matriz Maputo',
    active: true
  },
  {
    id: 'user-embaixador-05',
    email: 'paulo.embaixador@gef.co.mz',
    fullName: 'Paulo Cossa (Embaixador Parceiro)',
    role: 'EMBAIXADOR',
    storeId: 'store-001',
    storeName: 'Programa de Embaixadores GEF',
    active: true
  }
];

class AuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = new Set();
    this.init();
  }

  init() {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (parsed && parsed.id) {
          const role = normalizeRole(parsed.role, parsed.id);

          this.currentUser = {
            ...parsed,
            role,
            storeId: role === 'SUPERADMIN'
              ? 'ALL'
              : (parsed.storeId || 'store-001')
          };
        }
      }
    } catch {
      this.currentUser = null;
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.currentUser));
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return !!this.currentUser && this.currentUser.active !== false;
  }

  /**
   * LOGIN REAL ATRAVÉS DO SUPABASE AUTH
   */
  async signIn(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
      return {
        success: false,
        error: 'Informe o e-mail e a password.'
      };
    }

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

      if (authError) {
        return {
          success: false,
          error: authError.message
        };
      }

      if (!authData || !authData.user) {
        return {
          success: false,
          error: 'Utilizador não encontrado.'
        };
      }

      const authUser = authData.user;

      /**
       * BUSCAR PERFIL DO GEF
       */
      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();

        return {
          success: false,
          error: 'Perfil do utilizador não encontrado no GEF.'
        };
      }

      /**
       * VERIFICAR ESTADO DA CONTA
       */
      if (profile.active === false) {
        await supabase.auth.signOut();

        return {
          success: false,
          error: 'A sua conta está bloqueada ou desativada.'
        };
      }

      /**
       * NORMALIZAR ROLE
       *
       * O permissions.js transforma:
       * OPERADOR_CAIXA / CAIXA / CASHIER
       * em CASHIER.
       */
      const role = normalizeRole(profile.role, authUser.id);

      /**
       * IDENTIFICAR LOJA
       */
      let storeId = profile.store_id || null;
      let storeName = 'Sem loja atribuída';

      /**
       * SUPERADMIN TEM ACESSO GLOBAL
       */
      if (role === 'SUPERADMIN') {
        storeId = 'ALL';
        storeName = 'Plataforma Global (Monitor & SaaS)';
      }

      /**
       * BUSCAR NOME DA LOJA
       */
      if (storeId && storeId !== 'ALL') {
        const { data: store } =
          await supabase
            .from('stores')
            .select('id, name, trade_name')
            .eq('id', storeId)
            .maybeSingle();

        if (store) {
          storeName = store.trade_name || store.name;
        }
      }

      /**
       * CRIAR UTILIZADOR DA SESSÃO
       */
      this.currentUser = {
        id: authUser.id,
        email: profile.email || authUser.email || cleanEmail,
        fullName:
          profile.full_name ||
          authUser.user_metadata?.full_name ||
          cleanEmail.split('@')[0],
        role,
        storeId,
        storeName,
        active: profile.active !== false
      };

      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify(this.currentUser)
      );

      this.notify();

      return {
        success: true,
        user: this.currentUser
      };

    } catch (error) {
      console.error('Erro no login:', error);

      return {
        success: false,
        error: error?.message || 'Erro ao iniciar sessão.'
      };
    }
  }

  /**
   * CADASTRO
   */
  async signUp(
    email,
    password,
    fullName,
    role = 'CASHIER',
    storeId = 'store-001'
  ) {
    const normalizedRole = normalizeRole(role);

    try {
      const { data, error } =
        await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: fullName.trim()
            }
          }
        });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      if (!data || !data.user) {
        return {
          success: false,
          error: 'Não foi possível criar o utilizador.'
        };
      }

      this.currentUser = {
        id: data.user.id,
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        role: normalizedRole,
        storeId: normalizedRole === 'SUPERADMIN'
          ? 'ALL'
          : storeId,
        storeName: 'Loja Principal',
        active: true
      };

      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify(this.currentUser)
      );

      this.notify();

      return {
        success: true,
        user: this.currentUser
      };

    } catch (error) {
      console.error('Erro no cadastro:', error);

      return {
        success: false,
        error: error?.message || 'Não foi possível criar o utilizador.'
      };
    }
  }

  selectDemoUser(demoUser) {
    const role = normalizeRole(demoUser.role, demoUser.id);

    this.currentUser = {
      ...demoUser,
      role,
      storeId: role === 'SUPERADMIN'
        ? 'ALL'
        : demoUser.storeId
    };

    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify(this.currentUser)
    );

    this.notify();
  }

  switchActiveStore(storeId) {
    if (!this.currentUser) return;

    if (!canSwitchStores(this.currentUser)) {
      console.warn('Troca de loja não autorizada para esta função.');
      return;
    }

    const stores = db.getStores();

    const assignedStore = stores.find(
      s => s.id === storeId
    );

    const storeName = storeId === 'ALL'
      ? 'Todas as Filiais (Consolidado)'
      : (
          assignedStore?.tradeName ||
          assignedStore?.name ||
          'Loja Ativa'
        );

    this.currentUser = {
      ...this.currentUser,
      storeId,
      storeName
    };

    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify(this.currentUser)
    );

    this.notify();
  }

  async signOut() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn(
        'Erro ao terminar sessão no Supabase:',
        error
      );
    }

    this.currentUser = null;

    localStorage.removeItem(AUTH_STORAGE_KEY);

    this.notify();
  }
}

export const auth = new AuthService();
