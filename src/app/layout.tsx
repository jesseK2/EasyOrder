import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyOrder | Lovely things, made easy",
  description: "Little comforts, useful favorites, and everyday finds, picked with care and easy to order.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}