import { supabase } from "./auth.js";

const userGreeting = document.getElementById("userGreeting");
const btnLogin = document.getElementById("btnLogin");
const btnRegister = document.getElementById("btnRegister");
const btnLogout = document.getElementById("btnLogout");

async function atualizarHeader() {
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    let nome = user.user_metadata?.full_name 
            || user.user_metadata?.name 
            || user.email?.split("@")[0]
            || "Usuário";

    if (userGreeting) {
      userGreeting.textContent = `Olá, ${nome}`;
      userGreeting.style.display = "inline-block";
    }

    if (btnLogin) btnLogin.style.display = "none";
    if (btnRegister) btnRegister.style.display = "none";
    if (btnLogout) btnLogout.style.display = "inline-block";

  } else {
    if (userGreeting) userGreeting.style.display = "none";
    if (btnLogin) btnLogin.style.display = "inline-block";
    if (btnRegister) btnRegister.style.display = "inline-block";
    if (btnLogout) btnLogout.style.display = "none";
  }
}

btnLogout?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});

atualizarHeader();

supabase.auth.onAuthStateChange(() => {
  atualizarHeader();
});
