import React from 'react';
import { ViewStyle } from 'react-native';

type WithSkeletonProps = {
  isLoading?: boolean;
  skeletonComponent: React.ComponentType<any>;
  skeletonProps?: any;
  style?: ViewStyle;
};

export function withSkeleton<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  defaultSkeletonComponent: React.ComponentType<any>
) {
  return function WithSkeletonComponent({
    isLoading = false,
    skeletonComponent: SkeletonComponent = defaultSkeletonComponent,
    skeletonProps,
    style,
    ...props
  }: P & WithSkeletonProps) {
    if (isLoading) {
      return <SkeletonComponent {...skeletonProps} style={style} />;
    }

    return <WrappedComponent {...(props as P)} style={style} />;
  };
} 