// ===============================
// VARIÁVEIS / ESTADO
// ===============================

// AUTH (módulo: arquivo JS com import/export)
import { getUser, logout } from "./auth.js";

const API_ROOT = "https://backend-wg1b.onrender.com";
const API_BASE = `${API_ROOT}/api`;

let dadosBase = null;

export async function carregarDadosBase() {
  if (dadosBase) return dadosBase;

  const res = await fetch(`${API_BASE}/itens-base`, { cache: "no-store" }); 
  // API_BASE (endereço base da sua API), /itens-base (rota/endpoint = caminho no servidor)

  if (!res.ok) throw new Error("Falha ao carregar API (HTTP " + res.status + ")");

  dadosBase = await res.json();
  return dadosBase;
}

let nichoAtual = "";
let tipoAtual = "";
let categoriaAtual = "";
let categoriaFarmaciaAtual = "";
let cesta = [];
let ultimosItens = []; // guarda a última lista renderizada (para compararCesta)
let ultimosResultados = []; // (ultimosResultados = guarda a lista da última busca)
// DOM
const elBusca = document.getElementById("busca");
const authButtons = document.querySelector(".auth-buttons");
const areaUsuario = document.getElementById("areaUsuario");
const elResultado = document.getElementById("resultado");
const elCestaResultado = document.getElementById("cestaResultado");

const elFiltroSupermercado = document.getElementById("filtroSupermercado");
const elFiltroCombustivel = document.getElementById("filtroCombustivel");
const elFiltroFarmacia = document.getElementById("filtroFarmacia");

// NFC-e
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

  // UI (interface: parte visual): ativa botão e mostra filtros
  limparAtivos(".topo");
  b?.classList.add("ativo");

  hideAllSecundarios();

  if (n === "supermercado" && elFiltroSupermercado) elFiltroSupermercado.style.display = "flex";
  if (n === "combustivel" && elFiltroCombustivel) elFiltroCombustivel.style.display = "flex";
  if (n === "farmacia" && elFiltroFarmacia) elFiltroFarmacia.style.display = "flex";

  // MAPA (camadas: grupos de marcadores)
  if (n === "supermercado") mostrarCategoria("mercado");
  if (n === "combustivel") mostrarCategoria("posto");
  if (n === "farmacia") mostrarCategoria("farmacia");

  // aqui NÃO dispara buscar ainda
}
function setCategoria(cat, b) {
  categoriaAtual = cat;
  categoriaFarmaciaAtual = ""; // zera a da farmácia pra não misturar
  // UI (interface = visual): marca o botão clicado como ativo
  if (elFiltroSupermercado) {
    elFiltroSupermercado.querySelectorAll("button").forEach((btn) => btn.classList.remove("ativo"));
  }
  b?.classList.add("ativo");

  // dispara a busca (buscar = função que monta a lista)
  buscar();
}
// ===============================
// BADGE (indicador visual)
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
// DATA / RECÊNCIA (idade do preço)
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

function classeRecencia(d) {
  if (!d) return "old";
  const diffDias = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diffDias <= 7 ? "fresh" : "old";
}

function aplicarEstiloRecencia(li, classe) {
  if (classe === "fresh") {
    li.style.borderLeft = "6px solid #1f7a39";
    li.style.paddingLeft = "10px";
  } else {
    li.style.borderLeft = "6px solid #b3261e";
    li.style.paddingLeft = "10px";
  }
}

// ===============================
// API - AVALIAÇÕES (contadores de confirmação)
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
// API - PREÇOS (override aprovado)
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
// API - NFC-e (itens aprovados)
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
// ===============================
async function buscar() {
  if (!elResultado) return;

  if (!nichoAtual) return;

  if (nichoAtual === "combustivel" && !tipoAtual) return;
  if (nichoAtual === "supermercado" && !categoriaAtual) return;
  if (nichoAtual === "farmacia" && !categoriaFarmaciaAtual) return;

  const q = (elBusca?.value || "").trim();
  elResultado.innerHTML = "<li>🔎 Buscando…</li>";

  try {
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
// Guarda os resultados filtrados para o botão “Melhor opção”
// (ultimosResultados = memória da última busca)
ultimosResultados = Array.isArray(itensBase) ? itensBase.slice() : [];
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
      ultimosItens = [];
      return;
    }

    const ids = itens.map((x) => String(x.id));
    const contadores = await apiGetContadores(ids).catch(() => ({}));
    const overrides = await apiGetOverridesAprovados(ids).catch(() => ({}));
    itens = aplicarOverridesDePreco(itens, overrides);

    elResultado.innerHTML = "";
    cesta = [];
    ultimosItens = itens; // <-- guarda para compararCesta()

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
        ? `<a href="#" onclick="indicarNoMapaPorNomeLoja('${escapeHtmlAttr(lojaRaw)}'); return false;">${escapeHtml(
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
      if (span && typeof cont.confere === "number") span.textContent = cont.confere ? `(${cont.confere})` : "";

      elResultado.appendChild(li);
    });
  } catch (e) {
    console.error(e);
    elResultado.innerHTML = `<li style="color:#b3261e;">Erro: ${escapeHtml(e?.message || String(e))}</li>`;
    ultimosItens = [];
  }
}

// ===============================
// COMPARAR CESTA (somar itens marcados por loja)
// ===============================
function compararCesta() {
  if (!elCestaResultado) return;

  // pega itens marcados (checkbox (caixa de seleção))
  const selecionados = [];
  for (let i = 0; i < ultimosItens.length; i++) {
    const ck = document.getElementById(`ck-${i}`);
    if (ck?.checked) selecionados.push(ultimosItens[i]);
  }

  if (!selecionados.length) {
    elCestaResultado.innerHTML = "<div style='margin-top:10px;'>Marque itens da lista para comparar. 🧺</div>";
    return;
  }

  // soma por loja
  const somaPorLoja = new Map(); // Map (estrutura chave/valor)
  selecionados.forEach((it) => {
    const loja = String(it.loja || "").trim();
    const preco = Number(it.preco);

    if (!loja) return;
    if (!Number.isFinite(preco)) return;

    const atual = somaPorLoja.get(loja) || 0;
    somaPorLoja.set(loja, atual + preco);
  });

  if (somaPorLoja.size === 0) {
    elCestaResultado.innerHTML =
      "<div style='margin-top:10px;'>Esses itens não têm loja/preço consistente para comparar.</div>";
    return;
  }

  // ordena (mais barato primeiro)
  const ranking = Array.from(somaPorLoja.entries())
    .map(([loja, total]) => ({ loja, total }))
    .sort((a, b) => a.total - b.total);

  const linhas = ranking
    .slice(0, 10)
    .map(
      (r, idx) => `
      <div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #eee;">
        <div><b>${idx + 1}.</b> ${escapeHtml(r.loja)}</div>
        <div><b>R$ ${r.total.toFixed(2).replace(".", ",")}</b></div>
      </div>
    `
    )
    .join("");

  elCestaResultado.innerHTML = `
    <div style="margin-top:10px;">
      <div style="margin-bottom:8px;"><b>Comparação da cesta</b> (soma dos itens marcados por loja)</div>
      ${linhas}
      <div style="margin-top:8px;opacity:.8;font-size:.95rem;">
        Dica: clique no nome da loja nos itens para destacar no mapa.
      </div>
    </div>
  `;
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
  if (!user) {
    alert("Você precisa estar logado para confirmar preços.");
    return;
  }

  if (!id) {
    fb.innerText = "Item sem ID (não dá pra confirmar).";
    return;
  }

  fb.innerText = "Enviando…";

  try {
    const ret = await apiEnviarAvaliacao(id, "confere", user.id);

    const totalConfere = ret?.confere;
    const span = document.getElementById("confere-" + index);
    if (span && typeof totalConfere === "number") span.textContent = totalConfere ? `(${totalConfere})` : "";

    if (typeof totalConfere === "number" && li) aplicarBadgeConfere(li, totalConfere);

    fb.innerText = "Confirmado. ✅";
  } catch (err) {
    console.error(err);
    fb.innerText = "Falha ao confirmar (servidor).";
  }
}

// ===============================
// NFC-e: leitura / importação (mantida)
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

function nfceRenderPreview(nfce) {
  if (!elNfcePreview) return;

  const emitenteHtml = escapeHtml(nfce?.emitente || "—");
  const itens = Array.isArray(nfce?.itens) ? nfce.itens.slice(0, 30) : [];

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
    </div>
  `;
}

async function nfceLerUrl(url) {
  const u = String(url || "").trim();
  if (!u) return nfceSetStatus("Cole a URL da NFC-e.", true);
  if (!u.startsWith("http")) return nfceSetStatus("A URL precisa começar com http/https.", true);

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

    if (!resp.ok) return nfceSetStatus(data?.erro || `Falha ao ler NFC-e (HTTP ${resp.status}).`, true);

    ultimoNfce = data;
    nfceRenderPreview(data);

    const okToImport = Array.isArray(data?.itens) && data.itens.length > 0;
    nfceEnableImport(okToImport);
    nfceSetStatus(okToImport ? "NFC-e lida. Pronto para importar." : "Li a NFC-e, mas não encontrei itens.", !okToImport);
  } catch (err) {
    console.error(err);
    nfceSetStatus("Erro ao ler NFC-e. Veja console.", true);
  }
}

async function nfceImportar() {
  if (!ultimoNfce) return nfceSetStatus("Primeiro leia a NFC-e (QR ou URL).", true);

  const cidade = (elNfceCidade?.value || "").trim() || "Rio Grande";
  const itens = Array.isArray(ultimoNfce.itens) ? ultimoNfce.itens : [];
  if (!itens.length) return nfceSetStatus("NFC-e inválida (sem itens).", true);

  const payload = {
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
    const r = await fetch(`${API_BASE}/nfce/import-precos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      nfceSetStatus(data?.erro || "Falha ao importar.", true);
      nfceEnableImport(true);
      return;
    }

    nfceSetStatus("Importado com sucesso. ✅");
    ultimoNfce = null;
    nfceEnableImport(false);
    if (elNfcePreview) elNfcePreview.innerHTML = "";
    if (elNfceUrl) elNfceUrl.value = "";
    if (nichoAtual === "supermercado" && categoriaAtual) buscar();
  } catch (err) {
    console.error(err);
    nfceSetStatus("Erro ao importar. Veja console.", true);
    nfceEnableImport(true);
  }
}

// ===============================
// QR SCANNER (html5-qrcode: leitor via câmera)
// ===============================
let html5Qr = null;
let qrLendo = false;

const btnAbrirQr = document.getElementById("btnAbrirQr");
const btnFecharQr = document.getElementById("btnFecharQr");
const elQrModal = document.getElementById("qrModal");
const elQrStatus = document.getElementById("qrStatus");

function qrStatus(msg) {
  if (elQrStatus) elQrStatus.textContent = msg || "";
}

async function abrirScannerQr() {
  try {
    if (typeof Html5Qrcode === "undefined") {
      alert("Biblioteca do QR não carregou (html5-qrcode).");
      return;
    }
    if (!elQrModal) {
      alert("Não achei o modal do QR (id='qrModal').");
      return;
    }

    elQrModal.style.display = "flex";
    qrStatus("Abrindo câmera…");

    if (!html5Qr) html5Qr = new Html5Qrcode("qrReader");
    qrLendo = false;

    const config = { fps: 10, qrbox: { width: 240, height: 240 } };

    await html5Qr.start(
      { facingMode: "environment" },
      config,
      async (decodedText) => {
        if (qrLendo) return;
        qrLendo = true;

        try {
          await html5Qr.stop();
          await html5Qr.clear();
        } catch {}

        elQrModal.style.display = "none";
        qrStatus("");

        const url = String(decodedText || "").trim();
        if (!url.startsWith("http")) {
          alert("Li um QR, mas não parece URL.");
          return;
        }

        if (elNfceUrl) elNfceUrl.value = url;
        await nfceLerUrl(url);
      },
      () => {}
    );

    qrStatus("Aponte a câmera para o QR da NFC-e…");
  } catch (err) {
    console.error(err);
    qrStatus("❌ Não consegui abrir a câmera.");
    alert("Falha ao abrir QR: " + (err?.message || err));
  }
}

async function fecharScannerQr() {
  try {
    if (html5Qr && html5Qr.isScanning) {
      await html5Qr.stop();
      await html5Qr.clear();
    }
  } catch {}
  if (elQrModal) elQrModal.style.display = "none";
  qrStatus("");
}

btnAbrirQr?.addEventListener("click", abrirScannerQr);
btnFecharQr?.addEventListener("click", fecharScannerQr);
elQrModal?.addEventListener("click", (e) => {
  if (e.target === elQrModal) fecharScannerQr();
});

window.abrirScannerQr = abrirScannerQr;
window.fecharScannerQr = fecharScannerQr;

// ===============================
// MAPA + CAMADAS (Leaflet = biblioteca do mapa)
// Fonte de dados: Backend /api/locais (Supabase)
// ===============================
const centroRG = [-32.035, -52.098];
const mapEl = document.getElementById("map");

let map = null;
let usuarioPosicao = null;

let postosIndex = [];
let mercadosIndex = [];
let farmaciasIndex = [];

let layerPostos = null;
let layerMercados = null;
let layerFarmacias = null;

// controle de carregamento (cache = guarda dados pra não baixar de novo)
let locaisCarregados = { posto: false, mercado: false, farmacia: false };

function limparCamadasMapa() {
  if (!map) return;
  if (layerPostos && map.hasLayer(layerPostos)) map.removeLayer(layerPostos);
  if (layerMercados && map.hasLayer(layerMercados)) map.removeLayer(layerMercados);
  if (layerFarmacias && map.hasLayer(layerFarmacias)) map.removeLayer(layerFarmacias);
}

// mostra somente a categoria escolhida (camada = grupo de marcadores)
async function mostrarCategoria(tipo) {
  if (!map) return;
  if (!layerPostos || !layerMercados || !layerFarmacias) return;

  // garante que os dados do tipo já foram carregados do backend
  if (tipo === "posto") await garantirLocaisCarregados("posto");
  if (tipo === "mercado") await garantirLocaisCarregados("mercado");
  if (tipo === "farmacia") await garantirLocaisCarregados("farmacia");

  limparCamadasMapa();

  if (tipo === "posto") layerPostos.addTo(map);
  if (tipo === "mercado") layerMercados.addTo(map);
  if (tipo === "farmacia") layerFarmacias.addTo(map);
}

// busca locais no backend (endpoint = rota da API)
async function buscarLocaisNoBackend(tipo, cidade = "") {
  // ajuste se seu backend filtra por cidade (opcional)
  const qs = new URLSearchParams();
  if (tipo) qs.set("tipo", tipo);
  if (cidade) qs.set("cidade", cidade);

  const url = `${API_BASE}/locais?${qs.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.json();
}

async function garantirLocaisCarregados(tipo) {
  if (locaisCarregados[tipo]) return;

  // Se você quiser filtrar cidade aqui, use: "Rio Grande/RS" ou "Cassino/RS"
  // const cidade = "Rio Grande/RS";
  const cidade = "";

  const rows = await buscarLocaisNoBackend(tipo, cidade);

  // aceita tanto "loja" quanto "nome" (compatibilidade = funciona com dois formatos)
  const normalizar = (x) => {
    const nome = (x.nome || "").toString().trim();
    return {
      nome,
      nome_norm: normTxt(nome),
      latitude: Number(x.latitude),
      longitude: Number(x.longitude),
      marker: null,
    };
  };

  const lista = (rows || [])
    .map(normalizar)
    .filter((p) => p.nome && Number.isFinite(p.latitude) && Number.isFinite(p.longitude));

  if (tipo === "posto") {
    postosIndex = lista;
    renderizarMarkers(layerPostos, postosIndex);
    console.log("✅ Postos carregados (Supabase):", postosIndex.length);
  }

  if (tipo === "mercado") {
    mercadosIndex = lista;
    renderizarMarkers(layerMercados, mercadosIndex);
    console.log("✅ Mercados carregados (Supabase):", mercadosIndex.length);
  }

  if (tipo === "farmacia") {
    farmaciasIndex = lista;
    renderizarMarkers(layerFarmacias, farmaciasIndex);
    console.log("✅ Farmácias carregadas (Supabase):", farmaciasIndex.length);
  }

  locaisCarregados[tipo] = true;
}

function renderizarMarkers(layer, lista) {
  if (!layer) return;
  layer.clearLayers();

  lista.forEach((p) => {
    p.marker = L.marker([p.latitude, p.longitude])
      .addTo(layer)
      .bindPopup(`<b>${escapeHtml(p.nome)}</b><br><small>${escapeHtml("Rio Grande/RS")}</small>`);
  });
}

// inicializa mapa
if (mapEl) {
  if (typeof L === "undefined") {
    console.error("❌ Leaflet (L) não carregou. Mapa desativado.");
  } else {
    layerPostos = L.layerGroup();
    layerMercados = L.layerGroup();
    layerFarmacias = L.layerGroup();

    map = L.map("map").setView(centroRG, 13);
    window.map = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    // localização do usuário (geolocalização = pegar posição do dispositivo)
    map.locate({ setView: false, maxZoom: 15 });

    map.on("locationfound", (e) => {
      usuarioPosicao = e.latlng;
      L.circleMarker(usuarioPosicao, { radius: 8, fillOpacity: 0.85 })
        .addTo(map)
        .bindPopup("<b>Você está aqui</b>");
    });

    map.on("locationerror", () => {});

    // NÃO mostra nada no início (só cidade + você)
    // Os marcadores só aparecem quando clicar no nicho e chamar mostrarCategoria(...)
  }
} else {
  console.error("❌ Não achei a div #map no HTML.");
}

// focar (focar = centralizar o mapa em um local pelo nome)
function focarPorNome(nomeAlvo, lista) {
  if (!map) return false;
  if (!Array.isArray(lista) || !lista.length) return false;

  const alvo = normTxt(String(nomeAlvo || ""));
  if (!alvo) return false;

  let achado = lista.find((x) => x.nome_norm === alvo);
  if (!achado) achado = lista.find((x) => x.nome_norm.includes(alvo) || alvo.includes(x.nome_norm));
  if (!achado) return false;

  map.setView([achado.latitude, achado.longitude], 16);
  if (achado.marker?.openPopup) achado.marker.openPopup();
  return true;
}

// funções públicas pra destacar no mapa (usadas quando clicar num produto)
async function indicarNoMapaPorNomePosto(nomePosto) {
  await mostrarCategoria("posto");
  const ok = focarPorNome(nomePosto, postosIndex);
  if (!ok) alert("Não encontrei esse posto no mapa.");
}

async function indicarNoMapaPorNomeMercado(nomeMercado) {
  await mostrarCategoria("mercado");
  const ok = focarPorNome(nomeMercado, mercadosIndex);
  if (!ok) alert("Não encontrei esse mercado no mapa.");
}

async function indicarNoMapaPorNomeFarmacia(nomeFarmacia) {
  await mostrarCategoria("farmacia");
  const ok = focarPorNome(nomeFarmacia, farmaciasIndex);
  if (!ok) alert("Não encontrei essa farmácia no mapa.");
}

// roteia pelo nicho atual (nicho = categoria principal)
async function indicarNoMapaPorNomeLoja(nome) {
  if (nichoAtual === "combustivel") return indicarNoMapaPorNomePosto(nome);
  if (nichoAtual === "farmacia") return indicarNoMapaPorNomeFarmacia(nome);
  return indicarNoMapaPorNomeMercado(nome);
}

// exporta para HTML (onclick = clique chamando função do JS)
window.mostrarCategoria = mostrarCategoria;
window.indicarNoMapaPorNomeLoja = indicarNoMapaPorNomeLoja;


// ===============================
// HELPERS (helpers = funções auxiliares)
// ===============================
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
// MELHOR OPÇÃO
// ===============================
function acharMelhorOpcao() {
  if (!ultimosResultados || ultimosResultados.length === 0) {
    alert("Faça uma busca primeiro.");
    return;
  }

  // Escolhe o menor preço válido
  let melhor = null;

  for (const item of ultimosResultados) {
    const preco = Number(item?.preco);
    if (!Number.isFinite(preco)) continue;

    if (!melhor || preco < Number(melhor.preco)) {
      melhor = item;
    }
  }

  if (!melhor) {
    alert("Não encontrei preços válidos nos resultados.");
    return;
  }

  const produto = String(melhor.nome || melhor.produto || "Produto");
  const loja = String(melhor.loja || "Loja não informada");
  const precoFmt = Number(melhor.preco).toFixed(2).replace(".", ",");

  alert(`💰 Melhor opção (menor preço):\n\n${produto}\nR$ ${precoFmt}\n📍 ${loja}`);

  // Aponta no mapa, se essa função existir
  if (typeof indicarNoMapaPorNomeLoja === "function" && loja && loja !== "Loja não informada") {
    indicarNoMapaPorNomeLoja(loja);
  }
}
// ===============================
// EXPORTA FUNÇÕES PARA ONCLICK DO HTML (escopo global)
// ===============================
// Liga o botão “Melhor opção” ao clique
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnMelhorOpcao");
  if (btn) {
    btn.addEventListener("click", () => {
      acharMelhorOpcao();
    });
  }
});
// ===============================
// EXPORTA FUNÇÕES PARA O HTML
// ===============================
window.setNicho = setNicho;
window.buscar = buscar;
window.compararCesta = compararCesta;
window.confirmarPreco = confirmarPreco;
window.indicarNoMapaPorNomeLoja = indicarNoMapaPorNomeLoja;
window.acharMelhorOpcao = acharMelhorOpcao;
window.setCategoria = setCategoria;
