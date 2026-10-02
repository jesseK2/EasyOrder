"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, Minus, Plus, ShoppingBag } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { CART_STORAGE_KEY, CartLine, formatPrice, Product, readStoredCart, supabase } from "@/lib/supabase";

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setCart(readStoredCart());
    const client = supabase;
    if (!client) return;
    void client.auth.getSession().then(async ({ data }) => {
      const currentUser = data.session?.user;
      if (!currentUser) return;
      setUserId(currentUser.id);
      setEmail(currentUser.email || "");
      setName(currentUser.user_metadata?.full_name || "");
      const { data: saved } = await client.from("cart_items").select("quantity,product:products(id,slug,name,description,category,price_cents,image_url,badge)").eq("user_id", currentUser.id);
      if (saved?.length) {
        const restored = saved.flatMap((row) => row.product ? [{ product: row.product as unknown as Product, quantity: row.quantity }] : []);
        setCart(restored);
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(restored));
      }
    });
  }, []);

  const subtotal = cart.reduce((sum, line) => sum + line.product.price_cents * line.quantity, 0);
  const shipping = subtotal >= 7500 || subtotal === 0 ? 0 : 700;
  const total = subtotal + shipping;

  async function signIn() {
    if (!supabase) { setMessage("Supabase is not configured yet. Follow the setup guide to connect it."); return; }
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/checkout" } });
  }

  async function updateQuantity(productId: string, delta: number) {
    const next = cart.map((line) => line.product.id === productId ? { ...line, quantity: line.quantity + delta } : line).filter((line) => line.quantity > 0);
    setCart(next);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
    if (userId && supabase) {
      await supabase.from("cart_items").delete().eq("user_id", userId).eq("product_id", productId);
      const line = next.find((item) => item.product.id === productId);
      if (line) await supabase.from("cart_items").upsert({ user_id: userId, product_id: productId, quantity: line.quantity });
    }
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !userId) { setMessage("Sign in with Google before placing your order."); return; }
    if (!cart.length || cart.some((line) => line.product.id.startsWith("demo-"))) { setMessage("Your bag contains preview items. Connect the live catalog before checkout."); return; }
    setBusy(true);
    setMessage("");
    const { data: orderId, error } = await supabase.rpc("place_order", {
      p_customer_name: name,
      p_shipping_address: { address, city, postal_code: postalCode, country: "US" },
      p_items: cart.map((line) => ({ product_id: line.product.id, quantity: line.quantity })),
    });
    if (error || !orderId) {
      setBusy(false);
      setMessage(error?.message || "We couldn't place your order. Please try again.");
      return;
    }
    let confirmationSent = false;
    try {
      const { data: session } = await supabase.auth.getSession();
      const emailResponse = await fetch("/api/order-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session?.access_token || ""}` },
        body: JSON.stringify({ orderId }),
      });
      const emailResult = await emailResponse.json().catch(() => ({}));
      confirmationSent = Boolean(emailResult.sent);
    } catch {
      confirmationSent = false;
    }
    await supabase.from("cart_items").delete().eq("user_id", userId);
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem("fieldwork-cart");
    setCart([]);
    setCompleted(true);
    setMessage(confirmationSent ? "Your order is placed. A confirmation is on its way." : "Your order is placed. Email confirmation could not be sent; contact the shop with your order number.");
    setBusy(false);
  }

  if (completed) return <main className="checkout-shell"><Link className="brand-link" href="/" aria-label="EasyOrder home"><BrandLogo /></Link><section className="success-panel"><CheckCircle2 size={44} strokeWidth={1.3} /><p className="eyebrow">Order received</p><h1>Thank you for<br /><em>shopping small.</em></h1><p>{message}</p><Link className="button-dark" href="/">Back to the shop <ArrowRight size={16} /></Link></section></main>;

  return <main className="checkout-shell">
    <header className="checkout-header"><Link className="brand-link" href="/" aria-label="EasyOrder home"><BrandLogo /></Link><span><LockKeyhole size={14} /> Secure checkout</span></header>
    <div className="checkout-layout">
      <section className="checkout-form-wrap"><Link className="back-link" href="/"><ArrowLeft size={15} /> Back to shop</Link><p className="eyebrow">Your order, nearly there</p><h1>Check <em>out.</em></h1>
        {!userId && <div className="signin-callout"><div><b>Sign in to continue</b><p>Use Google to keep your order and cart connected to your account.</p></div><button type="button" className="google-button" onClick={signIn}>Continue with Google <ArrowRight size={15} /></button></div>}
        <form className="checkout-form" onSubmit={placeOrder}>
          <div className="form-section-title"><span>01</span><h2>Contact</h2></div>
          <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required readOnly={!!userId} placeholder="you@example.com" /></label>
          <div className="form-section-title"><span>02</span><h2>Delivery</h2></div>
          <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" /></label>
          <label>Street address<input value={address} onChange={(event) => setAddress(event.target.value)} required autoComplete="street-address" /></label>
          <div className="input-pair"><label>City<input value={city} onChange={(event) => setCity(event.target.value)} required autoComplete="address-level2" /></label><label>ZIP code<input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} required autoComplete="postal-code" /></label></div>
          {message && <p className="form-message" role="status">{message}</p>}
          <button className="place-order" type="submit" disabled={busy || !userId || !cart.length}>{busy ? "Placing your order…" : <>Place order <span>{formatPrice(total)}</span></>}</button>
          <p className="terms-note">By placing your order, you agree to our terms and privacy policy.</p>
        </form>
      </section>
      <aside className="order-summary"><div className="summary-title"><h2>Your bag</h2><span>{cart.reduce((sum, line) => sum + line.quantity, 0)} items</span></div>
        {!cart.length ? <div className="empty-bag"><ShoppingBag size={25} strokeWidth={1.3} /><p>Your bag is taking a quiet moment.</p><Link href="/">Find something good <ArrowRight size={14} /></Link></div> : cart.map((line) => <div className="summary-product" key={line.product.id}><div className="summary-thumb" style={{ backgroundImage: `url("${line.product.image_url}")` }} /><div className="summary-product-copy"><b>{line.product.name}</b><span>{formatPrice(line.product.price_cents)}</span><div className="quantity-control"><button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(line.product.id, -1)}><Minus size={12} /></button><span>{line.quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => updateQuantity(line.product.id, 1)}><Plus size={12} /></button></div></div></div>)}
        <div className="summary-totals"><div><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div><div><span>Shipping</span><span>{shipping === 0 ? "Complimentary" : formatPrice(shipping)}</span></div><div className="total-row"><b>Total</b><b>{formatPrice(total)}</b></div></div><p className="secure-note"><LockKeyhole size={13} /> Checkout securely with Google sign-in</p>
      </aside>
    </div>
    <footer className="checkout-footer"><span>© 2026 EASYORDER</span><span>Questions? Contact the shop.</span></footer>
  </main>;
}