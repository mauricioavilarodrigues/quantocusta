import { carregarDadosBase } from "./script.js";

const lista = document.getElementById("listaExplorar");
const buscaInput = document.getElementById("busca");
const filtroNicho = document.getElementById("filtroNicho");
const ordemPreco = document.getElementById("ordemPreco");

let todosItens = [];

async function carregarTodosItens() {
  const base = await carregarDadosBase();
  let todos = [];

  Object.keys(base).forEach(nicho => {
    base[nicho].forEach(item => {
      todos.push({ ...item, nicho });
    });
  });

  return todos;
}

function renderizarLista(itens) {
  lista.innerHTML = "";

  itens.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${item.nome}</strong><br>
      R$ ${item.preco.toFixed(2)}<br>
      ${item.loja || item.posto} (${item.nicho})
    `;
    lista.appendChild(li);
  });
}

function aplicarFiltros() {
  let filtrados = [...todosItens];

  const texto = buscaInput.value.toLowerCase();
  const nicho = filtroNicho.value;
  const ordem = ordemPreco.value;

  if (texto) {
    filtrados = filtrados.filter(item =>
      item.nome.toLowerCase().includes(texto)
    );
  }

  if (nicho) {
    filtrados = filtrados.filter(item => item.nicho === nicho);
  }

  if (ordem === "menor") {
    filtrados.sort((a, b) => a.preco - b.preco);
  }

  if (ordem === "maior") {
    filtrados.sort((a, b) => b.preco - a.preco);
  }

  renderizarLista(filtrados);
}

async function iniciar() {
  todosItens = await carregarTodosItens();
  aplicarFiltros();
}

buscaInput.addEventListener("input", aplicarFiltros);
filtroNicho.addEventListener("change", aplicarFiltros);
ordemPreco.addEventListener("change", aplicarFiltros);

iniciar();
