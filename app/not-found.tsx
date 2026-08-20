import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-2xl border border-border bg-white p-10 text-center shadow-sm">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted">
        The page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
