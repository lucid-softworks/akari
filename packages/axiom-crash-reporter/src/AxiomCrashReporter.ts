import { Axiom } from '@axiomhq/js';
import type {
  CrashReport,
  CrashReportCause,
  CrashReporterClient,
  CrashReporterOptions,
  CrashReportContext,
  CrashReportTransform,
  CrashSeverity,
} from './types';

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;

type ErrorUtilsShape = {
  setGlobalHandler?: (handler: GlobalErrorHandler) => void;
  getGlobalHandler?: () => GlobalErrorHandler;
};

type EventTargetShape = {
  addEventListener?: (type: string, listener: (event: unknown) => void) => void;
  removeEventListener?: (type: string, listener: (event: unknown) => void) => void;
  onunhandledrejection?: ((event: unknown) => void) | null;
};

type NormalizedError = {
  message: string;
  name?: string;
  stack?: string;
  chain?: CrashReportCause[];
  aggregate?: CrashReportCause[];
};

export class AxiomCrashReporter {
  private readonly client: CrashReporterClient;
  private readonly dataset: string;
  private readonly environment?: string;
  private readonly appVersion?: string;
  private readonly releaseChannel?: string;
  private readonly applicationId?: string;
  private readonly baseMetadata?: Record<string, unknown>;
  private readonly flushOnCapture: boolean;
  private readonly beforeSend?: CrashReportTransform;
  private readonly onClientError?: (error: unknown) => void;

  private installed = false;
  private originalErrorHandler?: GlobalErrorHandler;
  private originalOnUnhandledRejection?: ((event: unknown) => void) | null;
  private replacedOnUnhandledRejection = false;

  private readonly unhandledRejectionHandler: (event: unknown) => void;
  private readonly globalHandler: GlobalErrorHandler;

  public constructor(options: CrashReporterOptions) {
    if (!options.dataset) {
      throw new Error('A dataset name is required to initialize the Axiom crash reporter.');
    }

    if (!options.client && !options.token) {
      throw new Error('Provide either an Axiom ingestion token or a pre-configured client instance.');
    }

    this.dataset = options.dataset;
    this.environment = options.environment;
    this.appVersion = options.appVersion;
    this.releaseChannel = options.releaseChannel;
    this.applicationId = options.applicationId;
    this.baseMetadata = options.metadata ? { ...options.metadata } : undefined;
    this.flushOnCapture = options.flushOnCapture ?? true;
    this.beforeSend = options.beforeSend;
    this.onClientError = options.onError;

    if (options.client) {
      this.client = options.client;
    } else {
      this.client = (new Axiom({ token: options.token as string })) as unknown as CrashReporterClient;
    }

    this.unhandledRejectionHandler = (event: unknown) => {
      const reason = this.extractRejectionReason(event);
      void this.capture(reason, {
        severity: 'error',
        metadata: { crashSource: 'unhandled-rejection' },
      });
    };

    this.globalHandler = (error: unknown, isFatal?: boolean) => {
      void this.capture(error, {
        severity: isFatal ? 'fatal' : 'error',
        isFatal,
        metadata: { crashSource: 'global-error-handler' },
      });

      if (this.originalErrorHandler) {
        this.originalErrorHandler(error, isFatal);
      }
    };
  }

  public install(): void {
    if (this.installed) {
      return;
    }

    const errorUtils = (globalThis as unknown as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
    if (errorUtils?.setGlobalHandler && errorUtils?.getGlobalHandler) {
      this.originalErrorHandler = errorUtils.getGlobalHandler();
      errorUtils.setGlobalHandler(this.globalHandler);
    }

    const eventTarget = globalThis as unknown as EventTargetShape;
    if (typeof eventTarget.addEventListener === 'function' && typeof eventTarget.removeEventListener === 'function') {
      eventTarget.addEventListener('unhandledrejection', this.unhandledRejectionHandler);
    } else if ('onunhandledrejection' in eventTarget) {
      this.originalOnUnhandledRejection = eventTarget.onunhandledrejection ?? null;
      this.replacedOnUnhandledRejection = true;
      eventTarget.onunhandledrejection = (event: unknown) => {
        if (typeof this.originalOnUnhandledRejection === 'function') {
          this.originalOnUnhandledRejection.call(eventTarget, event);
        }

        this.unhandledRejectionHandler(event);
      };
    }

    this.installed = true;
  }

  public uninstall(): void {
    if (!this.installed) {
      return;
    }

    const errorUtils = (globalThis as unknown as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
    if (errorUtils?.setGlobalHandler && this.originalErrorHandler) {
      errorUtils.setGlobalHandler(this.originalErrorHandler);
    }
    this.originalErrorHandler = undefined;

    const eventTarget = globalThis as unknown as EventTargetShape;
    if (typeof eventTarget.removeEventListener === 'function') {
      eventTarget.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
    } else if (this.replacedOnUnhandledRejection && 'onunhandledrejection' in eventTarget) {
      eventTarget.onunhandledrejection = this.originalOnUnhandledRejection ?? null;
    }

    this.originalOnUnhandledRejection = null;
    this.replacedOnUnhandledRejection = false;
    this.installed = false;
  }

  public async reportError(error: unknown, context: CrashReportContext = {}): Promise<void> {
    await this.capture(error, context);
  }

  public async reportFatalError(error: unknown, context: CrashReportContext = {}): Promise<void> {
    const nextContext: CrashReportContext = {
      ...context,
      severity: 'fatal',
      isFatal: true,
    };

    await this.capture(error, nextContext);
  }

  public async captureException(error: unknown, context: CrashReportContext = {}): Promise<void> {
    await this.reportError(error, context);
  }

  private async capture(error: unknown, context: CrashReportContext): Promise<void> {
    const severity = this.resolveSeverity(context);
    const isFatal = context.isFatal ?? severity === 'fatal';
    const report = this.createReport(error, context, severity, isFatal);
    const candidate = await this.applyBeforeSend(report);

    if (!candidate) {
      return;
    }

    try {
      await this.client.ingest(this.dataset, [candidate]);
      if (this.flushOnCapture) {
        await this.client.flush();
      }
    } catch (ingestError) {
      if (this.onClientError) {
        this.onClientError(ingestError);
      } else {
        console.error('Failed to send crash report to Axiom', ingestError);
      }
    }
  }

  private resolveSeverity(context: CrashReportContext): CrashSeverity {
    if (context.severity) {
      return context.severity;
    }

    if (context.isFatal) {
      return 'fatal';
    }

    return 'error';
  }

  private createReport(
    error: unknown,
    context: CrashReportContext,
    severity: CrashSeverity,
    isFatal: boolean,
  ): CrashReport {
    const normalized = this.normalizeError(error);
    const metadata = this.mergeMetadata(context.metadata);
    const tags = context.tags ? { ...context.tags } : undefined;

    return {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      message: normalized.message,
      name: normalized.name,
      stack: normalized.stack,
      severity,
      isFatal,
      environment: this.environment,
      appVersion: this.appVersion,
      releaseChannel: this.releaseChannel,
      applicationId: this.applicationId,
      metadata,
      tags,
      chain: normalized.chain,
      aggregate: normalized.aggregate,
    };
  }

  private mergeMetadata(additional?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!this.baseMetadata && !additional) {
      return undefined;
    }

    return {
      ...(this.baseMetadata ?? {}),
      ...(additional ?? {}),
    };
  }

  private normalizeError(error: unknown): NormalizedError {
    if (error instanceof Error) {
      const chain = this.extractCauseChain(error);
      const aggregate = error instanceof AggregateError ? this.extractAggregateErrors(error.errors) : undefined;

      return {
        message: error.message,
        name: error.name,
        stack: error.stack,
        chain,
        aggregate,
      };
    }

    if (typeof error === 'string') {
      return { message: error };
    }

    if (typeof error === 'object' && error !== null) {
      try {
        return { message: JSON.stringify(error) };
      } catch {
        return { message: String(error) };
      }
    }

    return { message: String(error) };
  }

  private extractCauseChain(error: Error): CrashReportCause[] | undefined {
    const causes: CrashReportCause[] = [];
    let current: unknown = error.cause;

    while (current instanceof Error) {
      causes.push({
        message: current.message,
        name: current.name,
        stack: current.stack,
      });

      current = current.cause;
    }

    return causes.length > 0 ? causes : undefined;
  }

  private extractAggregateErrors(errors: Iterable<unknown>): CrashReportCause[] {
    const results: CrashReportCause[] = [];

    for (const entry of errors) {
      const normalized = this.normalizeError(entry);
      results.push({
        message: normalized.message,
        name: normalized.name,
        stack: normalized.stack,
      });
    }

    return results;
  }

  private extractRejectionReason(event: unknown): unknown {
    if (typeof event === 'object' && event !== null && 'reason' in event) {
      return (event as { reason?: unknown }).reason;
    }

    return event;
  }

  private async applyBeforeSend(report: CrashReport): Promise<CrashReport | null> {
    if (!this.beforeSend) {
      return report;
    }

    const clonedReport: CrashReport = {
      ...report,
      metadata: report.metadata ? { ...report.metadata } : undefined,
      tags: report.tags ? { ...report.tags } : undefined,
      chain: this.cloneCauses(report.chain),
      aggregate: this.cloneCauses(report.aggregate),
    };

    const transformed = await this.beforeSend(clonedReport);
    if (!transformed) {
      return null;
    }

    return transformed;
  }

  private cloneCauses(causes?: CrashReportCause[]): CrashReportCause[] | undefined {
    if (!causes) {
      return undefined;
    }

    const result: CrashReportCause[] = [];
    for (const cause of causes) {
      result.push({ ...cause });
    }

    return result;
  }

  private generateEventId(): string {
    const cryptoObject = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    if (cryptoObject && typeof cryptoObject.randomUUID === 'function') {
      return cryptoObject.randomUUID();
    }

    const timeComponent = Date.now().toString(36);
    const randomComponent = Math.random().toString(36).slice(2, 10);
    return `${timeComponent}-${randomComponent}`;
  }
}

export function initializeAxiomCrashReporter(options: CrashReporterOptions): AxiomCrashReporter {
  const reporter = new AxiomCrashReporter(options);
  reporter.install();
  return reporter;
}
