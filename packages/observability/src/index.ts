import { SpanStatusCode, trace } from '@opentelemetry/api';
import type { Span, SpanOptions, Tracer } from '@opentelemetry/api';

import { AxiomLogger, normalizeError } from './logger';
import { CrashReporter } from './crash-reporter';
import { toSpanAttributes, TracingManager } from './tracing';
import type {
  LogAttributes,
  LogLevel,
  LogOptions,
  ObservabilityClient,
  ObservabilityConfig,
  ObservabilitySpanOptions,
} from './types';

export * from './types';

class Observability implements ObservabilityClient {
  private readonly logger: AxiomLogger;
  private readonly tracing?: TracingManager;
  private readonly crashReporter?: CrashReporter;
  private readonly crashDataset?: string;
  private readonly instrumentationScope?: {
    name?: string;
    version?: string;
  };

  constructor(private readonly config: ObservabilityConfig) {
    const derivedGlobalAttributes: LogAttributes = {
      ...(config.globalAttributes ?? {}),
    };

    if (config.tracing?.environment && derivedGlobalAttributes.environment === undefined) {
      derivedGlobalAttributes.environment = config.tracing.environment;
    }

    if (config.tracing?.serviceName && derivedGlobalAttributes.serviceName === undefined) {
      derivedGlobalAttributes.serviceName = config.tracing.serviceName;
    }

    this.logger = new AxiomLogger({
      token: config.axiomToken,
      dataset: config.defaultDataset,
      baseUrl: config.axiomUrl,
      orgId: config.orgId,
      globalAttributes: derivedGlobalAttributes,
      flushOnError: config.flushOnError,
    });

    if (config.tracing) {
      this.tracing = new TracingManager(config.tracing);
      this.tracing.initialize();
      this.instrumentationScope = config.tracing.instrumentationScope;
    }

    if (config.crashReporting) {
      this.crashDataset = config.crashReporting.dataset;
      this.crashReporter = new CrashReporter(this.logger, config.crashReporting);
      this.crashReporter.install();
    }
  }

  async log(level: LogLevel, message: string, attributes: LogAttributes = {}, options: LogOptions = {}) {
    await this.logger.log(level, message, attributes, options);
  }

  async logDebug(message: string, attributes: LogAttributes = {}, options: LogOptions = {}) {
    await this.log('debug', message, attributes, options);
  }

  async logInfo(message: string, attributes: LogAttributes = {}, options: LogOptions = {}) {
    await this.log('info', message, attributes, options);
  }

  async logWarn(message: string, attributes: LogAttributes = {}, options: LogOptions = {}) {
    await this.log('warn', message, attributes, options);
  }

  async logError(message: string, attributes: LogAttributes = {}, options: LogOptions = {}) {
    const dataset = options.dataset ?? this.crashDataset;
    await this.log('error', message, attributes, {
      ...options,
      dataset,
      flush: options.flush ?? this.config.flushOnError,
    });
  }

  async captureException(error: unknown, attributes: LogAttributes = {}, options: LogOptions = {}) {
    const dataset = options.dataset ?? this.crashDataset;
    await this.logger.captureException(error, attributes, {
      ...options,
      dataset,
    });
  }

  async withSpan<T>(name: string, handler: (span: Span) => Promise<T> | T, options: ObservabilitySpanOptions = {}) {
    if (this.tracing) {
      return this.tracing.withSpan(name, handler, options);
    }

    const tracer = this.getTracer();
    const { attributes, status, ...spanOptions } = options;
    const span = tracer.startSpan(name, spanOptions as SpanOptions);
    if (attributes) {
      span.setAttributes(toSpanAttributes(attributes));
    }
    if (status) {
      span.setStatus(status);
    }

    try {
      const result = handler(span);
      if (result instanceof Promise) {
        return await result
          .then((value) => {
            span.end();
            return value;
          })
          .catch((error) => {
            const normalized = normalizeError(error);
            span.recordException({
              name: normalized.name,
              message: normalized.message,
              stack: normalized.stack,
            });
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: normalized.message,
            });
            span.end();
            throw error;
          });
      }

      span.end();
      return result;
    } catch (error) {
      const normalized = normalizeError(error);
      span.recordException({
        name: normalized.name,
        message: normalized.message,
        stack: normalized.stack,
      });
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: normalized.message,
      });
      span.end();
      throw error;
    }
  }

  startSpan(name: string, options: ObservabilitySpanOptions = {}): Span {
    if (this.tracing) {
      return this.tracing.startSpan(name, options);
    }

    const tracer = this.getTracer();
    const { attributes, status, ...spanOptions } = options;
    const span = tracer.startSpan(name, spanOptions as SpanOptions);
    if (attributes) {
      span.setAttributes(toSpanAttributes(attributes));
    }
    if (status) {
      span.setStatus(status);
    }
    return span;
  }

  getTracer(name?: string, version?: string): Tracer {
    if (this.tracing) {
      return this.tracing.getTracer(name, version);
    }

    const scopeName = name ?? this.instrumentationScope?.name ?? 'akari-observability';
    const scopeVersion = version ?? this.instrumentationScope?.version ?? '0.1.0';
    return trace.getTracer(scopeName, scopeVersion);
  }

  async flush() {
    await this.logger.flush();
    await this.tracing?.flush();
  }

  async shutdown() {
    this.crashReporter?.uninstall();
    await this.flush();
    await this.tracing?.shutdown();
  }
}

export const initializeObservability = (config: ObservabilityConfig): ObservabilityClient => {
  return new Observability(config);
};
