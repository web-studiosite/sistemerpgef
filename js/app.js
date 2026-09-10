/**
 * GEF - GESTÃO FINANCEIRA | MAIN APPLICATION CONTROLLER
 * JavaScript Puro (Vanilla JS)
 */

import { db } from './core/database.js';
import { auth } from './core/auth.js';
import { renderNavbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { checkAndRenderLockBanner } from './components/lock-banner.js';
import { getDefaultTabForRole, isTabAllowedForUser } from './core/permissions.js';

// Module Initializers
import { initDashboardModule } from '../modules/dashboard/dashboard.js';
import { initPosModule } from '../modules/pos/pos.js';
import { initVendasModule } from '../modules/vendas/vendas.js';
import { initOrcamentosModule } from '../modules/orcamentos/orcamentos.js';
import { initProdutosModule } from '../modules/produtos/produtos.js';
import { initEstoqueModule } from '../modules/estoque/estoque.js';
import { initPerdasModule } from '../modules/perdas/perdas.js';
import { initCaixaModule } from '../modules/caixa/caixa.js';
import { initClientesModule } from '../modules/clientes/clientes.js';
import { initEntregasModule } from '../modules/entregas/entregas.js';
import { initRelatoriosModule } from '../modules/relatorios/relatorios.js';
import { initConfiguracoesModule } from '../modules/configuracoes/configuracoes.js';
import { initEmbaixadoresModule } from '../modules/embaixadores/embaixadores.js';
import { initMonitorModule } from '../modules/monitor/monitor.js';
import { initLoginModule } from '../modules/login/login.js';

class GefApp {
  constructor() {
    this.currentTab = 'DASHBOARD';
    this.navbarRoot = null;
    this.sidebarRoot = null;
    this.lockBannerRoot = null;
    this.moduleContainer = null;
  }

  async start() {
    await db.init();

    this.navbarRoot = document.getElementById('navbar-root');
    this.sidebarRoot = document.getElementById('sidebar-root');
    this.lockBannerRoot = document.getElementById('lock-banner-root');
    this.moduleContainer = document.getElementById('module-container');

    // Parse URL params for initial tab
    const urlParams = new URLSearchParams(window.location.search);
    const requestedTab = urlParams.get('tab');
    const currentUser = auth.getCurrentUser();

    if (currentUser) {
      if (requestedTab && isTabAllowedForUser(requestedTab.toUpperCase(), currentUser)) {
        this.currentTab = requestedTab.toUpperCase();
      } else {
        this.currentTab = getDefaultTabForRole(currentUser.role, currentUser.id);
      }
    } else if (requestedTab) {
      this.currentTab = requestedTab.toUpperCase();
    }

    // Listen to popstate (browser back/forward)
    window.addEventListener('popstate', () => {
      const p = new URLSearchParams(window.location.search);
      const user = auth.getCurrentUser();
      const t = p.get('tab') || getDefaultTabForRole(user?.role, user?.id);
      this.navigateTo(t.toUpperCase(), false);
    });

    this.render();
  }

  navigateTo(tab, pushState = true) {
    const currentUser = auth.getCurrentUser();
    if (currentUser && !isTabAllowedForUser(tab, currentUser)) {
      tab = getDefaultTabForRole(currentUser.role, currentUser.id);
    }
    this.currentTab = tab;
    if (pushState) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState({}, '', url.toString());
    }
    this.render();
  }

  render() {
    // 1. Auth Guard
    if (!auth.isAuthenticated()) {
      document.body.classList.add('login-mode');
      if (this.navbarRoot) this.navbarRoot.style.display = 'none';
      if (this.sidebarRoot) this.sidebarRoot.style.display = 'none';
      if (this.lockBannerRoot) this.lockBannerRoot.innerHTML = '';
      
      this.moduleContainer.innerHTML = '';
      initLoginModule(this.moduleContainer, () => {
        document.body.classList.remove('login-mode');
        if (this.navbarRoot) this.navbarRoot.style.display = '';
        if (this.sidebarRoot) this.sidebarRoot.style.display = '';
        const user = auth.getCurrentUser();
        const def = getDefaultTabForRole(user?.role, user?.id);
        this.navigateTo(def);
      });
      return;
    }

    document.body.classList.remove('login-mode');
    if (this.navbarRoot) this.navbarRoot.style.display = '';
    if (this.sidebarRoot) this.sidebarRoot.style.display = '';

    // Verify current tab is permitted for role
    const currentUser = auth.getCurrentUser();
    if (currentUser && !isTabAllowedForUser(this.currentTab, currentUser)) {
      this.currentTab = getDefaultTabForRole(currentUser.role, currentUser.id);
    }

    // 2. Render Navbar
    renderNavbar(this.navbarRoot, {
      onStoreChange: () => this.render(),
      onNavigate: (tab) => this.navigateTo(tab)
    });

    // 3. Render Sidebar
    renderSidebar(this.sidebarRoot, {
      activeTab: this.currentTab,
      onSelectTab: (tab) => this.navigateTo(tab)
    });

    // 4. SaaS Lock Banner check
    checkAndRenderLockBanner(this.lockBannerRoot, (tab) => this.navigateTo(tab));

    // 5. Mount Active Module
    this.moduleContainer.innerHTML = '';
    const opts = {
      onNavigate: (tab) => this.navigateTo(tab)
    };

    switch (this.currentTab) {
      case 'DASHBOARD':
        initDashboardModule(this.moduleContainer, opts);
        break;
      case 'PDV':
        initPosModule(this.moduleContainer, opts);
        break;
      case 'VENDAS':
        initVendasModule(this.moduleContainer, opts);
        break;
      case 'ORCAMENTOS':
        initOrcamentosModule(this.moduleContainer, opts);
        break;
      case 'PRODUTOS':
        initProdutosModule(this.moduleContainer, opts);
        break;
      case 'ESTOQUE':
        initEstoqueModule(this.moduleContainer, opts);
        break;
      case 'PERDAS':
        initPerdasModule(this.moduleContainer, opts);
        break;
      case 'CAIXA':
        initCaixaModule(this.moduleContainer, opts);
        break;
      case 'CLIENTES':
        initClientesModule(this.moduleContainer, opts);
        break;
      case 'ENTREGAS':
        initEntregasModule(this.moduleContainer, opts);
        break;
      case 'RELATORIOS':
        initRelatoriosModule(this.moduleContainer, opts);
        break;
      case 'CONFIGURACOES':
        initConfiguracoesModule(this.moduleContainer, opts);
        break;
      case 'EMBAIXADORES':
        initEmbaixadoresModule(this.moduleContainer, opts);
        break;
      case 'MONITOR_SAAS':
      case 'LOJAS':
      case 'AUDITORIA':
        initMonitorModule(this.moduleContainer, opts);
        break;
      default:
        initDashboardModule(this.moduleContainer, opts);
        break;
    }

    // Scroll to top
    window.scrollTo(0, 0);
  }
}

// Auto-start on load
document.addEventListener('DOMContentLoaded', () => {
  const app = new GefApp();
  app.start();
});
