jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native/Libraries/Animated/NativeAnimatedModule');

jest.mock(
  '@shopify/flash-list',
  () => {
    const React = require('react');
    const { FlatList } = require('react-native');

    const FlashList = React.forwardRef((props, ref) => <FlatList ref={ref} {...props} />);
    FlashList.displayName = 'FlashList';

    return { FlashList };
  },
  { virtual: true },
);

const { act } = require('@testing-library/react-native');

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  if (jest.isMockFunction(setTimeout)) {
    act(() => {
      jest.runAllTimers();
    });
    jest.useRealTimers();
  }
});
