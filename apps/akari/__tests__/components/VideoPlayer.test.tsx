import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { resolveBlueskyVideoUrl } from '@/bluesky-api';
import { useThemeColor } from '@/hooks/useThemeColor';
import * as WebPlayerModule from '../../components/VideoPlayer.web';

jest.mock('expo-image', () => ({ Image: jest.fn(() => null) }));
jest.mock('@/hooks/useThemeColor');
jest.mock('@/bluesky-api', () => ({ resolveBlueskyVideoUrl: jest.fn() }));

const mockSeek = jest.fn();
const mockVideo = jest.fn();

jest.mock('react-native-video', () => {
  const React = require('react');
  return React.forwardRef((props: any, ref: any) => {
    mockVideo(props);
    React.useImperativeHandle(ref, () => ({
      seek: mockSeek,
    }));
    return null;
  });
});

const mockWebPlayer = jest.spyOn(WebPlayerModule, 'VideoPlayer').mockImplementation(() => null);

import { VideoPlayer } from '@/components/VideoPlayer';

const mockUseThemeColor = useThemeColor as jest.Mock;
const mockResolveVideoUrl = resolveBlueskyVideoUrl as jest.Mock;

describe('VideoPlayer', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveVideoUrl.mockReset();
    mockUseThemeColor.mockReturnValue('#000');
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    jest.useFakeTimers();
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders thumbnail with play icon and title', () => {
    const { getByText } = render(<VideoPlayer videoUrl="https://example.com/video.mp4" title="Sample" />);
    expect(getByText('▶')).toBeTruthy();
    expect(getByText('Sample')).toBeTruthy();
  });

  it('renders web player on web platform', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    render(<VideoPlayer videoUrl="https://example.com/video.mp4" />);
    expect(mockWebPlayer).toHaveBeenCalled();
  });

  it('handles playback lifecycle events', () => {
    const { getByText } = render(
      <VideoPlayer
        videoUrl="https://example.com/video.m3u8"
        thumbnailUrl="https://example.com/thumbnail.jpg"
        title="Title"
        description="Desc"
        aspectRatio={{ width: 4, height: 3 }}
      />,
    );

    const play = getByText('▶');
    fireEvent.press(play);

    expect(mockResolveVideoUrl).not.toHaveBeenCalled();

    const videoProps = mockVideo.mock.calls[0][0];

    act(() => {
      videoProps.onLoadStart?.({});
      videoProps.onProgress?.({});
      videoProps.onBuffer?.({});
      videoProps.onLoad?.({});
    });

    act(() => {
      jest.advanceTimersByTime(100);
      videoProps.onEnd?.({});
    });

    expect(mockSeek).toHaveBeenCalledWith(0);
  });

  it('handles loading timeout and retry', () => {
    const { getByText, queryByText } = render(
      <VideoPlayer videoUrl="https://example.com/video.mp4" aspectRatio={{ width: 4, height: 3 }} />,
    );

    const play = getByText('▶');
    fireEvent.press(play);

    act(() => {
      jest.advanceTimersByTime(15000);
    });

    expect(getByText('Video loading timeout')).toBeTruthy();

    fireEvent.press(getByText('Tap to retry'));
    expect(queryByText('Video loading timeout')).toBeNull();
  });

  it('handles various error messages and reset', () => {
    const { getByText, queryByText } = render(
      <VideoPlayer videoUrl="https://example.com/video.mp4" />,
    );

    const play = getByText('▶');
    fireEvent.press(play);

    const videoProps = mockVideo.mock.calls[0][0];

    act(() => {
      videoProps.onError?.({ error: { localizedDescription: 'bad' } });
      videoProps.onError?.({ error: { code: '404' } });
      videoProps.onError?.('simple');
      videoProps.onError?.({});
      videoProps.onError?.({
        get error() {
          throw new Error('boom');
        },
      });
      jest.advanceTimersByTime(5000);
    });

    expect(queryByText(/Failed to load video/)).toBeNull();
  });

  it('resolves Bluesky playlist URLs only when playback starts', async () => {
    const playlistUrl = 'https://video.bsky.app/v/123/playlist.m3u8';
    const resolvedUrl = 'https://cdn.bsky.app/video.mp4';
    mockResolveVideoUrl.mockResolvedValueOnce(resolvedUrl);

    const { getByText } = render(<VideoPlayer videoUrl={playlistUrl} />);

    expect(mockResolveVideoUrl).not.toHaveBeenCalled();

    fireEvent.press(getByText('▶'));

    expect(mockResolveVideoUrl).toHaveBeenCalledWith(playlistUrl);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => expect(mockVideo).toHaveBeenCalled());

    const videoProps = mockVideo.mock.calls[0][0];
    expect(videoProps.source?.uri).toBe(resolvedUrl);
  });

  it('falls back to the original playlist when resolution fails', async () => {
    const playlistUrl = 'https://video.bsky.app/v/456/playlist.m3u8';
    mockResolveVideoUrl.mockRejectedValueOnce(new Error('nope'));

    const { getByText } = render(<VideoPlayer videoUrl={playlistUrl} />);
    fireEvent.press(getByText('▶'));

    expect(mockResolveVideoUrl).toHaveBeenCalledWith(playlistUrl);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => expect(mockVideo).toHaveBeenCalled());

    const videoProps = mockVideo.mock.calls[0][0];
    expect(videoProps.source?.uri).toBe(playlistUrl);
  });

  it('ignores empty or invalid video URLs', () => {
    for (const badUrl of ['', 'not-a-url']) {
      const { getByText } = render(<VideoPlayer videoUrl={badUrl} />);
      const play = getByText('▶');
      fireEvent.press(play);
      expect(mockVideo).not.toHaveBeenCalled();
      mockVideo.mockClear();
    }
  });

  it('renders video without metadata when none provided', () => {
    const { getByText, queryByText } = render(<VideoPlayer videoUrl="https://example.com/video.mp4" />);
    const play = getByText('▶');
    fireEvent.press(play);

    const videoProps = mockVideo.mock.calls[0][0];

    act(() => {
      videoProps.onLoadStart?.({});
      videoProps.onLoad?.({});
      jest.advanceTimersByTime(100);
    });

    expect(queryByText('Tap to retry')).toBeNull();
  });
});

