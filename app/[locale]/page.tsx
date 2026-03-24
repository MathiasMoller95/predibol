import { getTranslations, setRequestLocale } from "next-intl/server";
import WelcomeTitle from "@/components/welcome-title";

type Props = {
  params: { locale: string };
};

export default async function LocaleHomePage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);

  const t = await getTranslations("Home");

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <WelcomeTitle text={t("welcome")} />
    </main>
  );
}
