import { carregarDadosBase } from "./script.js";

let itensGlobais = [];

document.addEventListener("DOMContentLoaded", async () => {
  itensGlobais = await carregarTodosOsItens();
  renderizar(itensGlobais);

  document.getElementById("ordenacao").addEventListener("change", e => {
    ordenar(e.target.value);
  });
});

const ul = document.getElementById("listaExplorar");

async function mostrarItens() {
  const itens = await carregarTodosItens();

  ul.innerHTML = "";

  itens.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.nome} - R$ ${item.preco} (${item.nicho})`;
    ul.appendChild(li);
  });
}

mostrarItens();
}

function ordenar(tipo) {
  let lista = [...itensGlobais];

  if (tipo === "preco") {
    lista.sort((a,b)=>(a.preco ?? 999999)-(b.preco ?? 999999));
  }

  if (tipo === "nome") {
    lista.sort((a,b)=>a.nome.localeCompare(b.nome));
  }

  renderizar(lista);
}

function renderizar(lista) {
  const ul = document.getElementById("listaExplorar");
  ul.innerHTML = "";

  lista.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${p.nome}</strong> — R$ ${fmt(p.preco)}<br><small>${p.loja} • ${p.nicho}</small>`;
    ul.appendChild(li);
  });
}

function fmt(v){
  return Number.isFinite(v) ? v.toFixed(2).replace(".",",") : "—";
}
