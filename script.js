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

  // obrigatoriedades por nicho (se você quiser manter assim)
  if (nichoAtual === "combustivel" && !tipoAtual) return alert("Selecione o tipo (Comum/Aditivada).");
  if (nichoAtual === "supermercado" && !categoriaAtual) return alert("Selecione a categoria (Alimentos/Limpeza).");
  if (nichoAtual === "farmacia" && !categoriaFarmaciaAtual) return alert("Selecione a categoria (Remédio/Higiene).");

  const termo = (elBusca?.value || "").toLowerCase();

  const res = await fetch("./data.json?v=" + Date.now(), { cache: "no-store" });
  const csvText = await res.text();

  const lista = Array.isArray(data[nichoAtual]) ? data[nichoAtual] : [];
  let itens = lista.filter(p => (p.nome || "").toLowerCase().includes(termo));

  // filtros por nicho
  if (nichoAtual === "combustivel") {
    // costuma ser "Gasolina Comum", "Gasolina Aditivada" etc no nome
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

    li.querySelector("#ck-" + index).addEventListener("change", (e) => {
      if (e.target.checked) cesta.push(p);
    });
  });
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
  Object.values(porLoja).forEach(v => { if (v < menor) menor = v; });

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

  // localização do usuário (não bloqueia se negar)
  map.locate({ setView: false, maxZoom: 15 });

  map.on("locationfound", (e) => {
    usuarioPosicao = e.latlng;
    L.circleMarker(usuarioPosicao, {
      radius: 8,
      fillOpacity: 0.85
    }).addTo(map).bindPopup("<b>Você está aqui</b>");
  });

  map.on("locationerror", () => {
    // ok: usuário pode negar
  });

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

    // ✅ Detecta separador: TAB (TSV) ou vírgula (CSV)
    const sep = linhas[0].includes("\t") ? "\t" : ",";

    const header = linhas[0].split(sep).map(h => h.trim().toLowerCase());

    const idxNome = header.indexOf("nome");
    const idxLat = header.indexOf("latitude");
    const idxLng = header.indexOf("longitude");

    if (idxLat === -1 || idxLng === -1) {
      throw new Error("Não achei colunas latitude/longitude. Cabeçalho: " + header.join(" | "));
    }

    const toNum = (v) => Number(String(v).trim().replace(",", "."));

    postosIndex = linhas.slice(1).map(linha => {
      const cols = linha.split(sep).map(c => c.trim());
      return {
        nome: (idxNome >= 0 ? cols[idxNome] : "Posto") || "Posto",
        latitude: toNum(cols[idxLat]),
        longitude: toNum(cols[idxLng])
      };
    }).filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));

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

// ===============================
// MELHOR OPÇÃO PERTO DE VOCÊ (com base em distância aos postos)
// ===============================
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
