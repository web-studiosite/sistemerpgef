/**

* GEF - GESTÃO FINANCEIRA | LOGIN MODULE
* JavaScript Puro (Vanilla JS)
  */

import { auth, DEMO_USERS } from '../../js/core/auth.js';
import { showToast } from '../../js/components/toast.js';

export function initLoginModule(container, onSuccess) {
container.innerHTML = ` <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: #0b0f19;"> <div style="width: 100%; max-width: 440px; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">

```
    <!-- Logo & Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: #1e293b; border-radius: 16px; border: 1px solid #334155; margin-bottom: 12px;">
        <img src="../../assets/icons/icon.svg" alt="GEF Logo" style="width: 44px; height: 44px;">
      </div>

      <h1 style="font-size: 20px; font-weight: 900; color: #f8fafc; margin: 0;">
        GEF - GESTÃO FINANCEIRA
      </h1>

      <p style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
        ERP Especializado para Materiais de Construção & Ferragens
      </p>
    </div>

    <!-- Form -->
    <form id="form-login" style="display: flex; flex-direction: column; gap: 14px;">

      <div>
        <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">
          E-mail Corporativo
        </label>

        <input
          type="email"
          id="login-email"
          placeholder="seu.email@gef.co.mz"
          required
          style="width: 100%; font-size: 13px;"
        >
      </div>

      <div>
        <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">
          Senha de Acesso
        </label>

        <input
          type="password"
          id="login-password"
          placeholder="••••••••"
          required
          style="width: 100%; font-size: 13px;"
        >
      </div>

      <button
        type="submit"
        id="btn-login"
        class="btn btn-primary"
        style="width: 100%; padding: 12px; font-size: 13px; font-weight: 800; margin-top: 6px;"
      >
        Acessar Sistema GEF
      </button>

    </form>

    <!-- Demo Profiles Quick Switch -->
    <div style="margin-top: 24px; border-top: 1px solid #1f2937; padding-top: 18px;">

      <div style="font-size: 10px; font-weight: 800; color: #ea580c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; text-align: center;">
        Perfis de Demonstração Rápidos (1-Clique)
      </div>

      <div style="display: flex; flex-direction: column; gap: 6px;">

        ${DEMO_USERS.map(u => `
          <button
            type="button"
            class="btn btn-secondary demo-user-btn"
            data-demo-id="${u.id}"
            style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; font-size: 11px; text-align: left;"
          >
            <div>
              <div style="font-weight: 700; color: #e2e8f0;">
                ${u.fullName}
              </div>

              <div style="font-size: 10px; color: #94a3b8;">
                ${u.storeName}
              </div>
            </div>

            <span
              class="badge ${
                u.role === 'SUPERADMIN'
                  ? 'badge-amber'
                  : u.role === 'ADMIN'
                  ? 'badge-blue'
                  : u.role === 'GERENTE'
                  ? 'badge-orange'
                  : 'badge-emerald'
              }"
              style="font-size: 8px;"
            >
              ${u.role}
            </span>
          </button>
        `).join('')}

      </div>
    </div>

  </div>
</div>
```

`;

// Submit standard form
container.querySelector('#form-login').onsubmit = async (e) => {
e.preventDefault();

```
const email = container.querySelector('#login-email').value;
const password = container.querySelector('#login-password').value;
const button = container.querySelector('#btn-login');

button.disabled = true;
button.textContent = 'A iniciar sessão...';

try {
  const res = await auth.signIn(email, password);

  if (res.success) {
    showToast(`Bem-vindo, ${res.user.fullName}!`, 'success');

    if (onSuccess) {
      onSuccess(res.user);
    }

    return;
  }

  // MOSTRAR O ERRO DEVOLVIDO PELO SUPABASE
  showToast(
    res.error || 'Não foi possível iniciar sessão.',
    'error'
  );

} catch (error) {
  console.error('Erro no formulário de login:', error);

  showToast(
    error?.message || 'Erro ao iniciar sessão.',
    'error'
  );

} finally {
  button.disabled = false;
  button.textContent = 'Acessar Sistema GEF';
}
```

};

// Demo user buttons
container.querySelectorAll('.demo-user-btn').forEach(btn => {
btn.onclick = () => {
const demoId = btn.getAttribute('data-demo-id');
const demo = DEMO_USERS.find(u => u.id === demoId);

```
  if (demo) {
    auth.selectDemoUser(demo);

    showToast(
      `Sessão iniciada como ${demo.fullName}`,
      'success'
    );

    if (onSuccess) {
      onSuccess(demo);
    }
  }
};
```

});
}
