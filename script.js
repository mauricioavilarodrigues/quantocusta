// ===============================
// VARIÁVEIS GLOBAIS
// ===============================
let nichoAtual = "";
let tipoAtual = "";
let categoriaAtual = "";
let categoriaFarmaciaAtual = "";

let cesta = [];

// refs DOM (evita "globais mágicas" quebrando)
const busca = document.getElementById("busca");
const resultado = document.getElementById("resultado");

const filtroSupermercado = document.getElementById("filtroSupermercado");
const filtroCombustivel = document.getElementById("filtroCombustivel");
const filtroFarmacia = document.getElementById("filtroFarmacia");

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
  if (resultado) resultado.innerHTML = "";

  limparAtivos(".topo");
  if (b) b.classList.add("ativo");

  ["Supermercado", "Combustivel", "Farmacia"].forEach(f => {
    const el = document.getElementById("filtro" + f);
    if (el) el.style.display = "none";
  });

  if (n === "supermercado" && filtroSupermercado) filtroSupermercado.style.display = "flex";
  if (n === "combustivel" && filtroCombustivel) filtroCombustivel.style.display = "flex";
  if (n === "farmacia" && filtroFarmacia) filtroFarmacia.style.display = "flex";
}

function setTipo(t, b) {
  tipoAtual = t;
  limparAtivos("#filtroCombustivel");
  if (b) b.classList.add("ativo");
  buscar();
}

function setCategoria(c, b) {
  categoriaAtual = c;
  limparAtivos("#filtroSupermercado");
  if (b) b.classList.add("ativo");
  buscar();
}

function setCategoriaFarmacia(c, b) {
  categoriaFarmaciaAtual = c;
  limparAtivos("#filtroFarmacia");
  if (b) b.classList.add("ativo");
  buscar();
}

// ===============================
// BUSCA (DATA.JSON)
// ===============================
async function buscar() {
  if (!nichoAtual) return alert("Selecione um nicho.");
  if (!busca || !resultado) return;

  const termo = (busca.value || "").toLowerCase();

  const res = await fetch("./data.json", { cache: "no-store" });
  const data = await res.json();

  if (!data[nichoAtual]) {
    resultado.innerHTML = "<li>Nenhum dado para este nicho.</li>";
    return;
  }

  let itens = data[nichoAtual].filter(p =>
    (p.nome || "").toLowerCase().includes(termo)
  );

  // (Opcional) filtros extras se você quiser usar depois:
  // - tipoAtual, categoriaAtual, categoriaFarmaciaAtual

  resultado.innerHTML = "";
  cesta = [];

  itens.forEach((p, index) => {
    const li = document.createElement("li");

    li.innerHTML =
      "<span><input type='checkbox'> " +
      (p.nome || "") +
      "<br><small>" + (p.loja || p.posto || "") + "</small></span>" +
      "<span class='preco'>R$ " + (Number(p.preco) || 0).toFixed(2) + "</span>" +
      "<div class='avaliacao'>" +
      "<button onclick='confirmarPreco(" + index + ")'>Confere</button>" +
      "<button onclick='negarPreco(" + index + ")'>Não confere</button>" +
      "<div id='feedback-" + index + "'></div></div>";

    resultado.appendChild(li);
    li.querySelector("input").addEventListener("change", (e) => {
      if (e.target.checked) cesta.push(p);
    });
  });
}

// ===============================
// MAPA – RIO GRANDE
// ===============================
const centroRioGrande = [-32.035, -52.098];

// garante que existe #map
const mapEl = document.getElementById("map");
if (!mapEl) {
  console.error("❌ Falta a div #map no HTML.");
} else {
  // cria mapa uma vez
  const map = L.map("map").setView(centroRioGrande, 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  // camadas separadas para não “apagar” tudo
  const layerEstimado = L.layerGroup().addTo(map);
  const layerPostos = L.layerGroup().addTo(map);
  const layerColab = L.layerGroup().addTo(map);

  function brMoney(n) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    return "R$ " + Number(n).toFixed(2).replace(".", ",");
  }

  // ===============================
  // 1) POSTOS (postos.json)
  // ===============================
  async function carregarPostos() {
    try {
      const res = await fetch("./postos.json?v=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const postos = await res.json();
      if (!Array.isArray(postos)) throw new Error("postos.json não é array");

      layerPostos.clearLayers();

      let bounds = null;

      postos.forEach(p => {
        const lat = Number(p.latitude);
        const lng = Number(p.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const m = L.marker([lat, lng])
          .addTo(layerPostos)
          .bindPopup("<b>" + (p.nome || "Posto") + "</b>");

        if (!bounds) bounds = L.latLngBounds([lat, lng], [lat, lng]);
        else bounds.extend([lat, lng]);
      });

      // enquadra os postos no mapa
      if (bounds) map.fitBounds(bounds.pad(0.12));

      console.log("✅ postos.json carregado:", postos.length);
    } catch (e) {
      console.error("❌ Erro ao carregar postos.json:", e);
    }
  }

  // ===============================
  // 2) ANP ESTIMADO (precos_estimados_rio_grande_anp.json)
  // ===============================
  async function carregarMapaRioGrandeEstimado() {
    try {
      const res = await fetch("./precos_estimados_rio_grande_anp.json?v=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const dados = await res.json();

      layerEstimado.clearLayers();

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
        "<small>" + (dados.aviso || "") + "</small>";

      // NÃO abre popup automaticamente (não “tampa” o resto)
      L.marker(centroRioGrande)
        .addTo(layerEstimado)
        .bindPopup(html);

      console.log("✅ estimado ANP carregado");
    } catch (e) {
      console.error("❌ Erro ao carregar estimado ANP:", e);
    }
  }

  // ===============================
  // 3) PREÇOS COLABORATIVOS (precos_colaborativos.json)
  // ===============================
  async function carregarPrecosColaborativos() {
    try {
      const res = await fetch("./precos_colaborativos.json?v=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const dados = await res.json();

      console.log("📌 dados colaborativos:", dados);

      if (!dados.precos || !Array.isArray(dados.precos) || dados.precos.length === 0) {
        console.warn("⚠️ Nenhum preço colaborativo encontrado");
        layerColab.clearLayers();
        return;
      }

      layerColab.clearLayers();

      // Como seu JSON colaborativo não tem lat/lng por posto,
      // espalhamos ao redor do centro só pra visualizar (depois você melhora).
      dados.precos.forEach((p, i) => {
        const precoNum = Number(String(p.preco).replace(",", "."));
        const popup =
          "<b>✅ Comunidade</b><br>" +
          "<b>" + (p.posto || "Posto") + "</b><br>" +
          (p.produto || "") + "<br>" +
          "Preço: " + (isNaN(precoNum) ? "—" : ("R$ " + precoNum.toFixed(2).replace(".", ","))) + "<br>" +
          "<small>Data: " + (p.data || "") + "</small>";

        // deslocamento radial simples (para não ficar tudo em cima)
        const angle = (i / Math.max(1, dados.precos.length)) * Math.PI * 2;
        const lat = centroRioGrande[0] + Math.cos(angle) * 0.01;
        const lng = centroRioGrande[1] + Math.sin(angle) * 0.01;

        L.marker([lat, lng])
          .addTo(layerColab)
          .bindPopup(popup);
      });

      console.log("✅ preços colaborativos carregados:", dados.precos.length);
    } catch (e) {
      console.error("❌ Erro ao carregar preços colaborativos:", e);
    }
  }

  // ===============================
  // BOOT
  // ===============================
  carregarPostos();
  carregarMapaRioGrandeEstimado();
  carregarPrecosColaborativos();

  console.log("✅ script.js carregado corretamente");
}

// ===============================
// FEEDBACK
// ===============================
function confirmarPreco(index) {
  const el = document.getElementById("feedback-" + index);
  if (el) el.innerText = "Obrigado por confirmar.";
}

function negarPreco(index) {
  const el = document.getElementById("feedback-" + index);
  if (el) el.innerText = "Preço contestado.";
}
