// ===============================
// VARIÁVEIS / ESTADO
// ===============================

import { getUser, logout } from "./auth.js";

const API_ROOT = "https://backend-wg1b.onrender.com";
const API_BASE = `${API_ROOT}/api`;

let nichoAtual = "";
let tipoAtual = "";
let categoriaAtual = "";
let categoriaFarmaciaAtual = "";

let cesta = [];

// DOM
const elBusca = document.getElementById("busca");
const authButtons = document.querySelector(".auth-buttons");
const areaUsuario = document.getElementById("areaUsuario");
const elResultado = document.getElementById("resultado");
const elCestaResultado = document.getElementById("cestaResultado");

const elFiltroSupermercado = document.getElementById("filtroSupermercado");
const elFiltroCombustivel = document.getElementById("filtroCombustivel");
const elFiltroFarmacia = document.getElementById("filtroFarmacia");

// Contribuir (abre/fecha) + NFC-e
const btnContribuir = document.getElementById("btnContribuir");
const boxContribuir = document.getElementById("boxContribuir");

const elNfceUrl = document.getElementById("nfceUrl");
const elNfceCidade = document.getElementById("nfceCidade");
const btnNfceLer = document.getElementById("btnNfceLer");
const btnNfceImportar = document.getElementById("btnNfceImportar");
const elNfceStatus = document.getElementById("nfceStatus");
const elNfcePreview = document.getElementById("nfcePreview");

// ===============================
// AUTH UI (seu login do Maurício)
// ===============================
async function refreshAuthUI() {
  if (!areaUsuario || !authButtons) return;
  try {
    const user = await getUser();
    if (user) {
      authButtons.style.display = "none";
      areaUsuario.style.display = "flex";
      areaUsuario.innerHTML = `
        <span style="font-weight:700;">Olá, ${escapeHtml(user.email || "usuário")}</span>
        <button id="btnLogout" style="margin-left:10px;">Sair</button>
      `;
      areaUsuario.querySelector("#btnLogout")?.addEventListener("click", async () => {
        try {
          await logout();
        } catch {}
        refreshAuthUI();
      });
    } else {
      authButtons.style.display = "flex";
      areaUsuario.style.display = "none";
      areaUsuario.innerHTML = "";
    }
  } catch {
    authButtons.style.display = "flex";
    areaUsuario.style.display = "none";
  }
}
refreshAuthUI();

// ===============================
// UI: Contribuir (accordion)
// ===============================
btnContribuir?.addEventListener("click", () => {
  if (!boxContribuir) return;
  boxContribuir.classList.toggle("aberto");
});

// ===============================
// NFC-e UI helpers
// ===============================
let ultimoNfce = null;

function nfceSetStatus(msg, isError = false) {
  if (!elNfceStatus) return;
  elNfceStatus.textContent = msg || "";
  elNfceStatus.style.color = isError ? "#b3261e" : "#1f7a39";
}

function nfceEnableImport(enabled) {
  if (!btnNfceImportar) return;
  btnNfceImportar.disabled = !enabled;
  btnNfceImportar.style.opacity = enabled ? "1" : "0.6";
}

btnNfceLer?.addEventListener("click", async () => {
  const url = elNfceUrl?.value || "";
  await nfceLerUrl(url);
});

btnNfceImportar?.addEventListener("click", async () => {
  await nfceImportar();
});

function parseMoneyFlexible(v) {
  if (v == null) return null;
  if (typeof v === "number") return v;
  const s = String(v)
    .replace(/\s/g, "")
    .replace(/[R$\u00A0]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// ===============================
// CONTROLES DE FILTRO
// ===============================
function limparAtivos(grupo) {
  document.querySelectorAll(grupo + " button").forEach((b) => b.classList.remove("ativo"));
}

function setNicho(n, b) {
  nichoAtual = n;
  tipoAtual = "";
  categoriaAtual = "";
  categoriaFarmaciaAtual = "";
  elResultado.innerHTML = "";

  limparAtivos(".topo");
  b?.classList.add("ativo");

  ["Supermercado", "Combustivel", "Farmacia"].forEach((f) => {
    const el = document.getElementById("filtro" + f);
    if (el) el.style.display = "none";
  });

  if (n === "supermercado") elFiltroSupermercado.style.display = "flex";
  if (n === "combustivel") elFiltroCombustivel.style.display = "flex";
  if (n === "farmacia") elFiltroFarmacia.style.display = "flex";

  buscar();
}

function setTipo(t, b) {
  tipoAtual = t;
  limparAtivos("#filtroCombustivel");
  b?.classList.add("ativo");
  buscar();
}

function setCategoria(c, b) {
  categoriaAtual = c;
  limparAtivos("#filtroSupermercado");
  b?.classList.add("ativo");
  buscar();
}

function setCategoriaFarmacia(c, b) {
  categoriaFarmaciaAtual = c;
  limparAtivos("#filtroFarmacia");
  b?.classList.add("ativo");
  buscar();
}

// ===============================
// BADGE POSITIVO (CONFIRMAÇÃO)
// ===============================
function garantirBadgeConfere(li) {
  const precoEl = li.querySelector(".preco");
  if (!precoEl) return null;

  let badge = li.querySelector(".badge-confere");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "badge-confere";
    badge.style.marginLeft = "8px";
    badge.style.fontSize = "12px";
    badge.style.fontWeight = "700";
    badge.style.display = "inline-block";
    badge.style.padding = "2px 8px";
    badge.style.borderRadius = "999px";
    badge.style.border = "1px solid #1f7a39";
    badge.style.background = "#e8f7ee";
    badge.style.color = "#1f7a39";
    precoEl.appendChild(badge);
  }
  return badge;
}

function aplicarBadgeConfere(li, confere) {
  const badge = garantirBadgeConfere(li);
  if (!badge) return;

  const n = Number(confere || 0);
  if (n > 0) {
    badge.textContent = `✅ Confirmado por ${n}`;
    badge.style.display = "inline-block";
  } else {
    badge.textContent = "";
    badge.style.display = "none";
  }
}

// ===============================
// LIMITAR CONFIRMAÇÃO POR USUÁRIO (front-only)
// - trava 1 voto (confere) por item por usuário POR DIA
// - sem backend não dá pra garantir 100% contra fraude, mas para o uso normal resolve.
// ===============================
function hojeISO() {
  // yyyy-mm-dd (local)
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function voteKey(userId, itemId, acao, dia = hojeISO()) {
  return `qc_vote:${String(userId)}:${String(itemId)}:${String(acao)}:${dia}`;
}

function userMustBeLoggedIn(user) {
  if (!user) {
    alert("Você precisa estar logado para confirmar preços.");
    return false;
  }
  return true;
}

function userAlreadyVotedToday(userId, itemId, acao) {
  try {
    return localStorage.getItem(voteKey(userId, itemId, acao)) === "1";
  } catch {
    return false;
  }
}

function markUserVotedToday(userId, itemId, acao) {
  try {
    localStorage.setItem(voteKey(userId, itemId, acao), "1");
  } catch {}
}

function parseDateSafe(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDataBR(d) {
  if (!d) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const mon = String(d.getMonth() + 1).padStart(2, "0");
  const y = d.getFullYear();
  return `${day}/${mon}/${y}`;
}

// <=7 dias: fresh (verde); senão old (vermelho)
function classeRecencia(d) {
  if (!d) return "old";
  const diffDias = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diffDias <= 7 ? "fresh" : "old";
}

// ===============================
// API - AVALIAÇÕES
// ===============================
async function apiGetContadores(ids) {
  if (!ids.length) return {};
  const url = `${API_BASE}/avaliacoes?ids=${encodeURIComponent(ids.join(","))}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar contadores: HTTP " + res.status);
  return await res.json();
}

// (melhoria pequena) agora aceita opcionalmente user_id, pra vocês evoluírem backend depois
async function apiEnviarAvaliacao(id, acao, user_id = null) {
  const body = { id: String(id), acao };
  if (user_id) body.user_id = String(user_id);

  const res = await fetch(`${API_BASE}/avaliacao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), // acao: "confere"
  });
  if (!res.ok) throw new Error("Falha ao enviar avaliação: HTTP " + res.status);
  return await res.json();
}

// ===============================
// API - PREÇOS (sincronização) - legado
// ===============================
async function apiGetOverridesAprovados(ids) {
  if (!ids?.length) return {};
  const url = `${API_BASE}/precos?status=aprovado&ids=${encodeURIComponent(ids.join(","))}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar overrides: HTTP " + res.status);
  return await res.json();
}

async function apiEnviarSugestaoPreco(payload) {
  const res = await fetch(`${API_BASE}/precos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao enviar sugestão: HTTP " + res.status);
  return await res.json();
}

// ===============================
// API - NFC-e (legado para listar aprovados)
// ===============================
async function apiGetNfceItensAprovados({ cidade, q, nicho, limit = 60 } = {}) {
  const qs = new URLSearchParams();
  if (cidade) qs.set("cidade", cidade);
  if (q) qs.set("q", q);
  if (nicho) qs.set("nicho", nicho);
  qs.set("limit", String(limit));

  const url = `${API_BASE}/nfce/itens?${qs.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar NFC-e: HTTP " + res.status);
  return await res.json();
}

// aplica overrides (obj por id) ao array de produtos
function aplicarOverridesDePreco(produtos, overridesPorId = {}) {
  return (produtos || []).map((p) => {
    const id = String(p.id);
    const ov = overridesPorId?.[id];
    if (ov?.preco != null) return { ...p, preco: ov.preco };
    return p;
  });
}

// ===============================
// ===== NOVO: CATÁLOGO/OFERTAS =====
// ===============================
async function apiCatalogoBusca({ q, limit = 50 } = {}) {
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  qs.set("limit", String(limit));
  const url = `${API_BASE}/catalogo/busca?${qs.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar catálogo: HTTP " + res.status);
  return await res.json(); // [{id,nome,ean,nicho,categoria,status}]
}

async function apiOfertasPorItem({ item_id, limit = 50 } = {}) {
  const qs = new URLSearchParams();
  qs.set("item_id", String(item_id));
  qs.set("limit", String(limit));
  const url = `${API_BASE}/ofertas?${qs.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar ofertas: HTTP " + res.status);
  return await res.json(); // [{preco,loja,cidade,uf,latitude,longitude,}]
}

// ===============================
// ===== NOVO: MODAL OFERTAS =====
// (sem depender do HTML)
// ===============================
let qcModal = null;

function ensureModal() {
  if (qcModal) return qcModal;

  const wrap = document.createElement("div");
  wrap.id = "qcModalOfertas";
  wrap.style.position = "fixed";
  wrap.style.inset = "0";
  wrap.style.background = "rgba(0,0,0,45)";
  wrap.style.display = "none";
  wrap.style.zIndex = "9999";
  wrap.style.padding = "20px";

  wrap.innerHTML = `
    <div style="max-width:860px;margin:0 auto;background:#fff;border-radius:16px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,25);">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;">
        <div style="font-weight:900;font-size:16px;" id="qcModalTitulo">Ofertas</div>
        <button id="qcModalFechar" style="border:0;background:#111;color:#fff;border-radius:999px;padding:8px 12px;cursor:pointer;">Fechar</button>
      </div>
      <div id="qcModalBody" style="margin-top:12px;max-height:70vh;overflow:auto;"></div>
    </div>
  `;

  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) hideModal();
  });

  document.body.appendChild(wrap);
  qcModal = wrap;

  wrap.querySelector("#qcModalFechar")?.addEventListener("click", hideModal);
  return qcModal;
}

function showModal({ titulo, html }) {
  const m = ensureModal();
  const t = m.querySelector("#qcModalTitulo");
  const b = m.querySelector("#qcModalBody");
  if (t) t.textContent = titulo || "Ofertas";
  if (b) b.innerHTML = html || "";
  m.style.display = "block";
}

function hideModal() {
  if (qcModal) qcModal.style.display = "none";
}

async function abrirOfertasDoItem(itemId, nome) {
  try {
    showModal({ titulo: "Carregando…", html: "<div>Buscando ofertas…</div>" });
    const ofertas = await apiOfertasPorItem({ item_id: itemId, limit: 80 });

    if (!Array.isArray(ofertas) || !ofertas.length) {
      showModal({
        titulo: nome || "Ofertas",
        html: `<div style="padding:10px;">Sem ofertas cadastradas ainda.</div>`,
      });
      return;
    }

    const linhas = ofertas
      .map((o) => {
        const preco = Number(o.preco);
        const precoTxt = Number.isFinite(preco) ? preco.toFixed(2).replace(".", ",") : "—";
        const loja = escapeHtml(o.loja || "—");
        const cidade = escapeHtml(o.cidade || "—");
        const uf = escapeHtml(o.uf || "");
        const data = escapeHtml(o.data_compra || o.atualizado_em || o.atualizadoEm || "—");
        return `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;"><b>R$ ${precoTxt}</b></td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${loja}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${cidade}${uf ? "/" + uf : ""}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${data}</td>
          </tr>
        `;
      })
      .join("");

    showModal({
      titulo: nome || "Ofertas",
      html: `
        <div style="overflow:auto;">
          <table style="border-collapse:collapse;width:100%;min-width:720px;">
            <thead>
              <tr>
                <th style="text-align:left;padding:8px;border-bottom:2px solid #ddd;">Preço</th>
                <th style="text-align:left;padding:8px;border-bottom:2px solid #ddd;">Loja</th>
                <th style="text-align:left;padding:8px;border-bottom:2px solid #ddd;">Cidade</th>
                <th style="text-align:left;padding:8px;border-bottom:2px solid #ddd;">Data</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>
      `,
    });
  } catch (e) {
    showModal({
      titulo: nome || "Ofertas",
      html: `<div style="padding:10px;color:#b3261e;">Erro ao carregar ofertas: ${escapeHtml(e?.message || String(e))}</div>`,
    });
  }
}

// ===============================
// BUSCA (mistura catálogo + nfce)
// ===============================
async function buscar() {
  if (!nichoAtual) return alert("Selecione um nicho.");

  if (nichoAtual === "combustivel" && !tipoAtual) return alert("Selecione o tipo (Comum/Aditivada).");
  if (nichoAtual === "supermercado" && !categoriaAtual) return alert("Selecione a categoria.");
  if (nichoAtual === "farmacia" && !categoriaFarmaciaAtual) return alert("Selecione a categoria.");

  const q = (elBusca?.value || "").trim();

  elResultado.innerHTML = "<li>🔎 Buscando…</li>";

  try {
    // 1) CATÁLOGO
    const catalogo = await apiCatalogoBusca({ q, limit: 60 });
    const catFiltrado = Array.isArray(catalogo)
      ? catalogo.filter((x) => {
          if (nichoAtual === "supermercado") return (x.nicho || "") === "supermercado";
          if (nichoAtual === "combustivel") return (x.nicho || "") === "combustivel";
          if (nichoAtual === "farmacia") return (x.nicho || "") === "farmacia";
          return true;
        })
      : [];

    // 2) NFC-e aprovados (supermercado)
    let nfce = [];
    if (nichoAtual === "supermercado") {
      nfce = await apiGetNfceItensAprovados({ cidade: "Rio Grande", q, nicho: "supermercado", limit: 60 });
    }

    // junta tudo
    let itens = [];

    // catálogo -> padroniza campos usados no render
    catFiltrado.forEach((c) => {
      itens.push({
        id: c.id,
        nome: c.nome,
        preco: null,
        loja: null,
        cidade: null,
        origem: "catalogo",
        createdAt: c.createdAt || c.created_at || null,
        updatedAt: c.updatedAt || c.updated_at || null,
      });
    });

    // nfce -> já vem com preço, loja, cidade, etc
    if (Array.isArray(nfce)) itens = itens.concat(nfce);

    // contadores
    const ids = itens.map((x) => String(x.id));
    const contadores = await apiGetContadores(ids).catch(() => ({}));

    // overrides aprovados
    const overrides = await apiGetOverridesAprovados(ids).catch(() => ({}));
    itens = aplicarOverridesDePreco(itens, overrides);

    if (!itens.length) {
      elResultado.innerHTML = "<li>Nenhum resultado.</li>";
      return;
    }

    elResultado.innerHTML = "";
    cesta = [];

    itens.forEach((p, index) => {
      const li = document.createElement("li");
      li.dataset.id = p.id;

      const dt = parseDateSafe(p.updatedAt || p.createdAt || p.data_compra || p.dataEmissao);
      li.classList.add(classeRecencia(dt));
      const ultimaHtml = `<span class="ultima-att">Última atualização: ${fmtDataBR(dt)}</span>`;

      const precoNum = Number(p.preco);
      const precoTxt = Number.isFinite(precoNum) ? precoNum.toFixed(2).replace(".", ",") : "—";
      const isCatalogo = p.origem === "catalogo";

      const lojaRaw = p.loja || "";
      const cidadeRaw = p.cidade || "";

      // loja clicável pra focar no mapa (por nome)
      const lojaHtml = lojaRaw
        ? `<a href="#" onclick="indicarNoMapaPorNomeMercado('${escapeHtmlAttr(lojaRaw)}'); return false;">${escapeHtml(
            lojaRaw
          )}</a>`
        : "";

      const selo = isCatalogo
        ? ` <button style="margin-left:8px;border:0;background:#111;color:#fff;border-radius:999px;padding:4px 10px;cursor:pointer;"
              onclick="abrirOfertasDoItem('${escapeHtmlAttr(p.id)}','${escapeHtmlAttr(p.nome || "")}')">Ver ofertas</button>`
        : ` <span class="preco" style="font-weight:900;">R$ ${precoTxt}</span>`;

      const subtituloHtml = (() => {
        if (lojaRaw && cidadeRaw) return `${lojaHtml} • ${escapeHtml(cidadeRaw)}`;
        if (lojaRaw) return `${lojaHtml}`;
        if (cidadeRaw) return escapeHtml(cidadeRaw);
        return isCatalogo ? "Clique em Ver ofertas" : "";
      })();

      li.innerHTML =
        "<span><input type='checkbox' id='ck-" +
        index +
        "'> " +
        (escapeHtml(p.nome || "") + selo) +
        "<br><small>" +
        subtituloHtml +
        (subtituloHtml ? " • " : "") +
        ultimaHtml +
        "</small></span>" +
        `<div style="margin-top:8px;display:flex;gap:10px;align-items:center;">
          <button onclick="confirmarPreco(${index})">Confirmar</button>
          <span id="confere-${index}" style="font-weight:700;"></span>
          <span id="feedback-${index}" style="opacity:.8;"></span>
        </div>`;

      // badge de confere
      const cont = contadores?.[String(p.id)] || { confere: 0, contesta: 0 };
      aplicarBadgeConfere(li, cont.confere);

      const span = li.querySelector(`#confere-${index}`);
      if (span && typeof cont.confere === "number") {
        span.textContent = cont.confere ? `(${cont.confere})` : "";
      }

      elResultado.appendChild(li);
    });
  } catch (e) {
    console.error(e);
    elResultado.innerHTML = `<li style="color:#b3261e;">Erro: ${escapeHtml(e?.message || String(e))}</li>`;
  }
}

// ===============================
// FEEDBACK / AVALIAÇÃO
// ===============================
async function confirmarPreco(index) {
  const fb = document.getElementById("feedback-" + index);
  if (!fb) return;

  const li = fb.closest("li");
  const id = li?.dataset?.id;

  const user = await getUser();
  if (!userMustBeLoggedIn(user)) return;

  if (!id) {
    fb.innerText = "Item sem ID (não dá pra confirmar).";
    return;
  }

  // trava 1 confere por usuário+item por dia (front-only)
  if (userAlreadyVotedToday(user.id, id, "confere")) {
    fb.innerText = "Você já confirmou esse item hoje. ✅";
    return;
  }

  fb.innerText = "Enviando…";

  apiEnviarAvaliacao(id, "confere", user.id)
    .then((ret) => {
      // marca voto local (só se backend der ok)
      markUserVotedToday(user.id, id, "confere");

      const totalConfere = ret?.confere;

      const span = document.getElementById("confere-" + index);
      if (span && typeof totalConfere === "number") {
        span.textContent = totalConfere ? `(${totalConfere})` : "";
      }

      if (typeof totalConfere === "number" && li) {
        aplicarBadgeConfere(li, totalConfere);
      }

      fb.innerText = "Obrigado por confirmar.✨️";
    })
    .catch((err) => {
      console.error(err);
      fb.innerText = "Falha ao confirmar (servidor).";
    });
}

// ===============================
// NFC-e: preview / leitura / importação
// ===============================
function nfceRenderPreview(nfce) {
  if (!elNfcePreview) return;

  const emitenteHtml = escapeHtml(nfce?.emitente || "—");

  const itens = Array.isArray(nfce?.itens) ? nfce.itens.slice(0, 30) : [];

  const warnings = Array.isArray(nfce?.warnings) ? nfce.warnings : [];
  const warningsHtml = warnings.length
    ? `<div style="margin-top:10px;padding:10px;border-radius:12px;background:#fff7ed;border:1px solid #f59e0b;">
        <b>Atenção:</b>
        <ul style="margin:6px 0 0 18px;">${warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul>
      </div>`
    : "";

  const itensHtml = itens
    .map(
      (it, i) => `
      <tr>
        <td style="padding:6px;border-bottom:1px solid #eee;">${i + 1}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;">${escapeHtml(it?.descricao || "")}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;">${escapeHtml(String(it?.qtd ?? ""))}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;">${escapeHtml(String(it?.un ?? ""))}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;">${escapeHtml(String(it?.vUnit ?? ""))}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;">${escapeHtml(String(it?.vTotal ?? ""))}</td>
      </tr>
    `
    )
    .join("");

  elNfcePreview.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;">
      <div><b>Emitente:</b> ${emitenteHtml}</div>
      <div><b>Data:</b> ${escapeHtml(nfce?.dataEmissao || "—")}</div>
      <div><b>Total:</b> ${escapeHtml(String(nfce?.total ?? "—"))}</div>
      <div style="margin-top:6px;"><b>Fonte:</b> ${
        nfce?.sourceUrl ? `<a href="${escapeHtml(nfce.sourceUrl)}" target="_blank">abrir consulta</a>` : "—"
      }</div>
      ${warningsHtml}
    </div>

    <div style="overflow:auto;margin-top:12px;">
      <table style="border-collapse:collapse;width:100%;min-width:720px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #ddd;">#</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #ddd;">Produto</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #ddd;">Qtd</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #ddd;">Un</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #ddd;">V. Unit</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #ddd;">V. Total</th>
          </tr>
        </thead>
        <tbody>${itensHtml || ""}</tbody>
      </table>
      ${itens.length > 30 ? `<div style="margin-top:6px; opacity:.8">Mostrando 30 primeiros itens</div>` : ""}
    </div>
  `;
}

async function nfceLerUrl(url) {
  const u = String(url || "").trim();
  if (!u) {
    nfceSetStatus("Cole a URL da NFC-e.", true);
    return;
  }
  if (!u.startsWith("http")) {
    nfceSetStatus("A URL precisa começar com http/https.", true);
    return;
  }

  ultimoNfce = null;
  nfceEnableImport(false);
  if (elNfcePreview) elNfcePreview.innerHTML = "";
  nfceSetStatus("Lendo NFC-e…");

  try {
    const resp = await fetch(`${API_BASE}/nfce/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: u }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      nfceSetStatus(data?.erro || `Falha ao ler NFC-e (HTTP ${resp.status}).`, true);
      return;
    }

    ultimoNfce = data;
    nfceRenderPreview(data);

    const okToImport = Array.isArray(data?.itens) && data.itens.length > 0;
    nfceEnableImport(okToImport);

    nfceSetStatus(okToImport ? "NFC-e lida. Pronto para importar." : "Li a NFC-e, mas não encontrei itens.", !okToImport);
  } catch (err) {
    console.error(err);
    nfceSetStatus("Erro ao ler NFC-e. Veja console/logs.", true);
    alert("Falha ao ler NFC-e: " + (err?.message || err));
  }
}

async function nfceImportar() {
  if (!ultimoNfce) {
    nfceSetStatus("Primeiro leia a NFC-e (QR ou URL).", true);
    return;
  }

  const cidade = (elNfceCidade?.value || "").trim() || "Rio Grande";
  const itens = Array.isArray(ultimoNfce.itens) ? ultimoNfce.itens : [];

  if (!itens.length) {
    nfceSetStatus("NFC-e inválida (sem itens).", true);
    return;
  }

  // ===== Importação LEGADO (precos_sugestoes) - mantém =====
  const payloadLegado = {
    cidade,
    sourceUrl: ultimoNfce.sourceUrl || null,
    emitente: ultimoNfce.emitente || null,
    cnpj: ultimoNfce.cnpj || null,
    dataEmissao: ultimoNfce.dataEmissao || null,
    itens: itens.map((it) => ({
      descricao: it.descricao || "",
      qtd: it.qtd ?? null,
      un: it.un ?? null,
      vUnit: it.vUnit ?? null,
      vTotal: it.vTotal ?? null,
    })),
  };

  // ===== Importação NOVA (catalogo/locais/ofertas) =====
  const payloadNovo = {
    loja: ultimoNfce.emitente || null,
    cidade,
    uf: "RS",
    cnpj: ultimoNfce.cnpj || null, // opcional
    chave_nfce: null,
    data_compra: null,
    itens: itens.map((it) => ({
      nome: it.descricao || "",
      preco: parseMoneyFlexible(it.vUnit) ?? null,
      ean: it.ean ?? null,
      nicho: "supermercado",
      categoria: null,
    })),
  };

  nfceSetStatus("Importando…");

  try {
    // tenta novo primeiro
    const rNovo = await fetch(`${API_BASE}/nfce/importar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadNovo),
    });
    const dataNovo = await rNovo.json().catch(() => ({}));

    // também envia legado (se quiser manter compat)
    const rLeg = await fetch(`${API_BASE}/nfce/import-precos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadLegado),
    });
    const dataLeg = await rLeg.json().catch(() => ({}));

    if (!rNovo.ok) {
      nfceSetStatus(dataNovo?.erro || "Falha ao importar (novo).", true);
      console.warn("novo import erro:", dataNovo);
      return;
    }

    if (!rLeg.ok) {
      console.warn("legado import erro:", dataLeg);
    }

    nfceSetStatus("Importado com sucesso. ✅");
    alert("Importação concluída! ✅");

    // limpa UI
    ultimoNfce = null;
    nfceEnableImport(false);
    if (elNfcePreview) elNfcePreview.innerHTML = "";
    if (elNfceUrl) elNfceUrl.value = "";

    // atualiza lista
    if (nichoAtual === "supermercado") buscar();
  } catch (e) {
    console.error(e);
    nfceSetStatus("Erro ao importar. Veja console/logs.", true);
  }
}

// ===============================
// MAPA + POSTOS (postos_rio_grande_rs.csv)
// ===============================
const centroRG = [-32.035, -52.098];
const mapEl = document.getElementById("map");

let map = null;
let layerPostos = null;
let usuarioPosicao = null;
let postosIndex = [];

if (mapEl) {
  map = L.map("map").setView(centroRG, 13);
  window.map = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(map);

  layerPostos = L.layerGroup().addTo(map);

  map.locate({ setView: false, maxZoom: 15 });

  map.on("locationfound", (e) => {
    usuarioPosicao = e.latlng;
    L.circleMarker(usuarioPosicao, { radius: 8, fillOpacity: 0.85 })
      .addTo(map)
      .bindPopup("<b>Você está aqui</b>");
  });

  map.on("locationerror", () => {});

  carregarPostosNoMapa();
} else {
  console.error("❌ Não achei a div #map no HTML.");
}

async function carregarPostosNoMapa() {
  try {
    if (!map || !layerPostos) return;

    const res = await fetch("postos_rio_grande_rs.csv?v=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);

    const csvText = await res.text();

    const linhas = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (linhas.length < 2) throw new Error("Arquivo vazio ou sem dados.");

    const sep = linhas[0].includes("\t") ? "\t" : ",";

    const header = linhas[0].split(sep).map((h) => h.trim().toLowerCase());

    const idxNome = header.indexOf("nome");
    const idxLat = header.indexOf("latitude");
    const idxLng = header.indexOf("longitude");

    if (idxLat === -1 || idxLng === -1) {
      throw new Error("Não achei colunas latitude/longitude no arquivo.");
    }

    const toNum = (v) => Number(String(v).trim().replace(",", "."));

    // agora guarda marker + nome_norm
    postosIndex = linhas
      .slice(1)
      .map((linha) => {
        const cols = linha.split(sep).map((c) => c.trim());
        const nome = (idxNome >= 0 ? cols[idxNome] : "Posto") || "Posto";
        const latitude = toNum(cols[idxLat]);
        const longitude = toNum(cols[idxLng]);
        return {
          nome,
          nome_norm: normTxt(nome),
          latitude,
          longitude,
          marker: null,
        };
      })
      .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));

    layerPostos.clearLayers();

    let bounds = null;

    postosIndex.forEach((p) => {
      p.marker = L.marker([p.latitude, p.longitude])
        .addTo(layerPostos)
        .bindPopup(`<b>${escapeHtml(p.nome)}</b><br><small>Rio Grande/RS</small>`);

      if (!bounds) bounds = L.latLngBounds([p.latitude, p.longitude], [p.latitude, p.longitude]);
      else bounds.extend([p.latitude, p.longitude]);
    });

    if (bounds) map.fitBounds(bounds.pad(0.12));
    console.log("✅ Postos marcados no mapa:", postosIndex.length);
  } catch (e) {
    console.error("❌ Erro ao carregar postos_rio_grande_rs.csv:", e);
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeHtmlAttr(str) {
  return escapeHtml(str).replaceAll("`", "&#096;");
}

function normTxt(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extrairNomeLimpoNfce(nomeBruto) {
  const s = String(nomeBruto || "").trim();
  const i = s.toLowerCase().indexOf("(código:");
  if (i > 0) return s.slice(0, i).trim();
  return s;
}

// ===============================
// FUNÇÕES DO MAPA: focar por nome (para mercado/loja)
// ===============================
function focarPorNome(nomeAlvo, lista) {
  if (!map) return false;
  if (!Array.isArray(lista) || !lista.length) return false;

  const alvo = normTxt(extrairNomeLimpoNfce(nomeAlvo));
  if (!alvo) return false;

  // match forte
  let achado = lista.find((x) => x.nome_norm === alvo);

  // fallback: contém
  if (!achado) achado = lista.find((x) => x.nome_norm.includes(alvo) || alvo.includes(x.nome_norm));

  if (!achado) return false;

  map.setView([achado.latitude, achado.longitude], 16);
  if (achado.marker?.openPopup) achado.marker.openPopup();
  return true;
}

function indicarNoMapaPorNomeMercado(nomeMercado) {
  // hoje seu mapa está carregando só postosIndex
  const ok = focarPorNome(nomeMercado, postosIndex);
  if (!ok) {
    alert("Não encontrei esse local no mapa ainda. (Hoje o mapa está carregando só postos.)");
  }
}

// ===============================
// MELHOR OPÇÃO PERTO DE VOCÊ
// ===============================
function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function acharMelhorOpcao() {
  if (!map) return;
  if (!usuarioPosicao) return alert("Localização não encontrada (permita a localização no navegador).");
  if (!postosIndex.length) return alert("Não há postos carregados no mapa.");

  let melhor = null;
  postosIndex.forEach((p) => {
    const d = distanciaKm(usuarioPosicao.lat, usuarioPosicao.lng, p.latitude, p.longitude);
    if (!melhor || d < melhor.dist) melhor = { ...p, dist: d };
  });

  if (!melhor) return;

  map.setView([melhor.latitude, melhor.longitude], 16);
  alert(`📍 Posto mais perto:\n\n${melhor.nome}\nDistância: ${melhor.dist.toFixed(2)} km`);
}

// ===============================
// EXPORTA FUNÇÕES PARA ONCLICK DO HTML
// ===============================
window.setNicho = setNicho;
window.setTipo = setTipo;
window.setCategoria = setCategoria;
window.setCategoriaFarmacia = setCategoriaFarmacia;

window.buscar = buscar;
window.acharMelhorOpcao = acharMelhorOpcao;

window.confirmarPreco = confirmarPreco;
window.abrirOfertasDoItem = abrirOfertasDoItem;
window.indicarNoMapaPorNomeMercado = indicarNoMapaPorNomeMercado;
