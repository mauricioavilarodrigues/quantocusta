const form = document.getElementById("formCadastro");
const mensagem = document.getElementById("mensagem");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;
  const confirmarSenha = document.getElementById("confirmarSenha").value;

  if (!nome || !email || !senha || !confirmarSenha) {
    mensagem.textContent = "Preencha todos os campos.";
    mensagem.style.color = "red";
    return;
  }

  if (senha !== confirmarSenha) {
    mensagem.textContent = "As senhas não coincidem.";
    mensagem.style.color = "red";
    return;
  }

  if (senha.length < 6) {
    mensagem.textContent = "A senha deve ter no mínimo 6 caracteres.";
    mensagem.style.color = "red";
    return;
  }

  // Simulação de cadastro (por enquanto)
  console.log("Usuário cadastrado:");
  console.log({ nome, email });

  mensagem.textContent = "Conta criada com sucesso! (simulação)";
  mensagem.style.color = "green";

  form.reset();
});
