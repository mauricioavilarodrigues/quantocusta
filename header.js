import { supabase } from "./auth.js";

const userGreeting = document.getElementById("userGreeting");
const btnLogin = document.getElementById("btnLogin");
const btnRegister = document.getElementById("btnRegister");
const btnLogout = document.getElementById("btnLogout");
const areaUsuario = document.getElementById("areaUsuario");
const authButtons = document.getElementById("authButtons");

async function atualizarHeader() {
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    let nome = user.user_metadata?.nome;
    if (!nome) nome = user.email?.split("@")[0] || "Usuário";

    if (userGreeting) userGreeting.textContent = `Olá, ${nome}`;
    if (areaUsuario) areaUsuario.style.display = "flex";
    if (authButtons) authButtons.style.display = "none";

  } else {
    if (areaUsuario) areaUsuario.style.display = "none";
    if (authButtons) authButtons.style.display = "flex";
    if (userGreeting) userGreeting.textContent = "";
  }
}

btnLogout.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});

atualizarHeader();

supabase.auth.onAuthStateChange(() => {
  atualizarHeader();
});
