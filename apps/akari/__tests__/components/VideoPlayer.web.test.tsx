import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { VideoPlayer } from '../../components/VideoPlayer.web';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('hls.js', () => ({ default: jest.fn(), Events: {}, isSupported: jest.fn(() => false) }));
jest.mock('@/hooks/useThemeColor');

const mockUseThemeColor = useThemeColor as jest.Mock;

beforeEach(() => {
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

  it('hides metadata when controls are disabled', () => {
    const { queryByText } = render(
      <VideoPlayer
        videoUrl="https://example.com/video.mp4"
        title="Hidden"
        showControls={false}
      />,
    );

    expect(queryByText('Hidden')).toBeNull();
  });

  it('shows error state and resets on tap', () => {
    const setStatus = jest.fn();
    const setError = jest.fn();
    const useStateSpy = jest
      .spyOn(React, 'useState')
      .mockImplementationOnce(() => ['error', setStatus])
      .mockImplementationOnce(() => ['Test failure', setError]);

    const { getByText } = render(<VideoPlayer videoUrl="https://example.com/video.mp4" />);
    expect(getByText('Test failure')).toBeTruthy();

    fireEvent.press(getByText('Tap to retry'));
    expect(setStatus).toHaveBeenCalledWith('idle');
    expect(setError).toHaveBeenCalledWith(null);

    useStateSpy.mockRestore();
  });
});

