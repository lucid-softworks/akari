import {
  createUploadTask,
  FileSystemUploadType,
} from 'expo-file-system/legacy';
import { useCallback } from 'react';

import { getVideoJobStatus, type VideoJobStatus } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { apiForAccount } from '@/utils/blueskyApi';
import type { AttachedVideo } from '@/utils/postComposer/types';

type UseComposerVideoUploadOptions = {
  applyVideoPatch: (postIdx: number, patch: Partial<AttachedVideo> | null) => void;
  setVideoUploadPhase: (
    postIdx: number,
    upload: AttachedVideo['upload'],
  ) => void;
};

type UseComposerVideoUploadResult = {
  startVideoUpload: (
    postIdx: number,
    asset: { uri: string; mimeType: string },
  ) => Promise<void>;
};

/**
 * Runs the Bluesky video upload + transcode pipeline for an attached
 * video. The actual `attachedVideo` mutations live on the parent;
 * `applyVideoPatch` lets the parent merge progress updates into its
 * thread-post state.
 */
export function useComposerVideoUpload({
  applyVideoPatch,
  setVideoUploadPhase,
}: UseComposerVideoUploadOptions): UseComposerVideoUploadResult {
  const { data: currentAccount } = useCurrentAccount();
  const { data: jwtToken } = useJwtToken();

  const startVideoUpload = useCallback(
    async (postIdx: number, asset: { uri: string; mimeType: string }) => {
      if (!jwtToken || !currentAccount?.did || !currentAccount?.pdsUrl) return;
      setVideoUploadPhase(postIdx, { phase: 'authorizing' });
      try {
        const api = apiForAccount(currentAccount);
        // The video service expects the JWT's audience to be the
        // user's PDS DID (did:web:<pds-hostname>) and the lxm to be
        // `com.atproto.repo.uploadBlob`, not the obvious
        // `app.bsky.video.uploadVideo` lxm. That uses the PDS-issued
        // service-auth as a stand-in for an uploadBlob credential
        // (the video service stores the resulting blob on the PDS).
        const pdsHostMatch = currentAccount.pdsUrl.match(/^https?:\/\/([^/?#]+)/i);
        const pdsHost = pdsHostMatch?.[1];
        if (!pdsHost) throw new Error('Invalid PDS URL');
        const auth = await api.getServiceAuth(
          jwtToken,
          `did:web:${pdsHost}`,
          'com.atproto.repo.uploadBlob',
          30 * 60,
        );
        const serviceJwt = auth?.token;
        if (!serviceJwt) {
          throw new Error("PDS didn't return a video service token");
        }

        // The video service dedupes by `did + name`. Reusing the same
        // filename triggers a 409 `already_exists` even when the bytes
        // are identical (it doesn't hand back the previous blob, so
        // we can't reuse it). Keep the original extension but stamp
        // each attempt with a random + timestamped slug so retries
        // don't collide.
        const ext =
          asset.uri.split('/').pop()?.split('?')[0]?.split('.').pop() || 'mp4';
        const fileName = `akari-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 10)}.${ext}`;

        applyVideoPatch(postIdx, { upload: { phase: 'uploading', progress: 0 } });

        const uploadUrl =
          `https://video.bsky.app/xrpc/app.bsky.video.uploadVideo` +
          `?did=${encodeURIComponent(currentAccount.did)}` +
          `&name=${encodeURIComponent(fileName)}`;
        const uploadTask = createUploadTask(
          uploadUrl,
          asset.uri,
          {
            httpMethod: 'POST',
            uploadType: FileSystemUploadType.BINARY_CONTENT,
            headers: {
              'Content-Type': asset.mimeType,
              Authorization: `Bearer ${serviceJwt}`,
            },
          },
          (p) => {
            if (p.totalBytesExpectedToSend > 0) {
              applyVideoPatch(postIdx, {
                upload: {
                  phase: 'uploading',
                  progress: p.totalBytesSent / p.totalBytesExpectedToSend,
                },
              });
            }
          },
        );
        const uploadRes = await uploadTask.uploadAsync();
        if (__DEV__) {
          console.warn(
            'Video upload response',
            uploadRes?.status,
            uploadRes?.body,
          );
        }
        const isOk =
          uploadRes && uploadRes.status >= 200 && uploadRes.status < 300;
        const parsedJsonBody = (() => {
          try {
            return uploadRes?.body ? JSON.parse(uploadRes.body) : null;
          } catch {
            return null;
          }
        })();
        const existingJobId =
          parsedJsonBody?.jobId ||
          parsedJsonBody?.jobStatus?.jobId ||
          parsedJsonBody?.id;
        const isAlreadyProcessed =
          uploadRes?.status === 409 && existingJobId;
        if (!isOk && !isAlreadyProcessed) {
          const detail = uploadRes?.body || `status ${uploadRes?.status ?? 'unknown'}`;
          throw new Error(`upload ${uploadRes?.status}: ${detail}`);
        }
        let job: VideoJobStatus =
          parsedJsonBody?.jobStatus ?? (parsedJsonBody as VideoJobStatus);
        if (isAlreadyProcessed && !job.blob && existingJobId) {
          const refreshed = await getVideoJobStatus(serviceJwt, existingJobId);
          job = refreshed.jobStatus;
        }
        applyVideoPatch(postIdx, {
          upload: {
            phase: 'processing',
            progress: job.progress ? job.progress / 100 : undefined,
          },
        });

        const startedAt = Date.now();
        while (job.state !== 'JOB_STATE_COMPLETED' && job.state !== 'JOB_STATE_FAILED') {
          if (Date.now() - startedAt > 3 * 60 * 1000) {
            throw new Error('Video transcode timed out');
          }
          await new Promise<void>((r) => setTimeout(r, 1500));
          const next = await getVideoJobStatus(serviceJwt, job.jobId);
          job = next.jobStatus;
          applyVideoPatch(postIdx, {
            upload: {
              phase: 'processing',
              progress: job.progress ? job.progress / 100 : undefined,
            },
          });
        }

        if (job.state === 'JOB_STATE_FAILED' || !job.blob) {
          throw new Error(job.error || job.message || 'Transcode failed');
        }

        applyVideoPatch(postIdx, {
          blob: { $type: 'blob', ...job.blob },
          upload: undefined,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        applyVideoPatch(postIdx, { upload: { phase: 'error', message } });
      }
    },
    [jwtToken, currentAccount, applyVideoPatch, setVideoUploadPhase],
  );

  return { startVideoUpload };
}
