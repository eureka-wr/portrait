export type JobStatus =
  | "ready"
  | "generating"
  | "review"
  | "selected"
  | "delivering"
  | "delivered"
  | "failed";

export type CandidateStatus = "pending" | "approved" | "rejected" | "selected";

export type PortraitCandidate = {
  id: string;
  label: string;
  description: string;
  pathname: string;
  mimeType: "image/jpeg";
  status: CandidateStatus;
  portraitDNAId: string;
  portraitDNAVersion: string;
  engineVersion: string;
  compilerVersion: string;
  promptChecksum: string;
  reviewChecklist: {
    pose: Record<string, boolean>;
    gaze: Record<string, boolean>;
    presence: Record<string, boolean>;
    hair: Record<string, boolean>;
  };
  rejectionReasons: string[];
  createdAt: string;
};

export type PortraitJob = {
  id: string;
  orderNo: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  channel: string;
  notes: string;
  consentConfirmed: true;
  status: JobStatus;
  source: {
    pathname: string;
    originalName: string;
    mimeType: "image/jpeg";
    width: number;
    height: number;
    sizeBytes: number;
  };
  candidates: PortraitCandidate[];
  selectedCandidateId?: string;
  model?: string;
  promptHash?: string;
  engineVersion?: "2.0";
  delivery?: {
    pathname: string;
    createdAt: string;
    filename: string;
  };
  error?: string;
};

export type SafePortraitJob = Omit<PortraitJob, "source" | "candidates" | "delivery"> & {
  source: Omit<PortraitJob["source"], "pathname"> & {
    url: string;
  };
  candidates: Array<Omit<PortraitCandidate, "pathname"> & { url: string }>;
  delivery?: {
    createdAt: string;
    filename: string;
    url: string;
  };
};

export type SafePortraitJobSummary = Pick<
  PortraitJob,
  | "id"
  | "orderNo"
  | "createdAt"
  | "updatedAt"
  | "customerName"
  | "channel"
  | "status"
  | "error"
> & {
  candidateCount: number;
  approvedCount: number;
  hasSelection: boolean;
  deliveryReady: boolean;
};
