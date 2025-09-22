import { trace } from '@opentelemetry/api';

import { AxiomLogger, normalizeError } from './logger';

const ingestMock = jest.fn();
const flushMock = jest.fn();

jest.mock('@axiomhq/js', () => ({
  Axiom: jest.fn().mockImplementation(() => ({
    ingest: ingestMock,
    flush: flushMock,
  })),
}));

describe('AxiomLogger', () => {
  beforeEach(() => {
    ingestMock.mockClear();
    flushMock.mockClear();
  });

  it('normalizes errors', () => {
    expect(normalizeError('failure')).toEqual({ name: 'Error', message: 'failure' });
    const objectError = normalizeError({ message: 'boom', name: 'Custom' });
    expect(objectError).toMatchObject({ name: 'Custom', message: 'boom' });
  });

  it('sends log events with merged attributes', async () => {
    const logger = new AxiomLogger({
      token: 'token',
      dataset: 'app-logs',
      globalAttributes: { appVersion: '1.0.0' },
      flushOnError: false,
    });

    const timestamp = new Date('2024-01-01T00:00:00Z');

    await logger.log('info', 'User signed in', { userId: '123' }, { timestamp });

    expect(ingestMock).toHaveBeenCalledTimes(1);
    const [dataset, events] = ingestMock.mock.calls[0];
    expect(dataset).toBe('app-logs');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      level: 'info',
      message: 'User signed in',
      userId: '123',
      appVersion: '1.0.0',
      _time: timestamp.toISOString(),
    });
    expect(flushMock).not.toHaveBeenCalled();
  });

  it('flushes automatically for error logs and exceptions', async () => {
    const logger = new AxiomLogger({
      token: 'token',
      dataset: 'app-logs',
      flushOnError: true,
    });

    await logger.log('error', 'Unhandled rejection');
    expect(flushMock).toHaveBeenCalledTimes(1);

    ingestMock.mockClear();
    flushMock.mockClear();

    const error = new Error('Boom');
    await logger.captureException(error, { screen: 'Feed' });
    expect(ingestMock).toHaveBeenCalledTimes(1);
    const payload = ingestMock.mock.calls[0][1][0];
    expect(payload).toMatchObject({
      errorName: 'Error',
      errorMessage: 'Boom',
      screen: 'Feed',
    });
    expect(flushMock).toHaveBeenCalledTimes(1);
  });

  it('records log events on the active span when available', async () => {
    const logger = new AxiomLogger({ token: 'token', dataset: 'logs' });
    const tracer = trace.getTracer('test');

    await new Promise<void>((resolve) => {
      tracer.startActiveSpan('parent', async (span) => {
        await logger.log('debug', 'inside span');
        span.end();
        resolve();
      });
    });

    expect(ingestMock).toHaveBeenCalledTimes(1);
  });
});
