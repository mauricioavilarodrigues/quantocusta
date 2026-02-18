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
const nomeUsuarioSpan = document.getElementById("nomeUsuario");
const btnLogout = document.getElementById("btnLogout");

async function atualizarHeaderUsuario() {
  const user = await getUser();

  if (user) {
    if (authButtons) authButtons.style.display = "none";
    if (areaUsuario) areaUsuario.style.display = "flex";

    const nome =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email.split("@")[0];

    if (nomeUsuarioSpan) nomeUsuarioSpan.textContent = `Olá, ${nome}`;
  } else {
    if (authButtons) authButtons.style.display = "flex";
    if (areaUsuario) areaUsuario.style.display = "none";
  }
}

btnLogout?.addEventListener("click", async () => {
  await logout();
  location.reload();
});

document.addEventListener("DOMContentLoaded", atualizarHeaderUsuario);

const elResultado = document.getElementById("resultado");
const elCestaResultado = document.getElementById("cestaResultado");

const elFiltroSupermercado = document.getElementById("filtroSupermercado");
const elFiltroCombustivel = document.getElementById("filtroCombustivel");
const elFiltroFarmacia = document.getElementById("filtroFarmacia");

// Contribuir (abre/fecha)
const btnContribuir = document.getElementById("btnContribuir");
const boxContribuir = document.getElementById("boxContribuir");
btnContribuir?.addEventListener("click", () => {
  boxContribuir?.classList.toggle("aberto");
});

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

  if (elResultado) elResultado.innerHTML = "";

  limparAtivos(".topo");
  b?.classList.add("ativo");

  if (elFiltroSupermercado) elFiltroSupermercado.style.display = "none";
  if (elFiltroCombustivel) elFiltroCombustivel.style.display = "none";
  if (elFiltroFarmacia) elFiltroFarmacia.style.display = "none";

  if (n === "supermercado" && elFiltroSupermercado) elFiltroSupermercado.style.display = "flex";
  if (n === "combustivel" && elFiltroCombustivel) elFiltroCombustivel.style.display = "flex";
  if (n === "farmacia" && elFiltroFarmacia) elFiltroFarmacia.style.display = "flex";
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
// API - AVALIAÇÕES
// ===============================
async function apiGetContadores(ids) {
  if (!ids.length) return {};
  const url = `${API_BASE}/avaliacoes?ids=${encodeURIComponent(ids.join(","))}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar contadores: HTTP " + res.status);
  return await res.json();
}

async function apiEnviarAvaliacao(id, acao) {
  const res = await fetch(`${API_BASE}/avaliacao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: String(id), acao }), // acao: "confere"
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
  return await res.json(); // [{preco,loja,cidade,uf,latitude,longitude,...}]
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
  wrap.style.background = "rgba(0,0,0,.45)";
  wrap.style.display = "none";
  wrap.style.zIndex = "9999";
  wrap.style.padding = "20px";

  wrap.innerHTML = `
    <div style="max-width:860px;margin:0 auto;background:#fff;border-radius:16px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.25);">
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

async function abrirOfertasDoItem({ itemId, nome }) {
  if (!itemId) return;

  showModal({ titulo: nome || "Ofertas", html: "Carregando ofertas..." });

  try {
    const ofertas = await apiOfertasPorItem({ item_id: itemId, limit: 80 });
    if (!Array.isArray(ofertas) || !ofertas.length) {
      showModal({
        titulo: nome || "Ofertas",
        html: `<div style="padding:10px;border:1px solid #eee;border-radius:12px;">
                Nenhuma oferta registrada ainda para este item.
               </div>`,
      });
      return;
    }

    // ordena por menor preço (mais útil pro usuário)
    const ordenadas = [...ofertas].sort((a, b) => Number(a.preco) - Number(b.preco));

    const menor = Number(ordenadas[0].preco);

    const rows = ordenadas
      .map((o) => {
        const preco = Number(o.preco);
        const diff = Number.isFinite(preco) && Number.isFinite(menor) ? (preco - menor) : null;
        const local = `${escapeHtml(o.loja || "—")}${
          o.cidade || o.uf ? ` • <small style="opacity:.8">${escapeHtml(o.cidade || "")}${o.uf ? "/" + escapeHtml(o.uf) : ""}</small>` : ""
        }`;

        const coords =
          Number.isFinite(Number(o.latitude)) && Number.isFinite(Number(o.longitude))
            ? `<button class="qc-btn-mapa" data-lat="${o.latitude}" data-lng="${o.longitude}" style="margin-left:10px;border:1px solid #ddd;background:#fff;border-radius:999px;padding:6px 10px;cursor:pointer;">Ver no mapa</button>`
            : "";

        return `
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px;border:1px solid #eee;border-radius:12px;margin-bottom:10px;">
            <div>
              <div style="font-weight:800;">${local}${coords}</div>
              <div style="margin-top:4px;opacity:.8;font-size:13px;">${escapeHtml(String(o.data_compra || ""))} ${o.origem ? " • " + escapeHtml(o.origem) : ""}</div>
            </div>
            <div style="font-weight:900;font-size:16px;">R$ ${Number.isFinite(preco) ? preco.toFixed(2) : "—"}
              ${
                diff != null && diff > 0
                  ? `<div style="font-size:12px;opacity:.8;text-align:right;">+${diff.toFixed(2)}</div>`
                  : diff === 0
                  ? `<div style="font-size:12px;opacity:.8;text-align:right;">melhor</div>`
                  : ""
              }
            </div>
          </div>
        `;
      })
      .join("");

    showModal({
      titulo: nome || "Ofertas",
      html: rows,
    });

    // bind botão "Ver no mapa"
    const body = qcModal?.querySelector("#qcModalBody");
    body?.querySelectorAll(".qc-btn-mapa")?.forEach((btn) => {
      btn.addEventListener("click", () => {
        const lat = Number(btn.getAttribute("data-lat"));
        const lng = Number(btn.getAttribute("data-lng"));
        if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
        hideModal();
        map.setView([lat, lng], 16);
        L.marker([lat, lng]).addTo(map).bindPopup("<b>Local da compra</b>").openPopup();
      });
    });
  } catch (e) {
    console.warn(e);
    showModal({
      titulo: nome || "Ofertas",
      html: `<div style="padding:10px;border:1px solid #eee;border-radius:12px;color:crimson;">
              Falha ao carregar ofertas.
            </div>`,
    });
  }
}

// ===============================
// BUSCA
// ===============================
async function buscar() {
  if (!nichoAtual) return alert("Selecione um nicho.");

  if (nichoAtual === "combustivel" && !tipoAtual) return alert("Selecione o tipo (Comum/Aditivada).");
  if (nichoAtual === "supermercado" && !categoriaAtual) return alert("Selecione a categoria (Alimentos/Limpeza).");
  if (nichoAtual === "farmacia" && !categoriaFarmaciaAtual) return alert("Selecione a categoria (Remédio/Higiene).");

  const termo = (elBusca?.value || "").toLowerCase();

  // ====== MODO ATUAL (data.json + overrides + NFC-e legado) ======
  const res = await fetch("./data.json?v=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();

  const lista = Array.isArray(data[nichoAtual]) ? data[nichoAtual] : [];

  // 1) carrega overrides aprovados (legado)
  let overridesPorId = {};
  try {
    const idsLista = (lista || []).map((p) => String(p.id)).filter(Boolean);
    if (idsLista.length) overridesPorId = await apiGetOverridesAprovados(idsLista);
  } catch (e) {
    console.warn("⚠️ Não consegui carregar overrides aprovados:", e);
  }

  // 2) aplica override + filtro texto
  let itens = aplicarOverridesDePreco(lista, overridesPorId).filter((p) =>
    (p.nome || "").toLowerCase().includes(termo)
  );

  // filtros por nicho
  if (nichoAtual === "combustivel") {
    itens = itens.filter((p) => (p.nome || "").toLowerCase().includes(tipoAtual.toLowerCase()));
  }
  if (nichoAtual === "supermercado") {
    itens = itens.filter((p) => (p.tipo || "") === categoriaAtual);
  }
  if (nichoAtual === "farmacia") {
    itens = itens.filter((p) => (p.tipo || "") === categoriaFarmaciaAtual);
  }
// 3) integra itens NFC-e aprovados (legado)
// 3) integra itens NFC-e aprovados (legado)
try {
  const cidade = "Rio Grande"; // depois a gente liga num input

  const nfce = await apiGetNfceItensAprovados({
    cidade,
    q: termo || "",
    nicho: nichoAtual || "",
    limit: termo && termo.length >= 2 ? 120 : 60,
  });

  console.log("NFCe primeiro item:", nfce?.[0]);

  const nfceItens = (nfce || []).map((x) => {
    const lojaOk =
      String(x.loja || "").trim() ||
      (x.cnpj ? `CNPJ ${String(x.cnpj).trim()}` : "Supermercado não identificado");

    return {
      id: x.id,
      nome: extrairNomeLimpoNfce(x.nome),
      loja: lojaOk,
      preco: Number(x.preco),
      cidade: x.cidade || "",
      origem: "nfce",
      dataEmissao: x.dataEmissao,
      sourceUrl: x.sourceUrl,
      cnpj: x.cnpj || "",
    };
  });

  const seen = new Set((itens || []).map((p) => `${normTxt(p.nome)}|${normTxt(p.loja || p.posto)}`));

  for (const p of nfceItens) {
    const key = `${normTxt(p.nome)}|${normTxt(p.loja)}`;
    if (!seen.has(key)) {
      seen.add(key);
      itens.push(p);
    }
  }
} catch (e) {
  console.warn("⚠️ NFC-e não integrou:", e);
}


  // ====== NOVO: Também puxa do catálogo colaborativo (opcional) ======
  // Se tiver termo, puxa do catálogo e mistura como "catalogo"
  try {
    if (termo && termo.trim().length >= 2) {
      const cat = await apiCatalogoBusca({ q: termo.trim(), limit: 40 });
      const catItens = (cat || [])
        .filter((x) => !nichoAtual || !x.nicho || x.nicho === nichoAtual) // se você preencher nicho na tabela, ajuda
        .map((x) => ({
          id: x.id,
          nome: x.nome,
          loja: "", // catálogo não é por loja; ofertas vêm depois
          cidade: "",
          preco: null, // preço vem das ofertas; vamos mostrar "ver ofertas"
          origem: "catalogo",
        }));

      const seenId = new Set((itens || []).map((p) => String(p.id)));
      for (const c of catItens) {
        if (!seenId.has(String(c.id))) {
          seenId.add(String(c.id));
          itens.push(c);
        }
      }
    }
  } catch (e) {
    console.warn("⚠️ Catálogo novo não integrou:", e);
  }

  if (!elResultado) return;
  elResultado.innerHTML = "";
  cesta = [];

  itens.forEach((p, index) => {
    const li = document.createElement("li");
    li.dataset.id = p.id;

    const precoNum = Number(p.preco);
    const precoTxt = Number.isFinite(precoNum) ? precoNum.toFixed(2) : "—";

    const origem = p.origem || "";
    const isNfce = origem === "nfce";
    const isCatalogo = origem === "catalogo";

    const selo =
      isNfce
        ? " <span style='display:inline-block;margin-left:6px;font-size:12px;font-weight:900;padding:2px 8px;border:1px solid #333;border-radius:999px;background:#fffdf2;'>🧾 NFC-e</span>"
        : isCatalogo
        ? " <span style='display:inline-block;margin-left:6px;font-size:12px;font-weight:900;padding:2px 8px;border:1px solid #333;border-radius:999px;background:#f2f7ff;'>📚 Catálogo</span>"
        : "";

    const subtitulo = (() => {
      const loja = (p.loja || p.posto || "").trim();
      const cidade = (p.cidade || "").trim();
      if (loja && cidade) return `${loja} • ${cidade}`;
      if (loja) return loja;
      if (cidade) return cidade;
      return isCatalogo ? "Clique em Ver ofertas" : "";
    })();

    li.innerHTML =
      "<span><input type='checkbox' id='ck-" +
      index +
      "'> " +
      (escapeHtml(p.nome || "") + selo) +
      "<br><small>" +
      escapeHtml(subtitulo) +
      "</small></span>" +
      "<span class='preco'>R$ " +
      precoTxt +
      "</span>" +
      "<div class='avaliacao'>" +
      "<button onclick='confirmarPreco(" +
      index +
      ")'>Confere <span id='confere-" +
      index +
      "'></span></button>" +
      "<button class='btn-inserir-preco' type='button'>Atualizar preço</button>" +
      (p.id
        ? "<button class='btn-ver-ofertas' type='button' style='margin-left:6px;'>Ver ofertas</button>"
        : "") +
      "<div id='feedback-" +
      index +
      "'></div></div>";

    elResultado.appendChild(li);

    // checkbox para cesta (se preço for válido; catálogo sem preço não entra)
    const ck = li.querySelector("#ck-" + index);
    if (ck) {
      ck.addEventListener("change", (e) => {
        if (!Number.isFinite(Number(p.preco))) {
          // catálogo sem preço não entra na cesta
          e.target.checked = false;
          return alert("Esse item é do catálogo. Clique em “Ver ofertas” para ver preços por loja.");
        }
        if (e.target.checked) cesta.push(p);
        else cesta = cesta.filter((x) => x.id !== p.id);
      });
    }

    // botão ver ofertas
    const btnOfertas = li.querySelector(".btn-ver-ofertas");
    if (btnOfertas) {
      btnOfertas.addEventListener("click", () => abrirOfertasDoItem({ itemId: p.id, nome: p.nome }));
    }
  });

  // contadores + badge positivo
  try {
    const ids = Array.from(elResultado.querySelectorAll("li[data-id]"))
      .map((li) => li.dataset.id)
      .filter(Boolean);

    if (ids.length) {
      const contadores = await apiGetContadores(ids);

      elResultado.querySelectorAll("li[data-id]").forEach((li, idx) => {
        const id = li.dataset.id;
        const totalConfere = contadores?.[id]?.confere ?? 0;

        const spanConfere = document.getElementById("confere-" + idx);
        if (spanConfere) spanConfere.textContent = totalConfere ? `(${totalConfere})` : "";

        aplicarBadgeConfere(li, totalConfere);
      });
    }
  } catch (e) {
    console.warn("⚠️ Não consegui carregar contadores do backend:", e);
  }
}

// ===============================
// CESTA
// ===============================
function compararCesta() {
  if (!elCestaResultado) return;
  if (!cesta.length) {
    elCestaResultado.innerHTML = "<p>Nenhum item selecionado.</p>";
    return;
  }

  const porLoja = {};
  cesta.forEach((p) => {
    const loja = p.loja || p.posto || "Sem loja";
    const preco = Number(p.preco) || 0;
    porLoja[loja] = (porLoja[loja] || 0) + preco;
  });

  let menor = Infinity;
  for (const v of Object.values(porLoja)) {
    if (v < menor) menor = v;
  }

  let html = "<h3>Resultado da cesta</h3>";
  Object.keys(porLoja).forEach((loja) => {
    const total = porLoja[loja];
    const cls = total === menor ? "menor" : "";
    html += `<div class="${cls}">${escapeHtml(loja)}: R$ ${total.toFixed(2)}</div>`;
  });

  elCestaResultado.innerHTML = html;
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
        return {
          nome: (idxNome >= 0 ? cols[idxNome] : "Posto") || "Posto",
          latitude: toNum(cols[idxLat]),
          longitude: toNum(cols[idxLng]),
        };
      })
      .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));

    layerPostos.clearLayers();

    let bounds = null;

    postosIndex.forEach((p) => {
      L.marker([p.latitude, p.longitude])
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
// MELHOR OPÇÃO PERTO DE VOCÊ
// ===============================
function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
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
// FEEDBACK / AVALIAÇÃO
// ===============================
function confirmarPreco(index) {
  const fb = document.getElementById("feedback-" + index);
  if (!fb) return;

  const li = fb.closest("li");
  const id = li?.dataset?.id;

  fb.innerText = "Obrigado por confirmar.✨️";

  if (id) {
    apiEnviarAvaliacao(id, "confere")
      .then((ret) => {
        const totalConfere = ret?.confere;

        const span = document.getElementById("confere-" + index);
        if (span && typeof totalConfere === "number") {
          span.textContent = totalConfere ? `(${totalConfere})` : "";
        }

        if (typeof totalConfere === "number") {
          aplicarBadgeConfere(li, totalConfere);
        }
      })
      .catch((e) => console.warn("⚠️ Falha ao enviar confirmação:", e));
  }
}

// ===============================
// Atualizar preço -> enviar pro backend (pendente)
// ===============================
document.addEventListener("click", async (e) => {
  const btn = e.target;
  if (!btn.classList?.contains("btn-inserir-preco")) return;

  const itemEl = btn.closest("li");
  const itemId = itemEl?.dataset?.id;

  if (!itemId) return alert("Não encontrei o ID do item (data-id).");

  let valor = prompt("Digite o novo preço (ex: 5,99):");
  if (!valor) return;

  valor = valor.trim().replace(",", ".");
  const novoPreco = Number(valor);

  if (!Number.isFinite(novoPreco) || novoPreco <= 0) return alert("Preço inválido.");

  const nome = (itemEl.querySelector("span")?.innerText || "").split("\n")[0].trim() || "Produto";
  const loja = (itemEl.querySelector("small")?.innerText || "").trim() || "Sem loja";

  let msg = itemEl.querySelector(".msg-preco-atualizado");
  if (!msg) {
    msg = document.createElement("div");
    msg.className = "msg-preco-atualizado";
    msg.style.marginTop = "6px";
    itemEl.appendChild(msg);
  }
  msg.textContent = "Enviando para aprovação…";

  try {
    await apiEnviarSugestaoPreco({
      item_id: String(itemId),
      nicho: nichoAtual || null,
      tipo: nichoAtual === "combustivel" ? tipoAtual : null,
      categoria:
        nichoAtual === "supermercado"
          ? categoriaAtual
          : nichoAtual === "farmacia"
          ? categoriaFarmaciaAtual
          : null,
      produto: nome,
      loja: loja,
      preco: novoPreco,
      cidade: "Rio Grande",
    });

    msg.textContent = "✅ Enviado para aprovação. Após aprovado, aparece em todos os dispositivos.";

    const precoEl = itemEl.querySelector(".preco");
    if (precoEl) {
      const badgePos = precoEl.querySelector(".badge-confere");
      precoEl.textContent = "R$ " + Number(novoPreco).toFixed(2);
      if (badgePos) precoEl.appendChild(badgePos);
    }
  } catch (err) {
    console.warn(err);
    msg.textContent = "❌ Falha ao enviar. Backend offline ou rota não existe.";
    alert("Falha ao enviar para o servidor. Veja o console/logs.");
  }
});

// ===============================
// EXPORTA FUNÇÕES PARA ONCLICK DO HTML
// ===============================
window.setNicho = setNicho;
window.setTipo = setTipo;
window.setCategoria = setCategoria;
window.setCategoriaFarmacia = setCategoriaFarmacia;

window.buscar = buscar;
window.compararCesta = compararCesta;
window.acharMelhorOpcao = acharMelhorOpcao;

window.confirmarPreco = confirmarPreco;

// ===============================
// DEBUG + ANTI-CACHE
// ===============================
window.qc_apiGetContadores = (ids) => apiGetContadores(ids);
window.qc_apiEnviarAvaliacao = (id, acao) => apiEnviarAvaliacao(id, acao);

window.__QC_TESTE = "OK-" + Date.now();
console.log("✅ script.js carregado corretamente");
console.log("QC_TESTE carregou:", window.__QC_TESTE);

// ===============================
// NFC-e (QR + Ler URL + Prévia + Importar)
// ===============================
let html5Qr = null;
let qrLendo = false;

let ultimoNfce = null;

// elementos do HTML novo
const elQrModal = document.getElementById("qrModal");
const elQrStatus = document.getElementById("qrStatus");
const elNfceResultado = document.getElementById("nfceResultado");

const btnAbrirQr = document.getElementById("btnAbrirQr");
const btnFecharQr = document.getElementById("btnFecharQr");

const btnNfceLer = document.getElementById("btnNfceLer");
const btnNfceImportar = document.getElementById("btnNfceImportar");

const elNfceUrl = document.getElementById("nfceUrl");
const elNfceCidade = document.getElementById("nfceCidade");

const elNfceStatus = document.getElementById("nfceStatus");
const elNfcePreview = document.getElementById("nfcePreview");

window.addEventListener("error", (e) => console.warn("ERRO JS:", e.message || e.error));
window.addEventListener("unhandledrejection", (e) => console.warn("PROMISE ERRO:", e.reason));

function nfceSetStatus(msg, isErr = false) {
  if (!elNfceStatus) return;
  elNfceStatus.textContent = msg || "";
  elNfceStatus.style.color = isErr ? "crimson" : "#333";
}

function nfceEnableImport(can) {
  if (btnNfceImportar) btnNfceImportar.disabled = !can;
}

function nfceRenderPreview(nfce) {
  if (!elNfcePreview) return;

  const warnings = Array.isArray(nfce?.warnings) ? nfce.warnings : [];
  const itens = Array.isArray(nfce?.itens) ? nfce.itens : [];

  const warningsHtml = warnings.length
    ? `<ul style="margin:10px 0;color:#8a6d3b;">${warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul>`
    : "";

  const itensHtml = itens
    .slice(0, 30)
    .map(
      (it, idx) => `
      <tr>
        <td style="padding:6px;border-bottom:1px solid #eee;">${idx + 1}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;">${escapeHtml(it.descricao || "")}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;">${escapeHtml(String(it.qtd ?? ""))}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;">${escapeHtml(it.un || "")}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;">${escapeHtml(String(it.vUnit ?? ""))}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;">${escapeHtml(String(it.vTotal ?? ""))}</td>
      </tr>
    `
    )
    .join("");

  elNfcePreview.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;">
      <div><b>Emitente:</b> ${escapeHtml(nfce?.emitente || "—")}</div>
      <div><b>CNPJ:</b> ${escapeHtml(nfce?.cnpj || "—")}</div>
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

    const okToImport = !!data?.cnpj && Array.isArray(data?.itens) && data.itens.length > 0;
    nfceEnableImport(okToImport);

    nfceSetStatus(okToImport ? "NFC-e lida. Pronto para importar." : "Li a NFC-e, mas faltou CNPJ ou itens.", !okToImport);
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

  if (!ultimoNfce.cnpj || !itens.length) {
    nfceSetStatus("NFC-e inválida (sem CNPJ ou itens).", true);
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
    cnpj: ultimoNfce.cnpj || null,
    chave_nfce: null,
    data_compra: null,
    itens: itens.map((it) => ({
      nome: it.descricao || "",
      preco: parseMoneyFlexible(it.vUnit) ?? calcFromTotal(it),
      nicho: "supermercado",
      categoria: categoriaAtual || null,
    })),
  };

  nfceSetStatus("Importando preços…");
  nfceEnableImport(false);

  try {
    // 1) legado (mantém o que você já usa)
    const resp1 = await fetch(`${API_BASE}/nfce/import-precos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadLegado),
    });
    const data1 = await resp1.json().catch(() => ({}));
    if (!resp1.ok) {
      const msg = data1?.erro ? `${data1.erro}${data1.detalhe ? " - " + data1.detalhe : ""}` : `HTTP ${resp1.status}`;
      throw new Error(msg);
    }

    // 2) novo modelo (para catálogo/ofertas)
    const resp2 = await fetch(`${API_BASE}/nfce/importar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadNovo),
    });
    const data2 = await resp2.json().catch(() => ({}));
    if (!resp2.ok) {
      console.warn("⚠️ Importação nova falhou:", data2);
      // não derruba tudo, mas avisa
    }

    nfceSetStatus(
      `✅ Importação OK. Legado enviados: ${data1?.enviados ?? 0} | Ignorados: ${data1?.ignorados ?? 0}` +
        (data2?.ok ? ` • Novo modelo ofertas: ${data2?.ofertas_inseridas ?? 0}` : ` • (Novo modelo não confirmado)`)
    );

    if (elNfceResultado) {
      elNfceResultado.innerHTML = `
        <div style="padding:10px;border:1px solid #e6e6e6;border-radius:12px;">
          <div><b>Importação concluída</b></div>
          <div>Legado: Enviados <b>${data1?.enviados ?? 0}</b> | Ignorados <b>${data1?.ignorados ?? 0}</b></div>
          <div>Novo modelo: ${data2?.ok ? `Ofertas inseridas <b>${data2?.ofertas_inseridas ?? 0}</b>` : `<span style="color:#b26a00;">não confirmado</span>`}</div>
          <div style="margin-top:6px; color:#666;">${escapeHtml(ultimoNfce.emitente || "")}</div>
        </div>
      `;
    }

    nfceEnableImport(false);
  } catch (err) {
    console.error(err);
    nfceSetStatus("❌ Erro ao importar (veja console).", true);
    nfceEnableImport(true);
    alert("Falha ao importar preços: " + (err?.message || err));
  }
}

function parseMoneyFlexible(v) {
  const n = Number(String(v ?? "").trim().replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function calcFromTotal(it) {
  const qtd = Number(String(it?.qtd ?? "").replace(",", "."));
  const total = parseMoneyFlexible(it?.vTotal);
  if (Number.isFinite(total) && Number.isFinite(qtd) && qtd > 0) return total / qtd;
  return null;
}

// -------------------
// QR Modal
// -------------------
async function abrirScannerQr() {
  if (!elQrModal) return;
  elQrModal.style.display = "block";
  if (elQrStatus) elQrStatus.textContent = "Abrindo câmera...";

  try {
    if (typeof Html5Qrcode === "undefined") {
      throw new Error("Lib html5-qrcode não carregou. Confira a ordem dos <script> no index.");
    }

    if (!html5Qr) html5Qr = new Html5Qrcode("qrReader");
    qrLendo = false;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    await html5Qr.start(
      { facingMode: "environment" },
      config,
      async (decodedText) => {
        if (qrLendo) return;
        qrLendo = true;

        try {
          await html5Qr.stop();
          await html5Qr.clear();
        } catch (e) {}

        if (elQrModal) elQrModal.style.display = "none";
        if (elQrStatus) elQrStatus.textContent = "";

        const url = String(decodedText || "").trim();
        if (elNfceUrl) elNfceUrl.value = url;

        await nfceLerUrl(url);
      },
      () => {}
    );

    if (elQrStatus) elQrStatus.textContent = "Aponte para o QR da nota…";
  } catch (err) {
    console.error(err);
    if (elQrStatus) elQrStatus.textContent = "❌ Não consegui abrir a câmera. Verifique permissões.";
    alert("Falha ao abrir câmera/QR: " + (err?.message || err));
  }
}

async function fecharScannerQr() {
  try {
    if (html5Qr && html5Qr.isScanning) {
      await html5Qr.stop();
      await html5Qr.clear();
    }
  } catch (e) {}
  if (elQrModal) elQrModal.style.display = "none";
  if (elQrStatus) elQrStatus.textContent = "";
}

// -------------------
// Bind de botões (HTML novo)
// -------------------
(function initNfceUI() {
  if (btnAbrirQr) btnAbrirQr.addEventListener("click", abrirScannerQr);
  if (btnFecharQr) btnFecharQr.addEventListener("click", fecharScannerQr);

  if (elQrModal) {
    elQrModal.addEventListener("click", (e) => {
      if (e.target === elQrModal) fecharScannerQr();
    });
  }

  if (btnNfceLer) {
    btnNfceLer.addEventListener("click", () => nfceLerUrl(elNfceUrl?.value || ""));
  }

  if (btnNfceImportar) {
    btnNfceImportar.addEventListener("click", nfceImportar);
  }

  nfceEnableImport(false);
})();
