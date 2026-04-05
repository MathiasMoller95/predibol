import Link from "next/link";

type SectionKey = string;

type Props = {
  homeHref: string;
  title: string;
  lawyerNote: string;
  sectionKeys: readonly SectionKey[];
  tSection: (key: string, sub: "title" | "content") => string;
  lastUpdated: string;
  backLabel: string;
};

function Paragraphs({ text }: { text: string }) {
  const parts = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className="space-y-4 text-pretty leading-relaxed text-slate-300">
      {parts.map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </div>
  );
}

export function LegalDocument({
  homeHref,
  title,
  lawyerNote,
  sectionKeys,
  tSection,
  lastUpdated,
  backLabel,
}: Props) {
  return (
    <div className="min-h-screen bg-[#0A0E14] text-white">
      <div className="mx-auto max-w-[700px] px-4 py-10 pb-16 sm:py-14">
        <Link
          href={homeHref}
          className="inline-block text-xl font-bold tracking-tight text-emerald-400 transition hover:text-emerald-300"
        >
          <span className="text-emerald-400">Predi</span>
          <span className="text-white">bol</span>
        </Link>

        <h1 className="mt-8 text-3xl font-bold text-white sm:text-4xl">{title}</h1>

        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm leading-relaxed text-amber-100/90">
          {lawyerNote}
        </p>

        <div className="mt-12 space-y-12">
          {sectionKeys.map((key) => (
            <section key={key}>
              <h2 className="text-lg font-semibold text-white sm:text-xl">{tSection(key, "title")}</h2>
              <div className="mt-4">
                <Paragraphs text={tSection(key, "content")} />
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 text-sm text-slate-500">{lastUpdated}</p>

        <p className="mt-10">
          <Link href={homeHref} className="text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:underline">
            {backLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
