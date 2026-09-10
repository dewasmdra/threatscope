import Link from "next/link";

export default function NotFound() {
  return (
    <div className="panel grid place-items-center px-6 py-20 text-center">
      <p className="font-mono text-sm text-neon">404</p>
      <h2 className="mt-2 text-xl font-semibold text-ink">No intel at this address</h2>
      <Link
        href="/"
        className="mt-5 rounded-xl border border-edge px-5 py-2.5 text-sm text-ink hover:border-neon/50 hover:text-neon"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
