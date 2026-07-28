export interface GenerationOrchestrator {
  createJob(input: {
    orderId: string;
    requestedCount: number;
    providerName: string;
  }): Promise<{ id: string }>;
  runJob(jobId: string): Promise<void>;
  retryJob(jobId: string): Promise<void>;
  retryCandidate(candidateId: string): Promise<{ id: string }>;
  cancelJob(jobId: string): Promise<void>;
}

/**
 * The route-level orchestrator uses the same persisted state machine today.
 * This port keeps the API boundary stable when execution moves to a worker.
 */
export const GENERATION_JOB_STAGES = [
  "created",
  "queued",
  "analyzing_source",
  "compiling_prompt",
  "calling_provider",
  "processing_assets",
  "quality_checking",
  "awaiting_review",
  "completed",
  "partially_completed",
  "failed",
  "cancelled",
] as const;

