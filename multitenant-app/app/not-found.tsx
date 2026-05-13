export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-fp-bg">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-fp-text mb-4">404</h1>
        <p className="text-fp-text-light text-lg mb-2">Page not found.</p>
        <p className="text-fp-text-light text-sm">
          If you&apos;re looking for a rental listing, check the URL or contact the property manager.
        </p>
      </div>
    </div>
  )
}
