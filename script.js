// ===============================
// VARIÁVEIS / ESTADO
// ===============================

// AUTH (usa o auth.js do Maurício)
import { getUser, logout } from "./auth.js";

const API_ROOT = "https://backend-wg1b.onrender.com";
const API_BASE = `${API_ROOT}/api`;

let dadosBase = null;

export async function carregarDadosBase() {
  if (dadosBase) return dadosBase;

  const res = await fetch("data.json?v=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao carregar data.json (HTTP " + res.status + ")");

  dadosBase = await res.json();
  return dadosBase;
}

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
// AUTH UI (Olá, nome — não email)
// ===============================
async function refreshAuthUI() {
  if (!areaUsuario || !authButtons) return;

  try {
    const user = await getUser();

    if (user) {
      authButtons.style.display = "none";
      areaUsuario.style.display = "flex";

      const nome =
        user?.user_metadata?.name ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.nome ||
        user?.user_metadata?.display_name ||
        user?.email ||
        "usuário";

      areaUsuario.innerHTML = `
        <span style="font-weight:700;">Olá, ${escapeHtml(nome)}</span>
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
  } catch (e) {
    console.warn("refreshAuthUI falhou:", e);
    authButtons.style.display = "flex";
    areaUsuario.style.display = "none";
    areaUsuario.innerHTML = "";
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

function calcFromTotal(it) {
  const qtd = Number(String(it?.qtd ?? "").replace(",", "."));
  const vTotal = parseMoneyFlexible(it?.vTotal);
  if (Number.isFinite(vTotal) && Number.isFinite(qtd) && qtd > 0) return vTotal / qtd;
  return null;
}

// ===============================
// CONTROLES DE FILTRO
// ===============================
function limparAtivos(grupo) {
  document.querySelectorAll(grupo + " button").forEach((b) => b.classList.remove("ativo"));
}

function hideAllSecundarios() {
  ["Supermercado", "Combustivel", "Farmacia"].forEach((f) => {
    const el = document.getElementById("filtro" + f);
    if (el) el.style.display = "none";
  });
}

function setNicho(n, b) {
  nichoAtual = n;
  tipoAtual = "";
  categoriaAtual = "";
  categoriaFarmaciaAtual = "";

  // não limpa resultado à toa; só mostra as opções secundárias e espera usuário escolher
  limparAtivos(".topo");
  b?.classList.add("ativo");

  hideAllSecundarios();

  if (n === "supermercado" && elFiltroSupermercado) elFiltroSupermercado.style.display = "flex";
  if (n === "combustivel" && elFiltroCombustivel) elFiltroCombustivel.style.display = "flex";
  if (n === "farmacia" && elFiltroFarmacia) elFiltroFarmacia.style.display = "flex";

  // aqui NÃO dispara buscar ainda, pra não ficar aparecendo aviso ao clicar no nicho primário
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
// LIMITAR CONFIRMAÇÃO POR USUÁRIO (por dia)
// ===============================
function hojeISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function voteKey(userId, itemId, acao, dia = hojeISO()) {
  return `qc_vote:${String(userId)}:${String(itemId)}:${String(acao)}:${dia}`;
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

function userMustBeLoggedIn(user) {
  if (!user) {
    alert("Você precisa estar logado para confirmar preços.");
    return false;
  }
  return true;
}

// ===============================
// DATA / RECÊNCIA
// ===============================
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

function aplicarEstiloRecencia(li, classe) {
  // não depende do CSS existir
  if (classe === "fresh") {
    li.style.borderLeft = "6px solid #1f7a39";
    li.style.paddingLeft = "10px";
  } else {
    li.style.borderLeft = "6px solid #b3261e";
    li.style.paddingLeft = "10px";
  }
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

async function apiEnviarAvaliacao(id, acao, user_id = null) {
  const body = { id: String(id), acao };
  if (user_id) body.user_id = String(user_id);

  const res = await fetch(`${API_BASE}/avaliacao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error("Falha ao enviar avaliação: HTTP " + res.status);
  return await res.json();
}

// ===============================
// API - PREÇOS (override aprovado) - mantém
// ===============================
async function apiGetOverridesAprovados(ids) {
  if (!ids?.length) return {};
  const url = `${API_BASE}/precos?status=aprovado&ids=${encodeURIComponent(ids.join(","))}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar overrides: HTTP " + res.status);
  return await res.json();
}

function aplicarOverridesDePreco(produtos, overridesPorId = {}) {
  return (produtos || []).map((p) => {
    const id = String(p.id);
    const ov = overridesPorId?.[id];
    if (ov?.preco != null) return { ...p, preco: ov.preco, updatedAt: ov.updated_at || p.updatedAt };
    return p;
  });
}

// ===============================
// API - NFC-e (aprovados para listar)
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

// ===============================
// BUSCA (catálogo base + nfce aprovados)
// Produto = nome + preço + loja + última atualização
// ===============================
async function buscar() {
  if (!elResultado) return;

  // trava: só busca quando o secundário estiver escolhido (sem alert/sem mensagem chata)
  if (!nichoAtual) return;

  if (nichoAtual === "combustivel" && !tipoAtual) return;
  if (nichoAtual === "supermercado" && !categoriaAtual) return;
  if (nichoAtual === "farmacia" && !categoriaFarmaciaAtual) return;

  const q = (elBusca?.value || "").trim();
  elResultado.innerHTML = "<li>🔎 Buscando…</li>";

  try {
    // 1) BASE LOCAL (data.json)
    const base = await carregarDadosBase();

    let itensBase = Array.isArray(base) ? base : base?.itens || base?.produtos || [];
    const qNorm = (q || "").toLowerCase();

    itensBase = itensBase.filter((p) => {
      if (!p) return false;

      const pNicho = String(p.nicho || "").toLowerCase();
      if (nichoAtual && pNicho !== nichoAtual) return false;

      if (nichoAtual === "combustivel" && tipoAtual) {
        if (String(p.tipo || "").toLowerCase() !== tipoAtual.toLowerCase()) return false;
      }

      if (nichoAtual === "supermercado" && categoriaAtual) {
        if (String(p.categoria || "").toLowerCase() !== categoriaAtual.toLowerCase()) return false;
      }

      if (nichoAtual === "farmacia" && categoriaFarmaciaAtual) {
        if (String(p.categoria || "").toLowerCase() !== categoriaFarmaciaAtual.toLowerCase()) return false;
      }

      if (qNorm) {
        const nome = String(p.nome || p.produto || "").toLowerCase();
        if (!nome.includes(qNorm)) return false;
      }

      return true;
    });

    let itens = itensBase.map((p) => ({
      id: p.id || p.item_id || normTxt(p.nome || p.produto || "").slice(0, 80),
      nome: p.nome || p.produto || "",
      preco: p.preco ?? null,
      loja: p.loja ?? null,
      cidade: p.cidade ?? null,
      origem: "base",
      createdAt: p.createdAt || p.created_at || null,
      updatedAt: p.updatedAt || p.updated_at || null,
    }));

    // 2) NFC-e aprovados (somente supermercado)
    if (nichoAtual === "supermercado") {
      const nfce = await apiGetNfceItensAprovados({
        cidade: "Rio Grande",
        q,
        nicho: "supermercado",
        limit: 80,
      });

      if (Array.isArray(nfce) && nfce.length) {
        itens = itens.concat(
          nfce.map((x) => ({
            id: x.id || x.item_id || x.itemId,
            nome: x.nome || x.produto || x.descricao || "",
            preco: x.preco ?? null,
            loja: x.loja || x.emitente || null,
            cidade: x.cidade || null,
            origem: "nfce",
            createdAt: x.created_at || x.createdAt || x.data_emissao || x.dataEmissao || null,
            updatedAt: x.approved_at || x.updated_at || x.updatedAt || x.data_emissao || x.dataEmissao || null,
          }))
        );
      }
    }

    if (!itens.length) {
      elResultado.innerHTML = "<li>Nenhum resultado.</li>";
      return;
    }

    const ids = itens.map((x) => String(x.id));
    const contadores = await apiGetContadores(ids).catch(() => ({}));
    const overrides = await apiGetOverridesAprovados(ids).catch(() => ({}));
    itens = aplicarOverridesDePreco(itens, overrides);

    elResultado.innerHTML = "";
    cesta = [];

    itens.forEach((p, index) => {
      const li = document.createElement("li");
      li.dataset.id = p.id;

      const dt = parseDateSafe(p.updatedAt || p.createdAt);
      const rec = classeRecencia(dt);
      li.classList.add(rec);
      aplicarEstiloRecencia(li, rec);

      const ultimaHtml = `<span class="ultima-att">Última atualização: ${fmtDataBR(dt)}</span>`;

      const precoNum = Number(p.preco);
      const precoTxt = Number.isFinite(precoNum) ? precoNum.toFixed(2).replace(".", ",") : "—";

      const lojaRaw = String(p.loja || "").trim();
      const cidadeRaw = String(p.cidade || "").trim();

      const lojaHtml = lojaRaw
        ? `<a href="#" onclick="indicarNoMapaPorNomeMercado('${escapeHtmlAttr(lojaRaw)}'); return false;">${escapeHtml(
            lojaRaw
          )}</a>`
        : "";

      const subtituloHtml = (() => {
        if (lojaRaw && cidadeRaw) return `${lojaHtml} • ${escapeHtml(cidadeRaw)} • ${ultimaHtml}`;
        if (lojaRaw) return `${lojaHtml} • ${ultimaHtml}`;
        if (cidadeRaw) return `${escapeHtml(cidadeRaw)} • ${ultimaHtml}`;
        return `${ultimaHtml}`;
      })();

      li.innerHTML = `
        <span>
          <input type="checkbox" id="ck-${index}"> 
          ${escapeHtml(p.nome || "")}
          <span class="preco" style="font-weight:900;"> R$ ${precoTxt}</span>
          <br>
          <small>${subtituloHtml}</small>
        </span>
        <div style="margin-top:8px;display:flex;gap:10px;align-items:center;">
          <button onclick="confirmarPreco(${index})">Confirmar</button>
          <span id="confere-${index}" style="font-weight:700;"></span>
          <span id="feedback-${index}" style="opacity:.8;"></span>
        </div>
      `;

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

  // 1 voto por dia por item por usuário
  if (userAlreadyVotedToday(user.id, id, "confere")) {
    fb.innerText = "Você já confirmou esse item hoje. ✅";
    return;
  }

  fb.innerText = "Enviando…";

  try {
    const ret = await apiEnviarAvaliacao(id, "confere", user.id);

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
  } catch (err) {
    console.error(err);
    fb.innerText = "Falha ao confirmar (servidor).";
  }
}

// ===============================
// NFC-e: preview / leitura / importação
// (sem exibir CNPJ na tela — mas continua indo no payload porque teu backend legado exige)
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
      <div><b>Mercado:</b> ${emitenteHtml}</div>
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

  // mantém CNPJ no payload porque seu backend legado exige (não mostramos na tela)
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

  nfceSetStatus("Importando…");
  nfceEnableImport(false);

  try {
    const rLeg = await fetch(`${API_BASE}/nfce/import-precos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadLegado),
    });

    const dataLeg = await rLeg.json().catch(() => ({}));
    if (!rLeg.ok) {
      nfceSetStatus(dataLeg?.erro || "Falha ao importar (legado).", true);
      nfceEnableImport(true);
      return;
    }

    nfceSetStatus("Importado com sucesso. ✅");
    alert("Importação concluída! ✅");

    ultimoNfce = null;
    nfceEnableImport(false);
    if (elNfcePreview) elNfcePreview.innerHTML = "";
    if (elNfceUrl) elNfceUrl.value = "";

    if (nichoAtual === "supermercado" && categoriaAtual) buscar();
  } catch (err) {
    console.error(err);
    nfceSetStatus("Erro ao importar. Veja console.", true);
    nfceEnableImport(true);
    alert("Falha ao importar: " + (err?.message || err));
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

    postosIndex = linhas
      .slice(1)
      .map((linha) => {
        const cols = linha.split(sep).map((c) => c.trim());
        const nome = (idxNome >= 0 ? cols[idxNome] : "Posto") || "Posto";
        return {
          nome,
          nome_norm: normTxt(nome),
          latitude: toNum(cols[idxLat]),
          longitude: toNum(cols[idxLng]),
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

function extrairNomeLimpoNfce(nomeBruto) {
  const s = String(nomeBruto || "").trim();
  const i = s.toLowerCase().indexOf("(código:");
  if (i > 0) return s.slice(0, i).trim();
  return s;
}

// focar por nome (por enquanto só nos postosIndex)
function focarPorNome(nomeAlvo, lista) {
  if (!map) return false;
  if (!Array.isArray(lista) || !lista.length) return false;

  const alvo = normTxt(extrairNomeLimpoNfce(nomeAlvo));
  if (!alvo) return false;

  let achado = lista.find((x) => x.nome_norm === alvo);
  if (!achado) achado = lista.find((x) => x.nome_norm.includes(alvo) || alvo.includes(x.nome_norm));
  if (!achado) return false;

  map.setView([achado.latitude, achado.longitude], 16);
  if (achado.marker?.openPopup) achado.marker.openPopup();
  return true;
}

function indicarNoMapaPorNomeMercado(nomeMercado) {
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
  const dLon = ((lat2 - lat1) * Math.PI) / 180; // (mantém simples; se quiser, eu ajusto depois)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
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
// HELPERS
// ===============================
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
window.indicarNoMapaPorNomeMercado = indicarNoMapaPorNomeMercado;
window.nfceLerUrl = nfceLerUrl;
window.nfceImportar = nfceImportar;
