import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

type Props = {
  params: { locale: string };
};

export default async function LocaleHomePage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  redirect(`/${locale}/login`);
}
