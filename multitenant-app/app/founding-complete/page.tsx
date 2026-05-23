export default function FoundingCompletePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="text-4xl mb-4">✓</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">You&apos;re in.</h1>
        <p className="text-gray-600 leading-relaxed">
          Your card is saved. You won&apos;t be charged anything until your first tenant
          is fully processed through your portal.
        </p>
        <p className="text-gray-600 mt-3 leading-relaxed">
          Check your email — there&apos;s a setup link waiting for you to get your portal ready.
        </p>
        <p className="text-sm text-gray-400 mt-6">
          Questions? Reply to the email or reach out directly.
        </p>
      </div>
    </div>
  )
}
