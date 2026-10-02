import { Leaf, ShoppingBasket } from "lucide-react";

export function BrandLogo() {
  return (
    <span className="brand-lockup">
      <span className="brand-symbol" aria-hidden="true">
        <ShoppingBasket className="brand-basket" size={21} strokeWidth={1.8} />
        <Leaf className="brand-sprig" size={12} strokeWidth={2} />
      </span>
      <span className="brand-name">EasyOrder</span>
    </span>
  );
}