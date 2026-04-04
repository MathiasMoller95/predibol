import LandingPage from "@/components/landing/landing-page";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

export async function generateMetadata({ params }: Props) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "LandingPage" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function LocaleHomePage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  return <LandingPage locale={locale} />;
}
