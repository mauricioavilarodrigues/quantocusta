// ===============================
// TESTE DA API REST
// ===============================

fetch("http://localhost:3000/produtos")
  .then(r => r.json())
  .then(dados => {
    console.log("✅ Dados vindos da API:", dados);
  })
  .catch(err => {
    console.error("❌ Erro ao acessar API:", err);
  });
