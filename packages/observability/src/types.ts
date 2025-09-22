import type { Span, SpanOptions, SpanStatusCode, Tracer } from '@opentelemetry/api';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type LogAttributes = Record<string, unknown>;

export type LogOptions = {
  dataset?: string;
  flush?: boolean;
  timestamp?: Date;
};

export type ObservabilityTracingConfig = {
  serviceName: string;
  otlpEndpoint: string;
  environment?: string;
  resourceAttributes?: Record<string, string>;
  instrumentationScope?: {
    name?: string;
    version?: string;
  };
  traceSampler?: 'always_on' | 'always_off' | {
    type: 'ratio';
    ratio: number;
  };
  enableConsoleDiagnostics?: boolean;
};

export type CrashReportingConfig = {
  enableGlobalHandler?: boolean;
  dataset?: string;
  captureUnhandledRejections?: boolean;
  passthrough?: boolean;
  additionalAttributes?: () => Promise<LogAttributes> | LogAttributes;
};

export type ObservabilityConfig = {
  axiomToken: string;
  defaultDataset: string;
  axiomUrl?: string;
  orgId?: string;
  flushOnError?: boolean;
  globalAttributes?: LogAttributes;
  tracing?: ObservabilityTracingConfig;
  crashReporting?: CrashReportingConfig;
};

export type ObservabilitySpanOptions = Omit<SpanOptions, 'attributes'> & {
  attributes?: LogAttributes;
  status?: {
    code: SpanStatusCode;
    message?: string;
  };
};

export type ObservabilityClient = {
  log: (level: LogLevel, message: string, attributes?: LogAttributes, options?: LogOptions) => Promise<void>;
  logDebug: (message: string, attributes?: LogAttributes, options?: LogOptions) => Promise<void>;
  logInfo: (message: string, attributes?: LogAttributes, options?: LogOptions) => Promise<void>;
  logWarn: (message: string, attributes?: LogAttributes, options?: LogOptions) => Promise<void>;
  logError: (message: string, attributes?: LogAttributes, options?: LogOptions) => Promise<void>;
  captureException: (error: unknown, attributes?: LogAttributes, options?: LogOptions) => Promise<void>;
  withSpan: <T>(name: string, handler: (span: Span) => Promise<T> | T, options?: ObservabilitySpanOptions) => Promise<T>;
  startSpan: (name: string, options?: ObservabilitySpanOptions) => Span;
  getTracer: (name?: string, version?: string) => Tracer;
  flush: () => Promise<void>;
  shutdown: () => Promise<void>;
};
