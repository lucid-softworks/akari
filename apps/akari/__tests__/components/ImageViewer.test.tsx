import { act, fireEvent, render } from '@testing-library/react-native';

import { ImageViewer } from '@/components/ImageViewer';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

jest.mock('expo-image', () => ({ Image: jest.fn(() => null) }));
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');

const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;

describe('ImageViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockReturnValue('#000');
    mockUseTranslation.mockReturnValue({
      t: (key: string) => {
        const map: Record<string, string> = {
          'common.loading': 'Loading',
          'common.failedToLoadImage': 'Failed to load image',
        };
        return map[key] ?? key;
      },
    });
  });

  it('renders alt text and handles close action', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <ImageViewer visible onClose={onClose} imageUrl="url" altText="Alt" />,
    );

    expect(getByText('Alt')).toBeTruthy();
    fireEvent.press(getByText('✕'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows loading text until image loads', () => {
    const { getByText, queryByText } = render(
      <ImageViewer visible onClose={() => {}} imageUrl="url" />,
    );

    expect(getByText('Loading')).toBeTruthy();

    const Image = require('expo-image').Image as jest.Mock;
    act(() => {
      Image.mock.calls[0][0].onLoad();
    });

    expect(queryByText('Loading')).toBeNull();
  });

  it('displays error text when image fails to load', () => {
    const { getByText } = render(
      <ImageViewer visible onClose={() => {}} imageUrl="url" />,
    );

    const Image = require('expo-image').Image as jest.Mock;
    act(() => {
      Image.mock.calls[0][0].onError();
    });

    expect(getByText('Failed to load image')).toBeTruthy();
  });
});
