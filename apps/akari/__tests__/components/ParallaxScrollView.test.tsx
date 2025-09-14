import { render } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';

const mockScrollOffset = { value: 0 };

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return {
    ...Reanimated,
    useScrollViewOffset: () => mockScrollOffset,
    useAnimatedStyle: (fn: () => unknown) => fn(),
    interpolate: (value: number, input: number[], output: number[]) => {
      const index = input.indexOf(value);
      if (index !== -1) return output[index];
      const start = input[0];
      const end = input[input.length - 1];
      const t = (value - start) / (end - start);
      return output[0] + t * (output[output.length - 1] - output[0]);
    },
  };
});

jest.mock('@/hooks/useColorScheme');
jest.mock('@/components/ui/TabBarBackground');

const mockUseColorScheme = useColorScheme as jest.Mock;
const mockUseBottomTabOverflow = useBottomTabOverflow as jest.Mock;

const getAncestor = (node: any, predicate: (n: any) => boolean) => {
  let current = node.parent;
  while (current && !predicate(current)) {
    current = current.parent;
  }
  return current;
};

describe('ParallaxScrollView', () => {
  const headerBackgroundColor = { light: 'white', dark: 'black' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseColorScheme.mockReturnValue('light');
    mockUseBottomTabOverflow.mockReturnValue(0);
    mockScrollOffset.value = 0;
  });

  it('renders header image and children', () => {
    const { getByText, getByTestId } = render(
      <ParallaxScrollView headerImage={<Text testID="header-image">Header</Text>} headerBackgroundColor={headerBackgroundColor}>
        <Text>Content</Text>
      </ParallaxScrollView>,
    );
    expect(getByText('Header')).toBeTruthy();
    expect(getByText('Content')).toBeTruthy();
    expect(getByTestId('header-image')).toBeTruthy();
  });

  it('applies bottom tab overflow to scroll view', () => {
    mockUseBottomTabOverflow.mockReturnValue(30);
    const { getByText } = render(
      <ParallaxScrollView headerImage={<Text testID="header-image">Header</Text>} headerBackgroundColor={headerBackgroundColor}>
        <Text>Content</Text>
      </ParallaxScrollView>,
    );
    const scrollView = getAncestor(
      getByText('Content'),
      (n) => n.props?.scrollEventThrottle !== undefined,
    );
    expect(scrollView.props.contentContainerStyle).toEqual(
      expect.objectContaining({ paddingBottom: 30 }),
    );
  });

  describe('theme support', () => {
    it('uses light background by default', () => {
      mockUseColorScheme.mockReturnValue(undefined);
      const { getByTestId } = render(
        <ParallaxScrollView headerImage={<Text testID="header-image">Header</Text>} headerBackgroundColor={headerBackgroundColor}>
          <Text>Content</Text>
        </ParallaxScrollView>,
      );
      const header = getAncestor(
        getByTestId('header-image'),
        (n) => StyleSheet.flatten(n.props?.style)?.height === 250,
      );
      const style = StyleSheet.flatten(header.props.style);
      expect(style.backgroundColor).toBe('white');
    });

    it('uses dark theme colors', () => {
      mockUseColorScheme.mockReturnValue('dark');
      const { getByTestId } = render(
        <ParallaxScrollView headerImage={<Text testID="header-image">Header</Text>} headerBackgroundColor={headerBackgroundColor}>
          <Text>Content</Text>
        </ParallaxScrollView>,
      );
      const header = getAncestor(
        getByTestId('header-image'),
        (n) => StyleSheet.flatten(n.props?.style)?.height === 250,
      );
      const style = StyleSheet.flatten(header.props.style);
      expect(style.backgroundColor).toBe('black');
    });
  });

  it('applies parallax transformations based on scroll offset', () => {
    mockScrollOffset.value = -250;
    const { getByTestId, rerender } = render(
      <ParallaxScrollView headerImage={<Text testID="header-image">Header</Text>} headerBackgroundColor={headerBackgroundColor}>
        <Text>Content</Text>
      </ParallaxScrollView>,
    );
    const header = getAncestor(
      getByTestId('header-image'),
      (n) => StyleSheet.flatten(n.props?.style)?.height === 250,
    );
    const styleArray = Array.isArray(header.props.style)
      ? header.props.style
      : [header.props.style];
    const animatedStyle = styleArray.find((s) => s && s.transform);
    expect(animatedStyle.transform[0].translateY).toBe(-125);
    expect(animatedStyle.transform[1].scale).toBe(2);

    mockScrollOffset.value = 250;
    rerender(
      <ParallaxScrollView headerImage={<Text testID="header-image">Header</Text>} headerBackgroundColor={headerBackgroundColor}>
        <Text>Content</Text>
      </ParallaxScrollView>,
    );
    const updatedHeader = getAncestor(
      getByTestId('header-image'),
      (n) => StyleSheet.flatten(n.props?.style)?.height === 250,
    );
    const updatedArray = Array.isArray(updatedHeader.props.style)
      ? updatedHeader.props.style
      : [updatedHeader.props.style];
    const updatedAnimated = updatedArray.find((s) => s && s.transform);
    expect(updatedAnimated.transform[0].translateY).toBeCloseTo(187.5);
    expect(updatedAnimated.transform[1].scale).toBe(1);
  });
});

