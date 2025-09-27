import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';

import { resolveBlueskyVideoUrl } from './video';

describe('resolveBlueskyVideoUrl', () => {
  const originalConsoleError = console.error;
  const server = setupServer();

  beforeAll(() => server.listen());

  afterEach(() => {
    server.resetHandlers();
    jest.restoreAllMocks();
    console.error = originalConsoleError;
    jest.useRealTimers();
  });

  afterAll(() => server.close());

  it('returns the original url for non-Bluesky playlists', async () => {
    const url = 'https://example.com/video.mp4';
    const result = await resolveBlueskyVideoUrl(url);
    expect(result).toBe(url);
  });

  it('resolves playlist urls to video urls with session ids', async () => {
    const playlist = `#EXTM3U\n#EXT-X-VERSION:3\nsegment1.ts\nvideo.m3u8?session_id=abc123`;
    let capturedHeaders: Record<string, string> | undefined;

    server.use(
      http.get('https://video.bsky.app/path/playlist.m3u8', async ({ request }) => {
        capturedHeaders = Object.fromEntries(request.headers.entries());
        return HttpResponse.text(playlist, {
          headers: { 'Content-Type': 'application/vnd.apple.mpegurl' },
        });
      }),
    );

    const result = await resolveBlueskyVideoUrl('https://video.bsky.app/path/playlist.m3u8');

    expect(capturedHeaders).toBeDefined();
    const headers = capturedHeaders!;
    expect(headers.accept).toBe('application/vnd.apple.mpegurl,application/x-mpegurl,*/*');
    expect(headers['user-agent']).toBe('VideoPlayer/1.0');
    expect(result).toBe('https://video.bsky.app/path/video.m3u8?session_id=abc123');
  });

  it('returns undefined and logs errors when playlist parsing fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.get('https://video.bsky.app/path/playlist.m3u8', () =>
        HttpResponse.text('#EXTM3U\n# Comment without session id', {
          headers: { 'Content-Type': 'application/vnd.apple.mpegurl' },
        }),
      ),
    );

    const result = await resolveBlueskyVideoUrl('https://video.bsky.app/path/playlist.m3u8');

    expect(result).toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('returns undefined with http error message when fetch fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.get('https://video.bsky.app/path/playlist.m3u8', () =>
        HttpResponse.text('Not Found', { status: 404, statusText: 'Not Found' }),
      ),
    );

    const result = await resolveBlueskyVideoUrl('https://video.bsky.app/path/playlist.m3u8');

    expect(result).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith('Video resolution: Failed to resolve playlist:', expect.any(Error));
  });

  it('handles aborted requests gracefully', async () => {
    jest.useFakeTimers();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.get('https://video.bsky.app/path/playlist.m3u8', async () => {
        await delay('infinite');
        return HttpResponse.text('');
      }),
    );

    const promise = resolveBlueskyVideoUrl('https://video.bsky.app/path/playlist.m3u8');
    jest.runOnlyPendingTimers();
    const result = await promise;

    expect(result).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith('Video resolution: Request timeout');
  });
});
