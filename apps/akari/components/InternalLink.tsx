import React, { useCallback } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import type { NavigationState, PartialState } from '@react-navigation/native';
import { router } from 'expo-router';

type InternalNavigationAction = 'push' | 'replace';

type NavigateInternalOptions = {
  href: string;
  action?: InternalNavigationAction;
};

type InternalLinkProps = Omit<PressableProps, 'onPress'> & {
  href: string;
  action?: InternalNavigationAction;
  onPress?: () => void;
  children: React.ReactNode;
};

function findActiveRoute(
  state: NavigationState | PartialState<NavigationState> | undefined,
): NavigationState | PartialState<NavigationState> | undefined {
  if (!state || !('routes' in state)) {
    return undefined;
  }

  const index = state.index ?? state.routes.length - 1;
  const activeRoute = state.routes[index];

  if (!activeRoute) {
    return undefined;
  }

  if (activeRoute.name === '(tabs)') {
    return state;
  }

  if (activeRoute.state) {
    return findActiveRoute(activeRoute.state as NavigationState | PartialState<NavigationState>);
  }

  return undefined;
}

function resolveHref(href: string) {
  if (href.startsWith('/(tabs)') || href.startsWith('/(')) {
    return href;
  }

  const normalized = href.startsWith('/') ? href : `/${href}`;
  return `/(tabs)${normalized}`;
}

export function navigateInternal({ href, action = 'push' }: NavigateInternalOptions) {
  const resolvedHref = resolveHref(href);
  const state = router.getState();

  if (state && !findActiveRoute(state)) {
    router.navigate('/(tabs)');
  }

  router[action](resolvedHref as never);
}

export function InternalLink({ href, action = 'push', onPress, children, ...pressableProps }: InternalLinkProps) {
  const handlePress = useCallback(() => {
    onPress?.();
    navigateInternal({ href, action });
  }, [action, href, onPress]);

  return (
    <Pressable {...pressableProps} onPress={handlePress}>
      {children}
    </Pressable>
  );
}
