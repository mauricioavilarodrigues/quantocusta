import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://qhkzyrtuvdifglxeupru.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoa3p5cnR1dmRpZmdseGV1cHJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjEwMTAsImV4cCI6MjA4NTgzNzAxMH0.Uu-3T9r2QFI4P2KMQtfFnw-foR2bPPojx2VX04AaD8I";

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

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) alert("Erro ao sair: " + error.message);
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
