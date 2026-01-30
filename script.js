// ===== VARIÁVEIS =====
let nichoAtual="", tipoAtual="", categoriaAtual="", categoriaFarmaciaAtual="";
let cesta=[], markersLayer, usuarioPosicao=null, pontos=[];

// ===== CONTROLES =====
function limparAtivos(grupo){ document.querySelectorAll(grupo+" button").forEach(b=>b.classList.remove("ativo")); }

function setNicho(n,b){
    nichoAtual=n; tipoAtual=""; categoriaAtual=""; categoriaFarmaciaAtual=""; resultado.innerHTML="";
    limparAtivos(".topo"); b.classList.add("ativo");
    ["Supermercado","Combustivel","Farmacia"].forEach(f=>document.getElementById("filtro"+f).style.display="none");
    if(n=="supermercado") filtroSupermercado.style.display="flex";
    if(n=="combustivel") filtroCombustivel.style.display="flex";
    if(n=="farmacia") filtroFarmacia.style.display="flex";
}

function setTipo(t,b){ tipoAtual=t; limparAtivos("#filtroCombustivel"); b.classList.add("ativo"); buscar(); }
function setCategoria(c,b){ categoriaAtual=c; limparAtivos("#filtroSupermercado"); b.classList.add("ativo"); buscar(); }
function setCategoriaFarmacia(c,b){ categoriaFarmaciaAtual=c; limparAtivos("#filtroFarmacia"); b.classList.add("ativo"); buscar(); }

// ===== BUSCA =====
async function buscar(){
    if(!nichoAtual) return alert("Selecione um nicho.");
    if(nichoAtual=="combustivel" && !tipoAtual) return alert("Selecione o tipo.");
    if(nichoAtual=="supermercado" && !categoriaAtual) return alert("Selecione a categoria.");
    if(nichoAtual=="farmacia" && !categoriaFarmaciaAtual) return alert("Selecione a categoria.");

    const termo = busca.value.toLowerCase();
    const res = await fetch("data.json");
    const data = await res.json();

    let itens = data[nichoAtual].filter(p=>p.nome.toLowerCase().includes(termo));

    if(nichoAtual=="combustivel") itens = itens.filter(p=>p.nome.toLowerCase().includes(tipoAtual.toLowerCase()));
    if(nichoAtual=="supermercado") itens = itens.filter(p=>p.tipo==categoriaAtual);
    if(nichoAtual=="farmacia") itens = itens.filter(p=>p.tipo==categoriaFarmaciaAtual);

    resultado.innerHTML="";

    itens.forEach((p,index)=>{
        const li=document.createElement("li");

