// ===============================
// QUANTOCUSTA - script.js (ALINHADO AO INDEX)
// ===============================
(() => {
  "use strict";

  // ===============================
  // DOM
  // ===============================
  const elBusca = document.getElementById("buscaInput");
  const elResultado = document.getElementById("resultado");

  const elFiltroSupermercado = document.getElementById("filtroSupermercado");
  const elFiltroCombustivel = document.getElementById("filtroCombustivel");
  const elFiltroFarmacia = document.getElementById("filtroFarmacia");

  if (!elBusca || !elResultado || !document.getElementById("map")) {
    console.error("❌ HTML não compatível: falta buscaInput, resultado ou map");
    return;
  }

  // ===============================
  // ESTADO
  // ===============================
  let nichoAtual = "";
  let tipoAtual = "";
  let categoriaAtual = "";
  let categoriaFarmaciaAtual = "";

  let dataCache = null;

  // ===============================
  // HELPERS
  // ===============================
  const safe = v => v ?? "";
  const toNumber = v => Number(String(v).replace(",", "."));
  const brMoney = n => isNaN(n) ? "—" : "R$ " + n.toFixed(2).replace(".", ",");

  function limparAtivos(selector) {
    document.querySelectorAll(selector + " button")
      .forEach(b => b.classList.remove("ativo"));
  }

  async function getData() {
    if (dataCache) return dataCache;
    const r = await fetch("data.json", { cache: "no-store" });
    dataCache = await r.json();
    return dataCache;
  }

  // ===============================
  // CONTROLES (LIGADOS AOS BOTÕES DO INDEX)
  // ===============================
  document.getElementById("btnSupermercado").onclick = () => setNicho("supermercado");
  document.getElementById("btnCombustivel").onclick = () => setNicho("combustivel");
  document.getElementById("btnFarmacia").onclick = () => setNicho("farmacia");

  document.getElementById("btnBuscar").onclick = buscar;
  document.getElementById("btnLimpar").onclick = () => {
    elBusca.value = "";
    elResultado.innerHTML = "";
  };

  // ===============================
  // FILTROS
  // ===============================
  function setNicho(n) {
    nichoAtual = n;
    tipoAtual = categoriaAtual = categoriaFarmaciaAtual = "";
    elResultado.innerHTML = "";

    limparAtivos(".topo");
    document.querySelector(`#btn${n.charAt(0).toUpperCase() + n.slice(1)}`)?.classList.add("ativo");

    elFiltroSupermercado.style.display = "none";
    elFiltroCombustivel.style.display = "none";
    elFiltroFarmacia.style.display = "none";

    if (n === "supermercado") elFiltroSupermercado.style.display = "flex";
    if (n === "combustivel") elFiltroCombustivel.style.display = "flex";
    if (n === "farmacia") elFiltroFarmacia.style.display = "flex";
  }

  elFiltroSupermercado.querySelectorAll("button").forEach(b =>
    b.onclick = () => { categoriaAtual = b.dataset.tipo; buscar(); }
  );

  elFiltroCombustivel.querySelectorAll("button").forEach(b =>
    b.onclick = () => { tipoAtual = b.dataset.tipo; buscar(); }
  );

  elFiltroFarmacia.querySelectorAll("button").forEach(b =>
    b.onclick = () => { categoriaFarmaciaAtual = b.dataset.tipo; buscar(); }
  );

  // ===============================
  // BUSCA
  // ===============================
  async function buscar() {
    if (!nichoAtual) return alert("Selecione um nicho.");

    const termo = elBusca.value.toLowerCase().trim();
    const data = await getData();
    let itens = data[nichoAtual] || [];

    if (termo) itens = itens.filter(p => safe(p.nome).toLowerCase().includes(termo));
    if (nichoAtual === "combustivel" && tipoAtual)
      itens = itens.filter(p => safe(p.nome).toLowerCase().includes(tipoAtual));
    if (nichoAtual === "supermercado" && categoriaAtual)
      itens = itens.filter(p => p.tipo === categoriaAtual);
    if (nichoAtual === "farmacia" && categoriaFarmaciaAtual)
      itens = itens.filter(p => p.tipo === categoriaFarmaciaAtual);

    elResultado.innerHTML = "";

    if (!itens.length) {
      elResultado.innerHTML = "<li>Nenhum resultado encontrado.</li>";
      return;
    }

    itens.forEach((p, i) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>
          ${safe(p.nome)}<br>
          <small>${safe(p.loja || p.posto)}</small>
        </span>
        <span class="preco">${brMoney(toNumber(p.preco))}</span>
      `;
      elResultado.appendChild(li);
    });
  }

  // ===============================
  // MAPA
  // ===============================
  const map = L.map("map").setView([-32.035, -52.098], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  const markersLayer = L.layerGroup().addTo(map);

  async function carregarMapaEstimado() {
    const r = await fetch("precos_estimados_rio_grande_anp.json", { cache: "no-store" });
    const d = await r.json();

    markersLayer.clearLayers();

    L.marker([-32.035, -52.098]).addTo(markersLayer).bindPopup(
      `<b>Rio Grande (ANP)</b><br>
       Gasolina: ${brMoney(toNumber(d?.combustiveis?.gasolina_comum?.preco_medio))}`
    );
  }

  async function carregarColaborativos() {
    const r = await fetch("precos_colaborativos.json", { cache: "no-store" });
    const d = await r.json();

    (d.precos || []).forEach(p => {
      const lat = -32.035 + (Math.random() - 0.5) * 0.01;
      const lng = -52.098 + (Math.random() - 0.5) * 0.01;

      L.marker([lat, lng])
        .addTo(markersLayer)
        .bindPopup(
          `<b>${safe(p.posto)}</b><br>
           ${safe(p.produto)}<br>
           ${brMoney(toNumber(p.preco))}`
        );
    });
  }

  // ===============================
  // BOOT
  // ===============================
  console.log("✅ script.js alinhado ao index.html");
  carregarMapaEstimado().then(carregarColaborativos);

})();
