export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl p-6 text-center space-y-3">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-gray-600">The page you are looking for doesn’t exist.</p>
      <a href="/" className="inline-block mt-2 underline">
        Go home
      </a>
    </main>
  );
}


