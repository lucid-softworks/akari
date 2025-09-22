import { diag, DiagLogLevel } from '@opentelemetry/api';

import { initializeObservability } from './index';

const ingestMock = jest.fn();
const flushMock = jest.fn();

jest.mock('@axiomhq/js', () => ({
  Axiom: jest.fn().mockImplementation(() => ({
    ingest: ingestMock,
    flush: flushMock,
  })),
}));

const exporterShutdownMock = jest.fn().mockResolvedValue(undefined);

jest.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: jest.fn().mockImplementation(() => ({
    export: jest.fn((_, callback) => {
      if (typeof callback === 'function') {
        callback({ code: 0 });
      }
    }),
    shutdown: exporterShutdownMock,
  })),
}));

type TestGlobal = typeof globalThis & {
  ErrorUtils?: {
    getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
    setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
  };
  addEventListener?: jest.Mock;
  removeEventListener?: jest.Mock;
};

describe('initializeObservability', () => {
  let globalScope: TestGlobal;
  let originalErrorUtils: TestGlobal['ErrorUtils'];
  let originalAddEventListener: TestGlobal['addEventListener'];
  let originalRemoveEventListener: TestGlobal['removeEventListener'];

  beforeEach(() => {
    ingestMock.mockClear();
    flushMock.mockClear();
    exporterShutdownMock.mockClear();
    globalScope = globalThis as TestGlobal;
    originalErrorUtils = globalScope.ErrorUtils;
    originalAddEventListener = globalScope.addEventListener;
    originalRemoveEventListener = globalScope.removeEventListener;

    const setGlobalHandler = jest.fn();
    const getGlobalHandler = jest.fn().mockReturnValue(jest.fn());

    globalScope.ErrorUtils = {
      setGlobalHandler,
      getGlobalHandler,
    };
    globalScope.addEventListener = jest.fn();
    globalScope.removeEventListener = jest.fn();
    diag.setLogger(
      { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), verbose: jest.fn() },
      DiagLogLevel.NONE,
    );
  });

  afterEach(async () => {
    if (originalErrorUtils === undefined) {
      Reflect.deleteProperty(globalScope, 'ErrorUtils');
    } else {
      globalScope.ErrorUtils = originalErrorUtils;
    }

    if (originalAddEventListener === undefined) {
      Reflect.deleteProperty(globalScope, 'addEventListener');
    } else {
      globalScope.addEventListener = originalAddEventListener;
    }

    if (originalRemoveEventListener === undefined) {
      Reflect.deleteProperty(globalScope, 'removeEventListener');
    } else {
      globalScope.removeEventListener = originalRemoveEventListener;
    }
  });

  type TestConfig = Parameters<typeof initializeObservability>[0];

  const createConfig = (): TestConfig => ({
    axiomToken: 'token',
    defaultDataset: 'app-logs',
    globalAttributes: { release: '1.0.0' },
    tracing: {
      serviceName: 'akari-app',
      otlpEndpoint: 'https://otel.example/v1/traces',
      environment: 'test',
    },
    crashReporting: {
      dataset: 'crashes',
    },
  });

  it('initializes logging, tracing, and crash reporting', async () => {
    const config = createConfig();
    const client = initializeObservability(config);

    expect(globalScope.ErrorUtils?.setGlobalHandler).toHaveBeenCalled();

    await client.logInfo('App started', { screen: 'Home' });
    expect(ingestMock).toHaveBeenCalledWith(
      'app-logs',
      expect.arrayContaining([
        expect.objectContaining({
          level: 'info',
          message: 'App started',
          screen: 'Home',
          release: '1.0.0',
          environment: 'test',
          serviceName: 'akari-app',
        }),
      ]),
    );

    ingestMock.mockClear();
    await client.captureException(new Error('Boom'));
    expect(ingestMock).toHaveBeenCalledWith(
      'crashes',
      expect.arrayContaining([expect.objectContaining({ errorMessage: 'Boom' })]),
    );

    ingestMock.mockClear();
    await client.withSpan('load-feed', async (span) => {
      expect(span.spanContext().traceId).toHaveLength(32);
      await client.logDebug('inside span');
    });
    expect(ingestMock).toHaveBeenCalled();

    await client.flush();
    expect(flushMock).toHaveBeenCalled();

    await client.shutdown();
    expect(exporterShutdownMock).toHaveBeenCalled();
  });

  it('falls back to noop tracing when disabled', async () => {
    const config: TestConfig = {
      axiomToken: 'token',
      defaultDataset: 'logs',
    };

    const client = initializeObservability(config);
    const tracer = client.getTracer();

    await client.withSpan('noop-span', async () => {
      await client.logInfo('without tracing');
    });

    expect(tracer).toBeDefined();
    expect(ingestMock).toHaveBeenCalled();
  });
});
