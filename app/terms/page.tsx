import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-semibold text-emerald-700">← ScholarFlow</Link>
        <h1 className="mt-6 text-3xl font-bold text-slate-900">Terms of Use</h1>
        <p className="mt-2 text-sm text-amber-700">Draft product terms — obtain legal review before a public production launch.</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600">
          <section><h2 className="font-bold text-slate-900">Using ScholarFlow</h2><p>Use the service lawfully, keep your account secure, and do not upload material you lack permission to use. Academic outputs and AI responses can contain errors and must be verified against official university sources.</p></section>
          <section><h2 className="font-bold text-slate-900">Your Content</h2><p>You retain ownership of your notes and course material. You grant ScholarFlow only the limited permission needed to store, process, and display that content to provide the service.</p></section>
          <section><h2 className="font-bold text-slate-900">Access</h2><p>ScholarFlow currently provides one feature set without separate feature tiers. Access policies may change in a future release with advance notice.</p></section>
          <section><h2 className="font-bold text-slate-900">Availability</h2><p>The service is provided without a guarantee of uninterrupted availability. ScholarFlow is not an official university system and does not replace academic advising.</p></section>
        </div>
      </article>
    </main>
  )
}
