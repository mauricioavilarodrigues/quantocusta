import { carregarDadosBase } from "./script.js"; 
// se não puder importar, copie a função

let itensGlobais = [];

document.addEventListener("DOMContentLoaded", async () => {
  const dados = await carregarTodosOsItens();
  itensGlobais = dados;
  renderizar(itensGlobais);
});

document.getElementById("ordenacao").addEventListener("change", (e) => {
  ordenarItens(e.target.value);
});

async function carregarTodosOsItens() {
  const base = await carregarDadosBase();

  let itensBase = [];

  // junta todos os nichos
  Object.keys(base).forEach((nicho) => {
    if (Array.isArray(base[nicho])) {
      base[nicho].forEach(p => {
        itensBase.push({
          id: p.id,
          nome: p.nome,
          preco: p.preco,
          loja: p.loja || p.posto || "",
          cidade: p.cidade || "",
          nicho,
          createdAt: p.createdAt || null,
          updatedAt: p.updatedAt || null
        });
      });
    }
  });

  return itensBase;
}

function ordenarItens(tipo) {
  let lista = [...itensGlobais];

  if (tipo === "preco") {
    lista.sort((a,b)=>(a.preco ?? 99999)-(b.preco ?? 99999));
  }

  if (tipo === "nome") {
    lista.sort((a,b)=>a.nome.localeCompare(b.nome));
  }

  if (tipo === "data") {
    lista.sort((a,b)=> new Date(b.updatedAt||0) - new Date(a.updatedAt||0));
  }

  renderizar(lista);
}

function renderizar(lista) {
  const ul = document.getElementById("listaExplorar");
  ul.innerHTML = "";

  lista.forEach(p => {
    const li = document.createElement("li");

    li.innerHTML = `
      <strong>${p.nome}</strong> — R$ ${formatarPreco(p.preco)}<br>
      <small>${p.loja} • ${p.nicho}</small>
    `;

    ul.appendChild(li);
  });
}

function formatarPreco(v){
  return Number.isFinite(v) ? v.toFixed(2).replace(".",",") : "—";
}
// explorar.js
let itensGlobais = [];

document.addEventListener("DOMContentLoaded", async () => {
  itensGlobais = await carregarItensExploracao();
  renderizar(itensGlobais);
});

document.getElementById("ordenacao").addEventListener("change", (e) => {
  ordenar(e.target.value);
});

async function carregarItensExploracao() {
  // 1️⃣ base local
  const base = await carregarDadosBase();

  let itens = [];

  Object.values(base).forEach(lista => {
    if (!Array.isArray(lista)) return;

    lista.forEach(p => {
      itens.push({
        id: p.id || normTxt(p.nome || "").slice(0,80),
        nome: p.nome,
        preco: p.preco ?? null,
        loja: p.loja || p.posto || null,
        cidade: p.cidade || null,
        origem: "base",
        createdAt: p.createdAt || null,
        updatedAt: p.updatedAt || null
      });
    });
  });

  // 2️⃣ NFC-e aprovados (somente supermercado, igual ao script principal)
  const nfce = await apiGetNfceItensAprovados({
    cidade: "Rio Grande",
    nicho: "supermercado",
    limit: 200
  }).catch(() => []);

  if (Array.isArray(nfce)) {
    itens = itens.concat(nfce.map(x => ({
      id: x.id || x.item_id,
      nome: x.nome || x.descricao,
      preco: x.preco ?? null,
      loja: x.loja || x.emitente,
      cidade: x.cidade || null,
      origem: "nfce",
      createdAt: x.created_at || x.data_emissao,
      updatedAt: x.approved_at || x.updated_at || x.data_emissao
    })));
  }

  // 3️⃣ overrides
  const ids = itens.map(i => String(i.id));
  const overrides = await apiGetOverridesAprovados(ids).catch(() => ({}));
  itens = aplicarOverridesDePreco(itens, overrides);

  return itens;
}

function ordenar(tipo) {
  let lista = [...itensGlobais];

  if (tipo === "preco") {
    lista.sort((a,b)=>(a.preco ?? 999999)-(b.preco ?? 999999));
  }

  if (tipo === "nome") {
    lista.sort((a,b)=>a.nome.localeCompare(b.nome));
  }

  if (tipo === "data") {
    lista.sort((a,b)=> new Date(b.updatedAt||0) - new Date(a.updatedAt||0));
  }

  renderizar(lista);
}

function renderizar(lista) {
  const ul = document.getElementById("listaExplorar");
  ul.innerHTML = "";

  lista.forEach(p => {
    const li = document.createElement("li");

    const dt = parseDateSafe(p.updatedAt || p.createdAt);
    const rec = classeRecencia(dt);
    li.classList.add(rec);
    aplicarEstiloRecencia(li, rec);

    li.innerHTML = `
      <strong>${p.nome}</strong> — R$ ${fmtPreco(p.preco)}<br>
      <small>${p.loja || ""}</small>
    `;

    ul.appendChild(li);
  });
}

function fmtPreco(v){
  return Number.isFinite(v) ? v.toFixed(2).replace(".",",") : "—";
}
