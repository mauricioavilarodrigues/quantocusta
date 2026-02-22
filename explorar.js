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
