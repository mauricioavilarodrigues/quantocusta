import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://qhkzyrtuvdifglxeupru.supabase.co";
const supabaseKey = "COLE_AQUI_SUA_ANON_PUBLIC_KEY";

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/index.html",
    },
  });

  if (error) alert("Erro no login: " + error.message);
}
