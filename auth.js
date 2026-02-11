import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://abcd1234efgh.supabase.co"; // ⬅️ URL REAL
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // ⬅️ ANON KEY REAL

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/admin.html"
    }
  });

  if (error) {
    alert("Erro no login: " + error.message);
  }
}
