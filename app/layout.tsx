import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Predibol",
  description: "Predibol app with Next.js, Supabase, and i18n",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
