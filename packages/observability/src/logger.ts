import { Axiom } from '@axiomhq/js';
import { SpanStatusCode, trace } from '@opentelemetry/api';

import type { LogAttributes, LogLevel, LogOptions } from './types';

export type LoggerConfig = {
  token: string;
  dataset: string;
  baseUrl?: string;
  orgId?: string;
  globalAttributes?: LogAttributes;
  flushOnError?: boolean;
};

export type NormalizedError = {
  name: string;
  message: string;
  stack?: string;
};

const safeSerialize = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const normalizeError = (error: unknown): NormalizedError => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? undefined,
    };
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as { name?: string; message?: string };
    return {
      name: candidate.name ?? error.constructor?.name ?? 'Error',
      message: candidate.message ?? safeSerialize(error),
      stack: (candidate as { stack?: string }).stack,
    };
  }

  return {
    name: 'Error',
    message: String(error),
  };
};

export class AxiomLogger {
  private readonly client: Axiom;
  private readonly defaultDataset: string;
  private readonly flushOnError: boolean;
  private globalAttributes: LogAttributes;

  constructor(config: LoggerConfig) {
    this.client = new Axiom({
      token: config.token,
      ...(config.baseUrl ? { url: config.baseUrl } : {}),
      ...(config.orgId ? { orgId: config.orgId } : {}),
    });
    this.defaultDataset = config.dataset;
    this.flushOnError = config.flushOnError ?? true;
    this.globalAttributes = { ...config.globalAttributes };
  }

  setGlobalAttributes(attributes: LogAttributes) {
    this.globalAttributes = { ...attributes };
  }

  mergeGlobalAttributes(attributes: LogAttributes) {
    this.globalAttributes = { ...this.globalAttributes, ...attributes };
  }

  async log(level: LogLevel, message: string, attributes: LogAttributes = {}, options: LogOptions = {}) {
    const dataset = options.dataset ?? this.defaultDataset;

    if (!dataset) {
      console.warn('[observability] No dataset configured for log message');
      return;
    }

    const timestamp = (options.timestamp ?? new Date()).toISOString();

    const payload: Record<string, unknown> = {
      _time: timestamp,
      level,
      message,
      ...this.globalAttributes,
      ...attributes,
    };

    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent('log', {
        level,
        message,
      });
    }

    try {
      await this.client.ingest(dataset, [payload]);
      if (options.flush) {
        await this.client.flush();
      }
    } catch (error) {
      console.warn('[observability] Failed to send log to Axiom', error);
    }

    if (!options.flush && (level === 'error' || level === 'fatal') && this.flushOnError) {
      try {
        await this.client.flush();
      } catch (error) {
        console.warn('[observability] Failed to flush Axiom client', error);
      }
    }
  }

  async captureException(error: unknown, attributes: LogAttributes = {}, options: LogOptions = {}) {
    const normalized = normalizeError(error);

    const combinedAttributes: LogAttributes = {
      errorName: normalized.name,
      errorMessage: normalized.message,
      ...(normalized.stack ? { stack: normalized.stack } : {}),
      ...attributes,
    };

    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.recordException({
        name: normalized.name,
        message: normalized.message,
        stack: normalized.stack,
      });
      activeSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: normalized.message,
      });
    }

    await this.log('error', normalized.message, combinedAttributes, {
      ...options,
      flush: options.flush ?? this.flushOnError,
    });
  }

  async flush() {
    try {
      await this.client.flush();
    } catch (error) {
      console.warn('[observability] Failed to flush Axiom client', error);
    }
  }
}
