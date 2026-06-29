export default function LegalPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20 text-slate-700 dark:text-zinc-300">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Legal</h1>
      <div className="space-y-6 text-sm leading-relaxed">
        <p>
          LinkScout is an AI-powered job search tool. The job listings displayed are aggregated from
          publicly available sources. We do not guarantee the accuracy, completeness, or timeliness
          of any job listing.
        </p>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Data Usage</h2>
        <p>
          We process your search queries and uploaded CVs solely to provide matching results. Your
          data is stored securely via Supabase and is never sold to third parties.
        </p>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Disclaimer</h2>
        <p>
          LinkScout is provided &quot;as is&quot; without warranty of any kind. We are not
          responsible for any decisions made based on the information provided through this service.
        </p>
      </div>
    </main>
  );
}
