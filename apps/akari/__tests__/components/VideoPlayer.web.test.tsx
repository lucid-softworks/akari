import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import { VideoPlayer } from '../../components/VideoPlayer.web';
import { useThemeColor } from '@/hooks/useThemeColor';
import { resolveBlueskyVideoUrl } from '@/bluesky-api';

jest.mock('hls.js', () => ({ default: jest.fn(), Events: {}, isSupported: jest.fn(() => false) }));
jest.mock('@/hooks/useThemeColor');
jest.mock('@/bluesky-api', () => ({ resolveBlueskyVideoUrl: jest.fn() }));

const mockUseThemeColor = useThemeColor as jest.Mock;
const mockResolveVideoUrl = resolveBlueskyVideoUrl as jest.Mock;

beforeEach(() => {
  mockResolveVideoUrl.mockReset();
  mockUseThemeColor.mockReturnValue('#000');
  (window as any).addEventListener = jest.fn();
  (window as any).removeEventListener = jest.fn();
});

describe('VideoPlayer.web', () => {
  it('renders title and description when provided', () => {
    const { getByText } = render(
      <VideoPlayer
        videoUrl="https://example.com/video.mp4"
        title="Sample Title"
        description="Sample Description"
      />,
    );

    expect(getByText('Sample Title')).toBeTruthy();
    expect(getByText('Sample Description')).toBeTruthy();
  });

  it('hides metadata when controls are disabled', async () => {
    const { getByText, queryByText } = render(
      <VideoPlayer
        videoUrl="https://example.com/video.mp4"
        title="Hidden"
        showControls={false}
      />,
    );

    fireEvent.press(getByText('▶'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(queryByText('Hidden')).toBeNull();
  });

  it('ignores empty title and description', async () => {
    const { getByText, queryByText } = render(
      <VideoPlayer videoUrl="https://example.com/video.mp4" title="   " description="" />,
    );

    fireEvent.press(getByText('▶'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(queryByText(/\S/)).toBeNull();
  });

  it('shows error state and resets on tap', () => {
    const dispatch = jest.fn();
    const errorState = {
      playerStatus: 'error',
      playerError: 'Test failure',
      shouldShowVideo: false,
      playbackUrl: null,
      isResolvingUrl: false,
    };
    const useReducerSpy = jest
      .spyOn(React, 'useReducer')
      .mockImplementationOnce(() => [errorState, dispatch] as any);

    const { getByText } = render(<VideoPlayer videoUrl="https://example.com/video.mp4" />);
    expect(getByText('Test failure')).toBeTruthy();

    fireEvent.press(getByText('ui.tapToRetry'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'reset' });

    useReducerSpy.mockRestore();
  });

  it('resolves Bluesky playlist URLs on demand', async () => {
    const playlistUrl = 'https://video.bsky.app/v/789/playlist.m3u8';
    mockResolveVideoUrl.mockResolvedValueOnce('https://cdn.bsky.app/video.mp4');

    const { getByText } = render(<VideoPlayer videoUrl={playlistUrl} />);

    expect(mockResolveVideoUrl).not.toHaveBeenCalled();

    fireEvent.press(getByText('▶'));

    expect(mockResolveVideoUrl).toHaveBeenCalledWith(playlistUrl);

    await act(async () => {
      await Promise.resolve();
    });
  });
});

