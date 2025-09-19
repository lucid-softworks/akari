import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';

type ToastType = 'success' | 'error' | 'info';

export type ToastOptions = {
  id?: string;
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
};

type Toast = Required<Pick<ToastOptions, 'message'>> & {
  id: string;
  title?: string;
  type: ToastType;
  duration: number;
};

type ToastContextValue = {
  showToast: (options: ToastOptions) => string;
  hideToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

type ToastProviderProps = {
  children: React.ReactNode;
};

type ToastVisualStyle = {
  background: string;
  border: string;
  icon: string;
  text: string;
  subtitle: string;
};

const typeStyles: Record<ToastType, { light: ToastVisualStyle; dark: ToastVisualStyle }> = {
  success: {
    light: {
      background: '#E7F8EF',
      border: '#BBEAD1',
      icon: '#0F9D58',
      text: '#0B5132',
      subtitle: '#1D6F45',
    },
    dark: {
      background: '#123524',
      border: '#1D5135',
      icon: '#4ADE80',
      text: '#DCFCE7',
      subtitle: '#A7F3D0',
    },
  },
  error: {
    light: {
      background: '#FDE8E8',
      border: '#F9BDBD',
      icon: '#D93025',
      text: '#7F1D1D',
      subtitle: '#9F1239',
    },
    dark: {
      background: '#401617',
      border: '#5F2021',
      icon: '#F87171',
      text: '#FECACA',
      subtitle: '#FCA5A5',
    },
  },
  info: {
    light: {
      background: '#E1F2FE',
      border: '#B6E0FE',
      icon: '#0B74D3',
      text: '#0C4A6E',
      subtitle: '#1D4ED8',
    },
    dark: {
      background: '#102A43',
      border: '#1C3A5B',
      icon: '#60A5FA',
      text: '#DBEAFE',
      subtitle: '#BFDBFE',
    },
  },
};

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    const id = options.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const toast: Toast = {
      id,
      title: options.title,
      message: options.message,
      type: options.type ?? 'info',
      duration: options.duration ?? 3000,
    };

    setToasts((current) => {
      const existingIndex = current.findIndex((item) => item.id === id);

      if (existingIndex !== -1) {
        const updated = [...current];
        updated[existingIndex] = toast;
        return updated;
      }

      const next = [...current, toast];
      if (next.length > 3) {
        next.shift();
      }
      return next;
    });

    return id;
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      hideToast,
    }),
    [showToast, hideToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
}

type ToastViewportProps = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  const insets = useOptionalSafeAreaInsets();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
      <View
        pointerEvents="box-none"
        style={[styles.viewport, { paddingBottom: Math.max(insets.bottom, 24) }]}
      >
        {toasts.map((toast, index) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} style={index > 0 ? styles.toastSpacing : undefined} />
        ))}
      </View>
    </View>
  );
}

const defaultInsets: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

function useOptionalSafeAreaInsets(): EdgeInsets {
  try {
    return useSafeAreaInsets();
  } catch {
    return defaultInsets;
  }
}

type ToastItemProps = {
  toast: Toast;
  onDismiss: (id: string) => void;
  style?: StyleProp<ViewStyle>;
};

function ToastItem({ toast, onDismiss, style }: ToastItemProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = typeStyles[toast.type][scheme];
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(8)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    const timeout = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration);

    return () => {
      clearTimeout(timeout);
    };
  }, [onDismiss, opacity, toast.duration, toast.id, translateY]);

  const iconName = React.useMemo(() => {
    switch (toast.type) {
      case 'success':
        return 'checkmark.circle.fill' as const;
      case 'error':
        return 'exclamationmark.triangle.fill' as const;
      default:
        return 'info.circle.fill' as const;
    }
  }, [toast.type]);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.toast, style, { backgroundColor: colors.background, borderColor: colors.border, opacity, transform: [{ translateY }] }]}
    >
      <IconSymbol name={iconName} size={20} color={colors.icon} style={styles.toastIcon} />
      <View style={styles.toastContent}>
        {toast.title ? (
          <Text style={[styles.toastTitle, { color: colors.text }]}>{toast.title}</Text>
        ) : null}
        <Text style={[styles.toastMessage, { color: toast.title ? colors.subtitle : colors.text }]}>{toast.message}</Text>
      </View>
    </Animated.View>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  toast: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: 'rgba(15, 23, 42, 0.25)',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  toastContent: {
    flex: 1,
  },
  toastIcon: {
    marginRight: 12,
  },
  toastTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  toastSpacing: {
    marginTop: 12,
  },
});
