// ===============================
// VARIÁVEIS / ESTADO
// ===============================

const API_URL = "https://backend-wg1b.onrender.com/api";
const API_BASE = API_URL;

let nichoAtual = "";
let tipoAtual = "";
let categoriaAtual = "";
let categoriaFarmaciaAtual = "";

let cesta = [];

// DOM
const elBusca = document.getElementById("busca");
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
  document.querySelectorAll(grupo + " button").forEach(b => b.classList.remove("ativo"));
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
// BUSCA (data.json)
// ===============================
async function buscar() {
  if (!nichoAtual) return alert("Selecione um nicho.");

  // obrigatoriedades por nicho
  if (nichoAtual === "combustivel" && !tipoAtual) return alert("Selecione o tipo (Comum/Aditivada).");
  if (nichoAtual === "supermercado" && !categoriaAtual) return alert("Selecione a categoria (Alimentos/Limpeza).");
  if (nichoAtual === "farmacia" && !categoriaFarmaciaAtual) return alert("Selecione a categoria (Remédio/Higiene).");

  const termo = (elBusca?.value || "").toLowerCase();

  const res = await fetch("./data.json?v=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();

  const lista = Array.isArray(data[nichoAtual]) ? data[nichoAtual] : [];

  // aplica overrides (se já carregou o IIFE de overrides), senão usa lista pura
  let itens = (window.aplicarOverridesDePreco ? window.aplicarOverridesDePreco(lista) : lista)
    .filter(p => (p.nome || "").toLowerCase().includes(termo));

  // filtros por nicho
  if (nichoAtual === "combustivel") {
    itens = itens.filter(p => (p.nome || "").toLowerCase().includes(tipoAtual.toLowerCase()));
  }
  if (nichoAtual === "supermercado") {
    itens = itens.filter(p => (p.tipo || "") === categoriaAtual);
  }
  if (nichoAtual === "farmacia") {
    itens = itens.filter(p => (p.tipo || "") === categoriaFarmaciaAtual);
  }

  if (!elResultado) return;
  elResultado.innerHTML = "";
  cesta = [];

  itens.forEach((p, index) => {
    const li = document.createElement("li");
    li.dataset.id = p.id;

    const precoNum = Number(p.preco);
    const precoTxt = Number.isFinite(precoNum) ? precoNum.toFixed(2) : "0.00";

    li.innerHTML =
      "<span><input type='checkbox' id='ck-" + index + "'> " +
      (p.nome || "") +
      "<br><small>" + (p.loja || p.posto || "") + "</small></span>" +
      "<span class='preco'>R$ " + precoTxt + "</span>" +
      "<div class='avaliacao'>" +
      "<button onclick='confirmarPreco(" + index + ")'>Confere <span id='confere-" + index + "'></span></button>" +
      "<button class='btn-inserir-preco' type='button'>Atualizar preço</button>" +
      "<div id='feedback-" + index + "'></div></div>";

    elResultado.appendChild(li);

    const ck = li.querySelector("#ck-" + index);
    if (ck) {
      ck.addEventListener("change", (e) => {
        if (e.target.checked) cesta.push(p);
        else cesta = cesta.filter(x => x.id !== p.id);
      });
    }
  });

  // ✅ Busca contadores reais no backend e aplica contador + badge positivo
  try {
    const ids = Array.from(elResultado.querySelectorAll("li[data-id]"))
      .map(li => li.dataset.id)
      .filter(Boolean);

    if (ids.length) {
      const contadores = await apiGetContadores(ids);

      elResultado.querySelectorAll("li[data-id]").forEach((li, idx) => {
        const id = li.dataset.id;

        const totalConfere = contadores?.[id]?.confere ?? 0;

        // contador no botão
        const spanConfere = document.getElementById("confere-" + idx);
        if (spanConfere) spanConfere.textContent = totalConfere ? `(${totalConfere})` : "";

        // badge positivo ao lado do preço
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
  cesta.forEach(p => {
    const loja = p.loja || p.posto || "Sem loja";
    const preco = Number(p.preco) || 0;
    porLoja[loja] = (porLoja[loja] || 0) + preco;
  });

  let menor = Infinity;
  for (const v of Object.values(porLoja)) {
    if (v < menor) menor = v;
  }

  let html = "<h3>Resultado da cesta</h3>";
  Object.keys(porLoja).forEach(loja => {
    const total = porLoja[loja];
    const cls = total === menor ? "menor" : "";
    html += `<div class="${cls}">${loja}: R$ ${total.toFixed(2)}</div>`;
  });

  elCestaResultado.innerHTML = html;
}

// ===============================
// MAPA + POSTOS (postos_rio_grande_rs.csv)
// ===============================
const centroRG = [-32.035, -52.098];
const mapEl = document.getElementById("map");

// variáveis do mapa
let map = null;
let layerPostos = null;
let usuarioPosicao = null;
let postosIndex = []; // [{nome, latitude, longitude}]

if (mapEl) {
  map = L.map("map").setView(centroRG, 13);
  window.map = map; // ✅ só depois que map existe

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  layerPostos = L.layerGroup().addTo(map);

  // localização do usuário
  map.locate({ setView: false, maxZoom: 15 });

  map.on("locationfound", (e) => {
    usuarioPosicao = e.latlng;
    L.circleMarker(usuarioPosicao, { radius: 8, fillOpacity: 0.85 })
      .addTo(map)
      .bindPopup("<b>Você está aqui</b>");
  });

  map.on("locationerror", () => {
    // ok
  });

  carregarPostosNoMapa();
} else {
  console.error("❌ Não achei a div #map no HTML.");
}

async function carregarPostosNoMapa() {
  try {
    if (!map || !layerPostos) {
      console.warn("⚠️ Mapa ou layerPostos não inicializados.");
      return;
    }

    const res = await fetch("postos_rio_grande_rs.csv?v=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);

    const csvText = await res.text();

    const linhas = csvText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    if (linhas.length < 2) throw new Error("Arquivo vazio ou sem dados.");

    // detecta separador (TAB ou vírgula)
    const sep = linhas[0].includes("\t") ? "\t" : ",";

    const header = linhas[0].split(sep).map(h => h.trim().toLowerCase());

    const idxNome = header.indexOf("nome");
    const idxLat = header.indexOf("latitude");
    const idxLng = header.indexOf("longitude");

    if (idxLat === -1 || idxLng === -1) {
      throw new Error("Não achei colunas latitude/longitude no arquivo.");
    }

    const toNum = (v) => Number(String(v).trim().replace(",", "."));

    postosIndex = linhas.slice(1)
      .map(linha => {
        const cols = linha.split(sep).map(c => c.trim());
        return {
          nome: (idxNome >= 0 ? cols[idxNome] : "Posto") || "Posto",
          latitude: toNum(cols[idxLat]),
          longitude: toNum(cols[idxLng])
        };
      })
      .filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));

    layerPostos.clearLayers();

    let bounds = null;

    postosIndex.forEach(p => {
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

// ===============================
// MELHOR OPÇÃO PERTO DE VOCÊ
// ===============================
function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lat2 - lat1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function acharMelhorOpcao() {
  if (!map) return;
  if (!usuarioPosicao) return alert("Localização não encontrada (permita a localização no navegador).");
  if (!postosIndex.length) return alert("Não há postos carregados no mapa.");

  let melhor = null;
  postosIndex.forEach(p => {
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
      .then(ret => {
        const totalConfere = ret?.confere;

        // contador no botão
        const span = document.getElementById("confere-" + index);
        if (span && typeof totalConfere === "number") {
          span.textContent = totalConfere ? `(${totalConfere})` : "";
        }

        // badge positivo
        if (typeof totalConfere === "number") {
          aplicarBadgeConfere(li, totalConfere);
        }
      })
      .catch(e => {
        console.warn("⚠️ Falha ao enviar confirmação:", e);
      });
  }
}

console.log("✅ script.js carregado corretamente");

async function apiGetContadores(ids) {
  if (!ids.length) return {};
  const url = `${API_BASE}/avaliacoes?ids=${encodeURIComponent(ids.join(","))}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha ao buscar contadores: HTTP " + res.status);
  return await res.json();
  // esperado: { "1": { contesta: 3, confere: 10 }, "2": {...} }
}

async function apiEnviarAvaliacao(id, acao) {
  const res = await fetch(`${API_BASE}/avaliacao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: String(id), acao }) // acao: "confere"
  });
  if (!res.ok) throw new Error("Falha ao enviar avaliação: HTTP " + res.status);
  return await res.json();
}

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
// OVERRIDES DE PREÇO (por usuário / navegador)
// Base: data.json (somente leitura)
// Override: localStorage (preço atualizado)
// ===============================
(() => {
  "use strict";

  const LS_KEY_PRECOS = "precosAtualizados"; // { [itemId]: { preco, dataISO } }

  function getOverrides() {
    try { return JSON.parse(localStorage.getItem(LS_KEY_PRECOS) || "{}"); }
    catch { return {}; }
  }

  function setOverride(itemId, novoPreco) {
    const o = getOverrides();
    o[itemId] = { preco: novoPreco, dataISO: new Date().toISOString() };
    localStorage.setItem(LS_KEY_PRECOS, JSON.stringify(o));
  }

  function atualizarPrecoNaUI(itemEl, novoPreco) {
    if (!itemEl) return;

    const precoEl = itemEl.querySelector(".preco");
    if (precoEl) {
      // preserva badge positivo se existir
      const badgePos = precoEl.querySelector(".badge-confere");
      precoEl.textContent = "R$ " + Number(novoPreco).toFixed(2);
      if (badgePos) precoEl.appendChild(badgePos);
      return;
    }

    // fallback
    const texto = itemEl.innerText;
    if (texto.includes("R$")) {
      itemEl.innerHTML = itemEl.innerHTML.replace(
        /R\$\s*\d+([.,]\d+)?/g,
        "R$ " + Number(novoPreco).toFixed(2)
      );
    }
  }

  // Clique no botão "Atualizar preço"
  document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("btn-inserir-preco")) return;

    const itemEl = e.target.closest("li") || e.target.closest(".item-produto") || e.target.parentElement;
    const itemId = itemEl?.dataset?.id;

    if (!itemId) {
      alert("Não encontrei o ID do item (data-id). Sem isso não dá pra salvar o novo preço.");
      return;
    }

    let valor = prompt("Digite o novo preço (ex: 5,99):");
    if (!valor) return;

    valor = valor.trim().replace(",", ".");
    const novoPreco = Number(valor);

    if (!Number.isFinite(novoPreco) || novoPreco <= 0) {
      alert("Preço inválido.");
      return;
    }

    setOverride(itemId, novoPreco);
    atualizarPrecoNaUI(itemEl, novoPreco);

    if (!itemEl.querySelector(".msg-preco-atualizado")) {
      const msg = document.createElement("div");
      msg.className = "msg-preco-atualizado";
      msg.style.marginTop = "6px";
      msg.textContent = "Preço atualizado registrado neste dispositivo.";
      itemEl.appendChild(msg);
    }
  });

  // aplica overrides ao array de produtos
  window.aplicarOverridesDePreco = function (produtos) {
    const o = getOverrides();
    return produtos.map(p => {
      const id = String(p.id);
      if (o[id]?.preco != null) {
        return { ...p, preco: o[id].preco, preco_atualizado_em: o[id].dataISO };
      }
      return p;
    });
  };
})();

// ===============================
// DEBUG (opcional)
// ===============================
window.qc_apiGetContadores = (ids) => apiGetContadores(ids);
window.qc_apiEnviarAvaliacao = (id, acao) => apiEnviarAvaliacao(id, acao);
window.qc_aplicarBadgeConfere = (li, n) => aplicarBadgeConfere(li, n);

// ===============================
// MARCADOR DE VERSÃO (ANTI-CACHE)
// ===============================
window.__QC_TESTE = "OK-" + Date.now();
console.log("QC_TESTE carregou:", window.__QC_TESTE);
