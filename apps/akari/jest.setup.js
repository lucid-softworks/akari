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
    const { View } = require('react-native');

    class FlashList extends React.Component {
      constructor(props) {
        super(props);

        this._scrollToOffset = jest.fn();
        this._scrollToIndex = jest.fn();
        this._scrollToEnd = jest.fn();

        this.scrollToOffset = (...args) => this._scrollToOffset(...args);
        this.scrollToIndex = (...args) => this._scrollToIndex(...args);
        this.scrollToEnd = (...args) => this._scrollToEnd(...args);
      }

      render() {
        const {
          data,
          renderItem,
          ListHeaderComponent,
          ListFooterComponent,
          ListEmptyComponent,
          ...rest
        } = this.props;

        const items = Array.isArray(data) ? data : [];
        const children = [];

        if (ListHeaderComponent) {
          children.push(
            typeof ListHeaderComponent === 'function'
              ? React.createElement(ListHeaderComponent)
              : ListHeaderComponent,
          );
        }

        if (items.length > 0 && typeof renderItem === 'function') {
          items.forEach((item, index) => {
            const element = renderItem({ item, index });

            if (element == null) {
              return;
            }

            children.push(
              React.createElement(
                React.Fragment,
                { key: `item-${item?.id ?? item?.key ?? index}` },
                element,
              ),
            );
          });
        } else if (items.length === 0 && ListEmptyComponent) {
          children.push(
            typeof ListEmptyComponent === 'function'
              ? React.createElement(ListEmptyComponent)
              : ListEmptyComponent,
          );
        }

        if (ListFooterComponent) {
          children.push(
            typeof ListFooterComponent === 'function'
              ? React.createElement(ListFooterComponent)
              : ListFooterComponent,
          );
        }

        return React.createElement(View, rest, ...children);
      }
    }

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
