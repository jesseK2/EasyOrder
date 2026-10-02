"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Heart, Leaf, Menu, PackageCheck, Plus, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { CART_STORAGE_KEY, CartLine, formatPrice, Product, readStoredCart, supabase } from "@/lib/supabase";

const demoProducts: Product[] = [
  { id: "demo-1", slug: "daily-ceramic-cup", name: "Daily ceramic cup", description: "Hand-thrown stoneware · 320 ml", category: "Table", price_cents: 2800, image_url: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1000&q=85", badge: "BESTSELLER" },
  { id: "demo-2", slug: "linen-market-tote", name: "Linen market tote", description: "Washed European linen · oat", category: "Carry", price_cents: 4200, image_url: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=85", badge: "JUST IN" },
  { id: "demo-3", slug: "morning-pour-over", name: "Morning pour-over", description: "Glazed porcelain · warm white", category: "Ritual", price_cents: 3600, image_url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=85", badge: null },
  { id: "demo-4", slug: "field-notes-set", name: "Field notes set", description: "Three pocket notebooks · recycled", category: "Paper", price_cents: 1800, image_url: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=1000&q=85", badge: null },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setCart(readStoredCart());
    const client = supabase;
    if (!client) return;
    void client.from("products").select("id,slug,name,description,category,price_cents,image_url,badge").eq("active", true).order("sort_order")
      .then(({ data }) => { if (data?.length) setProducts(data as Product[]); });
    void client.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      setUserEmail(user?.email ?? null);
      if (!user) return;
      const { data: saved } = await client.from("cart_items").select("quantity,product:products(id,slug,name,description,category,price_cents,image_url,badge)").eq("user_id", user.id);
      if (saved?.length) {
        const restored = saved.flatMap((row) => row.product ? [{ product: row.product as unknown as Product, quantity: row.quantity }] : []);
        setCart(restored);
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(restored));
      } else {
        const local = readStoredCart().filter((line) => !line.product.id.startsWith("demo-"));
        if (local.length) {
          await client.from("cart_items").upsert(local.map((line) => ({ user_id: user.id, product_id: line.product.id, quantity: line.quantity })));
          setCart(local);
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(local));
        }
      }
    });
  }, []);

  function persistCart(next: CartLine[]) {
    setCart(next);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
    const client = supabase;
    if (!client) return;
    void client.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) return;
      await client.from("cart_items").delete().eq("user_id", user.id);
      const persisted = next.filter((line) => !line.product.id.startsWith("demo-"));
      if (persisted.length) await client.from("cart_items").upsert(persisted.map((line) => ({ user_id: user.id, product_id: line.product.id, quantity: line.quantity })));
    });
  }

  function addToCart(product: Product) {
    const existing = cart.find((line) => line.product.id === product.id);
    persistCart(existing
      ? cart.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line)
      : [...cart, { product, quantity: 1 }]);
    setNotice(`${product.name} added to your bag`);
    window.setTimeout(() => setNotice(""), 2400);
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setUserEmail(null);
  }

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <main>
      <div className="announcement"><Leaf size={13} strokeWidth={1.8} /> Lovely everyday things, made easy. <span>Complimentary shipping over $75</span></div>
      <header className="site-header">
        <button className="icon-button menu-trigger" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        <Link className="brand-link" href="/" aria-label="EasyOrder home"><BrandLogo /></Link>
        <nav className={menuOpen ? "main-nav nav-open" : "main-nav"} aria-label="Main navigation">
          <a href="#shop" onClick={() => setMenuOpen(false)}>Shop all</a><a href="#story" onClick={() => setMenuOpen(false)}>Our approach</a><a href="#newsletter" onClick={() => setMenuOpen(false)}>Journal</a>
        </nav>
        <div className="header-actions">
          {userEmail ? <button className="account-link" onClick={signOut} title={`Signed in as ${userEmail}`}>Sign out</button> : <Link className="account-link" href="/sign-in">Sign in</Link>}
          <Link href="/checkout" className="bag-link" aria-label={`Shopping bag, ${itemCount} items`}><ShoppingBag size={18} strokeWidth={1.7} /><span>Bag</span><b>{itemCount}</b></Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line" />Good finds, no fuss</p><h1>Good things.<br />Easy days.<br /><em>Made easy.</em></h1><p className="hero-sub">Little comforts, useful favorites, and everyday finds, picked with care and just a click away.</p><a className="button-dark" href="#shop">Shop the good stuff <ArrowRight size={16} /></a><div className="hero-foot"><span>01 — 04</span><span className="hero-scroll">CURATED FOR EVERYDAY <ArrowDown size={13} /></span></div></div>
        <div className="hero-image"><Image src="https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1600&q=90" alt="Sunlit everyday objects on a quiet table" fill priority sizes="(max-width: 760px) 100vw, 58vw" unoptimized /><span className="image-caption">Small things, good living <ArrowUpRight size={13} /></span><span className="image-index">NO. 01 / EVERYDAY FINDS</span><div className="hero-order-note"><PackageCheck size={20} strokeWidth={1.5} /><span><b>Picked with care</b><small>Easy to love, easy to order.</small></span></div></div>
        <span className="hero-stamp">GOOD<br />FINDS<br /><i>AHEAD</i></span>
      </section>

      <section className="ticker" aria-label="Our values"><div>GOOD THINGS, MADE EASY <span>✳</span> A LITTLE LOVELIER EVERYDAY <span>✳</span> PICKED WITH CARE, ALWAYS <span>✳</span> GOOD THINGS, MADE EASY <span>✳</span> A LITTLE LOVELIER EVERYDAY <span>✳</span></div></section>

      <section id="shop" className="shop-section">
        <div className="section-heading"><div><p className="eyebrow">The EasyOrder edit</p><h2>Everyday favorites, <em>found.</em></h2></div><a className="text-link" href="#shop">Shop all finds <ArrowRight size={15} /></a></div>
        <div className="category-row"><span>01 / THE EVERYDAY EDIT</span><div><button className="category-active">All objects</button><button>Table</button><button>Ritual</button><button>Carry</button><button>Paper</button></div></div>
        <div className="product-grid">
          {products.map((product, index) => <article className="product-card" key={product.id}>
            <div className={`product-photo product-photo-${index % 4}`}><Image src={product.image_url} alt={product.name} fill sizes="(max-width: 700px) 50vw, 25vw" unoptimized /><span className="product-category">{product.category}</span>{product.badge && <span className="product-badge">{product.badge}</span>}<button className="quick-add" onClick={() => addToCart(product)} aria-label={`Add ${product.name} to bag`}><Plus size={18} /></button></div>
            <div className="product-details"><div><h3>{product.name}</h3><p>{product.description}</p></div><span>{formatPrice(product.price_cents)}</span></div>
          </article>)}
        </div>
        {!supabase && <p className="setup-note">Preview catalog shown. Connect Supabase to load your live inventory and enable checkout.</p>}
      </section>

      <section id="story" className="manifesto"><div className="manifesto-mark"><Heart size={22} strokeWidth={1.3} /></div><p className="eyebrow">A little more intentional</p><h2>Fewer things.<br /><em>More feeling.</em></h2><p>We partner with independent makers to bring useful, enduring objects into your everyday. Nothing extra. Nothing in a hurry.</p><a href="#shop" className="text-link">A note on how we make things <ArrowUpRight size={15} /></a><span className="manifesto-number">EO—001</span></section>

      <section id="newsletter" className="newsletter"><div><p className="eyebrow">A good note, now and then</p><h2>Keep in <em>good company.</em></h2></div><form onSubmit={(event) => { event.preventDefault(); setNotice("Thanks for being here. Newsletter signup will be available soon."); }}><label htmlFor="newsletter-email">Your email address</label><div className="email-field"><input id="newsletter-email" type="email" placeholder="you@example.com" required /><button aria-label="Join newsletter"><ArrowRight size={18} /></button></div></form></section>
      <footer className="site-footer"><Link className="brand-link" href="/" aria-label="EasyOrder home"><BrandLogo /></Link><span>Good everyday things, made easy.</span><span>© 2026 EASYORDER</span></footer>
      {notice && <div className="toast" role="status"><Check size={16} />{notice}<button aria-label="Dismiss" onClick={() => setNotice("")}><X size={15} /></button></div>}
    </main>
  );
}