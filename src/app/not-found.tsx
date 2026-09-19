import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="bg-gradient-to-br from-indigo-400 to-violet-500 bg-clip-text text-7xl font-extrabold text-transparent">
        404
      </p>
      <h1 className="mt-4 text-xl font-bold text-white">This page got lost in the plot</h1>
      <p className="mt-2 text-sm text-zinc-500">
        The book or page you're looking for doesn't exist (or isn't published).
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/dashboard" className="btn-primary">My dashboard</Link>
        <Link href="/store" className="btn-secondary">Browse store</Link>
      </div>
    </div>
  );
}
