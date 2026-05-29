import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { getVideoJobStatus, uploadVideoToService } from './videoService';

/**
 * Minimal stand-in for the browser XMLHttpRequest used by
 * uploadVideoToService. The node test environment has no XHR, so we
 * install a controllable fake on globalThis. Tests drive it by reading
 * the most-recently-constructed instance and invoking the lifecycle
 * helpers (resolveLoad / fail / emitProgress).
 */
type Listener = (e?: unknown) => void;

class MockXHR {
  static instances: MockXHR[] = [];
  static last(): MockXHR {
    return MockXHR.instances[MockXHR.instances.length - 1];
  }

  public method?: string;
  public url?: string;
  public async?: boolean;
  public requestHeaders: Record<string, string> = {};
  public responseType = '';
  public status = 0;
  public responseText = '';
  public sentBody: unknown;
  public aborted = false;

  private listeners: Record<string, Listener[]> = {};
  public upload = {
    listeners: {} as Record<string, Listener[]>,
    addEventListener(type: string, cb: Listener) {
      (this.listeners[type] ||= []).push(cb);
    },
    emit(type: string, e?: unknown) {
      (this.listeners[type] || []).forEach((cb) => cb(e));
    },
  };

  constructor() {
    MockXHR.instances.push(this);
  }

  open(method: string, url: string, async: boolean) {
    this.method = method;
    this.url = url;
    this.async = async;
  }

  setRequestHeader(key: string, value: string) {
    this.requestHeaders[key] = value;
  }

  addEventListener(type: string, cb: Listener) {
    (this.listeners[type] ||= []).push(cb);
  }

  private emit(type: string, e?: unknown) {
    (this.listeners[type] || []).forEach((cb) => cb(e));
  }

  send(body: unknown) {
    this.sentBody = body;
  }

  abort() {
    this.aborted = true;
    this.emit('abort');
  }

  // ---- test driver helpers ----
  resolveLoad(status: number, responseText: string) {
    this.status = status;
    this.responseText = responseText;
    this.emit('load');
  }

  emitError() {
    this.emit('error');
  }

  emitUploadProgress(e: unknown) {
    this.upload.emit('progress', e);
  }
}

describe('uploadVideoToService', () => {
  let originalXHR: unknown;

  beforeEach(() => {
    MockXHR.instances = [];
    originalXHR = (globalThis as Record<string, unknown>).XMLHttpRequest;
    (globalThis as Record<string, unknown>).XMLHttpRequest = MockXHR as unknown;
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).XMLHttpRequest = originalXHR;
  });

  const blob = { size: 100 } as unknown as Blob;

  it('opens a POST to the video service with did/name query params and auth headers, and resolves the parsed body', async () => {
    const promise = uploadVideoToService('jwt-token', 'did:example:alice', blob, 'video/mp4', 'clip.mp4');

    const xhr = MockXHR.last();
    expect(xhr.method).toBe('POST');
    expect(xhr.async).toBe(true);
    const url = new URL(xhr.url!);
    expect(url.origin + url.pathname).toBe('https://video.bsky.app/xrpc/app.bsky.video.uploadVideo');
    expect(url.searchParams.get('did')).toBe('did:example:alice');
    expect(url.searchParams.get('name')).toBe('clip.mp4');
    expect(xhr.requestHeaders.Authorization).toBe('Bearer jwt-token');
    expect(xhr.requestHeaders['Content-Type']).toBe('video/mp4');
    expect(xhr.responseType).toBe('text');
    expect(xhr.sentBody).toBe(blob);

    const body = { jobStatus: { jobId: 'job-1', did: 'did:example:alice', state: 'JOB_STATE_CREATED' } };
    xhr.resolveLoad(200, JSON.stringify(body));

    await expect(promise).resolves.toEqual(body);
  });

  it('reports upload progress fractions via onProgress', async () => {
    const onProgress = jest.fn();
    const promise = uploadVideoToService('jwt', 'did:x', blob, 'video/mp4', 'f.mp4', { onProgress });

    const xhr = MockXHR.last();
    xhr.emitUploadProgress({ lengthComputable: true, total: 200, loaded: 50 });
    xhr.emitUploadProgress({ lengthComputable: true, total: 200, loaded: 200 });
    // Ignored: not computable or zero total.
    xhr.emitUploadProgress({ lengthComputable: false, total: 200, loaded: 100 });
    xhr.emitUploadProgress({ lengthComputable: true, total: 0, loaded: 0 });

    expect(onProgress).toHaveBeenNthCalledWith(1, 0.25);
    expect(onProgress).toHaveBeenNthCalledWith(2, 1);
    expect(onProgress).toHaveBeenCalledTimes(2);

    xhr.resolveLoad(200, JSON.stringify({ jobStatus: {} }));
    await promise;
  });

  it('rejects when the success response is not valid JSON', async () => {
    const promise = uploadVideoToService('jwt', 'did:x', blob, 'video/mp4', 'f.mp4');
    MockXHR.last().resolveLoad(200, 'not-json');
    await expect(promise).rejects.toBeInstanceOf(Error);
  });

  it('rejects with status, detail message, and errorCode on a JSON error response', async () => {
    const promise = uploadVideoToService('jwt', 'did:x', blob, 'video/mp4', 'f.mp4');
    MockXHR.last().resolveLoad(400, JSON.stringify({ error: 'InvalidRequest', message: 'bad video' }));

    const err = (await promise.catch((e) => e)) as Error & { status: number; errorCode?: string };
    expect(err.message).toBe('upload 400: bad video');
    expect(err.status).toBe(400);
    expect(err.errorCode).toBe('InvalidRequest');
  });

  it('falls back to error field then raw text then status when building the detail', async () => {
    const onlyError = uploadVideoToService('jwt', 'did:x', blob, 'video/mp4', 'f.mp4');
    MockXHR.last().resolveLoad(403, JSON.stringify({ error: 'Forbidden' }));
    await expect(onlyError).rejects.toMatchObject({ message: 'upload 403: Forbidden', errorCode: 'Forbidden' });

    const rawText = uploadVideoToService('jwt', 'did:x', blob, 'video/mp4', 'f.mp4');
    MockXHR.last().resolveLoad(500, 'gateway exploded');
    const rawErr = (await rawText.catch((e) => e)) as Error & { errorCode?: string };
    expect(rawErr.message).toBe('upload 500: gateway exploded');
    expect(rawErr.errorCode).toBeUndefined();

    const emptyBody = uploadVideoToService('jwt', 'did:x', blob, 'video/mp4', 'f.mp4');
    MockXHR.last().resolveLoad(503, '');
    await expect(emptyBody).rejects.toMatchObject({ message: 'upload 503: status 503' });
  });

  it('rejects on network error', async () => {
    const promise = uploadVideoToService('jwt', 'did:x', blob, 'video/mp4', 'f.mp4');
    MockXHR.last().emitError();
    await expect(promise).rejects.toThrow('Network error during video upload');
  });

  it('aborts immediately when an already-aborted signal is supplied and never sends', async () => {
    const controller = new AbortController();
    controller.abort();
    const promise = uploadVideoToService('jwt', 'did:x', blob, 'video/mp4', 'f.mp4', {
      signal: controller.signal,
    });

    const xhr = MockXHR.last();
    expect(xhr.aborted).toBe(true);
    expect(xhr.sentBody).toBeUndefined();
    await expect(promise).rejects.toThrow('Video upload aborted');
  });

  it('aborts when the signal fires after send', async () => {
    const controller = new AbortController();
    const promise = uploadVideoToService('jwt', 'did:x', blob, 'video/mp4', 'f.mp4', {
      signal: controller.signal,
    });

    const xhr = MockXHR.last();
    expect(xhr.sentBody).toBe(blob);
    controller.abort();
    expect(xhr.aborted).toBe(true);
    await expect(promise).rejects.toThrow('Video upload aborted');
  });
});

describe('getVideoJobStatus', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('returns the job status and url-encodes the jobId', async () => {
    let capturedUrl: string | null = null;
    let capturedAuth: string | null = null;
    const payload = { jobStatus: { jobId: 'job/1', did: 'did:x', state: 'JOB_STATE_COMPLETED' } };

    server.use(
      http.get('https://video.bsky.app/xrpc/app.bsky.video.getJobStatus', ({ request }) => {
        capturedUrl = request.url;
        capturedAuth = request.headers.get('authorization');
        return HttpResponse.json(payload);
      }),
    );

    const result = await getVideoJobStatus('jwt-abc', 'job/1');

    expect(result).toEqual(payload);
    expect(capturedAuth).toBe('Bearer jwt-abc');
    expect(capturedUrl).toContain('jobId=job%2F1');
  });

  it('throws with the body message, status, and errorCode on a JSON error', async () => {
    server.use(
      http.get('https://video.bsky.app/xrpc/app.bsky.video.getJobStatus', () =>
        HttpResponse.json({ message: 'job not found', error: 'NotFound' }, { status: 404 }),
      ),
    );

    const err = (await getVideoJobStatus('jwt', 'missing').catch((e) => e)) as Error & {
      status: number;
      errorCode?: string;
    };
    expect(err.message).toBe('job not found');
    expect(err.status).toBe(404);
    expect(err.errorCode).toBe('NotFound');
  });

  it('falls back to a status-based message when the error body is not JSON', async () => {
    server.use(
      http.get('https://video.bsky.app/xrpc/app.bsky.video.getJobStatus', () =>
        HttpResponse.text('upstream failure', { status: 502 }),
      ),
    );

    const err = (await getVideoJobStatus('jwt', 'job').catch((e) => e)) as Error & {
      status: number;
      errorCode?: string;
    };
    expect(err.message).toBe('Job status failed (502)');
    expect(err.status).toBe(502);
    expect(err.errorCode).toBeUndefined();
  });
});
