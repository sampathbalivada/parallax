import Link from "next/link";
import { allMovies } from "@/lib/data/studio-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default function CompareIndexPage() {
  const movies = allMovies();

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="mb-12 text-center">
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm mb-4 inline-block">
          &larr; Back to Home
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">Compare Segments</h1>
        <p className="text-slate-400 mt-2">Choose a project to compare personalized cuts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {movies.map((movie) => (
          <Card key={movie.id} className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-xl text-slate-100">{movie.title}</CardTitle>
              <CardDescription className="text-slate-400">
                Duration: {movie.durationSeconds}s · {movie.status}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300 mb-6 line-clamp-3">
                {movie.description || "No description yet."}
              </p>
              <Link href={`/compare/${movie.id}`} className={buttonVariants({ className: "w-full rounded" })}>
                Compare this project
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
