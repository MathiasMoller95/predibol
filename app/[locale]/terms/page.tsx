import { LegalDocument } from "@/components/legal/legal-document";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: { locale: string };
};

const SECTION_KEYS = [
  "whatPredibolIs",
  "accounts",
  "groups",
  "acceptableUse",
  "intellectualProperty",
  "limitationOfLiability",
  "governingLaw",
  "contact",
] as const;

export async function generateMetadata({ params }: Props) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "Terms" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  const t = await getTranslations("Terms");
  const tCommon = await getTranslations("Common");

  return (
    <LegalDocument
      homeHref={`/${locale}`}
      title={t("title")}
      lawyerNote={t("lawyerNote")}
      sectionKeys={SECTION_KEYS}
      tSection={(key, sub) => t(`sections.${key}.${sub}`)}
      lastUpdated={t("lastUpdated")}
      backLabel={tCommon("legalBackHome")}
    />
  );
}
