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

    const termo=busca.value.toLowerCase();
    const res = await fetch("http://localhost:3000/produtos");
    const data = await res.json();
    let itens = data[nichoAtual].filter(p=>p.nome.toLowerCase().includes(termo));


    if(nichoAtual=="combustivel") itens=itens.filter(p=>p.nome.toLowerCase().includes(tipoAtual.toLowerCase()));
    if(nichoAtual=="supermercado") itens=itens.filter(p=>p.tipo==categoriaAtual);
    if(nichoAtual=="farmacia") itens=itens.filter(p=>p.tipo==categoriaFarmaciaAtual);

    resultado.innerHTML="";
    itens.forEach((p,index)=>{
        const li=document.createElement("li");
        li.innerHTML=`
            <span><input type="checkbox" onchange='addCesta(${JSON.stringify(p)})'> ${p.nome}<br><small>${p.loja||p.posto}</small></span>
            <span class="preco">R$ ${p.preco.toFixed(2)}</span>
            <div class="avaliacao"><strong>Este preço confere?</strong><br>
                <button onclick="confirmarPreco(${index})">👍 Confere</button>
                <button onclick="negarPreco(${index})">❌ Não confere</button>
                <div id="feedback-${index}"></div>
            </div>
        `;
        resultado.appendChild(li);
    });
}

// ===== CESTA =====
function addCesta(p){ cesta.push(p); }
function compararCesta(){
    let porLoja={};
    cesta.forEach(p=>{ let l=p.loja||p.posto; porLoja[l]=(porLoja[l]||0)+p.preco; });
    let html="<h3>Resultado da cesta</h3>"; let menor=Infinity;
    for(let l in porLoja) menor=Math.min(menor, porLoja[l]);
    for(let l in porLoja){ let cls=porLoja[l]==menor?"menor":""; html+=`<div class="${cls}">${l}: R$ ${porLoja[l].toFixed(2)}</div>`; }
    cestaResultado.innerHTML=html;
}

// ===== MAPA =====
const map = L.map('map').setView([-32.035,-52.098],13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
markersLayer=L.layerGroup().addTo(map);

map.locate({setView:true,maxZoom:15});
map.on("locationfound", e=>{
    usuarioPosicao=e.latlng;
    L.circleMarker(usuarioPosicao,{radius:8, color:'#4f5dff', fillColor:'#4f5dff', fillOpacity:0.8})
      .addTo(map).bindPopup("<b>Você está aqui</b>").openPopup();
});

const coords={"Buffon":[-32.035,-52.095],"SIM":[-32.032,-52.105],"Shell":[-32.040,-52.090]};

async function carregarMapa(){
   const res = await fetch("http://localhost:3000/produtos"); 
   const data = await res.json();


    markersLayer.clearLayers(); 
    pontos=[];
    data.combustivel.forEach(p=>{
        const c=coords[p.posto]; 
        if(!c) return;
        const marker = L.marker(c).addTo(markersLayer);
        marker.bindPopup(`<b>${p.posto}</b><br>${p.nome}<br>R$ ${p.preco.toFixed(2)}`);
        pontos.push({lat:c[0],lng:c[1],nome:p.posto,preco:p.preco,marker});
    });
}
carregarMapa();

function distancia(lat1, lon1, lat2, lon2){
    const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function acharMelhorOpcao(){
    if(!usuarioPosicao) return alert("Localização não encontrada.");
    const pesoDistancia=2;
    pontos.forEach(p=>{ 
        p.distancia=distancia(usuarioPosicao.lat,usuarioPosicao.lng,p.lat,p.lng); 
        p.score=p.preco+(p.distancia*pesoDistancia); 
    });
    pontos.sort((a,b)=>a.score-b.score); 
    const melhor=pontos[0];
    melhor.marker.openPopup(); 
    map.setView([melhor.lat,melhor.lng],16);
    alert(`🏆 Melhor opção:\n${melhor.nome}\nPreço: R$ ${melhor.preco}`);
}

function confirmarPreco(index){ 
    document.getElementById(`feedback-${index}`).innerText="Obrigado por confirmar o preço 👍"; 
}
function negarPreco(index){ 
    document.getElementById(`feedback-${index}`).innerText="Preço contestado. Obrigado pela colaboração ❌"; 
}
