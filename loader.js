import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

window.supabase = { createClient };

const script = document.createElement("script");
script.src = "app.js?v=4.3";
script.defer = true;
script.onerror = () => {
  const msg = document.getElementById("authmsg");
  if (msg) msg.textContent = "Technischer Fehler: app.js konnte nicht geladen werden.";
};
document.body.appendChild(script);
