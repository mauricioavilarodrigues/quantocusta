import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://SEU_PROJECT_ID.supabase.co";
const supabaseKey = "SUA_ANON_PUBLIC_KEY";

const supabase = createClient(supabaseUrl, supabaseKey);

const form = document.getElementById("formCadastro");
const mensagem = document.getElementById("mensagem");

form.addEventListener("submit", async (e) => {
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

  // Cadastro real no Supabase
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: senha,
    options: {
      data: {
        nome: nome
      }
    }
  });

  if (error) {
    mensagem.textContent = "Erro: " + error.message;
    mensagem.style.color = "red";
    return;
  }

  mensagem.textContent = "Conta criada com sucesso!";
  mensagem.style.color = "green";
  form.reset();
});
