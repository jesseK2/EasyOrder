import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const { orderId } = await request.json().catch(() => ({}));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !orderId || !supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Missing authorization or server configuration." }, { status: 400 });
  }

  const authClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user?.email) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: order, error } = await admin.from("orders")
    .select("id,total_cents,customer_name,order_items(product_name,quantity,unit_price_cents)")
    .eq("id", orderId).eq("user_id", user.id).single();
  if (error || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const { MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM, MAILGUN_REGION = "api" } = process.env;
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN || !MAILGUN_FROM) {
    return NextResponse.json({ sent: false, error: "Mailgun is not configured." }, { status: 503 });
  }
  const items = (order.order_items as { product_name: string; quantity: number; unit_price_cents: number }[])
    .map((item) => `• ${item.quantity} × ${item.product_name} — $${(item.quantity * item.unit_price_cents / 100).toFixed(2)}`)
    .join("\n");
  const body = new URLSearchParams({
    from: MAILGUN_FROM,
    to: user.email,
    subject: `Your EasyOrder order ${order.id.slice(0, 8)}`,
    text: `Hi ${order.customer_name},\n\nThank you for shopping with EasyOrder. Your order is confirmed.\n\n${items}\n\nTotal: $${(order.total_cents / 100).toFixed(2)}\n\nWe hope these everyday finds make your day a little easier.`,
  });
  const mailgunResponse = await fetch(`https://${MAILGUN_REGION}.mailgun.org/v3/${MAILGUN_DOMAIN}/messages`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!mailgunResponse.ok) return NextResponse.json({ sent: false, error: "Mailgun could not send the confirmation." }, { status: 502 });
  return NextResponse.json({ sent: true });
}