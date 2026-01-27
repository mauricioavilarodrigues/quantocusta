document.addEventListener("DOMContentLoaded", function() {

  const inputBusca = document.getElementById("busca");

  inputBusca.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
      buscar();
    }
  });

});

let nichoSelecionado = "";
let categoriaSelecionada = "";

const lista = document.getElementById("lista-produtos");
const campoBusca = document.getElementById("busca");

function mostrarProdutos(listaProdutos) {
  lista.innerHTML = "";

  listaProdutos.forEach(produto => {
    const div = document.createElement("div");
    div.className = "produto";
    div.textContent = `${produto.nome} - R$ ${produto.preco.toFixed(2)} (${produto.loja})`;
    lista.appendChild(div);
  });
}

campoBusca.addEventListener("input", () => {
  const texto = campoBusca.value.toLowerCase();
  const filtrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(texto)
  );
  mostrarProdutos(filtrados);
});

mostrarProdutos(produtos);

    }
  });

});
