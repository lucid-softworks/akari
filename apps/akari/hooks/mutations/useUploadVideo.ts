import { useCallback, useRef, useState } from 'react';

import {
  getVideoJobStatus,
  uploadVideoToService,
} from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { apiForAccount } from '@/utils/blueskyApi';

export type VideoUploadStatus =
  | { kind: 'idle' }
  | { kind: 'authorizing' }
  | { kind: 'uploading'; progress: number }
  | { kind: 'processing'; progress?: number }
  | { kind: 'done'; blob: { $type: 'blob'; ref: { $link: string }; mimeType: string; size: number } }
  | { kind: 'error'; message: string };

const VIDEO_SERVICE_AUDIENCE = 'did:web:video.bsky.app';

/**
 * Drives the full Bluesky video-upload pipeline so the composer can
 * show a progress bar and disable the post button until a transcoded
 * blob ref is in hand:
 *
 *   getServiceAuth → uploadVideo (XHR with progress) → poll
 *   getJobStatus → return blob ref.
 *
 * The progress bar covers the byte upload to the transcode service;
 * the subsequent server-side encode is reported as `processing` with
 * an optional percent from the job status.
 */
export function useUploadVideo() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const [status, setStatus] = useState<VideoUploadStatus>({ kind: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus({ kind: 'idle' });
  }, []);

  const upload = useCallback(
    async (videoUri: string, mimeType: string): Promise<VideoUploadStatus> => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.did || !currentAccount?.pdsUrl) {
        throw new Error('No account context');
      }
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      try {
        setStatus({ kind: 'authorizing' });
        const api = apiForAccount(currentAccount);
        const { token: serviceJwt } = await api.getServiceAuth(
          token,
          VIDEO_SERVICE_AUDIENCE,
          'app.bsky.video.uploadVideo',
        );

        // Pull the file into a Blob. RN gives us a polyfilled blob from
        // file:// URIs that lacks `arrayBuffer`, but we don't need it
        // — XHR can send the blob directly.
        const fileResponse = await fetch(videoUri);
        const fileBlob = await fileResponse.blob();
        const fileName =
          videoUri.split('/').pop()?.split('?')[0] ?? `video-${Date.now()}.mp4`;

        setStatus({ kind: 'uploading', progress: 0 });
        const uploadResult = await uploadVideoToService(
          serviceJwt,
          currentAccount.did,
          fileBlob,
          mimeType,
          fileName,
          {
            signal: abort.signal,
            onProgress: (fraction) => {
              setStatus({ kind: 'uploading', progress: fraction });
            },
          },
        );

        let job = uploadResult.jobStatus;
        setStatus({
          kind: 'processing',
          progress: job.progress ? job.progress / 100 : undefined,
        });

        // Poll the transcode pipeline until it finishes (or fails).
        // 1.5s interval, max ~3 minutes — short clips finish in seconds,
        // longer ones can take a while on the server.
        const startedAt = Date.now();
        const TIMEOUT_MS = 3 * 60 * 1000;
        while (job.state !== 'JOB_STATE_COMPLETED' && job.state !== 'JOB_STATE_FAILED') {
          if (Date.now() - startedAt > TIMEOUT_MS) {
            throw new Error('Video transcode timed out');
          }
          await new Promise<void>((r) => setTimeout(r, 1500));
          if (abort.signal.aborted) throw new Error('Aborted');
          const next = await getVideoJobStatus(serviceJwt, job.jobId);
          job = next.jobStatus;
          setStatus({
            kind: 'processing',
            progress: job.progress ? job.progress / 100 : undefined,
          });
        }

        if (job.state === 'JOB_STATE_FAILED' || !job.blob) {
          throw new Error(job.error || job.message || 'Transcode failed');
        }

        const done: VideoUploadStatus = {
          kind: 'done',
          blob: { $type: 'blob', ...job.blob },
        };
        setStatus(done);
        return done;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        const errored: VideoUploadStatus = { kind: 'error', message };
        setStatus(errored);
        return errored;
      } finally {
        if (abortRef.current === abort) abortRef.current = null;
      }
    },
    [token, currentAccount?.did, currentAccount?.pdsUrl],
  );

  return { status, upload, reset };
}
