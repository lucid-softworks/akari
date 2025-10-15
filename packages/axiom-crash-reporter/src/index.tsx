import React, { PropsWithChildren, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import ErrorBoundary from 'react-native-error-boundary';
import { Axiom } from '@axiomhq/js';

type AxiomConfig = {
  token: string;
  orgId?: string;
  dataset?: string;
};

type CrashData = {
  crashId: string;
  timestamp: string;
  error: {
    message: string;
    stack: string;
    name: string;
  };
  isFatal: boolean;
  type: string;
  navigation?: {
    currentRoute: unknown;
    routeHistory: unknown;
  };
  apiHistory?: unknown[];
  device: {
    platform: string;
    os: string;
  };
  appMetadata?: Record<string, unknown>;
  userAgent?: string;
};

type CrashProviderProps = {
  axiomConfig: AxiomConfig;
  navigationRef?: {
    current?: {
      getCurrentRoute?: () => unknown;
      getState?: () => unknown;
    };
  };
  getApiHistory?: () => unknown[];
  appMetadata?: Record<string, unknown>;
  onCrash?: (crashData: CrashData) => void;
  CustomFallbackComponent?: React.ComponentType<FallbackComponentProps>;
  enableConsoleLogging?: boolean;
};

type FallbackComponentProps = {
  error: Error;
  crashId: string;
  onReset?: () => void;
};

type NativeExceptionHandlerModule = {
  setJSExceptionHandler: (handler: (error: Error, isFatal?: boolean) => void, allowInDevMode?: boolean) => void;
  setNativeExceptionHandler: (handler: (errorString: string) => void, forceAppQuit?: boolean) => void;
};

type WebErrorEvent = {
  preventDefault: () => void;
  error?: Error;
  message: string;
};

type PromiseRejectionEventLike = {
  preventDefault: () => void;
  reason: unknown;
};

let axiomClient: Axiom | null = null;
let currentConfig: AxiomConfig | null = null;
let nativeExceptionHandlerModule: NativeExceptionHandlerModule | null | undefined;
let nativeExceptionHandlerPromise: Promise<NativeExceptionHandlerModule | null> | null = null;

const loadNativeExceptionHandler = (): Promise<NativeExceptionHandlerModule | null> => {
  if (Platform.OS === 'web') {
    nativeExceptionHandlerModule = null;
    return Promise.resolve(null);
  }

  if (nativeExceptionHandlerModule !== undefined) {
    return Promise.resolve(nativeExceptionHandlerModule);
  }

  if (!nativeExceptionHandlerPromise) {
    nativeExceptionHandlerPromise = import('react-native-exception-handler')
      .then((module) => {
        const resolvedModule: NativeExceptionHandlerModule = {
          setJSExceptionHandler: module.setJSExceptionHandler,
          setNativeExceptionHandler: module.setNativeExceptionHandler,
        };

        nativeExceptionHandlerModule = resolvedModule;
        return resolvedModule;
      })
      .catch((error: unknown) => {
        console.error('[AxiomCrashReporter] Failed to load react-native-exception-handler:', error);
        nativeExceptionHandlerModule = null;
        return null;
      });
  }

  return nativeExceptionHandlerPromise;
};

type CryptoLike = {
  randomUUID?: () => string;
};

const getCrypto = (): CryptoLike | undefined => {
  const maybeCrypto = (globalThis as { crypto?: CryptoLike }).crypto;
  return maybeCrypto;
};

const createUniqueId = (): string => {
  const cryptoModule = getCrypto();
  const rawId =
    cryptoModule?.randomUUID?.() ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  return rawId.replace(/-/g, '').slice(0, 6).toUpperCase();
};

const getAxiomClient = (config: AxiomConfig): Axiom => {
  if (!axiomClient || currentConfig?.token !== config.token || currentConfig?.orgId !== config.orgId) {
    axiomClient = new Axiom({
      token: config.token,
      orgId: config.orgId,
    });
    currentConfig = config;
  }

  return axiomClient;
};

const getUserAgent = (): string | undefined => {
  const maybeNavigator = (globalThis as { navigator?: { userAgent?: string } }).navigator;
  return maybeNavigator?.userAgent;
};

const sendCrashReport = async (
  config: AxiomConfig,
  err: Error | undefined,
  isFatal: boolean | undefined,
  type: string | undefined,
  crashId: string,
  navigationRef?: CrashProviderProps['navigationRef'],
  getApiHistory?: CrashProviderProps['getApiHistory'],
  appMetadata?: CrashProviderProps['appMetadata'],
  onCrash?: CrashProviderProps['onCrash'],
  enableConsoleLogging?: boolean,
): Promise<void> => {
  try {
    const crashData: CrashData = {
      crashId,
      timestamp: new Date().toISOString(),
      error: {
        message: err?.message ?? 'Unknown error',
        stack: err?.stack ?? '',
        name: err?.name ?? 'Error',
      },
      isFatal: isFatal ?? false,
      type: type ?? 'unknown',
      navigation: navigationRef
        ? {
            currentRoute: navigationRef.current?.getCurrentRoute?.() ?? null,
            routeHistory: navigationRef.current?.getState?.() ?? null,
          }
        : undefined,
      apiHistory: getApiHistory?.() ?? [],
      device: {
        platform: Platform.OS === 'web' ? 'web' : 'react-native',
        os: Platform.OS,
      },
      appMetadata: appMetadata ?? {},
      userAgent: getUserAgent(),
    };

    onCrash?.(crashData);

    const axiom = getAxiomClient(config);
    const dataset = config.dataset ?? 'react-native-crashes';

    await axiom.ingest(dataset, [crashData]);
    await axiom.flush();

    if (enableConsoleLogging) {
      console.log(`[AxiomCrashReporter] Crash report sent with ID: ${crashId}`);
    }
  } catch (error) {
    console.error('[AxiomCrashReporter] Failed to send crash report:', error);
  }
};

const DefaultFallbackComponent = ({ crashId, onReset }: FallbackComponentProps) => {
  if (Platform.OS === 'web') {
    return (
      <div style={webStyles.container}>
        <h1 style={webStyles.title}>Oops! Something went wrong</h1>
        <p style={webStyles.subtitle}>We've logged this error with code:</p>
        <div style={webStyles.crashId}>{crashId}</div>
        <p style={webStyles.message}>Please share this code with support if you need assistance.</p>
        {onReset && (
          <button style={webStyles.button} onClick={onReset}>
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Oops! Something went wrong</Text>
      <Text style={styles.subtitle}>We've logged this error with code:</Text>
      <Text style={styles.crashId}>{crashId}</Text>
      <Text style={styles.message}>Please share this code with support if you need assistance.</Text>
      {onReset && (
        <TouchableOpacity style={styles.button} onPress={onReset}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const CrashProvider = ({
  children,
  axiomConfig,
  navigationRef,
  getApiHistory,
  appMetadata,
  onCrash,
  CustomFallbackComponent,
  enableConsoleLogging = false,
}: PropsWithChildren<CrashProviderProps>) => {
  const crashIdRef = useRef<string>(createUniqueId());
  const crashId = crashIdRef.current;

  useEffect(() => {
    const errorHandler = (error: Error, isFatal: boolean) => {
      void sendCrashReport(
        axiomConfig,
        error,
        isFatal,
        'JS-Exception-Handler',
        crashId,
        navigationRef,
        getApiHistory,
        appMetadata,
        onCrash,
        enableConsoleLogging,
      );
    };

    if (Platform.OS === 'web') {
      type WebGlobal = typeof globalThis & {
        addEventListener?: (
          type: 'error' | 'unhandledrejection',
          listener: (event: WebErrorEvent | PromiseRejectionEventLike) => void,
        ) => void;
        removeEventListener?: (
          type: 'error' | 'unhandledrejection',
          listener: (event: WebErrorEvent | PromiseRejectionEventLike) => void,
        ) => void;
      };

      const webGlobal = globalThis as WebGlobal;

      const handleError = (event: WebErrorEvent) => {
        event.preventDefault();
        const capturedError = event.error ?? new Error(event.message);
        errorHandler(capturedError, true);
      };

      const handleRejection = (event: PromiseRejectionEventLike) => {
        event.preventDefault();
        const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
        errorHandler(reason, true);
      };

      webGlobal.addEventListener?.('error', handleError);
      webGlobal.addEventListener?.('unhandledrejection', handleRejection);

      return () => {
        webGlobal.removeEventListener?.('error', handleError);
        webGlobal.removeEventListener?.('unhandledrejection', handleRejection);
      };
    }

    void loadNativeExceptionHandler().then((module) => {
      if (!module) {
        return;
      }

      module.setJSExceptionHandler((error, isFatal) => {
        errorHandler(error, isFatal ?? false);
      }, false);

      module.setNativeExceptionHandler((errorString) => {
        const nativeError = new Error(errorString);
        void sendCrashReport(
          axiomConfig,
          nativeError,
          true,
          'Native-Exception-Handler',
          crashId,
          navigationRef,
          getApiHistory,
          appMetadata,
          onCrash,
          enableConsoleLogging,
        );
      }, false);
    });

    return undefined;
  }, [
    axiomConfig,
    navigationRef,
    getApiHistory,
    appMetadata,
    onCrash,
    enableConsoleLogging,
    crashId,
  ]);

  const FallbackComponent = CustomFallbackComponent ?? DefaultFallbackComponent;

  return (
    <ErrorBoundary
      onError={(error: Error, stackTrace: string) => {
        void sendCrashReport(
          axiomConfig,
          error,
          true,
          stackTrace || 'ErrorBoundary',
          crashId,
          navigationRef,
          getApiHistory,
          appMetadata,
          onCrash,
          enableConsoleLogging,
        );
      }}
      FallbackComponent={(props) => (
        <FallbackComponent error={props.error} crashId={crashId} onReset={props.resetError} />
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
  },
  crashId: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff4444',
    letterSpacing: 4,
    marginVertical: 20,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007bff',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

const webStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    minHeight: '100vh',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#333',
  },
  subtitle: {
    fontSize: '16px',
    marginBottom: '10px',
    color: '#666',
  },
  crashId: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#ff4444',
    letterSpacing: '4px',
    margin: '20px 0',
  },
  message: {
    fontSize: '14px',
    color: '#666',
    textAlign: 'center',
    marginBottom: '30px',
  },
  button: {
    backgroundColor: '#007bff',
    padding: '12px 30px',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export type { AxiomConfig, CrashData, CrashProviderProps, FallbackComponentProps };
export { CrashProvider, createUniqueId, sendCrashReport };
