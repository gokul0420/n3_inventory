// Supabase Edge Function: delete-user
// Fully deletes a user — the Auth account (which cascades to their profile) plus
// any pending invite — so the email is freed for reuse. Admin-only.
//
// Deploy:  name it exactly "delete-user" and paste this code.
// No secrets to set: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY
// are auto-injected into every Edge Function by Supabase.

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    // 1. Identify the caller from their JWT.
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: me }, error: ue } = await caller.auth.getUser();
    if (ue || !me) return json({ error: "Not authenticated" }, 401);

    // 2. Service-role client (bypasses RLS) — verify the caller is an admin.
    const admin = createClient(url, service);
    const { data: meProfile } = await admin.from("profiles").select("role").eq("id", me.id).single();
    if (meProfile?.role !== "admin") return json({ error: "Only admins can delete users" }, 403);

    const { userId, email } = await req.json();
    if (!userId && !email) return json({ error: "userId or email required" }, 400);

    // 3. Don't allow deleting yourself.
    if (userId && userId === me.id) return json({ error: "You cannot delete your own account" }, 400);

    // 4. Remove any pending invite for the email.
    if (email) await admin.from("pending_users").delete().eq("email", email);

    // 5. Delete the Auth account (cascades to public.profiles via FK).
    if (userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error && !/not found/i.test(error.message)) return json({ error: error.message }, 502);
    } else if (email) {
      // No userId given — find the auth user by email, then delete.
      const { data: list } = await admin.auth.admin.listUsers();
      const found = list?.users?.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
      if (found) await admin.auth.admin.deleteUser(found.id);
      await admin.from("profiles").delete().eq("email", email);
    }

    return json({ success: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
