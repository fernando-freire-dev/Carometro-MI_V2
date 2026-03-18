import { supabase } from "./supabaseClient.js";
import { verificarLogin, logout } from "./auth.js";

await verificarLogin();

// Logout
document.getElementById("btnLogout")?.addEventListener("click", logout);

// 🎓 Turmas
const turmas = {
  Fundamental: ["6ºA", "6ºB", "6ºC", "7ºA", "7ºB", "7ºC", "8ºA", "8ºB", "9ºA", "9ºB", "9ºC"],
  Médio: ["1ºA", "1ºB", "1ºC", "2ºA", "2ºB", "2ºC", "3ºA", "3ºB", "3ºC"]
};

const selectEnsino = document.getElementById("filtroEnsino");
const selectTurma = document.getElementById("filtroTurma");
const selectStatus = document.getElementById("filtroStatus");
const campoBusca = document.getElementById("buscaNome");
const tabelaAlunos = document.getElementById("tabelaAlunos");
const visualizadorFoto = document.getElementById("visualizadorFoto");
const fotoAmpliada = document.getElementById("fotoAmpliada");
const modalTurma = document.getElementById("modalTurma");
const modalInfo = document.getElementById("modalInfo");
const selectNovaTurma = document.getElementById("selectNovaTurma");
const btnCancelar = document.getElementById("btnCancelar");
const btnConfirmarTurma = document.getElementById("btnConfirmarTurma");
const toggleRA = document.getElementById("toggleRA");

let timeoutBusca;
let raVisivel = false;
let alunoSelecionado = null;

// =========================
// Utilidades
// =========================
function escaparHtml(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function obterStatusNormalizado(status) {
  return (status || "").toString().trim().toLowerCase();
}

function obterFotoUrl(ra) {
  const { data } = supabase
    .storage
    .from("fotos-alunos")
    .getPublicUrl(`${ra}.jpg`);

  return `${data.publicUrl}?t=${Date.now()}`;
}

function mostrarMensagem(texto) {
  alert(texto);
}

function preencherSelectTurmas() {
  selectTurma.innerHTML = '<option value="">Todas as Turmas</option>';

  if (turmas[selectEnsino.value]) {
    turmas[selectEnsino.value].forEach((turma) => {
      selectTurma.innerHTML += `<option value="${escaparHtml(turma)}">${escaparHtml(turma)}</option>`;
    });
  }
}

// =========================
// Eventos de filtro
// =========================
selectEnsino?.addEventListener("change", () => {
  preencherSelectTurmas();
  carregarAlunos();
});

selectTurma?.addEventListener("change", carregarAlunos);
selectStatus?.addEventListener("change", carregarAlunos);

campoBusca?.addEventListener("input", () => {
  clearTimeout(timeoutBusca);
  timeoutBusca = setTimeout(() => carregarAlunos(), 300);
});

// =========================
// Carregar alunos
// =========================
async function carregarAlunos() {
  let query = supabase
    .from("alunos")
    .select("*")
    .order("nome", { ascending: true });

  if (selectEnsino?.value) {
    query = query.eq("ensino", selectEnsino.value);
  }

  if (selectTurma?.value) {
    query = query.eq("turma", selectTurma.value);
  }

  if (selectStatus?.value) {
    query = query.eq("status", selectStatus.value);
  }

  const busca = campoBusca?.value?.trim();
  if (busca) {
    query = query.or(`nome.ilike.%${busca}%,ra.ilike.%${busca}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao carregar alunos:", error);
    tabelaAlunos.innerHTML = `<p>Erro ao carregar alunos.</p>`;
    return;
  }

  renderizarTabela(data || []);
}

function renderizarTabela(alunos) {
  if (!alunos.length) {
    tabelaAlunos.innerHTML = `<p>Nenhum aluno encontrado.</p>`;
    return;
  }

  let html = `
    <table>
      <tr>
        <th>Foto</th>
        <th class="col-ra" style="display:${raVisivel ? "table-cell" : "none"};">RA</th>
        <th>Nome</th>
        <th>Turma</th>
        <th>Status</th>
        <th>Ensino</th>
        <th>Ação</th>
      </tr>
  `;

  alunos.forEach((aluno) => {
    const statusNormalizado = obterStatusNormalizado(aluno.status);
    const fotoUrl = obterFotoUrl(aluno.ra);

    html += `
      <tr>
        <td>
          <img
            src="${fotoUrl}"
            class="foto-mini"
            data-src="${fotoUrl}"
            data-ra="${escaparHtml(aluno.ra)}"
            onerror="this.src='https://via.placeholder.com/60'"
            style="cursor:pointer;"
          >
        </td>
        <td class="col-ra" style="display:${raVisivel ? "table-cell" : "none"};">
          ${escaparHtml(aluno.ra)}
        </td>
        <td>${escaparHtml(aluno.nome)}</td>
        <td>${escaparHtml(aluno.turma)}</td>
        <td>
          <span class="badge ${statusNormalizado === "ativo" ? "badge-ativo" : "badge-inativo"}">
            ${escaparHtml(aluno.status)}
          </span>
        </td>
        <td>${escaparHtml(aluno.ensino)}</td>
        <td>
          <div class="acoes">
            <button
              class="btn-sm ${statusNormalizado === "ativo" ? "btn-danger" : "btn-success"} btn-status"
              data-ra="${escaparHtml(aluno.ra)}"
              data-status="${escaparHtml(aluno.status)}">
              ${statusNormalizado === "ativo" ? "Inativar" : "Ativar"}
            </button>

            <button
              class="btn-sm btn-warning btn-turma"
              data-ra="${escaparHtml(aluno.ra)}"
              data-nome="${escaparHtml(aluno.nome)}"
              data-ensino="${escaparHtml(aluno.ensino)}"
              data-turma="${escaparHtml(aluno.turma)}">
              Alterar Turma
            </button>

            <label class="btn-sm btn-info" style="cursor:pointer;">
              Foto
              <input
                type="file"
                accept="image/*"
                style="display:none;"
                class="input-foto"
                data-ra="${escaparHtml(aluno.ra)}">
            </label>
          </div>
        </td>
      </tr>
    `;
  });

  html += "</table>";
  tabelaAlunos.innerHTML = html;
}

// =========================
// Delegação de eventos
// =========================
tabelaAlunos?.addEventListener("click", async (event) => {
  const btnStatus = event.target.closest(".btn-status");
  const btnTurma = event.target.closest(".btn-turma");
  const fotoMini = event.target.closest(".foto-mini");

  if (btnStatus) {
    const ra = btnStatus.dataset.ra;
    const statusAtual = obterStatusNormalizado(btnStatus.dataset.status);
    const novoStatus = statusAtual === "ativo" ? "Inativo" : "Ativo";

    btnStatus.disabled = true;

    const { error } = await supabase
      .from("alunos")
      .update({ status: novoStatus })
      .eq("ra", ra);

    btnStatus.disabled = false;

    if (error) {
      console.error("Erro ao alterar status:", error);
      mostrarMensagem("Não foi possível alterar o status do aluno.");
      return;
    }

    carregarAlunos();
    return;
  }

  if (btnTurma) {
    iniciarMudancaTurma(
      btnTurma.dataset.ra,
      btnTurma.dataset.nome,
      btnTurma.dataset.ensino,
      btnTurma.dataset.turma
    );
    return;
  }

  if (fotoMini) {
    fotoAmpliada.src = fotoMini.dataset.src;
    visualizadorFoto.style.display = "flex";
  }
});

tabelaAlunos?.addEventListener("change", async (event) => {
  const inputFoto = event.target.closest(".input-foto");
  if (!inputFoto) return;

  const file = inputFoto.files?.[0];
  const ra = inputFoto.dataset.ra;

  if (!file) return;

  const { error } = await supabase.storage
    .from("fotos-alunos")
    .upload(`${ra}.jpg`, file, { upsert: true });

  if (error) {
    console.error("Erro ao enviar foto:", error);
    mostrarMensagem("Não foi possível enviar a foto.");
    return;
  }

  mostrarMensagem("Foto enviada com sucesso.");
  carregarAlunos();
});

// =========================
// Modal turma
// =========================
function iniciarMudancaTurma(ra, nome, ensino, turmaAtual) {
  alunoSelecionado = { ra, turmaAtual };

  modalInfo.innerHTML = `
    Aluno: <strong>${escaparHtml(nome)}</strong><br>
    Turma atual: <strong>${escaparHtml(turmaAtual)}</strong>
  `;

  selectNovaTurma.innerHTML = "";

  if (!turmas[ensino]) {
    mostrarMensagem("Ensino não encontrado para este aluno.");
    return;
  }

  turmas[ensino].forEach((turma) => {
    const option = document.createElement("option");
    option.value = turma;
    option.textContent = turma;
    if (turma === turmaAtual) option.selected = true;
    selectNovaTurma.appendChild(option);
  });

  modalTurma.style.display = "flex";
}

btnCancelar?.addEventListener("click", () => {
  modalTurma.style.display = "none";
});

btnConfirmarTurma?.addEventListener("click", async () => {
  if (!alunoSelecionado) return;

  const novaTurma = selectNovaTurma.value;

  if (novaTurma === alunoSelecionado.turmaAtual) {
    modalTurma.style.display = "none";
    return;
  }

  btnConfirmarTurma.disabled = true;

  const { error } = await supabase
    .from("alunos")
    .update({ turma: novaTurma })
    .eq("ra", alunoSelecionado.ra);

  btnConfirmarTurma.disabled = false;

  if (error) {
    console.error("Erro ao alterar turma:", error);
    mostrarMensagem("Não foi possível alterar a turma.");
    return;
  }

  modalTurma.style.display = "none";
  mostrarMensagem("Turma alterada com sucesso.");
  carregarAlunos();
});

// =========================
// Visualizador de foto
// =========================
visualizadorFoto?.addEventListener("click", (e) => {
  if (e.target.id === "visualizadorFoto") {
    e.currentTarget.style.display = "none";
  }
});

// =========================
// Mostrar/ocultar RA
// =========================
toggleRA?.addEventListener("click", () => {
  raVisivel = !raVisivel;

  document.querySelectorAll(".col-ra").forEach((col) => {
    col.style.display = raVisivel ? "table-cell" : "none";
  });
});

// Inicialização
carregarAlunos();
