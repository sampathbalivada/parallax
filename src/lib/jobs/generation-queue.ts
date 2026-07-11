import { GenerationJob } from "../types";

// In-memory job store for the hackathon
const jobStore: Map<string, GenerationJob> = new Map();

export const GenerationQueue = {
  enqueue: async (job: GenerationJob): Promise<void> => {
    jobStore.set(job.id, job);
    // In a real app, this would trigger a background worker. 
    // We will simulate the worker polling this in our route handlers.
  },

  getJob: async (jobId: string): Promise<GenerationJob | null> => {
    return jobStore.get(jobId) || null;
  },

  getAllJobs: async (): Promise<GenerationJob[]> => {
    return Array.from(jobStore.values());
  },

  updateJob: async (jobId: string, updates: Partial<GenerationJob>): Promise<GenerationJob | null> => {
    const job = jobStore.get(jobId);
    if (!job) return null;
    
    const updatedJob = { ...job, ...updates };
    jobStore.set(jobId, updatedJob);
    return updatedJob;
  },

  clear: async (): Promise<void> => {
    jobStore.clear();
  }
};
