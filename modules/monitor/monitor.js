/**
 * GEF - GESTÃO FINANCEIRA | MÓDULO MONITOR SAAS & TRAVA LRS
 * JavaScript Puro (Vanilla JS)
 * Exclusivo Superadmin Global (Independente de Loja)
 */

import { db } from '../../js/core/database.js';
import { auth } from '../../js/core/auth.js';
import { showToast } from '../../js/components/toast.js';
import { normalizeRole } from '../../js/core/permissions.js';

export function initMonitorModule(container) {
  const currentUser = auth.getCurrentUser();
  const userRole = currentUser ? normalizeRole(currentUser.role, currentUser.id) : '';

  const render = () => {
    if (userRole !== 'SUPERADMIN') {
      container.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 40px auto; text-align: center; padding: 36px 24px;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; color: #f87171;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 style="font-size: 18px; font-weight: 800; color: #f8fafc; margin: 0 0 8px 0;">Console Exclusivo de Superadmin</h2>
          <p style="font-size: 12px; color: #94a3b8; line-height: 1.6; margin: 0 0 20px 0;">
            O Monitor SaaS Global e o controle de travas LRS são independentes de filiais e restritos exclusivamente ao Super Administrador da plataforma. O perfil atual (<strong>${userRole || 'Usuário'}</strong>) visualiza apenas os módulos operacionais da sua loja.
          </p>
        </div>
      `;
      return;
    }

    const stores = db.getStores();
    const activeStores = stores.filter(s => s.acesso_ativo !== false).length;
    const lockedStores = stores.length - activeStores;
    const totalRevenueMRR = stores.reduce((sum, s) => sum + (s.valor_mensalidade || 4500), 0);

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Header Card -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: #ea580c; text-transform: uppercase; letter-spacing: 0.5px;">
                Console Central de Governança SaaS
              </div>
              <h2 style="font-size: 18px; font-weight: 900; color: #f8fafc; margin: 2px 0 0 0;">
                Monitor Global de Lojas & Trava LRS
              </h2>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                Superadmin independente de filial • Controle de licenciamento, adimplência e travas operacionais.
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-primary" id="btn-sync-all-licenses">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                <span>Verificar Licenças</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Metrics Grid Cards -->
        <div class="metrics-grid">
          <div class="card">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Total de Lojas Conectadas</div>
            <div style="font-size: 24px; font-weight: 900; color: #f8fafc; font-family: var(--font-mono); margin-top: 4px;">
              ${stores.length}
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Unidades de ferragens cadastradas</div>
          </div>

          <div class="card">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Lojas com Acesso Ativo</div>
            <div style="font-size: 24px; font-weight: 900; color: #34d399; font-family: var(--font-mono); margin-top: 4px;">
              ${activeStores}
            </div>
            <div style="font-size: 10px; color: #10b981; margin-top: 2px;">Operando normalmente com PDV liberado</div>
          </div>

          <div class="card">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Lojas Bloqueadas / Travadas</div>
            <div style="font-size: 24px; font-weight: 900; color: #f87171; font-family: var(--font-mono); margin-top: 4px;">
              ${lockedStores}
            </div>
            <div style="font-size: 10px; color: #ef4444; margin-top: 2px;">Com aviso LRS ou suspensão financeira</div>
          </div>

          <div class="card">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Receita Recorrente SaaS (MRR)</div>
            <div style="font-size: 24px; font-weight: 900; color: #60a5fa; font-family: var(--font-mono); margin-top: 4px;">
              ${totalRevenueMRR.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} <span style="font-size: 12px; color: #3b82f6;">MT/mês</span>
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Faturamento de licenças de software</div>
          </div>
        </div>

        <!-- Stores Governance Table Card -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 14px 16px; border-bottom: 1px solid #1f2937;">
            <h3 style="font-size: 14px; font-weight: 800; color: #f8fafc; margin: 0;">Status de Licenças das Lojas & Trava LRS</h3>
          </div>
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Loja / Filial</th>
                  <th>Cidade / Província</th>
                  <th>Mensalidade (MT)</th>
                  <th>Fim do Período / Expiração</th>
                  <th>Dias Restantes</th>
                  <th>Status de Acesso</th>
                  <th style="text-align: right;">Ações de Controle</th>
                </tr>
              </thead>
              <tbody>
                ${stores.map(s => {
                  const check = db.checkStoreLock(s.id);
                  const isLocked = check.isLocked;
                  const days = check.daysRemaining;

                  return `
                    <tr>
                      <td>
                        <div style="font-weight: 700; color: #f8fafc;">${s.name}</div>
                        <div style="font-size: 10px; color: #94a3b8;">ID: ${s.id} ${s.isHeadquarters ? '• <span class="badge badge-amber" style="font-size: 8px;">MATRIZ</span>' : ''}</div>
                      </td>
                      <td>${s.city || 'Maputo'}</td>
                      <td style="font-family: var(--font-mono); font-weight: 700;">
                        ${(s.valor_mensalidade || 4500).toFixed(2)} MT
                      </td>
                      <td style="font-size: 11px; color: #cbd5e1;">
                        ${s.data_fim_teste ? s.data_fim_teste.split('T')[0] : 'Licença Permanente'}
                      </td>
                      <td>
                        <strong style="font-family: var(--font-mono); color: ${days <= 3 ? '#f87171' : days <= 7 ? '#fbbf24' : '#34d399'};">
                          ${days >= 900 ? 'Ilimitado' : days + ' dias'}
                        </strong>
                      </td>
                      <td>
                        <span class="badge ${isLocked ? 'badge-red' : 'badge-emerald'}">
                          ${isLocked ? 'TRAVADO (LRS)' : 'ACESSO LIBERADO'}
                        </span>
                      </td>
                      <td style="text-align: right;">
                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                          <button class="btn btn-secondary btn-renew-store" data-id="${s.id}" style="padding: 4px 8px; font-size: 10px; color: #34d399; border-color: #10b981;">
                            +30 Dias Licença
                          </button>
                          <button class="btn btn-secondary btn-toggle-lock" data-id="${s.id}" style="padding: 4px 8px; font-size: 10px; color: ${isLocked ? '#34d399' : '#f87171'}; border-color: ${isLocked ? '#34d399' : '#ef4444'};">
                            ${isLocked ? 'Desbloquear' : 'Travar Acesso'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Events
    container.querySelector('#btn-sync-all-licenses').onclick = () => {
      showToast('Sincronização de licenças concluída com sucesso.', 'success');
      render();
    };

    container.querySelectorAll('.btn-renew-store').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const s = stores.find(st => st.id === id);
        if (s) {
          const currentExpiry = s.data_fim_teste ? new Date(s.data_fim_teste) : new Date();
          const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
          baseDate.setDate(baseDate.getDate() + 30);
          s.data_fim_teste = baseDate.toISOString().split('T')[0];
          s.acesso_ativo = true;
          db.saveStore(s);
          showToast(`Licença da loja ${s.name} renovada por mais 30 dias!`, 'success');
          render();
        }
      };
    });

    container.querySelectorAll('.btn-toggle-lock').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const s = stores.find(st => st.id === id);
        if (s) {
          const newState = s.acesso_ativo === false ? true : false;
          s.acesso_ativo = newState;
          s.motivo_bloqueio = newState ? '' : 'Suspensão temporária por pendência financeira SaaS.';
          db.saveStore(s);
          showToast(`Loja ${s.name} agora está ${newState ? 'LIBERADA' : 'BLOQUEADA (TRAVADA)'}!`, newState ? 'success' : 'error');
          render();
        }
      };
    });
  };

  render();
}
