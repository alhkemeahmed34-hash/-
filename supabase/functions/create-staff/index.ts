import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Server configuration missing" }, 500);
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: callerData, error: callerError } = await admin.auth.getUser(authHeader.slice(7));
  if (callerError || !callerData.user) return json({ error: "Invalid session" }, 401);
  if ((callerData.user.app_metadata ?? {}).role !== "owner") return json({ error: "Only the owner can create staff accounts" }, 403);

  let body: { email?: string; password?: string; full_name?: string; permissions?: string[] };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const fullName = body.full_name?.trim() ?? "";
  const allowed = new Set(["bookings.read", "bookings.update", "services.read", "services.manage", "customers.read", "reports.read"]);
  const permissions = Array.isArray(body.permissions) ? [...new Set(body.permissions.filter((p) => allowed.has(p)))] : [];
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "A valid email is required" }, 400);
  if (password.length < 10) return json({ error: "Password must be at least 10 characters" }, 400);
  if (!fullName) return json({ error: "Staff name is required" }, 400);

  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role: "staff", permissions },
  });
  if (error) return json({ error: error.message }, 400);
  const { error: profileError } = await admin.from("profiles").upsert({ id: data.user.id, full_name: fullName });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return json({ error: "Could not create staff profile" }, 500);
  }
  return json({ user_id: data.user.id, email: data.user.email, role: "staff", permissions }, 201);
});