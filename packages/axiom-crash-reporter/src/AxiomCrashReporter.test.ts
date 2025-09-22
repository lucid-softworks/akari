import { AxiomCrashReporter, initializeAxiomCrashReporter } from './AxiomCrashReporter';
import type { CrashReport, CrashReporterClient } from './types';

describe('AxiomCrashReporter', () => {
  let ingest: jest.MockedFunction<CrashReporterClient['ingest']>;
  let flush: jest.MockedFunction<CrashReporterClient['flush']>;
  let client: CrashReporterClient;

  beforeEach(() => {
    ingest = jest.fn().mockResolvedValue(undefined);
    flush = jest.fn().mockResolvedValue(undefined);
    client = {
      ingest,
      flush,
    };
  });

  it('sends normalized reports to Axiom', async () => {
    const reporter = new AxiomCrashReporter({
      dataset: 'crashes',
      client,
      environment: 'test',
      metadata: { release: '1.0.0' },
    });

    await reporter.reportError(new Error('boom'));

    expect(ingest).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledTimes(1);

    const [, events] = ingest.mock.calls[0];
    const payload = events[0] as CrashReport;
    expect(payload.message).toBe('boom');
    expect(payload.environment).toBe('test');
    expect(payload.metadata).toEqual({ release: '1.0.0' });
    expect(payload.severity).toBe('error');
    expect(payload.isFatal).toBe(false);
  });

  it('marks fatal errors and merges metadata overrides', async () => {
    const reporter = new AxiomCrashReporter({
      dataset: 'crashes',
      client,
      metadata: { platform: 'ios' },
    });

    await reporter.reportFatalError(new Error('fatal'), {
      metadata: { screen: 'home' },
      tags: { handled: 'false' },
    });

    const [, events] = ingest.mock.calls[0];
    const payload = events[0] as CrashReport;
    expect(payload.severity).toBe('fatal');
    expect(payload.isFatal).toBe(true);
    expect(payload.metadata).toEqual({ platform: 'ios', screen: 'home' });
    expect(payload.tags).toEqual({ handled: 'false' });
  });

  it('captures error causes and aggregate members', async () => {
    const reporter = new AxiomCrashReporter({ dataset: 'crashes', client });

    const cause = new Error('network down');
    const causedError = new Error('top-level');
    (causedError as { cause?: unknown }).cause = cause;
    await reporter.reportError(causedError);

    const [, causeEvents] = ingest.mock.calls[0];
    const causePayload = causeEvents[0] as CrashReport;
    expect(causePayload.chain?.[0]?.message).toBe('network down');

    ingest.mockClear();
    const aggregate = new AggregateError([new Error('first'), 'second'], 'aggregate fail');
    await reporter.reportError(aggregate);

    const [, aggregateEvents] = ingest.mock.calls[0];
    const aggregatePayload = aggregateEvents[0] as CrashReport;
    expect(aggregatePayload.aggregate?.length).toBe(2);
    expect(aggregatePayload.aggregate?.[1]?.message).toBe('second');
  });

  it('allows dropping events through beforeSend hook', async () => {
    const reporter = new AxiomCrashReporter({
      dataset: 'crashes',
      client,
      beforeSend: () => null,
    });

    await reporter.reportError(new Error('ignore'));
    expect(ingest).not.toHaveBeenCalled();
  });

  it('invokes custom ingestion error handler', async () => {
    const failure = new Error('network');
    ingest.mockRejectedValueOnce(failure);
    const onError = jest.fn();

    const reporter = new AxiomCrashReporter({
      dataset: 'crashes',
      client,
      onError,
    });

    await reporter.reportError(new Error('boom'));
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it('installs and restores global handlers', async () => {
    const originalErrorUtils = (globalThis as { ErrorUtils?: unknown }).ErrorUtils;
    const original = jest.fn();
    const setGlobalHandler = jest.fn();
    const getGlobalHandler = jest.fn(() => original);

    (globalThis as { ErrorUtils?: unknown }).ErrorUtils = {
      setGlobalHandler,
      getGlobalHandler,
    };

    const reporter = new AxiomCrashReporter({ dataset: 'crashes', client });
    reporter.install();

    expect(setGlobalHandler).toHaveBeenCalledTimes(1);
    const handler = setGlobalHandler.mock.calls[0][0];
    const error = new Error('fatal');
    handler(error, true);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ingest).toHaveBeenCalledTimes(1);
    expect(original).toHaveBeenCalledWith(error, true);

    reporter.uninstall();
    expect(setGlobalHandler).toHaveBeenCalledTimes(2);
    expect(setGlobalHandler.mock.calls[1][0]).toBe(original);
    (globalThis as { ErrorUtils?: unknown }).ErrorUtils = originalErrorUtils;
  });

  it('initializes and installs immediately', () => {
    const originalErrorUtils = (globalThis as { ErrorUtils?: unknown }).ErrorUtils;
    const setGlobalHandler = jest.fn();
    const getGlobalHandler = jest.fn();

    (globalThis as { ErrorUtils?: unknown }).ErrorUtils = {
      setGlobalHandler,
      getGlobalHandler,
    };

    const reporter = initializeAxiomCrashReporter({ dataset: 'crashes', client });
    expect(setGlobalHandler).toHaveBeenCalledTimes(1);

    reporter.uninstall();
    (globalThis as { ErrorUtils?: unknown }).ErrorUtils = originalErrorUtils;
  });
});
