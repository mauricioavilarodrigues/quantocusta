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
    let nome = user.user_metadata?.full_name
            || user.user_metadata?.name
            || user.email?.split("@")[0]
            || "Usuário";

    userGreeting.textContent = `Olá, ${nome}`;

    areaUsuario.style.display = "flex";
    authButtons.style.display = "none";

  } else {
    areaUsuario.style.display = "none";
    authButtons.style.display = "flex";
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
