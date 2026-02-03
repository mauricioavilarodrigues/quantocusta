// ===============================
// VARIÁVEIS / ESTADO
// ===============================
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
// BUSCA (data.json)
// ===============================
async function buscar() {
  if (!nichoAtual) return alert("Selecione um nicho.");

  // obrigatoriedades por nicho
  if (nichoAtual === "combustivel" && !tipoAtual) return alert("Selecione o tipo (Comum/Aditivada).");
  if (nichoAtual === "supermercado" && !categoriaAtual) return alert("Selecione a categoria (Alimentos/Limpeza).");
  if (nichoAtual === "farmacia" && !categoriaFarmaciaAtual) return alert("Selecione a categoria (Remédio/Higiene).");

  const termo = (elBusca?.value || "").toLowerCase();

  // ✅ data.json é JSON, então é res.json() e não res.text()
  const res = await fetch("./data.json?v=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();

  const lista = Array.isArray(data[nichoAtual]) ? data[nichoAtual] : [];
let itens = aplicarOverridesDePreco(lista)
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

  li.dataset.id = p.id; // ✅ mantém o id no <li>

  const precoNum = Number(p.preco);
  const precoTxt = Number.isFinite(precoNum) ? precoNum.toFixed(2) : "0.00";

  li.innerHTML =
    "<span><input type='checkbox' id='ck-" + index + "'> " +
    (p.nome || "") +
    "<br><small>" + (p.loja || p.posto || "") + "</small></span>" +
    "<span class='preco'>R$ " + precoTxt + "</span>" +
    "<div class='avaliacao'>" +
    "<button onclick='confirmarPreco(" + index + ")'>Confere</button>" +
    "<button onclick='negarPreco(" + index + ")'>Não confere</button>" +
    "<div id='feedback-" + index + "'></div></div>";

  elResultado.appendChild(li);

  // ✅ listener do checkbox precisa ficar DENTRO do forEach
  const ck = li.querySelector("#ck-" + index);
  if (ck) {
    ck.addEventListener("change", (e) => {
      if (e.target.checked) {
        cesta.push(p);
      } else {
        // opcional, mas recomendado: remove da cesta ao desmarcar
        cesta = cesta.filter(x => x.id !== p.id);
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
  const dLon = (lon2 - lon1) * Math.PI / 180;
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
// FEEDBACK
// ===============================
function confirmarPreco(index) {
  document.getElementById("feedback-" + index).innerText = "Obrigado por confirmar.";
}

function negarPreco(index) {
  document.getElementById("feedback-" + index).innerText = "Preço contestado.";
}

console.log("✅ script.js carregado corretamente");
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
window.negarPreco = negarPreco;
// ===============================
// BOTÃO EXTRA: "Inserir preço atualizado"
// Aparece APENAS após clicar em "Não confere"
// Não altera o que já existe; só adiciona UI nova.
// ===============================
(() => {
  "use strict";

  // Helper: identifica se o botão clicado é o "Não confere"
  function isNaoConfereButton(btn) {
    if (!btn) return false;

    // 1) Se você tiver uma classe específica, prefira isso:
    // return btn.classList.contains("btn-nao-confere");

    // 2) Fallback: detecta pelo texto do botão (se não tiver classe)
    const t = (btn.textContent || "").trim().toLowerCase();
    return t === "não confere" || t === "nao confere";
  }

  // Insere o botão novo no item (se ainda não existir)
  function ensureInserirPrecoButton(itemContainer) {
    if (!itemContainer) return;

    // Evita duplicar
    if (itemContainer.querySelector(".btn-inserir-preco")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-inserir-preco";
    btn.textContent = "Inserir preço atualizado";

    // Você pode colocar o botão onde quiser.
    // Aqui: logo abaixo dos botões de conferir/não confere (no final do item)
    itemContainer.appendChild(btn);
  }

  // Mostra o botão ao contestar
  document.addEventListener("click", (e) => {
    const alvo = e.target;

    // Só age quando for clique no botão "Não confere"
    if (!isNaoConfereButton(alvo)) return;

    // Acha o "container do item" (li, card, etc)
    // Ajuste para o seletor que vocês usam: "li", ".item", ".produto", etc.
    const item = alvo.closest("li") || alvo.closest(".item-produto") || alvo.parentElement;
    ensureInserirPrecoButton(item);
  });

  // (Opcional) Clique no botão "Inserir preço atualizado"
  // Por enquanto só abre um prompt e imprime no console.
  // Você disse que quer só inserir o botão, mas deixei o gancho pronto.
  document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("btn-inserir-preco")) return;

    const item = e.target.closest("li") || e.target.closest(".item-produto") || e.target.parentElement;

    // Apenas para teste — pode remover se quiser só o botão
    const valor = prompt("Digite o preço atualizado (ex: 5,99):");
    if (!valor) return;

    console.log("Preço atualizado informado:", valor, "Item:", item);
  });
})();

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

  // Tenta achar e atualizar visualmente o preço daquele item na lista
  // Ajuste o seletor ".preco-valor" se seu HTML usar outro
  function atualizarPrecoNaUI(itemEl, novoPreco) {
    if (!itemEl) return;

    // 1) se você tiver um span dedicado ao preço, perfeito:
    const precoEl = itemEl.querySelector(".preco-valor");
    if (precoEl) {
      precoEl.textContent = "R$ " + Number(novoPreco).toFixed(2);
      return;
    }

    // 2) fallback: tenta achar "R$" no texto do item e substituir (menos robusto)
    // (use só se não tiver um elemento específico para o preço)
    const texto = itemEl.innerText;
    if (texto.includes("R$")) {
      // não garante 100%, mas ajuda se seu layout for simples
      itemEl.innerHTML = itemEl.innerHTML.replace(/R\$\s*\d+([.,]\d+)?/g, "R$ " + Number(novoPreco).toFixed(2));
    }
  }

  // Quando clicar no botão "Inserir preço atualizado"
  document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("btn-inserir-preco")) return;

    const itemEl = e.target.closest("li") || e.target.closest(".item-produto") || e.target.parentElement;

    // IMPORTANTE: precisamos de um ID do produto.
    // Você já tem data-id no li? se não tiver, esse é o único ponto que você deve garantir no HTML.
    const itemId = itemEl?.dataset?.id;
    if (!itemId) {
      alert("Não encontrei o ID do item (data-id). Sem isso não dá pra salvar o novo preço.");
      return;
    }

    let valor = prompt("Digite o preço atualizado (ex: 5,99):");
    if (!valor) return;

    valor = valor.trim().replace(",", ".");
    const novoPreco = Number(valor);
    if (!Number.isFinite(novoPreco) || novoPreco <= 0) {
      alert("Preço inválido.");
      return;
    }

    // Salva override
    setOverride(itemId, novoPreco);

    // Atualiza a UI agora
    atualizarPrecoNaUI(itemEl, novoPreco);

    // Opcional: feedback visual simples
    // (sem mexer no resto)
    if (!itemEl.querySelector(".msg-preco-atualizado")) {
      const msg = document.createElement("div");
      msg.className = "msg-preco-atualizado";
      msg.style.marginTop = "6px";
      msg.textContent = "Preço atualizado registrado neste dispositivo.";
      itemEl.appendChild(msg);
    }
  });

  // Função utilitária que você pode chamar no seu render:
  // aplica overrides ao seu array de produtos
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
