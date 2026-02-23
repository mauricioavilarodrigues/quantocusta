import { carregarDadosBase } from "./script.js";

const lista = document.getElementById("listaExplorar");

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

async function mostrarItens() {
  const itens = await carregarTodosItens();
  lista.innerHTML = "";

  itens.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.nome} - R$ ${item.preco} (${item.nicho})`;
    lista.appendChild(li);
  });
}

mostrarItens();
