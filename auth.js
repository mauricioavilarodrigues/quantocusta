import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// 🔹 COLE AQUI OS DADOS DO SEU PROJETO SUPABASE
const supabaseUrl = "https://SEU-PROJETO.supabase.co";
const supabaseKey = "SUA_ANON_PUBLIC_KEY";

// 🔹 CLIENTE SUPABASE
export const supabase = createClient(supabaseUrl, supabaseKey);

// 🔹 LOGIN COM GOOGLE
export async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/index.html"
    }
  });

  if (error) {
    alert("Erro no login: " + error.message);
  }
}
