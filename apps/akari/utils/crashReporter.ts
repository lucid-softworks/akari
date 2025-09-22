import {
  initializeAxiomCrashReporter,
  type AxiomCrashReporter,
  type CrashReportContext,
  type CrashReporterOptions,
} from 'axiom-crash-reporter';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type UnknownRecord = Record<string, unknown>;

type ExpoConfigShape = {
  android?: { package?: string };
  ios?: { bundleIdentifier?: string };
  version?: string;
  extra?: UnknownRecord;
};

let reporter: AxiomCrashReporter | null = null;
let configurationWarningLogged = false;
let initializationFailureLogged = false;

const isDevelopmentMode = (): boolean => {
  const devFlag = (globalThis as { __DEV__?: boolean }).__DEV__;
  return devFlag === true;
};

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null;

const resolveString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const resolveBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  return undefined;
};

const getExpoConfig = (): ExpoConfigShape | undefined => {
  const expoConfig = Constants.expoConfig;
  if (expoConfig && typeof expoConfig === 'object') {
    return expoConfig as ExpoConfigShape;
  }

  return undefined;
};

const getExtra = (): UnknownRecord | undefined => {
  const expoConfig = getExpoConfig();
  if (expoConfig && isRecord(expoConfig.extra)) {
    return expoConfig.extra as UnknownRecord;
  }

  return undefined;
};

const getAxiomExtra = (): UnknownRecord | undefined => {
  const extra = getExtra();
  if (extra && isRecord(extra.axiom)) {
    return extra.axiom as UnknownRecord;
  }

  return undefined;
};

const resolveVariant = (): string | undefined => resolveString(getExtra()?.variant);

const resolveAppVersion = (): string | undefined => resolveString(getExpoConfig()?.version);

const resolveApplicationId = (): string | undefined => {
  const expoConfig = getExpoConfig();
  if (!expoConfig) {
    return undefined;
  }

  if (Platform.OS === 'android') {
    return resolveString(expoConfig.android?.package);
  }

  if (Platform.OS === 'ios') {
    return resolveString(expoConfig.ios?.bundleIdentifier);
  }

  return undefined;
};

const buildMetadata = (variant?: string): UnknownRecord => {
  const metadata: UnknownRecord = { platform: Platform.OS };

  if (variant) {
    metadata.appVariant = variant;
  }

  if (typeof Constants.executionEnvironment === 'string') {
    metadata.executionEnvironment = Constants.executionEnvironment;
  }

  if (typeof Constants.appOwnership === 'string') {
    metadata.appOwnership = Constants.appOwnership;
  }

  if (typeof Constants.debugMode === 'boolean') {
    metadata.debugMode = Constants.debugMode;
  }

  if (typeof Constants.deviceName === 'string' && Constants.deviceName) {
    metadata.deviceName = Constants.deviceName;
  }

  if (typeof Constants.deviceYearClass === 'number' && Number.isFinite(Constants.deviceYearClass)) {
    metadata.deviceYearClass = Constants.deviceYearClass;
  }

  if (typeof Constants.expoRuntimeVersion === 'string') {
    metadata.expoRuntimeVersion = Constants.expoRuntimeVersion;
  }

  if (typeof Constants.expoVersion === 'string') {
    metadata.expoVersion = Constants.expoVersion;
  }

  if (typeof Constants.sessionId === 'string' && Constants.sessionId) {
    metadata.sessionId = Constants.sessionId;
  }

  if (typeof Constants.statusBarHeight === 'number' && Number.isFinite(Constants.statusBarHeight)) {
    metadata.statusBarHeight = Constants.statusBarHeight;
  }

  if (typeof Constants.systemVersion === 'number' || typeof Constants.systemVersion === 'string') {
    metadata.systemVersion = Constants.systemVersion;
  }

  return metadata;
};

const warnMissingConfiguration = () => {
  if (!configurationWarningLogged && isDevelopmentMode()) {
    configurationWarningLogged = true;
    console.info('Axiom crash reporter is disabled because dataset or token values are missing.');
  }
};

const logInitializationFailure = (error: unknown) => {
  if (!initializationFailureLogged && isDevelopmentMode()) {
    initializationFailureLogged = true;
    console.error('Failed to initialize the Axiom crash reporter', error);
  }
};

const buildCrashReporterOptions = (): CrashReporterOptions | null => {
  const axiomExtra = getAxiomExtra();
  const dataset = resolveString(axiomExtra?.dataset);
  const token = resolveString(axiomExtra?.token);

  if (!dataset || !token) {
    warnMissingConfiguration();
    return null;
  }

  const variant = resolveVariant();
  const environment = resolveString(axiomExtra?.environment) ?? variant;
  const releaseChannel = resolveString(axiomExtra?.releaseChannel) ?? variant;
  const flushOnCapture = resolveBoolean(axiomExtra?.flushOnCapture);

  const options: CrashReporterOptions = {
    dataset,
    token,
  };

  if (environment) {
    options.environment = environment;
  }

  const appVersion = resolveAppVersion();
  if (appVersion) {
    options.appVersion = appVersion;
  }

  if (releaseChannel) {
    options.releaseChannel = releaseChannel;
  }

  const applicationId = resolveApplicationId();
  if (applicationId) {
    options.applicationId = applicationId;
  }

  const metadata = buildMetadata(variant);
  if (Object.keys(metadata).length > 0) {
    options.metadata = metadata;
  }

  if (flushOnCapture !== undefined) {
    options.flushOnCapture = flushOnCapture;
  }

  return options;
};

export const initializeCrashReporter = (): AxiomCrashReporter | null => {
  if (reporter) {
    return reporter;
  }

  const options = buildCrashReporterOptions();
  if (!options) {
    return null;
  }

  try {
    reporter = initializeAxiomCrashReporter(options);
    initializationFailureLogged = false;
  } catch (error) {
    reporter = null;
    logInitializationFailure(error);
    return null;
  }

  return reporter;
};

export const getCrashReporter = (): AxiomCrashReporter | null => reporter;

const withReporter = async (
  action: (instance: AxiomCrashReporter) => Promise<void>,
  failureMessage: string,
): Promise<void> => {
  const instance = initializeCrashReporter();
  if (!instance) {
    return;
  }

  try {
    await action(instance);
  } catch (error) {
    if (isDevelopmentMode()) {
      console.error(failureMessage, error);
    }
  }
};

export const captureCrash = async (error: unknown, context: CrashReportContext = {}): Promise<void> => {
  await withReporter(
    (instance) => instance.reportError(error, context),
    'Failed to forward crash report to Axiom',
  );
};

export const captureFatalCrash = async (error: unknown, context: CrashReportContext = {}): Promise<void> => {
  await withReporter(
    (instance) => instance.reportFatalError(error, context),
    'Failed to forward fatal crash report to Axiom',
  );
};
