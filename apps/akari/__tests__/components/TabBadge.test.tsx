import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;

const loadTabBadge = () => {
  let TabBadge: any;

  jest.isolateModules(() => {
    TabBadge = require('@/components/TabBadge').TabBadge;
  });

  if (!TabBadge) {
    throw new Error('TabBadge failed to load');
  }

  return TabBadge;
};

describe('TabBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockImplementation((colors) => colors.light);
  });

  it('returns null when count is zero', () => {
    const TabBadge = loadTabBadge();

    const { toJSON } = render(<TabBadge count={0} />);
    expect(toJSON()).toBeNull();
  });

  it('displays the count when greater than zero', () => {
    const TabBadge = loadTabBadge();

    const { getByText } = render(<TabBadge count={5} />);
    expect(getByText('5')).toBeTruthy();
  });

  it('shows "99+" when count exceeds 99', () => {
    const TabBadge = loadTabBadge();

    const { getByText } = render(<TabBadge count={150} />);
    expect(getByText('99+')).toBeTruthy();
  });

  it('applies small badge styles when size is small', () => {
    const TabBadge = loadTabBadge();

    const { toJSON } = render(<TabBadge count={1} size="small" />);
    const view = toJSON() as any;
    const style = StyleSheet.flatten(view.props.style);
    expect(style.height).toBe(16);
  });

  it('applies medium badge styles by default', () => {
    const TabBadge = loadTabBadge();

    const { toJSON } = render(<TabBadge count={1} />);
    const view = toJSON() as any;
    const style = StyleSheet.flatten(view.props.style);
    expect(style.height).toBe(20);
  });

  it('calls useThemeColor for background and text colors', () => {
    const TabBadge = loadTabBadge();

    render(<TabBadge count={1} />);
    expect(mockUseThemeColor).toHaveBeenNthCalledWith(
      1,
      { light: '#ff3b30', dark: '#ff453a' },
      'tint',
    );
    expect(mockUseThemeColor).toHaveBeenNthCalledWith(
      2,
      { light: '#ffffff', dark: '#ffffff' },
      'text',
    );
  });

  it('uses Android offsets for badge positioning', () => {
    let TabBadge: any;

    jest.isolateModules(() => {
      jest.doMock('react-native', () => {
        const flatten = (style: any): any => {
          if (Array.isArray(style)) {
            return style.reduce((acc, item) => ({ ...acc, ...flatten(item) }), {});
          }

          return style ?? {};
        };

        return {
          Platform: {
            OS: 'android',
            select: (config: Record<string, unknown>) => {
              const value = config.android ?? config.default;
              return typeof value === 'function' ? value() : value;
            },
          },
          StyleSheet: {
            create: <T,>(styles: T) => styles,
            flatten,
          },
          View: 'View',
        };
      });

      jest.doMock('@/components/ThemedText', () => ({
        ThemedText: ({ children, style }: { children: any; style?: unknown }) => ({
          type: 'ThemedText',
          props: { children, style },
        }),
      }));

      TabBadge = require('@/components/TabBadge').TabBadge;
    });

    jest.dontMock('react-native');
    jest.dontMock('@/components/ThemedText');

    if (!TabBadge) {
      throw new Error('TabBadge failed to load with Android platform');
    }

    const flatten = (style: any): any => {
      if (Array.isArray(style)) {
        return style.reduce((acc, item) => ({ ...acc, ...flatten(item) }), {});
      }

      return style ?? {};
    };

    const defaultElement = TabBadge({ count: 1 });
    const defaultStyle = flatten(defaultElement.props.style);

    expect(defaultStyle.top).toBe(-5);
    expect(defaultStyle.right).toBe(-5);
    expect(defaultStyle.shadowColor).toBeUndefined();

    const smallElement = TabBadge({ count: 1, size: 'small' });
    const smallStyle = flatten(smallElement.props.style);

    expect(smallStyle.top).toBe(-4);
    expect(smallStyle.right).toBe(-4);
  });
});
