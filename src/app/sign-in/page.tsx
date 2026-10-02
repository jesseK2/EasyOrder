"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleAlert, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/lib/supabase";

export default function SignInPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setIsSignedIn(Boolean(data.session)))
      .catch(() => setError("We couldn't check your account. Please reload the page."));
  }, []);

  async function signIn() {
    if (!supabase) {
      setError("Google sign-in isn't connected yet. The shop owner needs to add the Supabase project URL and public key, then enable Google under Supabase Authentication → Providers.");
      return;
    }
    setIsStarting(true);
    setError("");
    const requestedPath = new URLSearchParams(window.location.search).get("next");
    const nextPath = requestedPath?.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/checkout";
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}${nextPath}` },
      });
      if (authError) setError(`Google sign-in couldn't start: ${authError.message}`);
    } catch {
      setError("We couldn't connect to Google sign-in. Please try again in a moment.");
    } finally {
      setIsStarting(false);
    }
  }

  return <main className="signin-page">
    <header className="signin-header"><Link className="brand-link" href="/" aria-label="EasyOrder home"><BrandLogo /></Link><Link href="/" className="back-link"><ArrowLeft size={15} /> Back to shop</Link></header>
    <div className="signin-layout">
      <section className="signin-intro">
        <p className="eyebrow">Your EasyOrder account</p>
        <h1>Good things,<br /><em>one click away.</em></h1>
        <p className="signin-description">Sign in to keep your bag close and pick up checkout right where you left it.</p>
        {isSignedIn ? <Link className="button-dark" href="/checkout">Continue to checkout <ArrowRight size={16} /></Link> : <button type="button" className="signin-google-button" onClick={signIn} disabled={isStarting}><span className="google-g" aria-hidden="true">G</span>{isStarting ? "Connecting to Google…" : "Continue with Google"}<ArrowRight size={16} /></button>}
        {error && <p className="signin-error" role="alert"><CircleAlert size={16} />{error}</p>}
        {!supabase && <p className="signin-setup-note"><LockKeyhole size={14} /> Sign-in setup is not complete for this shop yet.</p>}
      </section>
      <section className="signin-steps" aria-labelledby="signin-steps-title">
        <p className="eyebrow">Quick and secure</p>
        <h2 id="signin-steps-title">Sign in, step by step.</h2>
        <ol>
          <li><span>01</span><div><b>Choose Google</b><p>Press “Continue with Google” and select the Google account you want to use.</p></div><Check size={16} /></li>
          <li><span>02</span><div><b>Approve the sign-in</b><p>If Google asks, review the request and allow EasyOrder to confirm your account.</p></div><Check size={16} /></li>
          <li><span>03</span><div><b>Return to your bag</b><p>We’ll bring you back to checkout, where you can add delivery details and review your order.</p></div><Check size={16} /></li>
        </ol>
        <p className="signin-privacy"><LockKeyhole size={13} /> Your password stays with Google. EasyOrder receives your basic account details.</p>
      </section>
    </div>
    <footer className="signin-footer"><span>© 2026 EASYORDER</span><span>Good everyday things, made easy.</span></footer>
  </main>;
}