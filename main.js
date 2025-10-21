// main.js - frontend completo VipCortes
const API_BASE = window.API_BASE_URL ? window.API_BASE_URL.replace(/\/$/, '') + '/api' : window.location.origin + '/api';

async function apiRequest(path, opts = {}) {
  const res = await fetch(API_BASE + path, opts);
  const json = await res.text().then(t => { try { return t ? JSON.parse(t) : {}; } catch { return {}; } });
  if (!res.ok) throw new Error(json.error || json.message || `Erro ${res.status}`);
  return json;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s]);
}

// ------------------ AGENDAMENTO ------------------
(function setupAgendar() {
  const form = document.querySelector('form#agendar') || document.querySelector('form');
  if (!form) return;

  const nomeEl = document.getElementById('nome');
  const idadeEl = document.getElementById('idade');
  const foneEl = document.getElementById('fone');
  const servicosEl = document.getElementById('servicos');
  const diaEl = document.getElementById('dia');
  const horarioEl = document.getElementById('horario');

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const payload = {
      name: nomeEl.value.trim(),
      age: idadeEl ? Number(idadeEl.value) : null,
      phone: foneEl ? foneEl.value.trim() : '',
      service: servicosEl.value,
      date: diaEl.value,
      time: horarioEl.value,
      observacoes: null
    };

    if (!payload.name || !payload.service || !payload.date) {
      return alert('Preencha Nome, Serviço e Data');
    }

    try {
      await apiRequest('/agendamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      window.location.href = 'AGENDAR2.html';
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar agendamento: ' + err.message);
    }
  });
  
})();

// ------------------ ADMINISTRAÇÃO ------------------
(function setupAdmin() {
  // só executa se estiver na admin.html
  if (!window.location.pathname.toLowerCase().includes('admin.html')) return;

  const tabela = document.querySelector('.agenda tbody');
  if (!tabela) return;

  async function carregarAgendamentos() {
    try {
      const { appointments } = await apiRequest('/agendamentos');
      tabela.innerHTML = '';

      if (!appointments.length) {
        tabela.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum agendamento encontrado.</td></tr>`;
        return;
      }

      for (const ag of appointments) {
        const tr = document.createElement('tr');

        tr.innerHTML = `
          <td>${escapeHtml(ag.name)}</td>
          <td>${escapeHtml(ag.phone)}</td>
          <td>${escapeHtml(ag.service)}</td>
          <td>${new Date(ag.data_agendamento).toLocaleDateString('pt-BR')}</td>
          <td>${ag.hora ? ag.hora.substring(0, 5) : ''}</td>
          <td><button class="btn-excluir" data-id="${ag.id}">Excluir</button></td>
        `;

        tabela.appendChild(tr);
      }

      // adiciona evento nos botões de exclusão
      document.querySelectorAll('.btn-excluir').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          if (!confirm('Deseja realmente excluir este agendamento?')) return;

          try {
            await apiRequest(`/agendamentos/${id}`, { method: 'DELETE' });
            alert('Agendamento excluído com sucesso!');
            await carregarAgendamentos(); // recarrega a lista
          } catch (err) {
            console.error(err);
            alert('Erro ao excluir: ' + err.message);
          }
        });
      });
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err);
      tabela.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;">Erro ao carregar agendamentos</td></tr>`;
    }
  }

  carregarAgendamentos();
})();

