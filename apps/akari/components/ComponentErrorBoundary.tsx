import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, radius, fontSize, fontWeight, lineHeight } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type ErrorBoundaryFallbackProps = {
  error: Error | null;
  reset: () => void;
};

type ComponentErrorBoundaryProps = {
  children: React.ReactNode;
  FallbackComponent?: React.ComponentType<ErrorBoundaryFallbackProps>;
  onReset?: () => void;
  resetKeys?: readonly unknown[];
};

type ComponentErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

const DefaultFallback: React.FC<ErrorBoundaryFallbackProps> = ({ error }) => {
  const borderColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor(
    { light: '#FFF5F5', dark: '#2B1818' },
    'background',
  );
  const textColor = useThemeColor({}, 'text');
  const { t } = useTranslation();

  return (
    <View
      accessibilityRole="alert"
      style={[styles.container, { borderColor, backgroundColor }]}
      accessibilityLabel={t('common.error')}
      accessibilityHint={t('notifications.somethingWentWrong')}
    >
      <Text style={[styles.title, { color: textColor }]}>{t('common.error')}</Text>
      <Text style={[styles.message, { color: textColor }]}>
        {t('notifications.somethingWentWrong')}
      </Text>
      {__DEV__ && error ? (
        <Text style={[styles.details, { color: textColor }]} numberOfLines={2}>
          {error.message}
        </Text>
      ) : null}
    </View>
  );
};

class ComponentErrorBoundaryInner extends React.Component<
  ComponentErrorBoundaryProps,
  ComponentErrorBoundaryState
> {
  state: ComponentErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ComponentErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ComponentErrorBoundary caught an error', error, errorInfo);
  }

  componentDidUpdate(prevProps: ComponentErrorBoundaryProps) {
    const { resetKeys } = this.props;

    if (
      this.state.hasError &&
      resetKeys &&
      !areArraysEqual(resetKeys, prevProps.resetKeys)
    ) {
      this.resetBoundary();
    }
  }

  resetBoundary() {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  }

  render(): React.ReactNode {
    const { hasError, error } = this.state;
    const { children, FallbackComponent } = this.props;

    if (hasError) {
      const Fallback = FallbackComponent ?? DefaultFallback;
      return <Fallback error={error} reset={() => this.resetBoundary()} />;
    }

    return children;
  }
}

const areArraysEqual = (
  first: readonly unknown[] | undefined,
  second: readonly unknown[] | undefined,
) => {
  if (first === second) {
    return true;
  }

  if (!first || !second || first.length !== second.length) {
    return false;
  }

  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) {
      return false;
    }
  }

  return true;
};

export function ComponentErrorBoundary({
  children,
  FallbackComponent,
  onReset,
  resetKeys,
}: ComponentErrorBoundaryProps) {
  return (
    <ComponentErrorBoundaryInner
      FallbackComponent={FallbackComponent}
      onReset={onReset}
      resetKeys={resetKeys}
    >
      {children}
    </ComponentErrorBoundaryInner>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  message: {
    fontSize: fontSize.base,
    lineHeight: lineHeight.normal,
  },
  details: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.tight,
    opacity: 0.8,
  },
});

export type { ComponentErrorBoundaryProps };
