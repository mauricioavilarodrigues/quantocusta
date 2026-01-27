@@ -1,63 +1,59 @@
document.addEventListener("DOMContentLoaded", function() {
  const campoBusca = document.getElementById("busca");

  campoBusca.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
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

  listaProdutos.forEach((produto, index) => {
    const div = document.createElement("div");
    div.className = "produto";

    div.innerHTML = `
      <span>
        ${produto.nome} - R$ ${produto.preco.toFixed(2)} (${produto.loja})
      </span>

      <div class="avaliacao">
        <p>Este preço confere com o da loja?</p>

        <button onclick="confirmarPreco(${index})">👍 Confere</button>
        <button onclick="negarPreco(${index})">❌ Não confere</button>

        <span id="feedback-${index}"></span>
      </div>
    `;

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
const inputBusca = document.getElementById("busca");

inputBusca.addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    buscar();
  }
});

  campoBusca.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      buscar();
    }
  });
});

async function buscar(){

  if(!nichoAtual){
    alert("Por favor, selecione Supermercado, Combustível ou Farmácia.");
    return;
  }
  const inputBusca = document.getElementById("busca");

  if(nichoAtual=="combustivel" && !tipoAtual){
    alert("Por favor, selecione o tipo de combustível.");
    return;
  }
  inputBusca.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
      buscar();
    }
  });

  if(nichoAtual=="supermercado" && !categoriaAtual){
    alert("Por favor, selecione uma categoria do supermercado.");
    return;
});

function validarBusca() {

  if (!nichoSelecionado) {
  "Por favor, selecione Supermercado, Combustível ou Farmácia.";
return;
  }

  if(nichoAtual=="farmacia" && !categoriaFarmaciaAtual){
    alert("Por favor, selecione uma categoria da farmácia.");
  if (!categoriaSelecionada) {
    "Por favor, selecione o tipo de combustível.";
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
