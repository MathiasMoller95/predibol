import LandingPage from "@/components/landing/landing-page";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

type Props = {
  params: { locale: string };
};

export async function generateMetadata({ params }: Props) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "LandingPage" });

  const metaTitle = t("metaTitle");
  const metaDescription = t("metaDescription");
  const ogLocale = locale === "en" ? "en_US" : locale === "pt" ? "pt_BR" : "es_ES";

  const metadata: Metadata = {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url: "https://predibol.com",
      siteName: "Predibol",
      locale: ogLocale,
      type: "website",
      images: [{ url: "/api/og", width: 1200, height: 630, alt: metaTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
      images: ["/api/og"],
    },
  };

  return metadata;
}

export default async function LocaleHomePage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  return <LandingPage locale={locale} />;
}
