"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProjectCreateForm() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/projects", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Project create failed");
      }

      router.push(`/director/movies/${data.movie.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Project create failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Project Title</Label>
        <Input id="title" name="title" required className="bg-zinc-950 border-zinc-700" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" className="bg-zinc-950 border-zinc-700" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="video">Canonical Video</Label>
        <Input id="video" name="video" type="file" accept="video/*" required className="bg-zinc-950 border-zinc-700 file:text-slate-200" />
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <Button type="submit" disabled={isSaving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
        <Upload className="size-4" />
        {isSaving ? "Creating..." : "Create Project"}
      </Button>
    </form>
  );
}
