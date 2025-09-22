import { diag, DiagConsoleLogger, DiagLogLevel, SpanStatusCode, trace } from '@opentelemetry/api';
import type { Span, SpanAttributes, SpanOptions, Tracer } from '@opentelemetry/api';
import {
  AlwaysOffSampler,
  AlwaysOnSampler,
  BatchSpanProcessor,
  BasicTracerProvider,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

import { normalizeError } from './logger';
import type { ObservabilitySpanOptions, ObservabilityTracingConfig } from './types';

export const toSpanAttributes = (attributes: Record<string, unknown>): SpanAttributes => {
  const spanAttributes: SpanAttributes = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined) {
      continue;
    }

    if (value === null) {
      spanAttributes[key] = 'null';
      continue;
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      spanAttributes[key] = value;
      continue;
    }

    if (Array.isArray(value)) {
      spanAttributes[key] = value.map((entry) => String(entry));
      continue;
    }

    spanAttributes[key] = String(value);
  }

  return spanAttributes;
};

const createSampler = (config?: ObservabilityTracingConfig['traceSampler']) => {
  if (!config || config === 'always_on') {
    return new ParentBasedSampler({ root: new AlwaysOnSampler() });
  }

  if (config === 'always_off') {
    return new AlwaysOffSampler();
  }

  if (config.type === 'ratio') {
    return new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(config.ratio) });
  }

  return new ParentBasedSampler({ root: new AlwaysOnSampler() });
};

export class TracingManager {
  private readonly config: ObservabilityTracingConfig;
  private provider?: BasicTracerProvider;
  private exporter?: OTLPTraceExporter;

  constructor(config: ObservabilityTracingConfig) {
    this.config = config;
  }

  initialize() {
    if (this.provider) {
      return;
    }

    if (this.config.enableConsoleDiagnostics) {
      diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
    }

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment ?? 'development',
      ...this.config.resourceAttributes,
    });

    const provider = new BasicTracerProvider({
      resource,
      sampler: createSampler(this.config.traceSampler),
    });

    this.exporter = new OTLPTraceExporter({
      url: this.config.otlpEndpoint,
    });

    provider.addSpanProcessor(new BatchSpanProcessor(this.exporter));
    provider.register();

    this.provider = provider;
  }

  getTracer(name?: string, version?: string): Tracer {
    const scopeName = name ?? this.config.instrumentationScope?.name ?? 'akari-observability';
    const scopeVersion = version ?? this.config.instrumentationScope?.version ?? '0.1.0';
    return trace.getTracer(scopeName, scopeVersion);
  }

  startSpan(name: string, options: ObservabilitySpanOptions = {}): Span {
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

  async withSpan<T>(
    name: string,
    handler: (span: Span) => Promise<T> | T,
    options: ObservabilitySpanOptions = {},
  ): Promise<T> {
    const tracer = this.getTracer();
    const { attributes, status, ...spanOptions } = options;
    return tracer.startActiveSpan(name, spanOptions as SpanOptions, (span) => {
      if (attributes) {
        span.setAttributes(toSpanAttributes(attributes));
      }
      if (status) {
        span.setStatus(status);
      }

      try {
        const result = handler(span);
        if (result instanceof Promise) {
          return result
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
    });
  }

  async flush() {
    try {
      await this.provider?.forceFlush();
    } catch (error) {
      console.warn('[observability] Failed to flush tracing provider', error);
    }
  }

  async shutdown() {
    try {
      await this.provider?.shutdown();
    } catch (error) {
      console.warn('[observability] Failed to shutdown tracing provider', error);
    }
    this.provider = undefined;
    this.exporter = undefined;
  }
}
