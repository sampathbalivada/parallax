import Link from "next/link";
import { allMovies } from "@/lib/data/studio-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ProjectCreateForm } from "./project-create-form";

export default function DirectorIndexPage() {
  const movies = allMovies();

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="mb-12">
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm mb-4 inline-block">
          &larr; Back to Home
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">Director Studio</h1>
        <p className="text-slate-400 mt-2">Manage your adaptive cinema projects.</p>
      </div>

      <section className="mb-10 border border-zinc-800 bg-zinc-900 p-5">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-100">New Project</h2>
          <p className="text-sm text-slate-400 mt-1">Upload a canonical video, then mark adaptive segments in the editor.</p>
        </div>
        <ProjectCreateForm />
      </section>

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
              <Link href={`/director/movies/${movie.id}`} className={buttonVariants({ className: "w-full rounded" })}>
                Open Project
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
