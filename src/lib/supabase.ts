import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  image_url: string;
  badge: string | null;
};

export type CartLine = {
  product: Product;
  quantity: number;
};

export const CART_STORAGE_KEY = "easyorder-cart";
const PREVIOUS_CART_STORAGE_KEY = "fieldwork-cart";

export function readStoredCart(): CartLine[] {
  try {
    const current = localStorage.getItem(CART_STORAGE_KEY);
    const stored = current ?? localStorage.getItem(PREVIOUS_CART_STORAGE_KEY);
    if (!stored) return [];
    if (!current) {
      localStorage.setItem(CART_STORAGE_KEY, stored);
      localStorage.removeItem(PREVIOUS_CART_STORAGE_KEY);
    }
    return JSON.parse(stored) as CartLine[];
  } catch {
    return [];
  }
}

export function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}