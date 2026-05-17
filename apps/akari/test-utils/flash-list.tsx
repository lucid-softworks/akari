import React from 'react';
import { View } from 'react-native';

export const mockScrollToOffset = jest.fn();

type SupplementalComponent =
  | React.ReactElement
  | React.ComponentType
  | (() => React.ReactNode)
  | null
  | undefined;

function Supplemental({ component }: { component: SupplementalComponent }) {
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

export function FlashList(props: any) {
  const {
    data = [],
    renderItem,
    ListEmptyComponent,
    ListFooterComponent,
    ListHeaderComponent,
    keyExtractor,
    style,
    ref,
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
      <Supplemental component={ListHeaderComponent} />
      {shouldShowEmpty ? <Supplemental component={ListEmptyComponent} /> : items}
      <Supplemental component={ListFooterComponent} />
    </View>
  );
}

FlashList.displayName = 'FlashList';
