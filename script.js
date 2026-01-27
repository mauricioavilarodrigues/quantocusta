@@ -1,63 +1,59 @@
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
const inputBusca = document.getElementById("busca");

inputBusca.addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    buscar();
  }
});

async function buscar(){
document.addEventListener("DOMContentLoaded", function() {

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
  document.getElementById("mensagem").innerText =
  "Por favor, selecione Supermercado, Combustível ou Farmácia.";
return;
  }

  if(nichoAtual=="farmacia" && !categoriaFarmaciaAtual){
    alert("Por favor, selecione uma categoria da farmácia.");
  if (!categoriaSelecionada) {
    document.getElementById("mensagem").innerText =
    "Por favor, selecione o tipo de combustível.";
    return;
  }

  alert("Agora você pode digitar o produto para buscar.");
}
