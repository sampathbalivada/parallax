import Link from "next/link";
import { seedMovie } from "@/lib/data/seed";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default function DirectorIndexPage() {
  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="mb-12">
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm mb-4 inline-block">
          &larr; Back to Home
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">Director Studio</h1>
        <p className="text-slate-400 mt-2">Manage your adaptive cinema projects.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-xl text-slate-100">{seedMovie.title}</CardTitle>
            <CardDescription className="text-slate-400">
              Duration: {seedMovie.durationSeconds}s
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-300 mb-6 line-clamp-3">
              {seedMovie.description}
            </p>
            <Link href={`/director/movies/${seedMovie.id}`} className={buttonVariants({ className: "w-full rounded" })}>
              Open Project
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
