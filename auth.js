import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://SEU_PROJETO.supabase.co";
const supabaseKey = "SUA_PUBLIC_ANON_KEY";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google"
  });

  if (error) {
    alert("Erro no login: " + error.message);
  }
}
