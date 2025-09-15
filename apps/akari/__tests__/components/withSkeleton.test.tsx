import React from 'react';
import { Text } from 'react-native';
import type { ViewStyle } from 'react-native';
import { render } from '@testing-library/react-native';

import { withSkeleton } from '@/components/ui/withSkeleton';

type BaseProps = { label: string; style?: ViewStyle };

const BaseComponent = ({ label, style }: BaseProps) => (
  <Text style={style}>{label}</Text>
);

const DefaultSkeleton = ({ style }: { style?: ViewStyle }) => (
  <Text style={style}>Default Skeleton</Text>
);

describe('withSkeleton', () => {
  it('renders the skeleton component when loading', () => {
    const Wrapped = withSkeleton(BaseComponent, DefaultSkeleton);
    const { getByText, queryByText } = render(
      <Wrapped isLoading label="Loaded" />
    );

    expect(getByText('Default Skeleton')).toBeTruthy();
    expect(queryByText('Loaded')).toBeNull();
  });

  it('renders the wrapped component when not loading', () => {
    const Wrapped = withSkeleton(BaseComponent, DefaultSkeleton);
    const style: ViewStyle = { backgroundColor: 'red' };
    const { getByText, queryByText } = render(
      <Wrapped label="Loaded" style={style} />
    );

    const text = getByText('Loaded');
    expect(text).toBeTruthy();
    expect(text.props.style).toEqual(style);
    expect(queryByText('Default Skeleton')).toBeNull();
  });

  it('uses a custom skeleton component and forwards props and style', () => {
    const Wrapped = withSkeleton(BaseComponent, DefaultSkeleton);
    const CustomSkeleton = ({ label, style }: { label: string; style?: ViewStyle }) => (
      <Text style={style}>{label}</Text>
    );
    const style: ViewStyle = { backgroundColor: 'blue' };
    const { getByText, queryByText } = render(
      <Wrapped
        isLoading
        label="Loaded"
        skeletonComponent={CustomSkeleton}
        skeletonProps={{ label: 'Custom Skeleton' }}
        style={style}
      />
    );

    const text = getByText('Custom Skeleton');
    expect(text).toBeTruthy();
    expect(text.props.style).toEqual(style);
    expect(queryByText('Default Skeleton')).toBeNull();
  });
});

