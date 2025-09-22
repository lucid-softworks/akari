export type CrashSeverity = 'fatal' | 'error' | 'warning' | 'info';

export type CrashReportCause = {
  message: string;
  name?: string;
  stack?: string;
};

export type CrashReport = {
  id: string;
  timestamp: string;
  message: string;
  name?: string;
  stack?: string;
  severity: CrashSeverity;
  isFatal: boolean;
  environment?: string;
  appVersion?: string;
  releaseChannel?: string;
  applicationId?: string;
  metadata?: Record<string, unknown>;
  tags?: Record<string, string>;
  chain?: CrashReportCause[];
  aggregate?: CrashReportCause[];
};

export type CrashReportContext = {
  severity?: CrashSeverity;
  metadata?: Record<string, unknown>;
  tags?: Record<string, string>;
  isFatal?: boolean;
};

export type CrashReportTransform = (
  report: CrashReport,
) => CrashReport | null | Promise<CrashReport | null>;

export type CrashReporterClient = {
  ingest: (
    dataset: string,
    events: unknown[],
    options?: Record<string, unknown>,
  ) => Promise<unknown>;
  flush: () => Promise<unknown>;
};

export type CrashReporterOptions = {
  dataset: string;
  token?: string;
  client?: CrashReporterClient;
  environment?: string;
  appVersion?: string;
  releaseChannel?: string;
  applicationId?: string;
  metadata?: Record<string, unknown>;
  flushOnCapture?: boolean;
  beforeSend?: CrashReportTransform;
  onError?: (error: unknown) => void;
};
