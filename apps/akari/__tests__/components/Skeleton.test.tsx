import { render } from '@testing-library/react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useThemeColor');

const mockUseThemeColor = useThemeColor as jest.Mock;

describe('Skeleton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default dimensions and theme color', () => {
    mockUseThemeColor.mockReturnValue('red');

    const { getByTestId, unmount } = render(<Skeleton testID="skeleton" />);

    expect(mockUseThemeColor).toHaveBeenCalledWith(
      { light: '#f0f0f0', dark: '#2a2a2a' },
      'background',
    );

    const view = getByTestId('skeleton');
    expect(view.props.style[0]).toMatchObject({
      width: '100%',
      height: 20,
      borderRadius: 4,
      backgroundColor: 'red',
    });

    expect(() => unmount()).not.toThrow();
  });

  it('supports custom colors and dimensions', () => {
    mockUseThemeColor.mockReturnValue('blue');

    const { getByTestId, unmount } = render(
      <Skeleton
        testID="skeleton"
        width={50}
        height={10}
        borderRadius={2}
        lightColor="pink"
        darkColor="green"
        style={{ margin: 1 }}
      />,
    );

    expect(mockUseThemeColor).toHaveBeenCalledWith(
      { light: 'pink', dark: 'green' },
      'background',
    );

    const view = getByTestId('skeleton');
    expect(view.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 50,
          height: 10,
          borderRadius: 2,
          backgroundColor: 'blue',
        }),
        expect.objectContaining({ margin: 1 }),
      ]),
    );

    expect(() => unmount()).not.toThrow();
  });
});
