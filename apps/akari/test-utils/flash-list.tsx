import React from 'react';
import { View } from 'react-native';

export const mockScrollToOffset = jest.fn();

type SupplementalComponent =
  | React.ReactElement
  | React.ComponentType
  | (() => React.ReactNode)
  | null
  | undefined;

function renderSupplemental(component: SupplementalComponent) {
  if (!component) {
    return null;
  }

  if (typeof component === 'function') {
    const Component = component as () => React.ReactNode;
    return <React.Fragment>{Component()}</React.Fragment>;
  }

  if (React.isValidElement(component)) {
    return component;
  }

  const Component = component as React.ComponentType;
  return <Component />;
}

export const FlashList = React.forwardRef<any, any>((props, ref) => {
  const {
    data = [],
    renderItem,
    ListEmptyComponent,
    ListFooterComponent,
    ListHeaderComponent,
    keyExtractor,
    style,
  } = props;

  React.useImperativeHandle(ref, () => ({
    scrollToOffset: mockScrollToOffset,
  }));

  const typedData = Array.isArray(data) ? data : [];

  const items =
    renderItem && typedData.length > 0
      ? typedData.map((item: any, index: number) => {
          const rendered = renderItem({ item, index });
          const key = keyExtractor ? keyExtractor(item, index) : index;

          return <React.Fragment key={key}>{rendered}</React.Fragment>;
        })
      : null;

  const shouldShowEmpty = typedData.length === 0 && ListEmptyComponent;

  return (
    <View style={style}>
      {renderSupplemental(ListHeaderComponent)}
      {shouldShowEmpty ? renderSupplemental(ListEmptyComponent) : items}
      {renderSupplemental(ListFooterComponent)}
    </View>
  );
});

FlashList.displayName = 'FlashList';
