// ===============================
// CONFIG
// ===============================
const API_URL = "http://localhost:3000/produtos";

// ===============================
// ELEMENTOS
// ===============================
const lista = document.getElementById("resultado");

const inputBusca = document.getElementById("busca");

// ===============================
// CARREGAR PRODUTOS
// ===============================
async function carregarProdutos() {
  try {
    const resposta = await fetch(API_URL);
    const dados = await resposta.json();
    mostrarProdutos(dados);
  } catch (erro) {
    console.error("Erro ao buscar API:", erro);
  }
}

// ===============================
// MOSTRAR NA TELA
// ===============================
function mostrarProdutos(produtos) {
  lista.innerHTML = "";

  produtos.forEach(p => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3>${p.nome}</h3>
      <p>Preço: R$ ${p.preco}</p>
      <p>Loja: ${p.loja}</p>
    `;

    lista.appendChild(div);
  });
}

// ===============================
// BUSCA
// ===============================
if (inputBusca) {
  inputBusca.addEventListener("input", async () => {
    const termo = inputBusca.value.toLowerCase();
    const resposta = await fetch(API_URL);
    const dados = await resposta.json();

    const filtrados = dados.filter(p =>
      p.nome.toLowerCase().includes(termo) ||
      p.loja.toLowerCase().includes(termo)
    );

    mostrarProdutos(filtrados);
  });
}

// ===============================
// START
// ===============================
carregarProdutos();
