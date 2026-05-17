import type { BlueskyUploadBlobResponse } from './types';

/**
 * Bluesky's video service runs on a separate origin
 * (`https://video.bsky.app`) and is reached with a short-lived
 * service-auth JWT minted on the user's PDS. The flow is:
 *
 * 1. PDS: getServiceAuth({ aud: 'did:web:video.bsky.app', lxm: 'app.bsky.video.uploadVideo' })
 * 2. Video service: uploadVideo (POST raw bytes) → { jobId }
 * 3. Video service: getJobStatus poll → { state: JOB_STATE_COMPLETED, blob }
 * 4. PDS createPost with `app.bsky.embed.video` referencing the blob.
 *
 * The blob handed back is already registered in the user's repo —
 * referencing it from a post triggers the appview's video pipeline so
 * other clients can play it back.
 */
const VIDEO_SERVICE_BASE = 'https://video.bsky.app';

export type VideoJobState =
  | 'JOB_STATE_CREATED'
  | 'JOB_STATE_ENCODING'
  | 'JOB_STATE_SCANNED'
  | 'JOB_STATE_SCANNING'
  | 'JOB_STATE_COMPLETED'
  | 'JOB_STATE_FAILED';

export type VideoJobStatus = {
  jobId: string;
  did: string;
  state: VideoJobState;
  progress?: number;
  blob?: BlueskyUploadBlobResponse['blob'];
  error?: string;
  message?: string;
};

/**
 * Posts the video bytes to the transcode service. Returns the
 * job-status descriptor; the blob is only present once
 * `state === 'JOB_STATE_COMPLETED'`. Use XHR rather than fetch so we
 * can surface upload-progress events to the UI.
 */
export function uploadVideoToService(
  serviceJwt: string,
  did: string,
  blob: Blob,
  mimeType: string,
  fileName: string,
  options: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
): Promise<{ jobStatus: VideoJobStatus }> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${VIDEO_SERVICE_BASE}/xrpc/app.bsky.video.uploadVideo`);
    url.searchParams.set('did', did);
    url.searchParams.set('name', fileName);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url.toString(), true);
    xhr.setRequestHeader('Authorization', `Bearer ${serviceJwt}`);
    xhr.setRequestHeader('Content-Type', mimeType);
    xhr.responseType = 'text';

    if (options.onProgress && xhr.upload) {
      xhr.upload.addEventListener('progress', (e: ProgressEvent) => {
        if (e.lengthComputable && e.total > 0) {
          options.onProgress!(e.loaded / e.total);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      } else {
        // The video service's error responses come back flat (rather
        // than the appview's `{ error, message }`), so probe both
        // shapes when building the diagnostic string.
        let body: { error?: string; message?: string } = {};
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          // body wasn't JSON; fall back to raw text below
        }
        const detail = body.message || body.error || xhr.responseText || `status ${xhr.status}`;
        const err = new Error(`upload ${xhr.status}: ${detail}`) as Error & {
          status: number;
          errorCode?: string;
        };
        err.status = xhr.status;
        if (body.error) err.errorCode = body.error;
        reject(err);
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error during video upload')));
    xhr.addEventListener('abort', () => reject(new Error('Video upload aborted')));

    if (options.signal) {
      if (options.signal.aborted) {
        xhr.abort();
        return;
      }
      options.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(blob);
  });
}

/**
 * Polls the transcode pipeline for the job's current state. Caller
 * loops until `state === 'JOB_STATE_COMPLETED'` (or `_FAILED`) and
 * then plucks `blob` off the result.
 */
export async function getVideoJobStatus(
  serviceJwt: string,
  jobId: string,
): Promise<{ jobStatus: VideoJobStatus }> {
  const url = `${VIDEO_SERVICE_BASE}/xrpc/app.bsky.video.getJobStatus?jobId=${encodeURIComponent(jobId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${serviceJwt}` },
  });
  if (!res.ok) {
    let body: { message?: string; error?: string } = {};
    try {
      body = await res.json();
    } catch {
      // ignore; build error from status
    }
    const err = new Error(body.message || `Job status failed (${res.status})`) as Error & {
      status: number;
      errorCode?: string;
    };
    err.status = res.status;
    if (body.error) err.errorCode = body.error;
    throw err;
  }
  return await res.json();
}
