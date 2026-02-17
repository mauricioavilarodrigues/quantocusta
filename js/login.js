import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://qhkzyrtuvdifglxeupru.supabase.co";
const supabaseKey = "SUA_CHAVE_PUBLICA_AQUI"; // a mesma que você usou no cadastro.js

const supabase = createClient(supabaseUrl, supabaseKey);

const form = document.getElementById("formLogin");
const mensagem = document.getElementById("mensagem");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;

  mensagem.textContent = "Entrando...";

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (error) {
    mensagem.textContent = "Erro: " + error.message;
    mensagem.style.color = "red";
    return;
  }

  mensagem.textContent = "Login realizado com sucesso!";
  mensagem.style.color = "green";

  console.log("Usuário logado:", data.user);

  // redireciona para página principal
  setTimeout(() => {
    window.location.href = "index.html";
  }, 1500);
});

