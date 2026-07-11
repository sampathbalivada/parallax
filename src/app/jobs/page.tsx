import Link from "next/link";
import { GenerationQueue } from "@/lib/jobs/generation-queue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Force dynamic rendering so jobs are always fresh when reloading the page
export const dynamic = 'force-dynamic';

export default async function JobsPage() {
  const jobs = await GenerationQueue.getAllJobs();

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm mb-2 inline-block">
            &larr; Back to Home
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Generation Jobs</h1>
          <p className="text-slate-400 mt-1">Monitor adaptive segment generation tasks.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-zinc-900 border-zinc-700">
            Total Jobs: {jobs.length}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {jobs.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl text-slate-500">
            No jobs in the queue.
          </div>
        ) : (
          jobs.map(job => (
            <Card key={job.id} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="py-4">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Job: {job.id}</span>
                  <Badge className={
                    job.status === 'READY' ? 'bg-green-600' :
                    job.status === 'FAILED' ? 'bg-red-600' :
                    'bg-amber-600'
                  }>
                    {job.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-300 flex flex-col gap-2">
                <div className="flex gap-4">
                  <span className="w-24 text-slate-500">Slot ID:</span>
                  <span className="font-mono">{job.slotId}</span>
                </div>
                <div className="flex gap-4">
                  <span className="w-24 text-slate-500">Profile:</span>
                  <span className="font-mono">{job.profileId}</span>
                </div>
                <div className="flex gap-4">
                  <span className="w-24 text-slate-500">Cache Key:</span>
                  <span className="font-mono text-xs break-all">{job.cacheKey}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
