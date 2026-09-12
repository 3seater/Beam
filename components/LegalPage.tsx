import { Footer } from '@/components/Footer';

interface LegalSection {
  heading: string;
  body: React.ReactNode;
}

interface LegalPageProps {
  title: string;
  subtitle: string;
  effectiveDate: string;
  sections: LegalSection[];
}

export function LegalPage({ title, subtitle, effectiveDate, sections }: LegalPageProps) {
  return (
    <>
      <main className="min-h-screen pt-32 pb-20 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="mb-12">
            <p className="text-xs font-medium text-white/35 tracking-widest uppercase mb-3">Legal</p>
            <h1 className="text-3xl font-semibold text-white mb-3">{title}</h1>
            <p className="text-base text-white/50">{subtitle}</p>
            <p className="text-sm text-white/30 mt-4">Effective date: {effectiveDate}</p>
          </div>

          <div className="h-px bg-white/10 mb-12" />

          {/* Sections */}
          <div className="flex flex-col gap-10">
            {sections.map((section, i) => (
              <section key={i}>
                <h2 className="text-base font-semibold text-white mb-3">{section.heading}</h2>
                <div className="text-sm text-white/60 leading-relaxed space-y-3">
                  {section.body}
                </div>
              </section>
            ))}
          </div>

          {/* Contact footer */}
          <div className="mt-16 h-px bg-white/10 mb-10" />
          <p className="text-sm text-white/35">
            Questions about this document? Reach us at{' '}
            <a href="mailto:hello@beam.finance" className="text-white/60 hover:text-white transition-colors underline underline-offset-2">
              hello@beam.finance
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
