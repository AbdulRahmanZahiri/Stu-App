import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-semibold text-emerald-700">← ScholarFlow</Link>
        <h1 className="mt-6 text-3xl font-bold text-slate-900">Privacy Notice</h1>
        <p className="mt-2 text-sm text-amber-700">Draft privacy notice — obtain legal review before a public production launch.</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600">
          <section><h2 className="font-bold text-slate-900">Data We Process</h2><p>ScholarFlow stores account details, academic planning data, notes, uploaded files, course information, and usage needed to operate the product.</p></section>
          <section><h2 className="font-bold text-slate-900">Service Providers</h2><p>Supabase provides authentication and storage, and Groq processes AI requests. ScholarFlow does not currently process payment card information.</p></section>
          <section><h2 className="font-bold text-slate-900">Sharing</h2><p>Personal records are restricted by database access policies. Notes marked shared and messages posted in community rooms are visible to other signed-in users as indicated in the product.</p></section>
          <section><h2 className="font-bold text-slate-900">Your Choices</h2><p>You can update profile data, delete individual records, or permanently delete your account from Settings. Account deletion removes application records and owned uploads subject to provider retention and legal requirements.</p></section>
        </div>
      </article>
    </main>
  )
}
