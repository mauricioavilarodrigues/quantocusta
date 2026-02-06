import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "URL_DO_SUPABASE",
  "PUBLIC_ANON_KEY"
);

export async function loginWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: "google"
  });
}

export async function logout() {
  await supabase.auth.signOut();
}

export function onAuthStateChange(callback) {
  supabase.auth.onAuthStateChange((event, session) => {
    callback(session);
  });
}
