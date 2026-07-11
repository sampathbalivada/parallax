import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-black text-slate-50 relative overflow-hidden">
      {/* Decorative background elements removed for Netflix clean look, or keep a subtle red glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#E50914]/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="z-10 text-center max-w-3xl">
        <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-6 text-white uppercase" style={{ letterSpacing: '0.05em' }}>
          Project <span className="text-[#E50914]">Parallax</span>
        </h1>
        
        <p className="text-2xl text-white mb-2 font-medium">
          One story. A different world for every viewer.
        </p>
        <p className="text-lg text-slate-400 mb-12">
          Director-authored adaptive cinema.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Link href="/director" className={buttonVariants({ size: "lg", variant: "secondary", className: "rounded px-8 font-semibold text-lg min-w-[240px]" })}>
            Open Director Studio
          </Link>
          
          <Link href="/watch" className={buttonVariants({ size: "lg", className: "rounded px-8 font-semibold text-lg min-w-[240px]" })}>
            Watch Personalized Cut
          </Link>

          <Link href="/compare" className={buttonVariants({ size: "lg", variant: "outline", className: "rounded px-8 font-semibold text-lg min-w-[240px]" })}>
            Compare Cuts
          </Link>
        </div>
      </div>
    </main>
  );
}
