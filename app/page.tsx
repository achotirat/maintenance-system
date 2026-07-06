import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Preventive Maintenance System</h1>
      <p className="mt-4 text-lg text-gray-600">Multi-tenant SaaS for property maintenance management</p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-700"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-gray-900 px-4 py-2 text-gray-900 hover:bg-gray-100"
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
