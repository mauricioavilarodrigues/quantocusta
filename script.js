// ===============================
// QUANTOCUSTA - script.js (corrigido)
// Leaflet + Busca + Filtros + Cesta + Mapa Estimado + Colaborativo
// ===============================

(() => {
  "use strict";

  // ===============================
  // REFERÊNCIAS DO DOM (SEM GLOBAIS MÁGICAS)
  // ===============================
  const elBusca = document.getElementById("busca");
  const elResultado = document.getElementById("resultado");
  const elCestaResultado = document.getElementById("cestaResultado");

  const elFiltroSupermercado = document.getElementById("filtroSupermercado");
  const elFiltroCombustivel = document.getElementById("filtroCombustivel");
  const elFiltroFarmacia = document.getElementById("filtroFarmacia");

  // Se algum elemento essencial não existir, avisa e não quebra tudo
  if (!elBusca || !elResultado || !elCestaResultado || !document.getElementById("map")) {
    console.error("❌ Falta algum elemento no HTML: ids esperados -> busca, resultado, cestaResultado, map");
  }

  // ===============================
  // ESTADO GLOBAL CONTROLADO
  // ===============================
  let nichoAtual = "";
  let tipoAtual = "";
  let categoriaAtual = "";
  let categoriaFarmaciaAtual = "";

  const cesta = [];
  const cestaIds = new Set(); // evita duplicar item na cesta

  // cache dos dados para não refazer fetch a cada clique
  let dataCache = null;

  // ===============================
  // HELPERS
  // ===============================
  function safeText(v) {
    return (v === null || v === undefined) ? "" : String(v);
  }

  function toNumber(v) {
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }

  function brMoney(n) {
    if (!Number.isFinite(n)) return "—";
    return "R$ " + n.toFixed(2).replace(".", ",");
  }

  function uidFromItem(p) {
    // cria uma "chave" estável para evitar duplicar na cesta
    // usa id se tiver; senão, combina campos comuns
    if (p && (p.id !== undefined && p.id !== null)) return `id:${p.id}`;
    return `k:${safeText(p.nome)}|${safeText(p.loja || p.posto)}|${safeText(p.tipo)}|${safeText(p.cidade)}`;
  }

  function limparAtivos(grupoSelector) {
    document.querySelectorAll(grupoSelector + " button")
      .forEach(b => b.classList.remove("ativo"));
  }

  async function getData() {
    if (dataCache) return dataCache;
    const res = await fetch("data.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Falha ao carregar data.json (HTTP " + res.status + ")");
    dataCache = await res.json();
    return dataCache;
  }

  // ===============================
  // CONTROLES DE FILTRO (EXPOSTOS PARA O HTML)
  // ===============================
  window.setNicho = function setNicho(n, b) {
    nichoAtual = n;
    tipoAtual = "";
    categoriaAtual = "";
    categoriaFarmaciaAtual = "";
    elResultado.innerHTML = "";

    limparAtivos(".topo");
    if (b) b.classList.add("ativo");

    ["Supermercado", "Combustivel", "Farmacia"].forEach(f => {
      const el = document.getElementById("filtro" + f);
      if (el) el.style.display = "none";
    });

    if (n === "supermercado" && elFiltroSupermercado) elFiltroSupermercado.style.display = "flex";
    if (n === "combustivel" && elFiltroCombustivel) elFiltroCombustivel.style.display = "flex";
    if (n === "farmacia" && elFiltroFarmacia) elFiltroFarmacia.style.display = "flex";
  };

  window.setTipo = function setTipo(t, b) {
    tipoAtual = t;
    limparAtivos("#filtroCombustivel");
    if (b) b.classList.add("ativo");
    window.buscar();
  };

  window.setCategoria = function setCategoria(c, b) {
    categoriaAtual = c;
    limparAtivos("#filtroSupermercado");
    if (b) b.classList.add("ativo");
    window.buscar();
  };

  window.setCategoriaFarmacia = function setCategoriaFarmacia(c, b) {
    categoriaFarmaciaAtual = c;
    limparAtivos("#filtroFarmacia");
    if (b) b.classList.add("ativo");
    window.buscar();
  };

  // ===============================
  // BUSCA + RENDER RESULTADOS (EXPOSTO PARA O HTML)
  // ===============================
  window.buscar = async function buscar() {
    try {
      if (!nichoAtual) return alert("Selecione um nicho.");
      if (nichoAtual === "combustivel" && !tipoAtual) return alert("Selecione o tipo.");
      if (nichoAtual === "supermercado" && !categoriaAtual) return alert("Selecione a categoria.");
      if (nichoAtual === "farmacia" && !categoriaFarmaciaAtual) return alert("Selecione a categoria.");

      const termo = (elBusca?.value || "").toLowerCase().trim();

      const data = await getData();
      const lista = Array.isArray(data[nichoAtual]) ? data[nichoAtual] : [];

      let itens = lista.filter(p => safeText(p.nome).toLowerCase().includes(termo));

      // filtros por nicho (como no teu código antigo)
      if (nichoAtual === "combustivel") {
        itens = itens.filter(p => safeText(p.nome).toLowerCase().includes(tipoAtual.toLowerCase()));
      }
      if (nichoAtual === "supermercado") {
        itens = itens.filter(p => p.tipo === categoriaAtual);
      }
      if (nichoAtual === "farmacia") {
        itens = itens.filter(p => p.tipo === categoriaFarmaciaAtual);
      }

      elResultado.innerHTML = "";

      if (itens.length === 0) {
        const li = document.createElement("li");
        li.innerHTML = "<span>Nenhum resultado encontrado.</span>";
        elResultado.appendChild(li);
        return;
      }

      itens.forEach((p, index) => {
        const li = document.createElement("li");

        const preco = toNumber(p.preco);
        const lojaTxt = safeText(p.loja || p.posto || "");
        const nomeTxt = safeText(p.nome || "Sem nome");

        li.innerHTML =
          "<span>" +
          "<input type='checkbox' id='ck-" + index + "'>" +
          " " + nomeTxt +
          "<br><small>" + lojaTxt + "</small></span>" +
          "<span class='preco'>" + brMoney(preco) + "</span>" +
          "<div class='avaliacao'>" +
          "<strong>Este preço confere?</strong><br>" +
          "<button onclick='confirmarPreco(" + index + ")'>👍 Confere</button>" +
          "<button onclick='negarPreco(" + index + ")'>❌ Não confere</button>" +
          "<div id='feedback-" + index + "'></div></div>";

        elResultado.appendChild(li);

        // checkbox -> cesta (sem duplicar)
        const ck = li.querySelector("#ck-" + index);
        ck.addEventListener("change", (e) => {
          const key = uidFromItem(p);
          if (e.target.checked) {
            if (!cestaIds.has(key)) {
              cesta.push(p);
              cestaIds.add(key);
            }
          } else {
            // remove da cesta se desmarcar
            const idx = cesta.findIndex(x => uidFromItem(x) === key);
            if (idx >= 0) cesta.splice(idx, 1);
            cestaIds.delete(key);
          }
        });
      });

    } catch (err) {
      console.error("❌ Erro na busca:", err);
      alert("Erro ao buscar. Veja o console (F12).");
    }
  };

  // ===============================
  // CESTA (EXPOSTO PARA O HTML)
  // ===============================
  window.compararCesta = function compararCesta() {
    if (cesta.length === 0) {
      elCestaResultado.innerHTML = "<h3>Resultado da cesta</h3><div>Nenhum item selecionado.</div>";
      return;
    }

    const porLoja = {};
    cesta.forEach(p => {
      const loja = safeText(p.loja || p.posto || "Sem nome");
      const preco = toNumber(p.preco);
      porLoja[loja] = (porLoja[loja] || 0) + (Number.isFinite(preco) ? preco : 0);
    });

    let menor = Infinity;
    Object.values(porLoja).forEach(v => { menor = Math.min(menor, v); });

    let html = "<h3>Resultado da cesta</h3>";
    for (const loja in porLoja) {
      const total = porLoja[loja];
      const cls = total === menor ? "menor" : "";
      html += `<div class="${cls}">${loja}: ${brMoney(total)}</div>`;
    }

    elCestaResultado.innerHTML = html;
  };

  // ===============================
  // FEEDBACK (EXPOSTO PARA O HTML)
  // ===============================
  window.confirmarPreco = function confirmarPreco(index) {
    const el = document.getElementById("feedback-" + index);
    if (el) el.innerText = "Obrigado por confirmar.";
  };

  window.negarPreco = function negarPreco(index) {
    const el = document.getElementById("feedback-" + index);
    if (el) el.innerText = "Preço contestado.";
  };

  // ===============================
  // MAPA – LEAFLET (RIO GRANDE)
  // ===============================
  if (typeof L === "undefined") {
    console.error("❌ Leaflet (L) não está carregado. Verifique o <script> do Leaflet antes do script.js.");
    return;
  }

  const map = L.map("map").setView([-32.035, -52.098], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  const markersLayer = L.layerGroup().addTo(map);

  async function carregarMapaRioGrandeEstimado() {
    try {
      const res = await fetch("precos_estimados_rio_grande_anp.json", { cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao carregar precos_estimados_rio_grande_anp.json (HTTP " + res.status + ")");
      const dados = await res.json();

      markersLayer.clearLayers();

      const centro = [-32.035, -52.098];
      const c = dados.combustiveis || {};

      const html =
        "<b>Rio Grande (estimado)</b><br>" +
        "<small>Base: " + safeText(dados.cidade_base) +
        " | ANP " + safeText(dados?.periodo?.data_inicial) +
        " a " + safeText(dados?.periodo?.data_final) + "</small><br><br>" +
        "<b>Gasolina Comum:</b> " + brMoney(toNumber(c?.gasolina_comum?.preco_medio)) + "<br>" +
        "<b>Gasolina Aditivada:</b> " + brMoney(toNumber(c?.gasolina_aditivada?.preco_medio)) + "<br>" +
        "<b>Etanol:</b> " + brMoney(toNumber(c?.etanol_hidratado?.preco_medio)) + "<br>" +
        "<b>Diesel:</b> " + brMoney(toNumber(c?.oleo_diesel?.preco_medio)) + "<br>" +
        "<b>Diesel S10:</b> " + brMoney(toNumber(c?.oleo_diesel_s10?.preco_medio)) + "<br>" +
        "<b>GNV:</b> " + brMoney(toNumber(c?.gnv?.preco_medio)) + "<br>" +
        "<b>GLP:</b> " + brMoney(toNumber(c?.glp?.preco_medio)) + "<br><br>" +
        "<small>" + safeText(dados.aviso) + "</small>";

      L.marker(centro).addTo(markersLayer).bindPopup(html);

    } catch (e) {
      console.error("Erro ao carregar mapa estimado:", e);
    }
  }

  async function carregarPrecosColaborativos() {
    try {
      const res = await fetch("precos_colaborativos.json", { cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao carregar precos_colaborativos.json (HTTP " + res.status + ")");
      const dados = await res.json();

      if (!Array.isArray(dados.precos) || dados.precos.length === 0) {
        console.warn("Nenhum preço colaborativo encontrado");
        return;
      }

      const centro = [-32.035, -52.098];

      dados.precos.forEach((p) => {
        const precoNum = toNumber(p.preco);

        const popup =
          "<b>✅ Comunidade</b><br>" +
          "<b>" + safeText(p.posto || "Posto") + "</b><br>" +
          safeText(p.produto || "") + "<br>" +
          "Preço: " + brMoney(precoNum) + "<br>" +
          "<small>Data: " + safeText(p.data || "-") + "</small>";

        // jitter para não empilhar marcadores (± ~0.005)
        const jitterLat = (Math.random() - 0.5) * 0.01;
        const jitterLng = (Math.random() - 0.5) * 0.01;

        L.marker([centro[0] + jitterLat, centro[1] + jitterLng])
          .addTo(markersLayer)
          .bindPopup(popup);
      });

    } catch (e) {
      console.error("Erro ao carregar preços colaborativos:", e);
    }
  }

  // ===============================
  // MELHOR OPÇÃO (placeholder seguro)
  // ===============================
  // Você não enviou a lógica completa aqui; então deixo uma versão "não quebra".
  // Se você quiser, eu integro com dados reais e geolocalização depois.
  window.acharMelhorOpcao = function acharMelhorOpcao() {
    alert("⚠️ 'Melhor opção perto de você' ainda não está conectado às coordenadas reais dos postos. Posso ligar isso com lat/lng quando você tiver coordenadas por posto.");
  };

  // ===============================
  // BOOT
  // ===============================
  console.log("✅ script.js carregado corretamente");
  carregarMapaRioGrandeEstimado().then(() => carregarPrecosColaborativos());

})();
