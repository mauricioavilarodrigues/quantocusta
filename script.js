@@ -1,63 +1,59 @@
document.addEventListener("DOMContentLoaded", function () {

  const lista = document.getElementById("lista-produtos");
  const campoBusca = document.getElementById("busca");

  campoBusca.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      buscar();
    }
  });

  campoBusca.addEventListener("input", () => {
    const texto = campoBusca.value.toLowerCase();
    const filtrados = produtos.filter(p =>
      p.nome.toLowerCase().includes(texto)
    );
    mostrarProdutos(filtrados);
  });

  mostrarProdutos(produtos);
});

let nichoSelecionado = "";
let categoriaSelecionada = "";

function mostrarProdutos(listaProdutos) {
  const lista = document.getElementById("lista-produtos");
  lista.innerHTML = "";

  listaProdutos.forEach((produto, index) => {
    const div = document.createElement("div");
    div.className = "produto";

    div.innerHTML = `
      <div>
        ${produto.nome} - R$ ${produto.preco.toFixed(2)} (${produto.loja})
      </div>

      <div class="avaliacao">
        <strong>Este preço confere com o da loja?</strong><br>
        <button onclick="confirmarPreco(${index})">👍 Confere</button>
        <button onclick="negarPreco(${index})">❌ Não confere</button>
        <span id="feedback-${index}"></span>
      </div>
    `;

    lista.appendChild(div);
  });
}

async function buscar() {
  if (!nichoAtual) {
    alert("Por favor, selecione Supermercado, Combustível ou Farmácia.");
    return;
  }

  if (nichoAtual === "combustivel" && !tipoAtual) {
    alert("Por favor, selecione o tipo de combustível.");
    return;
  }

  if (nichoAtual === "supermercado" && !categoriaAtual) {
    alert("Por favor, selecione uma categoria do supermercado.");
    return;
  }

  if (nichoAtual === "farmacia" && !categoriaFarmaciaAtual) {
    alert("Por favor, selecione uma categoria da farmácia.");
    return;
  }

  alert("Agora você pode digitar o produto para buscar.");
}

function confirmarPreco(index) {
  document.getElementById(`feedback-${index}`).innerText =
    "Obrigado por confirmar!";
}

function negarPreco(index) {
  document.getElementById(`feedback-${index}`).innerText =
    "Preço contestado. Obrigado!";
}
