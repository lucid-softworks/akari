import type { AxiomCrashReporter } from 'axiom-crash-reporter';
import { Platform } from 'react-native';

type UnknownRecord = Record<string, unknown>;

type CrashReporterModule = typeof import('@/utils/crashReporter');

const mockInitializeAxiomCrashReporter = jest.fn();

jest.mock('axiom-crash-reporter', () => ({
  initializeAxiomCrashReporter: mockInitializeAxiomCrashReporter,
}));

const createConstantsMock = (extraOverrides?: UnknownRecord) => {
  const extra: UnknownRecord = { variant: 'production', ...(extraOverrides ?? {}) };

  return {
    __esModule: true,
    default: {
      appOwnership: 'standalone',
      debugMode: false,
      deviceName: 'Test Device',
      deviceYearClass: 2023,
      executionEnvironment: 'standalone',
      expoRuntimeVersion: '1.0.0',
      expoVersion: '53.0.0',
      sessionId: 'session-id',
      statusBarHeight: 20,
      systemVersion: 17,
      expoConfig: {
        version: '1.2.3',
        ios: { bundleIdentifier: 'com.example.app' },
        android: { package: 'com.example.app' },
        extra,
      },
    },
  };
};

const originalPlatform = Platform.OS;
const originalDevFlag = (globalThis as { __DEV__?: boolean }).__DEV__;

beforeEach(() => {
  jest.resetModules();
  mockInitializeAxiomCrashReporter.mockReset();
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  if (originalDevFlag === undefined) {
    delete (globalThis as { __DEV__?: boolean }).__DEV__;
  } else {
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDevFlag;
  }
});

const loadCrashReporterModule = (): CrashReporterModule => {
  return require('@/utils/crashReporter') as CrashReporterModule;
};

describe('crashReporter utilities', () => {
  it('returns null when configuration is missing', async () => {
    jest.doMock('expo-constants', () => createConstantsMock({ variant: 'development' }));
    const { initializeCrashReporter } = loadCrashReporterModule();
    const reporter = initializeCrashReporter();
    expect(reporter).toBeNull();
    expect(mockInitializeAxiomCrashReporter).not.toHaveBeenCalled();
  });

  it('initializes the crash reporter with Expo metadata', async () => {
    const fakeReporter = {
      reportError: jest.fn(),
      reportFatalError: jest.fn(),
    } as unknown as AxiomCrashReporter;

    jest.doMock('expo-constants', () =>
      createConstantsMock({
        variant: 'production',
        axiom: {
          dataset: 'app-crashes',
          token: 'token-123',
          releaseChannel: 'beta',
          flushOnCapture: false,
        },
      }),
    );

    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    mockInitializeAxiomCrashReporter.mockReturnValue(fakeReporter);

    const { initializeCrashReporter, getCrashReporter } = loadCrashReporterModule();
    const reporter = initializeCrashReporter();

    expect(mockInitializeAxiomCrashReporter).toHaveBeenCalledTimes(1);
    expect(mockInitializeAxiomCrashReporter).toHaveBeenCalledWith(
      expect.objectContaining({
        dataset: 'app-crashes',
        token: 'token-123',
        environment: 'production',
        releaseChannel: 'beta',
        appVersion: '1.2.3',
        applicationId: 'com.example.app',
        metadata: expect.objectContaining({
          platform: 'ios',
          appVariant: 'production',
          executionEnvironment: 'standalone',
          appOwnership: 'standalone',
        }),
        flushOnCapture: false,
      }),
    );

    expect(reporter).toBe(fakeReporter);
    expect(getCrashReporter()).toBe(fakeReporter);
  });

  it('captures handled and fatal crashes with the shared reporter instance', async () => {
    const fakeReporter = {
      reportError: jest.fn().mockResolvedValue(undefined),
      reportFatalError: jest.fn().mockResolvedValue(undefined),
    } as unknown as AxiomCrashReporter;

    jest.doMock('expo-constants', () =>
      createConstantsMock({
        variant: 'production',
        axiom: {
          dataset: 'app-crashes',
          token: 'token-123',
        },
      }),
    );

    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    mockInitializeAxiomCrashReporter.mockReturnValue(fakeReporter);

    const { initializeCrashReporter, captureCrash, captureFatalCrash } = loadCrashReporterModule();

    initializeCrashReporter();

    await captureCrash(new Error('boom'), { metadata: { feature: 'feed' } });
    await captureFatalCrash('fatal-error', { metadata: { feature: 'fatal' } });

    expect(fakeReporter.reportError).toHaveBeenCalledTimes(1);
    expect(fakeReporter.reportError).toHaveBeenCalledWith(expect.any(Error), {
      metadata: { feature: 'feed' },
    });

    expect(fakeReporter.reportFatalError).toHaveBeenCalledTimes(1);
    expect(fakeReporter.reportFatalError).toHaveBeenCalledWith('fatal-error', {
      metadata: { feature: 'fatal' },
    });

    expect(mockInitializeAxiomCrashReporter).toHaveBeenCalledTimes(1);
  });
});
