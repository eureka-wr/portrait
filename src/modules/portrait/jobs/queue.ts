export type PortraitJobEnvelope<T = Record<string, unknown>> = {
  id: string;
  type: "generate" | "refine" | "export" | "retention_cleanup";
  payload: T;
  createdAt: string;
  attempt: number;
  maxAttempts: number;
};

export interface PortraitJobQueue {
  enqueue<T>(job: PortraitJobEnvelope<T>): Promise<void>;
  next(): Promise<PortraitJobEnvelope | null>;
  acknowledge(jobId: string): Promise<void>;
  fail(jobId: string, reason: string): Promise<void>;
}

/**
 * Local-only queue. Production state is still persisted in generation_jobs so
 * browser refreshes never lose task status. Replace through this interface with
 * BullMQ, Vercel Workflow, Cloudflare Queues, or another managed worker.
 */
export class InMemoryPortraitJobQueue implements PortraitJobQueue {
  private jobs: PortraitJobEnvelope[] = [];

  async enqueue<T>(job: PortraitJobEnvelope<T>) {
    if (!this.jobs.some((item) => item.id === job.id)) {
      this.jobs.push(job as PortraitJobEnvelope);
    }
  }

  async next() {
    return this.jobs[0] ?? null;
  }

  async acknowledge(jobId: string) {
    this.jobs = this.jobs.filter((job) => job.id !== jobId);
  }

  async fail(jobId: string) {
    const job = this.jobs.find((item) => item.id === jobId);
    if (!job) return;
    job.attempt += 1;
    if (job.attempt >= job.maxAttempts) {
      await this.acknowledge(jobId);
    }
  }
}

