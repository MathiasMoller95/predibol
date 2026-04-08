import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import RegisterSw from "@/components/register-sw";
import { routing } from "@/i18n/routing";

const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

type Props = {
  children: React.ReactNode;
  params: { locale: string };
};

export const metadata: Metadata = {
  appleWebApp: {
    capable: true,
    title: "Predibol",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e14",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-dark-900 text-slate-100 antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <RegisterSw />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
