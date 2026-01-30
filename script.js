// ===============================
// VARIÁVEIS GLOBAIS
// ===============================
let nichoAtual = "";
let tipoAtual = "";
let categoriaAtual = "";
let categoriaFarmaciaAtual = "";

let cesta = [];
let markersLayer = null;

// ===============================
// CONTROLES DE FILTRO
// ===============================
function limparAtivos(grupo) {
  document.querySelectorAll(grupo + " button")
    .forEach(b => b.classList.remove("ativo"));
}

function setNicho(n, b) {
  nichoAtual = n;
  tipoAtual = "";
  categoriaAtual = "";
  categoriaFarmaciaAtual = "";
  resultado.innerHTML = "";

  limparAtivos(".topo");
  b.classList.add("ativo");

  ["Supermercado", "Combustivel", "Farmacia"].forEach(f => {
    document.getElementById("filtro" + f).style.display = "none";
  });

  if (n === "supermercado") filtroSupermercado.style.display = "flex";
  if (n === "combustivel") filtroCombustivel.style.display = "flex";
  if (n === "farmacia") filtroFarmacia.style.display = "flex";
}

function setTipo(t, b) {
  tipoAtual = t;
  limparAtivos("#filtroCombustivel");
  b.classList.add("ativo");
  buscar();
}

function setCategoria(c, b) {
  categoriaAtual = c;
  limparAtivos("#filtroSupermercado");
  b.classList.add("ativo");
  buscar();
}

function setCategoriaFarmacia(c, b) {
  categoriaFarmaciaAtual = c;
  limparAtivos("#filtroFarmacia");
  b.classList.add("ativo");
  buscar();
}

// ===============================
// BUSCA (DATA.JSON)
// ===============================
async function buscar() {
  if (!nichoAtual) return alert("Selecione um nicho.");

  const termo = busca.value.toLowerCase();
  const res = await fetch("data.json");
  const data = await res.json();

  let itens = data[nichoAtual].filter(p =>
    p.nome.toLowerCase().includes(termo)
  );

  resultado.innerHTML = "";

  itens.forEach((p, index) => {
    const li = document.createElement("li");

    li.innerHTML =
      "<span><input type='checkbox'> " +
      p.nome +
      "<br><small>" + (p.loja || p.posto || "") + "</small></span>" +
      "<span class='preco'>R$ " + p.preco.toFixed(2) + "</span>" +
      "<div class='avaliacao'>" +
      "<button onclick='confirmarPreco(" + index + ")'>Confere</button>" +
      "<button onclick='negarPreco(" + index + ")'>Não confere</button>" +
      "<div id='feedback-" + index + "'></div></div>";

    resultado.appendChild(li);
    li.querySelector("input").addEventListener("change", () => cesta.push(p));
  });
}

// ===============================
// MAPA – RIO GRANDE (ANP ESTIMADO)
// ===============================
const map = L.map("map").setView([-32.035, -52.098], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

markersLayer = L.layerGroup().addTo(map);

function brMoney(n) {
  if (n === null || n === undefined || isNaN(n)) return "-";
  return "R$ " + Number(n).toFixed(2).replace(".", ",");
}

async function carregarMapaRioGrandeEstimado() {
  try {
    const res = await fetch("precos_estimados_rio_grande_anp.json");
    const dados = await res.json();

    markersLayer.clearLayers();

    const centro = [-32.035, -52.098];
    const c = dados.combustiveis;

    const html =
      "<b>Rio Grande (estimado)</b><br>" +
      "<small>Base: " + dados.cidade_base +
      " | ANP " + dados.periodo.data_inicial +
      " a " + dados.periodo.data_final + "</small><br><br>" +
      "<b>Gasolina Comum:</b> " + brMoney(c.gasolina_comum.preco_medio) + "<br>" +
      "<b>Gasolina Aditivada:</b> " + brMoney(c.gasolina_aditivada.preco_medio) + "<br>" +
      "<b>Etanol:</b> " + brMoney(c.etanol_hidratado.preco_medio) + "<br>" +
      "<b>Diesel:</b> " + brMoney(c.oleo_diesel.preco_medio) + "<br>" +
      "<b>Diesel S10:</b> " + brMoney(c.oleo_diesel_s10.preco_medio) + "<br>" +
      "<b>GNV:</b> " + brMoney(c.gnv.preco_medio) + "<br>" +
      "<b>GLP:</b> " + brMoney(c.glp.preco_medio) + "<br><br>" +
      "<small>" + dados.aviso + "</small>";

    L.marker(centro)
      .addTo(markersLayer)
      .bindPopup(html)
      .openPopup();

  } catch (e) {
    console.error("Erro ao carregar mapa:", e);
  }
}

carregarMapaRioGrandeEstimado();

// ===============================
// FEEDBACK
// ===============================
function confirmarPreco(index) {
  document.getElementById("feedback-" + index).innerText =
    "Obrigado por confirmar.";
}

function negarPreco(index) {
  document.getElementById("feedback-" + index).innerText =
    "Preço contestado.";
}

console.log("script.js carregado corretamente");
