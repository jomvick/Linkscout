export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20 text-slate-700 dark:text-zinc-300">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Privacy Policy</h1>
      <div className="space-y-6 text-sm leading-relaxed">
        <p>
          Your privacy matters. This policy outlines how LinkScout collects, uses, and protects your
          personal data.
        </p>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">What We Collect</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Email address (if you sign up)</li>
          <li>Search queries and preferences</li>
          <li>CV documents you choose to upload</li>
          <li>Basic usage analytics</li>
        </ul>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">How We Use It</h2>
        <p>
          To power your job search: processing queries, analyzing CVs for skill matching, sending
          alerts you configure, and improving our service.
        </p>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Data Retention</h2>
        <p>
          You can delete your account and associated data at any time. CVs are retained only while
          your account is active and are deleted upon account removal.
        </p>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Contact</h2>
        <p>
          For questions about this policy, open an issue on our GitHub repository.
        </p>
      </div>
    </main>
  );
}
