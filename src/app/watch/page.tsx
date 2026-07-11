import Link from "next/link";
import { seedProfiles, seedMovie } from "@/lib/data/seed";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function WatchIndexPage() {
  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="mb-12 text-center">
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm mb-4 inline-block">
          &larr; Back to Home
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">Who is watching?</h1>
        <p className="text-slate-400 mt-2">Select a viewer profile to generate a personalized cut.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {seedProfiles.map(profile => (
          <Card key={profile.id} className="bg-zinc-900 border-zinc-800 flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-100 flex items-center justify-between">
                {profile.displayName}
                <span className="text-3xl" title={profile.country}>
                  {profile.country === 'India' ? '🇮🇳' : profile.country === 'Japan' ? '🇯🇵' : '🇺🇸'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-2 text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 w-16">City</span>
                <span className="font-medium text-slate-200">{profile.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 w-16">Language</span>
                <span className="font-medium text-slate-200">{profile.languageLabel}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                 <Badge variant="outline" className="border-zinc-700">{profile.locale}</Badge>
                 {profile.culturalContext?.map(ctx => (
                   <Badge key={ctx} variant="secondary" className="bg-zinc-800 text-slate-400">{ctx}</Badge>
                 ))}
              </div>
            </CardContent>
            <CardFooter>
              <Link href={`/watch/${seedMovie.id}?profile=${profile.id}`} className={buttonVariants({ className: "w-full rounded" })}>
                Watch this cut
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Button variant="outline" className="border-zinc-700 text-slate-300 hover:bg-zinc-800" disabled>
          Create Custom Profile (Coming Soon)
        </Button>
      </div>
    </main>
  );
}
