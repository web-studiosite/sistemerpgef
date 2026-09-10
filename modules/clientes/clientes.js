/**
 * GEF - GESTÃO FINANCEIRA | CLIENTES & CRÉDITO (FIADO)
 * JavaScript Puro (Vanilla JS)
 */

import { db } from '../../js/core/database.js';
import { auth } from '../../js/core/auth.js';
import { showToast } from '../../js/components/toast.js';

export function initClientesModule(container) {
  const storeId = db.getCurrentStoreId();
  let customers = db.getCustomers(storeId);
  let searchTerm = '';

  const render = () => {
    customers = db.getCustomers(storeId);

    const filtered = customers.filter(c => {
      const matchSearch = !searchTerm || 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.document || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });

    const totalReceivable = customers.reduce((sum, c) => sum + (c.currentDebt || 0), 0);
    const totalCreditLimit = customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
    const customersInDebt = customers.filter(c => (c.currentDebt || 0) > 0).length;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Header Card -->
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 20px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 800; color: #f8fafc; margin: 0;">Clientes & Gestão de Crédito (Fiado)</h2>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
              Controle rigoroso de limites de crédito para mestres de obra, contas correntes e recebimento de amortizações.
            </div>
          </div>
          <button class="btn btn-primary" id="btn-create-customer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
            <span>Novo Cliente</span>
          </button>
        </div>

        <!-- Metrics -->
        <div class="metrics-grid">
          <div class="card metric-card">
            <span class="metric-title">Total a Receber (Fiado Ativo)</span>
            <div class="metric-value" style="color: #fbbf24;">
              ${totalReceivable.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} <span style="font-size: 14px; color: #f59e0b;">MT</span>
            </div>
            <div class="metric-sub">${customersInDebt} clientes com débitos pendentes de quitação</div>
          </div>

          <div class="card metric-card">
            <span class="metric-title">Limite Total de Crédito Concedido</span>
            <div class="metric-value" style="color: #60a5fa;">
              ${totalCreditLimit.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} <span style="font-size: 14px; color: #3b82f6;">MT</span>
            </div>
            <div class="metric-sub">Teto de risco autorizado em carteira</div>
          </div>

          <div class="card metric-card">
            <span class="metric-title">Índice de Utilização do Crédito</span>
            <div class="metric-value" style="color: #34d399;">
              ${totalCreditLimit > 0 ? ((totalReceivable / totalCreditLimit) * 100).toFixed(1) : '0'}%
            </div>
            <div class="metric-sub">Margem média comprometida no fiado</div>
          </div>
        </div>

        <!-- Filter Bar Card -->
        <div class="card" style="padding: 12px 16px; display: flex; gap: 10px; align-items: center;">
          <input 
            type="text" 
            id="input-cust-search" 
            placeholder="Buscar por nome, NUIT ou telefone do cliente..." 
            value="${searchTerm}"
            style="flex: 1; font-size: 12px;"
          >
          <button class="btn btn-secondary" id="btn-cust-clear" style="padding: 6px 12px; font-size: 11px;">
            Limpar
          </button>
        </div>

        <!-- Customers Table -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>NUIT / Doc</th>
                  <th>Telefone</th>
                  <th>Limite Autorizado</th>
                  <th>Dívida Atual (Fiado)</th>
                  <th>Saldo Disponível</th>
                  <th>Status</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr><td colspan="8" style="text-align: center; color: #64748b; padding: 32px;">Nenhum cliente cadastrado.</td></tr>
                ` : filtered.map(c => {
                  const limit = c.creditLimit || 0;
                  const debt = c.currentDebt || 0;
                  const available = Math.max(0, limit - debt);
                  const isOver = debt >= limit && limit > 0;
                  return `
                    <tr>
                      <td>
                        <div style="font-weight: 700; color: #f8fafc;">${c.name}</div>
                        <div style="font-size: 10px; color: #94a3b8;">${c.address || 'Maputo'}</div>
                      </td>
                      <td>
                        <span style="font-family: var(--font-mono); color: #cbd5e1;">${c.document || c.taxId || 'Não informado'}</span>
                      </td>
                      <td>
                        <span style="font-size: 11px; color: #cbd5e1;">${c.phone || '-'}</span>
                      </td>
                      <td style="font-family: var(--font-mono); color: #cbd5e1;">
                        ${limit.toFixed(2)} MT
                      </td>
                      <td>
                        <strong style="color: ${debt > 0 ? '#fbbf24' : '#64748b'}; font-family: var(--font-mono); font-size: 13px;">
                          ${debt.toFixed(2)} MT
                        </strong>
                      </td>
                      <td>
                        <strong style="color: ${isOver ? '#ef4444' : '#34d399'}; font-family: var(--font-mono);">
                          ${available.toFixed(2)} MT
                        </strong>
                      </td>
                      <td>
                        <span class="badge ${isOver ? 'badge-red' : debt > 0 ? 'badge-amber' : 'badge-emerald'}">
                          ${isOver ? 'LIMITE ESGOTADO' : debt > 0 ? 'COM DÉBITO' : 'REGULAR'}
                        </span>
                      </td>
                      <td style="text-align: right;">
                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                          ${debt > 0 ? `
                            <button class="btn btn-primary btn-pay-debt" data-cust-id="${c.id}" style="padding: 4px 8px; font-size: 10px; background: #10b981; border-color: #10b981;">
                              Receber Pagamento
                            </button>
                          ` : ''}
                          <button class="btn btn-secondary btn-edit-cust" data-cust-id="${c.id}" style="padding: 4px 8px; font-size: 10px;">
                            Editar
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

    // Filter events
    const sInp = container.querySelector('#input-cust-search');
    sInp.oninput = (e) => {
      searchTerm = e.target.value;
      render();
      const ref = container.querySelector('#input-cust-search');
      if (ref) {
        ref.focus();
        ref.setSelectionRange(searchTerm.length, searchTerm.length);
      }
    };

    container.querySelector('#btn-cust-clear').onclick = () => {
      searchTerm = '';
      render();
    };

    // Create
    container.querySelector('#btn-create-customer').onclick = () => {
      openCustomerModal(null, () => render());
    };

    // Edit
    container.querySelectorAll('.btn-edit-cust').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-cust-id');
        const c = customers.find(item => item.id === id);
        if (c) openCustomerModal(c, () => render());
      };
    });

    // Pay Debt
    container.querySelectorAll('.btn-pay-debt').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-cust-id');
        const c = customers.find(item => item.id === id);
        if (c) openPayDebtModal(c, () => render());
      };
    });
  };

  const openCustomerModal = (customer, onSuccess) => {
    const isEdit = !!customer;
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 460px;">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}</h3>
          <button class="modal-close-btn" id="btn-close-cmodal">✕</button>
        </div>
        <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Nome Completo / Razão Social:</label>
            <input type="text" id="inp-c-name" value="${customer?.name || ''}" placeholder="Ex: Mestre Armando Construções" required style="width: 100%;">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">NUIT / Documento:</label>
              <input type="text" id="inp-c-doc" value="${customer?.document || customer?.taxId || ''}" placeholder="Ex: 400123987" style="width: 100%; font-family: var(--font-mono);">
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Telefone / WhatsApp:</label>
              <input type="text" id="inp-c-phone" value="${customer?.phone || ''}" placeholder="+258 84 000 0000" style="width: 100%;">
            </div>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Endereço / Localização habitual de obra:</label>
            <input type="text" id="inp-c-address" value="${customer?.address || ''}" placeholder="Ex: Bairro Triunfo, Parcela 15" style="width: 100%;">
          </div>

          <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
            <label style="font-size: 11px; font-weight: 700; color: #ea580c; text-transform: uppercase; display: block; margin-bottom: 4px;">Limite de Crédito Autorizado (MT):</label>
            <input type="number" min="0" step="500" id="inp-c-limit" value="${customer?.creditLimit || 0}" style="width: 100%; font-size: 16px; font-weight: 900; font-family: var(--font-mono); color: #34d399;">
            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">
              Valor máximo acumulado permitido para compras fiado.
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-cmodal">Cancelar</button>
          <button class="btn btn-primary" id="btn-save-cust">${isEdit ? 'Salvar Alterações' : 'Cadastrar Cliente'}</button>
        </div>
      </div>
    `;

    modal.querySelector('#btn-close-cmodal').onclick = () => modal.remove();
    modal.querySelector('#btn-cancel-cmodal').onclick = () => modal.remove();
    modal.querySelector('#btn-save-cust').onclick = () => {
      const name = modal.querySelector('#inp-c-name').value.trim();
      if (!name) {
        showToast('Nome do cliente é obrigatório.', 'error');
        return;
      }

      const saved = {
        id: customer?.id || 'cust-' + Date.now(),
        storeId,
        name,
        document: modal.querySelector('#inp-c-doc').value.trim(),
        taxId: modal.querySelector('#inp-c-doc').value.trim(),
        phone: modal.querySelector('#inp-c-phone').value.trim(),
        address: modal.querySelector('#inp-c-address').value.trim(),
        creditLimit: parseFloat(modal.querySelector('#inp-c-limit').value) || 0,
        currentDebt: customer?.currentDebt || 0
      };

      db.saveCustomer(saved);
      showToast(`Cliente ${saved.name} salvo com sucesso!`, 'success');
      modal.remove();
      if (onSuccess) onSuccess();
    };

    document.body.appendChild(modal);
  };

  const openPayDebtModal = (customer, onSuccess) => {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 420px;">
        <div class="modal-header" style="border-bottom-color: rgba(16, 185, 129, 0.4);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <h3 class="modal-title" style="color: #6ee7b7;">Receber Pagamento de Fiado</h3>
          </div>
          <button class="modal-close-btn" id="btn-close-pdmodal">✕</button>
        </div>

        <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div style="background: #1e293b; padding: 10px; border-radius: 8px; border: 1px solid #334155;">
            <div style="font-size: 12px; font-weight: bold; color: #fff;">${customer.name}</div>
            <div style="font-size: 11px; color: #94a3b8;">Dívida Pendente: <strong style="color: #fbbf24;">${customer.currentDebt.toFixed(2)} MT</strong></div>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Valor a Amortizar (MT):</label>
            <input type="number" min="1" max="${customer.currentDebt}" step="any" id="inp-pd-val" value="${customer.currentDebt}" style="width: 100%; font-size: 18px; font-weight: 900; font-family: var(--font-mono); color: #34d399;">
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Forma de Recebimento:</label>
            <select id="sel-pd-method" style="width: 100%;">
              <option value="DINHEIRO">Dinheiro Físico (Entra no Caixa Ativo)</option>
              <option value="M-PESA">M-Pesa (Vodacom)</option>
              <option value="E-MOLA">e-Mola (Movitel)</option>
              <option value="POS_CARTAO">Cartão POS / TPA</option>
              <option value="TRANSFERENCIA">Transferência Bancária</option>
            </select>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-pdmodal">Cancelar</button>
          <button class="btn btn-primary" id="btn-confirm-pay" style="background: #10b981; border-color: #10b981;">
            Confirmar Recebimento
          </button>
        </div>
      </div>
    `;

    modal.querySelector('#btn-close-pdmodal').onclick = () => modal.remove();
    modal.querySelector('#btn-cancel-pdmodal').onclick = () => modal.remove();
    modal.querySelector('#btn-confirm-pay').onclick = () => {
      const val = parseFloat(modal.querySelector('#inp-pd-val').value) || 0;
      const method = modal.querySelector('#sel-pd-method').value;

      if (val <= 0 || val > customer.currentDebt) {
        showToast('Valor de amortização inválido.', 'error');
        return;
      }

      // Reduce debt
      customer.currentDebt = Math.max(0, customer.currentDebt - val);
      db.saveCustomer(customer);

      // If Dinheiro, add to current cash drawer
      if (method === 'DINHEIRO') {
        const activeSession = db.getActiveCashSession(storeId);
        if (activeSession) {
          activeSession.cashInDrawer += val;
          activeSession.cashSales = (activeSession.cashSales || 0) + val;
          db.saveCashSession(activeSession);
        }
      }

      showToast(`Recebimento de ${val.toFixed(2)} MT efetuado com sucesso! Nova dívida: ${customer.currentDebt.toFixed(2)} MT`, 'success');
      modal.remove();
      if (onSuccess) onSuccess();
    };

    document.body.appendChild(modal);
  };

  render();
}
