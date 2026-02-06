import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://SEU_PROJETO.supabase.co";
const supabaseKey = "SUA_PUBLIC_ANON_KEY";

export const supabase = createClient(supabaseUrl, supabaseKey);

// Login com Google
export async function loginComGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google"
  });

  if (error) {
    alert("Erro no login: " + error.message);
  }
}

// Logout
export async function logout() {
  await supabase.auth.signOut();
}

// Monitorar sessão
export function onAuthChange(callback) {
  supabase.auth.onAuthStateChange((event, session) => {
    callback(session);
  });
}
